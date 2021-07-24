/* eslint-disable linebreak-style */
/* eslint-disable no-return-await */
/* eslint-disable consistent-return */
/* eslint-disable no-plusplus */

const axios = require('axios');
const moment = require('moment');
const time = require('../util/time');
const config = require('../config');

async function getCandles(ticker, today, momentStartDay) {
  let epochObj;
  if (today) {
    epochObj = time.generateTodaysEPOCHTimes();
  } else {
    epochObj = time.generatePastWeekEPOCHTimes(momentStartDay);
  }

  // TODO Rename variable
  const todaysCandlesRequest = `${'https://finnhub.io/api/v1/stock/candle?'
    + 'symbol='}${
    ticker
  }&resolution=${
    config.candleInterval
  }&from=${
    epochObj.fromEpoch
  }&to=${
    epochObj.toEpoch
  }&token=${
    config.token}`;

  return await axios.get(todaysCandlesRequest).then((response) => {
    if (response === undefined || response.status !== 200) {
      return;
    }

    const formattedResponse = [];
    const times = response.data.t;

    if (response.data.s === 'no_data') {
      return null;
    }

    for (let i = 0; i < times.length; i++) {
      const timeObj = moment.unix(times[i]).local();

      if (
        (timeObj.hour() > 9 && timeObj.hour() < 16)
        || (timeObj.hour() === 9 && timeObj.minute() >= 30)
      ) {
        formattedResponse.push({
          o: response.data.o[i],
          h: response.data.h[i],
          l: response.data.l[i],
          c: response.data.c[i],
          v: response.data.v[i],
          t: timeObj,
        });
      }
    }

    return formattedResponse;
  });
}

async function getQuote(ticker) {
  const quoteRequest = `${'https://finnhub.io/api/v1/quote?'
    + 'symbol='}${
    ticker
  }&token=${
    config.token}`;

  return await axios.get(quoteRequest).then((response) => {
    if (response === undefined || response.status !== 200) {
      return;
    }

    return response.data;
  });
}

exports.getCandles = getCandles;
exports.getQuote = getQuote;
