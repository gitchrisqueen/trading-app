/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */
//require = require("esm")(module /*, options*/); // Needed for the ES6 style for @gitchrisqueen/tdameritrade-api-js-client
const utils = require('./utils');
const DBV2WS = require('deribit-v2-ws-gitchrisqueen');
const Deribit = require('./deribit.js');
const TradingLogic = require('./tradinglogic.js');

// Add a parameter to determine the logic to start
const logicType = process.argv[2] || process.env.LOGIC_TYPE || 'none';

// Environment Variables
const {deribit_api_url, deribit_api_key, deribit_api_secret, port, host} = require('../config');

const debug = true;

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
        let tradingLogic = new TradingLogic(deribitApi, debug);
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

    /*
    // Start TradingLogic
    let tradingLogic = new TradingLogic(udf, debug);
    let incomeLevel = (process.env.INCOMELEVEL) ? process.env.INCOMELEVEL : tradingLogic.getIncomeLevels().daily;
    tradingLogic.setIncomeLevel(incomeLevel);


    (async () => {
        utils.log(`Starting ${tradingLogic.getIncomeLevel()} Trading`);
        //await tradingLogic.init();
        return tradingLogic.init();
    })();




// TODO: Return Queued orders as json for tradingview chart to draw
    let orders = tradingLogic.getQueuedOrders();
    const orderEntriesArray = Object.fromEntries(orders.entries());
    app.use('/orders', JSON.stringify(orderEntriesArray));



     */

// TODO: Return orders a json for tradingview chart to draw
// TODO: Return position for tradingview chart to draw
// TODO: Return zones as json to be charted (including fresh zones)

}

const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

const morgan = require('morgan');
app.use(morgan('tiny'));

const fs = require('fs');
const path = require('path');
const marked = require('marked');

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
    //res.set('Content-Type', 'text/plain').send('Welcome to the Trading App.');
    // Return the TradingStragegyDoc.md as html
    const readmePath = path.join(__dirname, '../wiki//TradingStrategyDoc.md');
    fs.readFile(readmePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading TradingStrategyDoc.md file');
            return;
        }
        const htmlContent = marked.parse(data);

        const fullHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>README</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              pre {
                background-color: #f4f4f4;
                padding: 10px;
                border-radius: 5px;
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
          </html>
        `;

        // Send the HTML response
        res.setHeader('Content-Type', 'text/html');
        res.send(fullHtml);
    });
})

// Wiki Images endpoint to serve all the images in the wiki
app.use('/images', express.static(path.join(__dirname, '../wiki/images')));

// Tradingview Directory
app.use('/tradingview', express.static(__dirname + '/tradingview'));
app.use('/src', express.static(__dirname));

// Start desired Logic and set UDF paths - Use params sent to app.js to determine which logic to start
if (logicType === 'deribit') {
    startDeribitLogic(app);
} else if (logicType === 'tda') {
    startTDALogic(app);
} else if (logicType === 'none') {
    console.log('Not starting any trading logic');
} else {
    console.error('Invalid logic type specified. Use "deribit" or "tda".');
}

// Handle errors
app.use((err, req, res, next) => {
    if (err instanceof query.Error) {
        return res.status(err.status).send({
            s: 'error',
            errmsg: err.message
        })
    }

    console.error('Error: Not Found');
    console.error('Details:', {
        status: err.status,
        message: err.message,
        url: err.response.req.url
    });

    res.status(500).send({
        s: 'error',
        errmsg: 'Internal Error: ' + err.message
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
