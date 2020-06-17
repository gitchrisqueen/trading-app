/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const DBV2WS = require('deribit-v2-ws-gitchrisqueen'); //TODO: Shouldn't need this. Create and use mock for api module
const Deribit = require('../src/deribit');
const ut = require('../src/utils'); // TODO: Shouldnt need utils. Try to remove

const d = new Date();
d.setSeconds(0, 0);
const time = d.getTime(); // Take the seconds off the time

const key = '3hjn18oV';
const secret = '8q5CotqH3hZv-01-CM-X00kT2lNWdMbPcOfbx0xZ8b4';
const domain = 'test.deribit.com';
const debug = false;
const dbvws = new DBV2WS({key, secret, domain, debug});
const dbit = new Deribit(dbvws, debug);

//jest.setTimeout(10000); // 10 seconds

beforeAll(() => {
    //return dbit.init();
});

afterAll(() => {
    //return dbit.disconnect();
});


describe(`Asynchronous Functions`, () => {
    beforeAll(async () => {
        await dbit.init();
    });
    afterAll(() => {
        return dbit.disconnect();
    });
    describe.each([
        ['BTC-PERPETUAL', time - (1000 * 60 * 60), time - (1000 * 60 * 60), '1', true], // Same start and end time
        ['BTC-PERPETUAL', time - (1000 * 60 * 60), time - (1000 * 60 * 60) + (1000 * 60), '1', true], // 1 minute difference start and end time
        ['BTC-PERPETUAL', time - (1000 * 60 * 60), time - (1000 * 60 * 60) + (1000 * 60 * 15 * 3), '15', true], // 45 minutes apart. Allow for 3 bars
        ['BTC-PERPETUAL', time - (1000 * 60 * 60 * 24 * 7), time - (1000 * 60 * 60 * 24 * 7) + (1000 * 60 * 60 * 24 * 3), '1D', true], // 7 days ago to 4 days ago. Allow for 3 bars
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
        let divisor = resolutionInMinutes * 60 * 1000;
        //let divisor = ut.div_mod(resolutionInMilliSeconds, 10)[0];
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
                let promises = [];
                for (let r in results) {
                    let bar = results[r];
                    for (let p in properties) {
                        let np = new Promise(async (resolve, reject) => {
                            expect(bar).toHaveProperty(properties[p]);
                            resolve();
                        });
                        promises.push(np);
                    }
                }
                return await Promise.allSettled(promises);
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

describe(`Action Function Test`, () => {
});





