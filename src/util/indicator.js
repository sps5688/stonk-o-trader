/* eslint-disable linebreak-style */
/* eslint-disable prefer-spread */

const movingAverages = require('moving-averages');
const roundTo = require('round-to');

function getHighOfDay(todaysCandles) {
  return Math.max.apply(
    Math,
    todaysCandles.map((o) => o.h),
  );
}

function getLowOfDay(todaysCandles) {
  return Math.min.apply(
    Math,
    todaysCandles.map((o) => o.l),
  );
}

function findDaysRange(highOfDay, lowOfDay) {
  return Math.abs(lowOfDay - highOfDay);
}

function getEMA(yesterdaysCandles, todaysCandles, interval) {
  const currentCandles = yesterdaysCandles.concat(todaysCandles);
  const closes = currentCandles.map((candle) => roundTo(parseFloat(candle.c), 2));

  return movingAverages.ema(closes, interval);
}

exports.getHighOfDay = getHighOfDay;
exports.getLowOfDay = getLowOfDay;
exports.findDaysRange = findDaysRange;
exports.getEMA = getEMA;
