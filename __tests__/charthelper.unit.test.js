/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */


const cs = require('./chartsetup');
const charthelper = require('../src/charthelper');
const ch = new charthelper();

describe('Bar Tests', () => {

    beforeAll(() => {
        //console.log("Bar 1 => " + JSON.stringify(cs.bar1));
        //console.log("Bar 2 => " + JSON.stringify(cs.bar2));
        //console.log("Bar 3 => " + JSON.stringify(cs.bar3));
        //console.log("Bar Boring => " + JSON.stringify(cs.barBoring));
        //console.log("Bar Exciting => " + JSON.stringify(cs.barExciting));
    })

    describe('getBarBody()', () => {
        for (let bar in cs.zone.values()) {
            test('(' + JSON.stringify(bar) + ') expects 1', () => {
                expect(ch.getBarBody(bar)).toBe(1);

            });
        }

    });

    describe('getBarRange()', () => {
        for (let bar in cs.zone.values()) {
            test('(' + JSON.stringify(bar) + ') expects 3', () => {
                expect(ch.getBarRange(bar)).toBe(3);
            });
        }

    });


    describe('isBoringBar()', () => {
        test('(barBoring) expects true', () => {
            expect(ch.isBoringBar(cs.barBoring)).toBe(true);
        });
        test('(barExciting) expects false', () => {
            expect(ch.isBoringBar(cs.barExciting)).toBe(false);
        });
    });

    describe('isExcitingBar()', () => {
        test('(barBoring) expects false', () => {
            expect(ch.isExcitingBar(cs.barBoring)).toBe(false);
        });
        test('(barExciting) expects true', () => {
            expect(ch.isExcitingBar(cs.barExciting)).toBe(true);
        });
    });

});

describe('Zone Tests', () => {
    beforeAll(() => {
        //console.log(JSON.stringify(cs.zone));
    })
    test('getMinBaseLow(zone) expects 1', () => {
        expect(ch.getMinBaseLow(cs.zone)).toBe(1);
    });
    test('getMinBaseBody(zone) expects 2', () => {
        expect(ch.getMinBaseBody(cs.zone)).toBe(2);
    });
    test('getMaxBaseHigh(zone) expects 12', () => {
        expect(ch.getMaxBaseHigh(cs.zone)).toBe(12);
    });
    test('getMaxBaseBody(zone) expects 11', () => {
        expect(ch.getMaxBaseBody(cs.zone)).toBe(11);
    });
    test('getBaseBodyMid(zone) expects 6.5', () => {
        expect(ch.getBaseBodyMid(cs.zone)).toBe(6.5);
    });

    describe.each([
        [cs.supply, cs.currentPrice, cs.supplyZonePropertiesExpect, true, false],
        [cs.demand, cs.currentPrice, cs.demandZonePropertiesExpect, false, true]
    ])('Zone Properties Test', (z, c, expectedZoneProperties, isSupply, isDemand) => {
        describe('getZoneProperties()', () => {
            let getZonePropertiesResults = ch.getZoneProperties(z, c);

            test('expects to be equal', () => {
                expect(getZonePropertiesResults).toEqual(expectedZoneProperties);
            });
            test('expects not to be', () => {
                expect(getZonePropertiesResults).not.toBe(expectedZoneProperties);
            });
        });
        describe('isSupply()', () => {
            let isSupplyResult = ch.isSupply(z, c);
            test(`expects ${isSupply}`, () => {
                expect(isSupplyResult).toBe(isSupply);
            });
            test(`expects ${isDemand}`, () => {
                expect(isSupplyResult).not.toBe(isDemand);
            });
        });
        describe('isDemand()', () => {
            let isDemandResult = ch.isDemand(z, c);
            test(`expects ${isDemand}`, () => {
                expect(isDemandResult).toBe(isDemand);
            });
            test(`expects ${isDemand}`, () => {
                expect(isDemandResult).not.toBe(isSupply);
            });
        });
    });

    describe.each([
        [cs.zone, cs.time, parseInt(cs.time / 1000), parseInt(cs.time / (1000 * 60))],
        [cs.zone, cs.bar1.time, parseInt(cs.bar1.time / 1000), parseInt(cs.bar1.time / (1000 * 60))]
    ])('Zone Time Test', (z, expectedTimeMilli, expectedTimeSeconds, expectedTimeMinutes) => {

        describe('getZoneTimeStampMilli(zone)', () => {
            test('expects ' + expectedTimeMilli, () => {
                expect(ch.getZoneTimeStampMilli(z)).toBe(expectedTimeMilli);
            });
        });
        describe('getZoneTimeStampSeconds(zone)', () => {
            test('expects ' + expectedTimeSeconds, () => {
                expect(ch.getZoneTimeStampSeconds(z)).toBe(expectedTimeSeconds);
            });
        });
        describe('getZoneTimeStampMinutes(zone)', () => {
            test('expects ' + expectedTimeMinutes, () => {
                expect(ch.getZoneTimeStampMinutes(z)).toBe(expectedTimeMinutes);
            });
        });
    });
});

describe.each([
    [cs.bars, , 3],
    [cs.bars, 3, 2],
    [cs.bars, 4, 1]
])('discoverBasesFromBars()', (a, b, expected) => {
    test(`minBase = ${b} expects ${expected}`, () => {
        let discovery = ch.discoverBasesFromBars(a, b);
        expect(discovery.size).toBe(expected);
    });
});

/*
test('discoverBasesFromBars(' + JSON.stringify([...cs.bars.entries()]) + ') expects 3 bases ', () => {

});

test('discoverBasesFromBars(' + JSON.stringify([...cs.bars.entries()]) + ',3) expects 2 bases ', () => {
    let discovery = ch.discoverBasesFromBars(cs.bars, 3);
    expect(discovery.size).toBe(2);
});

test('discoverBasesFromBars(' + JSON.stringify([...cs.bars.entries()]) + ',4) expects 1 base ', () => {
    let discovery = ch.discoverBasesFromBars(cs.bars, 4);
    expect(discovery.size).toBe(1);
});


 */







