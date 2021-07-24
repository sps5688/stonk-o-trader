/* eslint-disable linebreak-style */
/* eslint-disable no-unused-vars */

const moment = require('moment');
const roundTo = require('round-to');
const config = require('../config');
const indicator = require('../util/indicator');
const output = require('../util/output');

async function updateProgress(text) {
  if (config.exposeStrategy) {
    await output.write(text);
  }
}

async function shouldBuy(
  ticker,
  intervalCandle,
  todaysCandles,
  todaysRange,
  yesterdaysCandles,
  portfolio,
) {
  const nineEMAs = indicator.getEMA(yesterdaysCandles, todaysCandles, 9);
  const currentNineEMA = roundTo(nineEMAs[nineEMAs.length - 1], 2);

  const intervalCandleOpen = intervalCandle.o;
  const intervalCandleHigh = intervalCandle.h;
  const intervalCandleClose = intervalCandle.c;
  const intervalCandleLow = intervalCandle.l;
  const intervalCandleVolume = intervalCandle.v;
  const intervalCandleTime = intervalCandle.t;
  const nineEMAPercentDifference = roundTo(
    ((intervalCandleClose - currentNineEMA)
      / intervalCandleClose
      / todaysRange)
      * 100,
    2,
  );

  if (intervalCandleTime.hour() === 15 && intervalCandleTime.minute() >= 30) {
    await updateProgress('Not opening position close to end of day');

    return null;
  }

  await updateProgress(`Current 9EMA: ${currentNineEMA}`);

  // ### CANDLE COLOR INDICATOR
  if (intervalCandleClose < intervalCandleOpen) {
    await updateProgress('Candle is red');
    return null;
  }
  await updateProgress('Candle is green');

  // ### CANDLE COLOR INDICATOR

  // ### ABOVE EMA INDICATOR
  if (nineEMAPercentDifference < 0) {
    await updateProgress(`Price below 9EMA: ${nineEMAPercentDifference}`);
    return null;
  }
  await updateProgress(`Price above 9EMA: ${nineEMAPercentDifference}`);
  // ### ABOVE EMA INDICATOR

  const { maxLoss } = config;
  const { stopLossPercent } = config;

  // Compute stop loss
  const stopLoss = parseFloat(
    (currentNineEMA - currentNineEMA * stopLossPercent).toFixed(2),
  );

  // Compute share amount
  const shares = Math.floor(maxLoss / (intervalCandleClose - stopLoss));

  const purchaseAmount = intervalCandleClose * shares;
  if (purchaseAmount > portfolio.getAvailableFunds()) {
    await updateProgress('No available funds for purchase');
    return null;
  }

  return {
    action: 'buy',
    shares,
    stop: stopLoss,
    purchaseTime: intervalCandleTime,
    intervalCandle,
    purchaseAmount,
  };
}

async function shouldSell(
  ticker,
  intervalCandle,
  todaysCandles,
  todaysRange,
  yesterdaysCandles,
  portfolio,
) {
  const positionInfo = portfolio.getPositionInfo(ticker);
  const nineEMAs = indicator.getEMA(yesterdaysCandles, todaysCandles, 9);
  const currentNineEMA = roundTo(nineEMAs[nineEMAs.length - 1], 2);

  const intervalCandleOpen = intervalCandle.o;
  const intervalCandleClose = intervalCandle.c;
  const intervalCandleHigh = intervalCandle.h;
  const intervalCandleLow = intervalCandle.l;
  const intervalCandleVolume = intervalCandle.v;
  const intervalCandleTime = intervalCandle.t;
  const nineEMAPercentDifference = roundTo(
    ((intervalCandleClose - currentNineEMA)
      / intervalCandleClose
      / todaysRange)
      * 100,
    2,
  );

  const momentTime = moment(intervalCandleTime, 'HH:mm:ss am');
  if (momentTime.hour() === 15 && momentTime.minute() >= 50) {
    await updateProgress('Selling position before end of day');
    return {
      action: 'sell',
      shares: positionInfo.shares,
      purchaseTime: intervalCandle.t,
      intervalCandle,
    };
  }

  await updateProgress(`Candidate 9EMA: ${currentNineEMA}`);

  // ### EMA BROKEN INDICATOR
  if (nineEMAPercentDifference > 0) {
    await updateProgress(`9EMA Still intact: ${nineEMAPercentDifference}`);
  } else {
    await updateProgress(`9EMA broken: ${nineEMAPercentDifference}`);
    return {
      action: 'sell',
      shares: positionInfo.shares,
      purchaseTime: intervalCandleTime,
      intervalCandle,
    };
  }
  // ### EMA BROKEN INDICATOR

  return null;
}

// TODO Implement
function shouldShort() {}

// TODO Implement
function shouldCover() {}

exports.shouldBuy = shouldBuy;
exports.shouldSell = shouldSell;
