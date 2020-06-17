/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const utils = require('./utils');
const DBV2WS = require('deribit-v2-ws-gitchrisqueen');
const Deribit = require('./deribit.js');
const TradingLogic = require('./tradinglogic.js');

// Environment Variables
const {deribit_api_url, deribit_api_key, deribit_api_secret, port} = require('../config');

const debug = true;
let tradingLogic = false;

if (deribit_api_url && deribit_api_key && deribit_api_secret) {
    utils.log('App.js', 'Connecting to API', false, '#800080', 23);
    let dbvws = new DBV2WS({key: deribit_api_key, secret: deribit_api_secret, domain: deribit_api_url, debug: debug});
    let deribitApi = new Deribit(dbvws, debug);
    tradingLogic = new TradingLogic(deribitApi, debug);
    let incomeLevel = (process.env.INCOMELEVEL) ? process.env.INCOMELEVEL : tradingLogic.getIncomeLevels().daily;
    tradingLogic.setIncomeLevel(incomeLevel);


// TODO: Return Queued orders as json for tradingview chart to draw
// TODO: Return orders a json for tradingview chart to draw
// TODO: Return position for tradingview chart to draw
// TODO: Return zones as json to be charted (including fresh zones)

} else {
    utils.log(`Cannot connect to Deribit. Missing Credentials: deribit_api_key=${deribit_api_key} | deribit_api_secret=${deribit_api_secret} | deribit_api_url=${deribit_api_url}`);
    //process.exit(1);
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

// UDF Directory
let deribitUDFAPP = require('./udf/deribit/index');
app.use('/udf/deribit', deribitUDFAPP);


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
const HOST = process.env.HOST || '0.0.0.0';
const PORT = port || 80;
app.listen(PORT, () => {
    console.log(`Running on http://${HOST}:${PORT}`);
})

// TODO: delete line below
if (false) {
    // TODO: uncomment line below
//if (tradingLogic !== false) {
// Start TradingLogic
    //(async () => {
    utils.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
    //await tradingLogic.init();
    return tradingLogic.init();
    //})();
}

