/* eslint-disable linebreak-style */
/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */

const roundTo = require('round-to');
const { table, getBorderCharacters } = require('table');
const output = require('../util/output');
const config = require('../config');

export default class Portfolio {
  constructor(availableFunds) {
    this.availableFunds = availableFunds;
    this.positions = [];
    this.history = [];
    this.dailyProfit = 0;
    this.purchaseAmounts = [];
  }

  isOwned(ticker) {
    const { positions } = this;

    for (let i = 0; i < positions.length; i++) {
      if (positions[i].ticker === ticker) {
        return true;
      }
    }

    return false;
  }

  dailyMaxLossHit() {
    if (this.dailyProfit <= config.maxDailyLossAmount) {
      return true;
    }

    return false;
  }

  updateUnrealizedAmount(ticker, currentPrice) {
    const position = this.getPositionInfo(ticker);
    const unrealizedAmount = (currentPrice - position.price) * position.shares;

    position.unrealizedAmount = roundTo(unrealizedAmount, 2);
    position.currentPrice = roundTo(parseFloat(currentPrice), 2);
  }

  async printPortfolio() {
    const tableConfig = {
      border: getBorderCharacters('norc'),
    };

    const data = [
      ['', '', 'Current Positions', '', '', '', '', '', '', ''],
      [
        'Ticker',
        'Shares',
        'Entry Price',
        'Current Price',
        'Stop',
        'Entry Amount',
        'Curent Amount',
        'Change',
        'Change %',
        'Entry Time',
      ],
    ];

    let totalPurchaseAmount = 0;
    let totalUnrealizedAmount = 0;
    let totalCurrentAmount = 0;
    let totalPercentChange = 0;
    for (const position of this.positions) {
      const currentAmount = position.purchaseAmount + position.unrealizedAmount;
      const unrealizedPercent = roundTo(
        ((position.currentPrice - position.price) / position.price) * 100,
        2,
      );

      totalPurchaseAmount += parseFloat(position.purchaseAmount);
      totalUnrealizedAmount += parseFloat(position.unrealizedAmount);
      totalCurrentAmount += parseFloat(currentAmount);
      totalPercentChange += parseFloat(unrealizedPercent);

      data.push([
        position.ticker,
        position.shares,
        position.price,
        position.currentPrice,
        position.stop,
        roundTo(position.purchaseAmount, 2),
        roundTo(currentAmount, 2),
        roundTo(position.unrealizedAmount, 2),
        `${unrealizedPercent}%`,
        position.purchaseTime,
      ]);
    }

    data.push([
      '',
      '',
      'Totals',
      '',
      '',
      roundTo(totalPurchaseAmount, 2),
      roundTo(totalCurrentAmount, 2),
      roundTo(totalUnrealizedAmount, 2),
      `${roundTo(totalPercentChange, 2)}%`,
      '',
    ]);

    data.push([
      '',
      '',
      'Available Funds',
      `$${roundTo(this.availableFunds, 2)}`,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);

    const positionOutput = `${table(data, tableConfig)}`;
    await output.write(positionOutput);

    const historyData = [
      ['', '', 'Trade History', '', '', '', '', ''],
      [
        'Action',
        'Ticker',
        'Shares',
        'Entry Price',
        'Exit/Stop Price',
        'Change',
        'Change %',
        'Trade Time',
      ],
    ];

    for (const trade of this.history) {
      const changePercent = trade.action === 'buy'
        ? ''
        : `${roundTo(((trade.exit - trade.entry) / trade.exit) * 100, 2)}%`;
      const result = trade.result === '' ? '' : roundTo(trade.result, 2);

      historyData.push([
        trade.action,
        trade.ticker,
        trade.shares,
        trade.entry,
        trade.exit,
        result,
        changePercent,
        trade.tradeTime,
      ]);
    }

    // Daily profit %
    const percent = ((config.availableFunds + this.dailyProfit - config.availableFunds)
        / config.availableFunds)
      * 100;

    // Calculate average purchase amount
    let averagePurchaseAmount = '';
    if (this.purchaseAmounts.length !== 0) {
      averagePurchaseAmount = roundTo(
        this.purchaseAmounts.reduce((a, b) => a + b, 0)
          / this.purchaseAmounts.length,
        2,
      );
    }

    historyData.push([
      '',
      '',
      'TOTALS',
      roundTo(this.dailyProfit, 2),
      `${roundTo(percent, 2)}%`,
      '',
      '',
      '',
    ]);
    historyData.push([
      '',
      '',
      'AVERAGE PURCHASE AMOUNT',
      averagePurchaseAmount,
      '',
      '',
      '',
      '',
    ]);

    if (config.printTradeLog) {
      await this.printTradeLog();
    }
  }

  async printTradeLog() {
    const tableConfig = {
      border: getBorderCharacters('norc'),
    };

    const historyData = [
      ['', '', 'Trade History', '', '', '', '', ''],
      [
        'Action',
        'Ticker',
        'Shares',
        'Entry Price',
        'Exit/Stop Price',
        'Change',
        'Change %',
        'Trade Time',
      ],
    ];

    for (const trade of this.history) {
      const changePercent = trade.action === 'buy'
        ? ''
        : `${roundTo(((trade.exit - trade.entry) / trade.exit) * 100, 2)}%`;
      const result = trade.result === '' ? '' : roundTo(trade.result, 2);

      historyData.push([
        trade.action,
        trade.ticker,
        trade.shares,
        trade.entry,
        trade.exit,
        result,
        changePercent,
        trade.tradeTime,
      ]);
    }

    // Daily profit %
    const percent = ((config.availableFunds + this.dailyProfit - config.availableFunds)
        / config.availableFunds)
      * 100;

    // Calculate average purchase amount
    let averagePurchaseAmount = '';
    if (this.purchaseAmounts.length !== 0) {
      averagePurchaseAmount = roundTo(
        this.purchaseAmounts.reduce((a, b) => a + b, 0)
          / this.purchaseAmounts.length,
        2,
      );
    }

    historyData.push([
      '',
      '',
      'TOTALS',
      roundTo(this.dailyProfit, 2),
      `${roundTo(percent, 2)}%`,
      '',
      '',
      '',
    ]);
    historyData.push([
      '',
      '',
      'AVERAGE PURCHASE AMOUNT',
      averagePurchaseAmount,
      '',
      '',
      '',
      '',
    ]);

    const historyOutput = `${table(historyData, tableConfig)}`;
    await output.write(historyOutput);
  }

  async didStopLossTrigger(ticker, intervalCandle) {
    const intervalCandleLow = intervalCandle.l;

    const { positions } = this;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].ticker === ticker) {
        // Examine the stoploss
        const entryPrice = positions[i].price;
        const { stop } = positions[i];
        const { shares } = positions[i];

        // Update array if it hit
        if (intervalCandleLow <= stop) {
          await output.write('Stop loss triggered');

          // Compute loss
          const lossPerShare = roundTo(entryPrice - stop, 2);

          // Update daily profit metric
          this.dailyProfit -= lossPerShare * shares;

          // Remove from array
          positions.splice(i, 1);

          this.history.push({
            action: 'sell',
            ticker,
            shares,
            entry: entryPrice,
            exit: stop,
            result: parseFloat(-1 * (lossPerShare * shares)),
            tradeTime: intervalCandle.t.add(config.candleInterval, 'minutes').format('hh:mm:ss a'),
          });

          // Update available funds
          this.availableFunds += entryPrice * shares - lossPerShare * shares;

          return true;
        }
        await output.write('Stop loss still intact');
        return false;
      }
    }
  }

  getPositionInfo(ticker) {
    const { positions } = this;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].ticker === ticker) {
        return positions[i];
      }
    }

    return null;
  }

  getPositions() {
    return this.positions;
  }

  async openPosition(
    ticker,
    shares,
    price,
    stop,
    purchaseTime,
    purchaseAmount,
  ) {
    await output.write(
      `Opening position for ${ticker} for $${purchaseAmount}`,
    );

    this.positions.push({
      ticker,
      shares,
      price,
      stop,
      purchaseAmount,
      unrealizedAmount: 0,
      currentPrice: price,
      purchaseTime: purchaseTime.add(config.candleInterval, 'minutes').format('hh:mm:ss a'),
    });

    this.history.push({
      action: 'buy',
      ticker,
      shares,
      entry: price,
      exit: stop,
      result: '',
      tradeTime: purchaseTime.format('hh:mm:ss a'),
    });

    this.availableFunds -= purchaseAmount;
    this.purchaseAmounts.push(purchaseAmount);
  }

  async closePosition(ticker, sharesToSell, currentPrice, purchaseTime) {
    const exitAmount = currentPrice * sharesToSell;
    await output.write(
      `Closing position for ${ticker} for $${exitAmount}`,
    );

    const { positions } = this;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].ticker === ticker) {
        // Get the entry price
        const entryPrice = positions[i].price;

        // Compute profit
        const profitPerShare = roundTo(currentPrice - entryPrice, 2);

        // Update daily profit metric
        this.dailyProfit += profitPerShare * sharesToSell;

        // Remove, sell all shares
        positions.splice(i, 1);

        this.history.push({
          action: 'sell',
          ticker,
          shares: sharesToSell,
          entry: entryPrice,
          exit: currentPrice,
          result: profitPerShare * sharesToSell,
          tradeTime: purchaseTime.add(config.candleInterval, 'minutes').format('hh:mm:ss a'),
        });

        // Update available funds
        this.availableFunds += entryPrice * sharesToSell + profitPerShare * sharesToSell;

        break;
      }
    }
  }

  async makeTransaction(ticker, actionObj) {
    const { intervalCandle } = actionObj;
    const currentPrice = intervalCandle.c;

    const { action } = actionObj;
    const { shares } = actionObj;
    const { stop } = actionObj;
    const { purchaseTime } = actionObj;
    const { purchaseAmount } = actionObj;

    if (action === 'buy') {
      await this.openPosition(
        ticker,
        shares,
        currentPrice,
        stop,
        purchaseTime,
        purchaseAmount,
      );
    } else {
      await this.closePosition(ticker, shares, currentPrice, purchaseTime);
    }
  }

  getAvailableFunds() {
    return this.availableFunds;
  }
}
