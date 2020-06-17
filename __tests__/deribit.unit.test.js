/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

jest.mock('deribit-v2-ws-gitchrisqueen');
const Connection = require('deribit-v2-ws-gitchrisqueen');
const Deribit = require('../src/deribit');

let dbit, mc, debug = false;
//mc = new Connection();
//console.log(mc);
//dbit = new Deribit(mc, debug);

beforeAll(() => {
    mc = new Connection();
    //console.log(mc);
    dbit = new Deribit(mc, debug);
});

afterAll(() => {
    //return dbit.disconnect();
});

describe('constructor() tests', () => {

    test('expects to have property _deribitApi', () => {
        expect(dbit).toHaveProperty('_deribitApi');
        expect(dbit._deribitApi).toEqual(mc);
    });

    test('expects to have property _debug', () => {
        expect(dbit).toHaveProperty('_debug');
        expect(dbit._debug).toEqual(debug);
    });


    test('expects to have property defaultPosition', () => {
        expect(dbit).toHaveProperty('defaultPosition');
        expect(dbit).toHaveProperty('defaultPosition.leverage', 1);
        expect(dbit).toHaveProperty('defaultPosition.size', 0);
        expect(dbit).toHaveProperty('defaultPosition.floating_profit_loss', 0);
        expect(dbit.getOrderTypes()).toBe(dbit.orderTypes);
    });

    test('expects to have property instruments', () => {
        expect(dbit).toHaveProperty('instruments');
    });

    test('expects to have property currentPriceMap', () => {
        expect(dbit).toHaveProperty('currentPriceMap');
    });

    test('expects to have property portfolio', () => {
        expect(dbit).toHaveProperty('portfolio');
        expect(dbit).toHaveProperty('portfolio.equity');
        expect(dbit).toHaveProperty('portfolio.balance');

    });

    test('expects to have property orderTypes', () => {
        expect(dbit).toHaveProperty('orderTypes');
        expect(dbit).toHaveProperty('orderTypes.buylimit', 'buy_limit');
        expect(dbit).toHaveProperty('orderTypes.buystopmarket', 'buy_stop_market');
        expect(dbit).toHaveProperty('orderTypes.selllimit', 'sell_limit');
        expect(dbit).toHaveProperty('orderTypes.sellstopmarket', 'sell_stop_market');
    });
})

describe(`Set Functions Test`, () => {
    let instrument = 'my_test_instrument';
    let price = 123456789;
    test(`setCurrentPriceStored(${instrument},${price}) expects currentPriceMap to have property ${instrument}`, () => {
        dbit.setCurrentPriceStored(instrument, price);
        expect(dbit.currentPriceMap.has(instrument)).toEqual(true);
        expect(dbit.currentPriceMap.get(instrument)).toEqual(price);
    });
});

