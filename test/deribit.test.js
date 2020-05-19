/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

//
const deribit = require('../src/deribit');
let dbit;


const key = '3hjn18oV';
const secret = '7Cc7CuVeN3QibJtRHA-w_GAzMnqWm-8PddsicaS3vlw';
const domain = 'test.deribit.com';

beforeAll(() => {
    process.env.KEY = key;
    process.env.SECRET = secret;
    process.env.DOMAIN = domain;
    dbit = new deribit();
});

afterAll(() => {
    return true;
});

test('constructor() expects to have property defaultPosition', () => {
    expect(dbit).toHaveProperty('defaultPosition');
    expect(dbit).toHaveProperty('defaultPosition.leverage',1);
    expect(dbit).toHaveProperty('defaultPosition.size',0);
    expect(dbit).toHaveProperty('defaultPosition.floating_profit_loss',0);
    expect(dbit.getOrderTypes()).toBe(dbit.orderTypes);
});

test('constructor() expects to have property instruments', () => {
    expect(dbit).toHaveProperty('instruments');
});

test('constructor() expects to have property currentPriceMap', () => {
    expect(dbit).toHaveProperty('currentPriceMap');
});

test('constructor() expects to have property portfolio', () => {
    expect(dbit).toHaveProperty('portfolio');
    expect(dbit).toHaveProperty('portfolio.equity');
    expect(dbit).toHaveProperty('portfolio.balance');

});


test('constructor() expects to have property orderTypes', () => {
    expect(dbit).toHaveProperty('orderTypes');
    expect(dbit).toHaveProperty('orderTypes.buylimit','buy_limit');
    expect(dbit).toHaveProperty('orderTypes.buystopmarket','buy_stop_market');
    expect(dbit).toHaveProperty('orderTypes.selllimit','sell_limit');
    expect(dbit).toHaveProperty('orderTypes.sellstopmarket','sell_stop_market');
});

test('getOrderTypes() expects to be getOrderTypes', () => {
    expect(dbit.getOrderTypes()).toBe(dbit.orderTypes);
});


