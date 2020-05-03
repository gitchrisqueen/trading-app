/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const TradingLogic = require('./tradinglogic.js');


let tradingLogic = new TradingLogic();
/*
tradingLogic.setIncomeLevel(tradingLogic.getIncomeLevels().intraday);
(async () => {
    tradingLogic.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    await tradingLogic.init();
})();


tradingLogic = new TradingLogic();
tradingLogic.setIncomeLevel(tradingLogic.getIncomeLevels().hourly);
(async () => {
    tradingLogic.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    await tradingLogic.init();
})();
*/

tradingLogic = new TradingLogic();
tradingLogic.setIncomeLevel(tradingLogic.getIncomeLevels().daily);
(async () => {
    tradingLogic.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    await tradingLogic.init();
})();

/*

tradingLogic = new TradingLogic();
tradingLogic.setIncomeLevel(tradingLogic.getIncomeLevels().weekly);
(async () => {
    tradingLogic.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    await tradingLogic.init();
})();

tradingLogic = new TradingLogic();
tradingLogic.setIncomeLevel(tradingLogic.getIncomeLevels().monthly);
(async () => {
     tradingLogic.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    await tradingLogic.init();
})();

 */