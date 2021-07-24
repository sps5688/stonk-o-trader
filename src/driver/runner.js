/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-continue */
/* eslint-disable block-scoped-var */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-var */

const moment = require('moment');
const finnhub = require('../data/finnhub');
const indicator = require('../util/indicator');
const output = require('../util/output');
const strategy = require('../strategy/example');
const time = require('../util/time');
const config = require('../config');
const { default: Portfolio } = require('../model/portfolio');

async function run(tickerInformation) {
  const portfolio = new Portfolio(config.availableFunds);

  while (await time.isMarketOpen()) {
    await output.write('Market is open\n');

    if (tickerInformation.length === 0) {
      await output.write('No tickers to trade.');
      break;
    }

    for (const entry of tickerInformation) {
      const { ticker } = entry;
      let openedPostion = false;
      await output.write(`Evaluating ${ticker}`);

      // Evaluate buy/sells on candle interval
      let isOwned = portfolio.isOwned(ticker);
      if (await time.shouldEvaluateTicker()) {
        if (!config.backtest) {
          // Sleep for half a second
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const { previousWeekCandles } = entry;

        if (previousWeekCandles === null) {
          await output.write('Error retrieving previous week candle information');
          continue;
        }

        const yesterdaysCandles = await time.getYesterdaysCandles(
          previousWeekCandles,
          0,
        );

        let todaysCandles = null;
        if (config.backtest) {
          todaysCandles = time.getTodaysCandles(previousWeekCandles);
        } else {
          todaysCandles = await finnhub.getCandles(entry.ticker, true, null);

          if (todaysCandles === null) {
            await output.write('Error retrieving candle information');
            continue;
          }
        }

        const intervalCandle = todaysCandles[todaysCandles.length - 1];

        // Find HOD, LOD, and Days Range
        const highOfDay = indicator.getHighOfDay(todaysCandles);
        const lowOfDay = indicator.getLowOfDay(todaysCandles);
        const todaysRange = indicator.findDaysRange(highOfDay, lowOfDay);

        await output.write(`High of Day: ${highOfDay}`);
        await output.write(`Low of Day: ${lowOfDay}`);
        await output.write(`Day Range: ${todaysRange}`);
        await output.write(`Last ${config.candleInterval} Min Candle: `);
        await output.write(JSON.stringify(intervalCandle, null, 2));

        if (!isOwned) {
          const actionObj = await strategy.shouldBuy(
            ticker,
            intervalCandle,
            todaysCandles,
            todaysRange,
            yesterdaysCandles,
            portfolio,
          );

          if (actionObj !== null) {
            await output.write('Ticker meets buy criteria');
            await portfolio.makeTransaction(ticker, actionObj);
            openedPostion = true;
          } else {
            await output.write('Ticker does not meet buy criteria');
          }
        } else if (isOwned) {
          // Determine if stop loss triggered
          const triggered = await portfolio.didStopLossTrigger(
            ticker,
            intervalCandle,
          );

          if (!triggered) {
            const actionObj = await strategy.shouldSell(
              ticker,
              intervalCandle,
              todaysCandles,
              todaysRange,
              yesterdaysCandles,
              portfolio,
            );

            if (actionObj !== null) {
              await output.write('Ticker meets sell criteria');
              await portfolio.makeTransaction(ticker, actionObj);
            } else {
              await output.write('Ticker does not meet sell criteria');
            }
          }
        }
      }

      // If position was not just opened, ticker is still owned, and trading with live data, update unrealized information
      isOwned = portfolio.isOwned(ticker);
      if (!config.backtest && isOwned && !openedPostion) {
        const quote = await finnhub.getQuote(ticker);
        portfolio.updateUnrealizedAmount(ticker, quote.c);
      }

      await output.write('\n');
    }

    // Show current portfolio
    await portfolio.printPortfolio();

    // Determine if daily max loss is hit
    if (portfolio.dailyMaxLossHit()) {
      await output.write('Daily max loss hit.');

      // TODO Sell all current positions on next min, set a flag

      break;
    }

    if (!config.backtest) {
      // Sleep for approximately 1 min, depending on request execution time
      const now = moment();

      const sleepInterval = 1;
      const remainingSeconds = (sleepInterval - 1) * 60 + (60 - now.second());
      const remainingMiliseconds = (remainingSeconds + 5) * 1000; // Gives API a few seconds for their candle data to update

      await output.write('Sleeping...');
      await new Promise((resolve) => setTimeout(resolve, remainingMiliseconds));
    } else {
      await time.adjustCurrentBacktestTime();
    }
    // break; // for testing one transaction
  }

  await output.write(
    'Market is closed, nothing to do, or hit daily max loss.\n',
  );

  // Print Days Trades
  await portfolio.printTradeLog();
  await output.write('Exiting');
}

exports.run = run;