describe(`Get Functions Test`, () => {

    describe(`getOrderTypes()`, () => {
        test('expects to be orderTypes', () => {
            expect(dbit.getOrderTypes()).toBe(dbit.orderTypes);
        });
        test('expects to have property buylimit=buy_limit', () => {
            expect(dbit.getOrderTypes()).toHaveProperty('buylimit', 'buy_limit');
        });
        test('expects to have property buystopmarket=buy_stop_market', () => {
            expect(dbit.getOrderTypes()).toHaveProperty('buystopmarket', 'buy_stop_market');
        });
        test('expects to have property selllimit=sell_limit', () => {
            expect(dbit.getOrderTypes()).toHaveProperty('selllimit', 'sell_limit');
        });
        test('expects to have property sellstopmarket=sell_stop_market', () => {
            expect(dbit.getOrderTypes()).toHaveProperty('sellstopmarket', 'sell_stop_market');
        });
    });
    describe(`Get Portfolio Functions`, () => {

        describe(`getPortfolioEquityBTC()`, () => {

            test('expects to be portfolio.equity', () => {
                expect(dbit.getPortfolioEquityBTC()).toBe(dbit.portfolio.equity);
            });
            test('expects to be a number', () => {
                expect(dbit.getPortfolioEquityBTC()).not.toBeNaN();

            });
        });

        describe(`getPortfolioTotalPLBTC()`, () => {
            test('expects to be portfolio.equity', () => {
                expect(dbit.getPortfolioTotalPLBTC()).toBe(dbit.portfolio.total_pl);
            });
            test('expects to be a number', () => {
                expect(dbit.getPortfolioTotalPLBTC()).not.toBeNaN();
            });
            test('expects to equal portfolio.total_pl + portfolio.equity', () => {
                //TODO: This is not a good test find something better
                let total = dbit.portfolio.total_pl + dbit.portfolio.equity;
                expect(dbit.getPortfolioTotalPLBTC()).toBe(total);
            });
        });
    });

    describe(`getAccountTotalBTC()`, () => {
        test('expects not to be NaN', () => {
            expect(dbit.getAccountTotalBTC()).not.toBeNaN();
        });
    });
    describe(`getPosition()`, () => {
        test('expects to be position property', () => {
            expect(dbit.getPosition()).toBe(dbit.position);
        });
        test('expects to contain leverage,size,floating_profit_loss properties', () => {
            let expected = {
                'leverage': expect.any(Number),
                'size': expect.any(Number),
                'floating_profit_loss': expect.any(Number)
            };
            expect(dbit.getPosition()).toEqual(expect.objectContaining(expected));
        });
    });
    describe(`getInstruments()`, () => {
        test('expects to have return Map object', async () => {
            let expected = new Map();
            //expected.set('BTC-PERPETUAL', expect.any(Array));
            return expect(dbit.getInstruments()).toEqual(expect.objectContaining(expected));
        });
    });
    describe(`getCurrentPriceStored(BTC-PERPETUAL)`, () => {
        test('expects to equal any number', async () => {
            return expect(dbit.getCurrentPriceStored('BTC-PERPETUAL')).toEqual(expect.any(Number));
        });
    });

    describe(`Asynchronous Functions`, () => {

        let instrument = 'test_instrument';
        let type = 'test_type';

        describe.each([
            // Arrange
            ['test-Instrument1', 1234, 5678, '1'],
            ['test-Instrument2', 1234, 5678, '1D'],
            ['test-Instrument3', 5678, 1234, '1'],
            // TODO: A time where stop less than start ???
        ])(`getBars(%s,%i,%i,%s)`, (inst, start, stop, resolution) => {
            let orders;
            test(`expects to call _deribitApi.get_tradingview_chart_data(${inst},${start},${stop},${resolution},)`, () => {
                // Act
                dbit.getBars(inst, start, stop, resolution);
                // Assert
                expect(mc.get_tradingview_chart_data).toHaveBeenCalledWith(inst, start, stop, resolution);
            });

        });


        describe(`Get Orders`, () => {
            let expected = {
                'jsonrpc': '2.0',
                'id': expect.any(Number),
                'result': expect.any(Array)
            };

            let orders;

            test(`getOpenOrders(${instrument}) expects call to _deribitApi.get_open_orders_by_instrument(${instrument},${type})`, () => {
                orders = dbit.getOpenOrders(instrument, type);
                expect(mc.get_open_orders_by_instrument).toHaveBeenCalledWith(instrument, type);
            });
            test(`getOpenStopOrders(${instrument}) expects call to _deribitApi.get_open_orders_by_instrument(${instrument},stop_all)`, () => {
                orders = dbit.getOpenStopOrders(instrument);
                expect(mc.get_open_orders_by_instrument).toHaveBeenCalledWith(instrument, 'stop_all');
            });
        });
        describe(`getInitialPosition(${instrument})`, () => {
            test(`expects call to _deribitAPI.getPosition(${instrument})`, () => {
                dbit.getInitialPosition(instrument);
                expect(mc.getPosition).toHaveBeenCalledWith(instrument);
            });
        });
        describe(`getCurrentPriceLive(${instrument})`, () => {
            test(`expects call to _deribitApi.get_ticker(${instrument})`, () => {
                let cpl = dbit.getCurrentPriceLive(instrument);
                expect(mc.get_ticker).toHaveBeenCalledWith(instrument);
            });
        });
    });
});

describe(`Retrieve Function Test`, () => {
});


describe(`Action Function Test`, () => {

    //setupPositionSubscriptions
    const instrument = 'test_instrument';
    const channel1 = 'user.changes.' + instrument + '.100ms';
    const channel2 = 'ticker.' + instrument + '.100ms';
    describe(`setupPositionSubscriptions(${instrument})`, () => {


        test(`expects call to _deribitApi.getPosition(${instrument})`, async () => {
            expect.assertions(1);
            await dbit.setupPositionSubscriptions(instrument);
            expect(mc.getPosition).toHaveBeenCalledWith(instrument);

            //expect(mc.getPosition).toHaveBeenNthCalledWith(1, instrument);

        });

        test(`expects _deribitApi.subscribe is mock function`, () => {
            expect.assertions(1);
            expect(jest.isMockFunction(mc.subscribe)).toBe(true);
        });

        test(`expects call to _deribitApi.subscribe('private',${channel1})`, async () => {
            expect.assertions(1);
            await dbit.setupPositionSubscriptions(instrument);
            expect(mc.subscribe).toHaveBeenCalledWith('private', channel1);

            //expect(mc.subscribe).toHaveBeenNthCalledWith(2, 'private', channel1);

        });
        test(`expects call to _deribitApi.subscribe('private',${channel2})`, () => {
            expect.assertions(1);
            return dbit.setupPositionSubscriptions(instrument).then(() => {
                expect(mc.subscribe).toHaveBeenCalledWith('private', channel2);
            });
            //expect(mc.subscribe).toHaveBeenNthCalledWith(3, 'private', channel2);

        });
    });


});





