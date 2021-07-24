/* eslint-disable linebreak-style */
/* eslint-disable no-lonely-if */
/* eslint-disable no-restricted-syntax */
/* eslint-disable radix */

const moment = require('moment');
const output = require('./output');
const config = require('../config');

let backtestCurrentHour = 0;
let backtestCurrentMinute = 0;
let backtestCurrentDay = 0;

function initializeBacktestStartTime() {
  const momentStartDay = moment(
    `${config.backtestStartYear
    }-${
      config.backtestStartMonth
    }-${
      config.backtestStartDay
    }T${
      config.backtestStartHour
    }:${
      config.backtestStartMin
    }:00`,
  );

  backtestCurrentDay = parseInt(config.backtestStartDay);
  backtestCurrentHour = parseInt(config.backtestStartHour);
  backtestCurrentMinute = parseInt(config.backtestStartMin);

  return momentStartDay;
}

function generatePastWeekEPOCHTimes(momentStartDay) {
  const startDayObj = moment(momentStartDay);

  let toDay;
  if (config.backtest) {
    toDay = startDayObj;
  } else {
    toDay = startDayObj.subtract(1, 'days');
  }

  if (toDay.day() === 6) {
    // Yesterday was Sunday, go back 2 days
    toDay.subtract(2, 'days');
  }

  toDay.set('hour', 16);
  toDay.set('minute', '00');
  toDay.set('second', 0);
  toDay.set('millisecond', 0);

  const toEpoch = toDay.unix();

  const fromDay = startDayObj.subtract(7, 'days');
  fromDay.set('hour', '09');
  fromDay.set('minute', 30);
  fromDay.set('second', 0);
  fromDay.set('millisecond', 0);

  const fromEpoch = fromDay.unix();

  return {
    fromEpoch,
    toEpoch,
  };
}

function generateTodaysEPOCHTimes() {
  const open = moment();
  const now = moment();

  open.set('hour', '09');
  open.set('minute', 30);
  open.set('second', 0);
  open.set('millisecond', 0);

  now.set('second', 0);
  now.set('millisecond', 0);

  const fromEpoch = open.unix();
  const toEpoch = now.unix();

  return {
    fromEpoch,
    toEpoch,
  };
}

async function isMarketOpen() {
  if (config.backtest) {
    if (
      backtestCurrentHour < 9
      || backtestCurrentHour >= 16
      || (backtestCurrentHour === 9 && backtestCurrentMinute < 30)
    ) {
      return false;
    }

    return true;
  }

  const format = 'hh:mm:ss';
  const now = moment();

  if (now.day() === 6 || now.day() === 0) {
    return false;
  }

  const beforeTime = moment('09:30:00', format);
  const afterTime = moment('16:00:00', format);

  if (now.isBetween(beforeTime, afterTime)) {
    return true;
  }

  return false;
}

async function adjustCurrentBacktestTime() {
  if (backtestCurrentMinute === 60) {
    backtestCurrentHour += 1;
    backtestCurrentMinute = 1;
  } else {
    backtestCurrentMinute += 1;
  }
}

function adjustCurrentDayForBacktesting(time) {
  // TODO MAKE AN ALTERED TIME AND RETURN THAT

  if (config.backtest) {
    if (time.day() === 0) {
      // Today is Sunday, go back 2 more days
      time.subtract(2, 'days');
    } else if (time.day() === 6) {
      // Today is Saturday, go back 1 more day
      time.subtract(1, 'days');
    }
  }

  return time;
}

function adjustCurrentTimeForBacktesting(time) {
  let alteredTime = null;

  if (config.backtest) {
    alteredTime = moment(adjustCurrentDayForBacktesting(time));

    alteredTime.set('hour', backtestCurrentHour);
    alteredTime.set('minute', backtestCurrentMinute);
    alteredTime.set('second', 0);
    alteredTime.set('millisecond', 0);
  }

  return alteredTime;
}

async function shouldEvaluateTicker() {
  const format = 'hh:mm:ss';
  let now = moment();

  let beforeTime = moment('09:30:00', format);
  let afterTime = moment('16:00:00', format);

  if (config.backtest) {
    now = adjustCurrentTimeForBacktesting(now);
    beforeTime = adjustCurrentDayForBacktesting(beforeTime);
    afterTime = adjustCurrentDayForBacktesting(afterTime);
  }

  const currentMin = now.minutes();
  if (now.isBetween(beforeTime, afterTime)) {
    const remainder = currentMin % config.candleInterval;
    if (remainder === 0) {
      await output.write(
        `Current Time: ${now.format('hh:mm:ss a')}. Can evaluate ticker.`,
      );
      return true;
    }
  }

  await output.write(
    `Current Time: ${now.format('hh:mm:ss a')}. Invalid transaction time.`,
  );
  return false;
}

function getTodaysCandles(candles) {
  const todaysCandles = [];

  for (const candle of candles) {
    const time = candle.t;

    if (config.backtest) {
      if (
        (time.date() === backtestCurrentDay
          && time.hour() === backtestCurrentHour
          && time.minute() < backtestCurrentMinute)
        || (time.date() === backtestCurrentDay
          && time.hour() < backtestCurrentHour)
      ) {
        todaysCandles.push(candle);
      }
    } else {
      const currentDay = moment().date();

      if (time.date() === currentDay) {
        todaysCandles.push(candle);
      }
    }
  }

  return todaysCandles;
}

async function getYesterdaysCandles(candles, level) {
  let yesterdaysCandles = [];

  let momentPreviousDay;
  if (config.backtest) {
    const momentStartDay = moment(
      `${config.backtestStartYear
      }-${
        config.backtestStartMonth
      }-${
        config.backtestStartDay}`,
    );

    momentPreviousDay = momentStartDay.subtract(1, 'days');
  } else {
    momentPreviousDay = moment().subtract(1, 'days');
  }

  if (momentPreviousDay.day() === 0) {
    // Today is Sunday, go back 2 more days
    momentPreviousDay.subtract(2, 'days');
  } else if (momentPreviousDay.day() === 6) {
    // Today is Saturday, go back 1 more day
    momentPreviousDay.subtract(1, 'days');
  } else {
    // Weekday
    if (level !== 0) {
      momentPreviousDay.subtract(level, 'days');
    }
  }

  const momentPreviousDayDate = momentPreviousDay.date();
  for (const candle of candles) {
    const time = candle.t;

    if (time.date() === momentPreviousDayDate) {
      yesterdaysCandles.push(candle);
    }
  }

  if (yesterdaysCandles.length === 0) {
    yesterdaysCandles = getYesterdaysCandles(candles, level + 1);
  }

  return yesterdaysCandles;
}

exports.initializeBacktestStartTime = initializeBacktestStartTime;
exports.adjustCurrentBacktestTime = adjustCurrentBacktestTime;
exports.generateTodaysEPOCHTimes = generateTodaysEPOCHTimes;
exports.generatePastWeekEPOCHTimes = generatePastWeekEPOCHTimes;
exports.isMarketOpen = isMarketOpen;
exports.shouldEvaluateTicker = shouldEvaluateTicker;
exports.getTodaysCandles = getTodaysCandles;
exports.getYesterdaysCandles = getYesterdaysCandles;
