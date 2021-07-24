# stonk-o-trader
Algorithmic Stock Trading Simulation. Enhancing with live trading via Puppeteer soon. Testing underway.

## Overview
This application is a continuation of a project that I began in 2012 (also published on GitHub). The main objective is to allow traders to easily paper trade different strategies with real market data, free of charge. After a strategy is thoroughly backtested and proven to be profitable, the trader can simply flip a switch and allow the strategy to trade with a live account.

## Usage
1. This is a NodeJS based application, so installing NodeJS on your system is required. Go to https://nodejs.org/en/download/ and download the latest version. Note that this will also install the Node Package Manager (npm). I have been using version node version 14.11.0 and npm version 6.14.8 during development.
2. After NodeJS is installed, open up the stonk-o-trader directory in whichever cli you prefer (command prompt, powershell, terminal, etc).
3. Run the command "npm install" to install the application's dependencies.
4. Go over to finnhub.io and sign up for a free API key. Please note the free tier request limitations.
5. In the stonk-o-trader directory, create a new file named ".env" and enter your Finnhub API key. Use the ".env-sample" file as an example.
6. In the stonk-o-trader src directory, modify the "config.js" file with the configurations that you want to execute with. Configuration explanations to follow.
7. Update the watchlist.json file for the tickers that you would like to run against. See the Data section for an explanation of how many tickers can be traded at once.
8. In the previously opened cli, run the "npm start" command. 
9. The application will created a folder called "results" in the same directory. It will then created a file with the current date and all output will be displayed on the cli as well as in the text file. Warning: the text files can grow depending on how many tickers and the strategy.  

## Configuration
  - backtest: If the strategy is being backtested. If false, will go to Finnhub on the specified candle interval and grab live data with the current time. If true, will use the rest of the backtesting configurations to determine what data should be pulled.
  - backtestStartYear: The current year. Current backtesting capability doesn't interate over multiple years.
  - backtestStartMonth: The current month. Current backtesting capability doesn't interate over multiple months.
  - backtestStartDay: The current day. Current backtesting capability doesn't interate over multiple days.
  - backtestStartHour: The hour to start backtesting at. Useful for testing how a strategy will behave at a specific time. Format is 24-hour time.
  - backtestStartMin: The min to start backtesting at. Useful for testing how a strategy will behave at a specific time.
  - candleInterval: The candle interval to retrieve data in. Currently, this needs to be in line with what Finnhub supports, haven't tested more than 1 and 5 min intervals.
  - maxLoss: The maximum loss per trade that the strategy is willing to risk. Not all strategies will use this. Probably should though : )
  - stopLossPercent: The percent under a significant level that will be used in Stop Loss Calculations.
  - availableFunds: The amount of money the application has to trade.
  - maxDailyLossAmount: The maximum number of money the application can lose before terminating for the day. Must be a negative number.
  - token: The Finnhub API key, is always passed in through the .env file.
  - exposeStrategy: If the application should output any strategy specific information to the console and the result text file. Either true or false.
  - printTradeLog: If the application should print out all of the trades made for a given day on each evaluation cycle. Either true or false.

## Data
At a glance, the free-tier of finnhub allows for a maximum of 60 requests/min to the APIs. This application executions 1 request/ticker to get the past week's data in order to calculate intraday technical indicators accurately. It then makes 1 request/ticker every candle interval (1/5 min) and an additional 1 request/ticker if running live to update unrealized information for current positions. Furthermore, Finnhub states that the free tier is for personal use only.

Feel free to add your own data source. The only requirement is that the data should be in the same format as what the rest of the application expects. See the finnhub.js file as an example.

## Strategy
I've included a single example.js file under the strategies directory. That is meant to be an EXAMPLE as to how custom strategies can be implemented with technical indicators and conditions. Feel free to add your own and change the "const strategy = require('../strategy/example');" line in the runner.js file under the driver directory to point to a different strategy.

## **DISCLAIMER**
**I AM NOT A FINANCIAL ADVISOR. DO NOT TAKE ANYTHING ON THIS REPOSITORY AS FINANCIAL ADVISE!**

## TODO 
1. Continue testing live trading & publish
2. Add logic to sell all positions when daily max loss is hit
3. Persit portfolio in case script dies, h2 database or local mysql/mongodb?
4. Add short selling logic (Sell Short, Buy to Cover trade options), will need to alter stoploss method logic or create new one
5. Add scaling out of position logic
6. See if certain sleep logic can be removed, no need to throttle?
7. Add Crypto support & switch
8. Buy a low latency API
