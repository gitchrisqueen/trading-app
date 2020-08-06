/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */
//require = require("esm")(module /*, options*/); // Needed for the ES6 style for @gitchrisqueen/tdameritrade-api-js-client
const utils = require('./utils');
const DBV2WS = require('deribit-v2-ws-gitchrisqueen');
const Deribit = require('./deribit.js');
const TradingLogic = require('./tradinglogic.js');

// Environment Variables
const {deribit_api_url, deribit_api_key, deribit_api_secret, port, host} = require('../config');

const debug = true;
let tradingLogic = false;

function startDeribitLogic(app) {
    // UDF Directory
    const {udfapp, udf} = require('./udf/deribit/index');
    app.use('/udf', udfapp);


    if (deribit_api_url && deribit_api_key && deribit_api_secret) {
        utils.log('App.js', 'Connecting to API', false, '#800080', 23);
        let dbvws = new DBV2WS({
            key: deribit_api_key,
            secret: deribit_api_secret,
            domain: deribit_api_url,
            debug: debug
        });
        let deribitApi = new Deribit(dbvws, debug);
        tradingLogic = new TradingLogic(deribitApi, debug);
        let incomeLevel = (process.env.INCOMELEVEL) ? process.env.INCOMELEVEL : tradingLogic.getIncomeLevels().daily;
        tradingLogic.setIncomeLevel(incomeLevel);

        // Start TradingLogic
        (async () => {
            utils.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
            //await tradingLogic.init();
            return tradingLogic.init();
        })();


// TODO: Return Queued orders as json for tradingview chart to draw
// TODO: Return orders a json for tradingview chart to draw
// TODO: Return position for tradingview chart to draw
// TODO: Return zones as json to be charted (including fresh zones)

    } else {
        utils.log(`Cannot connect to Deribit. Missing Credentials: deribit_api_key=${deribit_api_key} | deribit_api_secret=${deribit_api_secret} | deribit_api_url=${deribit_api_url}`);
        //process.exit(1);
    }
}


function startTDALogic(app) {
    // UDF Directory
    const {udfapp, udf} = require('./udf/tdameritrade/index');
    app.use('/udf', udfapp);

}

const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

const morgan = require('morgan');
app.use(morgan('tiny'));

// Common
const query = require('./query');

function handlePromise(res, next, promise) {
    promise.then(result => {
        res.send(result);
    }).catch(err => {
        next(err);
    })
}

// Endpoints
app.all('/', (req, res) => {
    res.set('Content-Type', 'text/plain').send('Welcome to the Trading App.');
    //TODO: Return the index.html file instead
})

// Tradingview Directory
app.use('/tradingview', express.static(__dirname + '/tradingview'));
app.use('/src', express.static(__dirname));

// Start desired Logic and set UDF paths
//startDeribitLogic(app);
startTDALogic(app);

// Handle errors
app.use((err, req, res, next) => {
    if (err instanceof query.Error) {
        return res.status(err.status).send({
            s: 'error',
            errmsg: err.message
        })
    }

    console.error(err)
    res.status(500).send({
        s: 'error',
        errmsg: 'Internal Error'
    })
})

// Listen
const HOST = host || '0.0.0.0';
const PORT = port || 80;
app.listen(PORT, () => {
    console.log(`Running on http://${HOST}:${PORT}`);
    console.log(`TradingView Chart - http://${HOST}:${PORT}/tradingview`);
    console.log(`UDF Config - http://${HOST}:${PORT}/udf/config`);
    console.log(`UDF Time - http://${HOST}:${PORT}/udf/time`);
    console.log(`UDF Symbol Info - http://${HOST}:${PORT}/udf/symbol_info`);
    console.log(`UDF Symbols - http://${HOST}:${PORT}/udf/symbols?symbol=/NGU20:XCME`);
    console.log(`UDF Search - http://${HOST}:${PORT}/udf/search?type=FUTURE&exchange=XCME&query=ES&limit=100`);
    console.log(`UDF History - http://${HOST}:${PORT}/udf/history?symbol=/NGU20&resolution=1D&from=1403265600000&to=1403294400000`);

})
