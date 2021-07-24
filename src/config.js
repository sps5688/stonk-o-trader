/* eslint-disable linebreak-style */

require('dotenv').config();

module.exports = {
  backtest: true,
  backtestStartYear: 2021,
  backtestStartMonth: '07',
  backtestStartDay: '23',
  backtestStartHour: '09',
  backtestStartMin: '30',
  candleInterval: '1',
  maxLoss: 20,
  stopLossPercent: 0.01,
  availableFunds: 50000,
  maxDailyLossAmount: -300,
  token: process.env.API_KEY,
  exposeStrategy: true,
  printTradeLog: true,
};
