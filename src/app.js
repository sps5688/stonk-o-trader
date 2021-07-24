/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

const fs = require('fs');
const moment = require('moment');
const backtest = require('./util/time');
const watchList = require('./watchlist.json');
const runner = require('./driver/runner');
const finnhub = require('./data/finnhub');
const output = require('./util/output');
const config = require('./config');

async function preprocessWatchList(entries, momentStartDay) {
  const tickerInformationArr = [];

  for (const entry of entries) {
    const tickerInformation = {};
    const { ticker } = entry;

    tickerInformation.previousWeekCandles = await finnhub.getCandles(
      ticker,
      false,
      momentStartDay,
    );

    tickerInformation.ticker = ticker;
    tickerInformationArr.push(tickerInformation);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return tickerInformationArr;
}

async function init() {
  // Preprocess ticker list
  let momentStartDay;
  if (config.backtest) {
    momentStartDay = backtest.initializeBacktestStartTime();
  } else {
    momentStartDay = moment();
  }

  await output.createDir('results');

  const fileName = momentStartDay.format('MM-DD-YYYY');
  fs.truncate(`results/${fileName}.txt`, 0, () => {});
  output.setOutputFileName(`results/${fileName}.txt`);

  const tickerInformation = await preprocessWatchList(
    watchList.watchList,
    momentStartDay,
  );

  // Wait for half a second to ensure data comes back
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Begin execution
  runner.run(tickerInformation);
}

init();
