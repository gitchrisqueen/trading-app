/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const TradingLogic = require('./tradinglogic.js');


let tradingLogic = new TradingLogic();

let incomeLevel = (process.env.INCOMELEVEL) ? process.env.INCOMELEVEL : tradingLogic.getIncomeLevels().daily;

//console.log(`Income Level: ${process.env.INCOMELEVEL}`);
//process.exit(1);

tradingLogic.setIncomeLevel(incomeLevel);
(async () => {
    tradingLogic.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    await tradingLogic.init();
})();
