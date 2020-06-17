/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */
// will import this named export into your test file:
//'use strict';

const Connection = jest.createMockFromModule('deribit-v2-ws-gitchrisqueen');

Connection.get_tradingview_chart_data = jest.fn().mockImplementation((a, b, c, d) => {
    return [];
}).mockName('Connection.get_tradingview_chart_data');

Connection.get_open_orders_by_instrument = jest.fn().mockImplementation((a, b) => {
    return [];
}).mockName('Connection.get_open_orders_by_instrument');

Connection.getPosition = jest.fn().mockImplementation((a) => {
    return new Promise(r => {
        r([]);
    });
}).mockName('Connection.getPosition');

Connection.get_ticker = jest.fn().mockImplementation((a) => {
    return [];
}).mockName('Connection.get_ticker');

Connection.subscribe = jest.fn().mockImplementation((a, b) => {
    return new Promise(r => {
        r('done');
    });
    // done
}).mockName('Connection.subscribe');

Connection.on = jest.fn().mockImplementation((a, b) => {
    return new Promise(r => {
        r('done');
    });
    // done
}).mockName('Connection.on');


module.exports = Connection;
