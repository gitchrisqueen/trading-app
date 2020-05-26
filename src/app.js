/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const utils = require('../src/utils');
const appUtils = new utils(true);
appUtils.setLogColor('#800080');
appUtils.setScriptName('App.js');

const TradingLogic = require('./tradinglogic.js');

let tradingLogic = new TradingLogic();

let incomeLevel = (process.env.INCOMELEVEL) ? process.env.INCOMELEVEL : tradingLogic.getIncomeLevels().daily;

//console.log(`Income Level: ${process.env.INCOMELEVEL}`);
//process.exit(1);

tradingLogic.setIncomeLevel(incomeLevel);
(async () => {
    appUtils.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    await tradingLogic.init();
})();
