/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */
const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

const morgan = require('morgan');
app.use(morgan('tiny'));

// Common
const query = require('../../query');

function handlePromise(res, next, promise) {
    promise.then(result => {
        res.send(result);
    }).catch(err => {
        next(err);
    })
}

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

// UDF Required Functions
const UDF = require('./tdameritradeudf')
const udf = new UDF();

app.get('/time', (req, res) => {
    //TODO: Get time from data provider server ???
    const time = Math.floor(Date.now() / 1000)  // In seconds
    res.set('Content-Type', 'text/plain').send(time.toString())
})

app.get('/config', (req, res, next) => {
    handlePromise(res, next, udf.config())
})

app.get('/symbol_info', (req, res, next) => {
    handlePromise(res, next, udf.symbolInfo())
})

app.get('/symbols', [query.symbol], (req, res, next) => {
    handlePromise(res, next, udf.symbol(req.query.symbol))
})

app.get('/search', [query.query, query.limit], (req, res, next) => {
    if (req.query.type === '') {
        req.query.type = null
    }
    if (req.query.exchange === '') {
        req.query.exchange = null
    }

    handlePromise(res, next, udf.search(
        req.query.query,
        req.query.type,
        req.query.exchange,
        req.query.limit
    ))
})

app.get('/history', [
    query.symbol,
    query.from,
    query.to,
    query.resolution
], (req, res, next) => {
    handlePromise(res, next, udf.history(
        req.query.symbol,
        req.query.from,
        req.query.to,
        req.query.resolution
    ))
})

module.exports = {udfapp: app, udf: udf};
