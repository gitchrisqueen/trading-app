/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

//
const deribit = require('../src/deribit');
const ut = require('../src/utils');
let dbit;
const time = Date.now();
const key = '3hjn18oV';
const secret = '7Cc7CuVeN3QibJtRHA-w_GAzMnqWm-8PddsicaS3vlw';
const domain = 'test.deribit.com';
process.env.KEY = key;
process.env.SECRET = secret;
process.env.DOMAIN = domain;
dbit = new deribit();

//jest.setTimeout(10000); // 10 seconds

beforeAll(() => {
    //return dbit.init();
});

afterAll(() => {
    //return dbit.disconnect();
});

describe('constructor() tests', () => {
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

describe(`Get Functions Test`, () => {

    test('getOrderTypes() expects to be getOrderTypes', () => {
        expect(dbit.getOrderTypes()).toBe(dbit.orderTypes);
    });
    test('getOrderTypes() expects to have property buylimit=buy_limit', () => {
        expect(dbit.getOrderTypes()).toHaveProperty('buylimit', 'buy_limit');
    });
    test('getOrderTypes() expects to have property buystopmarket=buy_stop_market', () => {
        expect(dbit.getOrderTypes()).toHaveProperty('buystopmarket', 'buy_stop_market');
    });
    test('getOrderTypes() expects to have property selllimit=sell_limit', () => {
        expect(dbit.getOrderTypes()).toHaveProperty('selllimit', 'sell_limit');
    });
    test('getOrderTypes() expects to have property sellstopmarket=sell_stop_market', () => {
        expect(dbit.getOrderTypes()).toHaveProperty('sellstopmarket', 'sell_stop_market');
    });
    test('getPortfolioEquityBTC() expects to be portfolio.equity', () => {
        expect(dbit.getPortfolioEquityBTC()).toBe(dbit.portfolio.equity);
    });
    test('getPortfolioEquityBTC() expects not to be NaN', () => {
        expect(dbit.getPortfolioEquityBTC()).not.toBeNaN();
    });
    test('getPortfolioTotalPLBTC() expects to be portfolio.equity', () => {
        expect(dbit.getPortfolioTotalPLBTC()).toBe(dbit.portfolio.total_pl);
    });
    test('getPortfolioTotalPLBTC() expects not to be NaN', () => {
        expect(dbit.getPortfolioTotalPLBTC()).not.toBeNaN();
    });
    test('getPortfolioTotalPLBTC() expects to be portfolio.equity', () => {
        //TODO: This is not a good test find something better
        let total = dbit.portfolio.total_pl + dbit.portfolio.equity;
        expect(dbit.getPortfolioTotalPLBTC()).toBe(total);
    });
    test('getAccountTotalBTC() expects not to be NaN', () => {
        expect(dbit.getAccountTotalBTC()).not.toBeNaN();
    });

    describe(`Asynchronous Functions`, () => {

        describe.each([
            ['BTC-PERPETUAL', time - (1000 * 60 * 60), time - (1000 * 60 * 60), '1', true],
            ['BTC-PERPETUAL', time - (1000 * 60 * 60), time - (1000 * 60 * 60) + (1000 * 60), '1', true],
            ['BTC-PERPETUAL', time - (1000 * 60 * 60), time - (1000 * 60 * 60) + (1000 * 60 * 15 * 3), '15', true],
            ['BTC-PERPETUAL', time - (1000 * 60 * 60 * 24 * 7), time - (1000 * 60 * 60 * 24 * 7) + (1000 * 60 * 60 * 24 * 3), '1D', true],
            ['BTC-PERPETUAL', time + (1000 * 60 * 60), time + (1000 * 60 * 60), '1', false], // Time an hour in the future
            ['BTC-PERPETUAL', 1167609600000, 1167609600000, '1', false] // Time (1/1/2007) before bitcoin was even created (~2008)
            // TODO: A time where stop less than start ???
        ])(`getBars(%s,%i,%i,%s)`, (inst, start, stop, resolution, expectsBars) => {

            // Expect the first bar time to equal the start time
            // Expect the last bar time to equal the last time
            // Expect the returned array length to equal the expectedBarCount
            // Expect the returned bars to have properties (high,low,open,close,time)


            let results, length, firstBar, lastBar, firstBarTime, lastBarTime, expectedBarCount = 0;
            let properties = ['high', 'low', 'open', 'close', 'time'];
            let resolutionInMinutes = ut.getTimeFrameInMinutes(resolution);
            let resolutionInMilliSeconds = resolutionInMinutes * 60 * 1000;
            //let divisor = ut.div_mod(resolutionInMilliSeconds, 10)[0];
            let divisor = resolutionInMilliSeconds

            beforeAll(async () => {
                await dbit.init();
                results = await dbit.getBars(inst, start, stop, resolution);
                length = results.length;
                firstBar = results[0];
                lastBar = results[length - 1];
                firstBarTime = (firstBar && firstBar.time) ? firstBar.time : start;
                lastBarTime = (lastBar && lastBar.time) ? lastBar.time : stop;
                firstBarTime = Math.floor(firstBarTime / divisor);
                lastBarTime = Math.floor(lastBarTime / divisor);
                if (expectsBars) {
                    // Determine how many Bars we should get
                    let diff = Math.abs(start - stop);
                    let mod = ut.div_mod(diff, divisor);
                    expectedBarCount = (mod[0] > 0) ? mod[0] + 1 : 0;
                }
                start = Math.floor(start / divisor);
                return stop = Math.floor(stop / divisor);
            });

            afterAll(async () => {
                return await dbit.disconnect();
            });

            test(`expects results to have property length`, async () => {
                return expect(results).toHaveProperty('length');
            });


            if (expectsBars) {
                test(`expects bar to have properties: ${JSON.stringify(properties)}`, async () => {
                    for (let r in results) {
                        let bar = results[r];
                        for (let p in properties) {
                            return expect(bar).toHaveProperty(properties[p]);
                        }
                    }
                });

                test(`expects first bar time to be close to ${start}`, async () => {
                    return expect(firstBarTime / (divisor)).toBeCloseTo(start / (divisor), 0);
                });
                test(`expects last bar time to close to ${stop}`, async () => {
                    return expect(lastBarTime).toBeCloseTo(stop, 0);
                });
                test(`expects bar(s)`, async() => {
                    return expect(length).toBe(expectedBarCount);
                });
            } else {
                test(`expects 0 bar(s)`, async () => {
                    return expect(length).toBe(expectedBarCount);
                });
            }

        });
    });
});

describe(`Retrieve Function Test`, () => {
});

describe(`Subscribe Function Test`, () => {
});

describe(`Action Function Test`, () => {
});





