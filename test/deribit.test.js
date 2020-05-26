/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

//
const deribit = require('../src/deribit');
const utils = require('../src/utils');
const ut = new utils('true');
ut.setLogColor('#FFA500');
ut.setScriptName('Deribit.Test.js');

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
    });

    describe(`Asynchronous Functions`, () => {
        beforeAll(async () => {
            await dbit.init();
        });
        afterAll( () => {
            return dbit.disconnect();
        });
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
                test(`expects bar(s)`, async () => {
                    return expect(length).toBe(expectedBarCount);
                });
            } else {
                test(`expects 0 bar(s)`, async () => {
                    return expect(length).toBe(expectedBarCount);
                });
            }
        });
        describe(`Get Orders`, () => {
            let orders;
            test('getOpenOrders(BTC-PERPETUAL) expects equal array containing [jsonrpc,id,result] type', async () => {
                orders = await dbit.getOpenOrders('BTC-PERPETUAL');
                let expected = {
                    'jsonrpc': '2.0',
                    'id': expect.any(Number),
                    'result': expect.any(Array)
                };
                return expect(orders).toEqual(expect.objectContaining(expected));
            });
            test('getOpenStopOrders(BTC-PERPETUAL) expects equal array containing [jsonrpc,id,result] type', async () => {
                orders = await dbit.getOpenStopOrders('BTC-PERPETUAL');
                let expected = {
                    'jsonrpc': '2.0',
                    'id': expect.any(Number),
                    'result': expect.any(Array)
                };
                return expect(orders).toEqual(expect.objectContaining(expected));
            });
        });
        describe(`getInitialPosition(BTC-PERPETUAL)`, () => {
            test('expects array containing [leverage,size,floating_point_profit]', async () => {
                await dbit.getInitialPosition('BTC-PERPETUAL');
                let expected = {
                    'leverage': expect.any(Number),
                    'size': expect.any(Number),
                    'floating_profit_loss': expect.any(Number)
                };
                return expect(dbit.getPosition()).toEqual(expect.objectContaining(expected));
            });
        });
        describe(`getInstruments()`, () => {
            test('expects to have property BTC-PERPETUAL', async () => {
                await dbit.retrieveAPIInstruments();
                let expected = new Map();
                expected.set('BTC-PERPETUAL', expect.any(Array));
                return expect(dbit.getInstruments()).toEqual(expect.objectContaining(expected));
            });
        });
        describe(`getCurrentPriceStored(BTC-PERPETUAL)`, () => {
            test('expects to equal any number', async () => {
                return expect(dbit.getCurrentPriceStored('BTC-PERPETUAL')).toEqual(expect.any(Number));
            });
        });
        describe(`getCurrentPriceLive(BTC-PERPETUAL)`, () => {
            test('expects to equal any number', async () => {
                let cpl = await dbit.getCurrentPriceLive('BTC-PERPETUAL');
                return expect(cpl).toEqual(expect.any(Number));
            });
        });
    });
});

describe(`Retrieve Function Test`, () => {
});

describe(`Subscribe Function Test`, () => {
});

describe(`Action Function Test`, () => {
});





