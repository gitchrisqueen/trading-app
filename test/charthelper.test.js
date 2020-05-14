/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const charthelper = require('../src/charthelper');
const ch = new charthelper();

const time = Date.now();

const bar1 =
    {
        high: 4,
        open: 3,
        close: 2,
        low: 1,
        time: time
    }

const bar2 =
    {
        high: 8,
        open: 7,
        close: 6,
        low: 5,
        time: time + 1000
    }


const bar3 =
    {
        high: 12,
        open: 11,
        close: 10,
        low: 9,
        time: time + 2000
    }

const barBoring =
    {
        high: 10,
        open: 6,
        close: 5,
        low: 1,
        time: time + 3000
    }

const barExciting =
    {
        high: 10,
        open: 9,
        close: 2,
        low: 1,
        time: time + 4000
    }

const currentPrice = 20;

const boringBarArray1 = Object.entries(barBoring);
const demandBar = boringBarArray1.reduce(function (map, obj) {
    let key = obj.shift();
    let value = obj.shift();
    if (key != 'time') {
        map[key] = currentPrice - (value * 2)
    }
    return map;
}, {});

const demand = [demandBar, demandBar, demandBar];

const boringBarArray2 = Object.entries(barBoring);
const supplyBar = boringBarArray2.reduce(function (map, obj) {
    let key = obj.shift();
    let value = obj.shift();
    if (key != 'time') {
        map[key] = currentPrice + (value * 2);
    }
    return map;
}, {});

const supply = [supplyBar, supplyBar, supplyBar];


const zone = [bar1, bar1, bar3];


test('getMinBaseLow(' + JSON.stringify(zone) + ') expects 1', () => {
    expect(ch.getMinBaseLow(zone)).toBe(1);
});

test('getMinBaseBody(' + JSON.stringify(zone) + ') expects 2', () => {
    expect(ch.getMinBaseBody(zone)).toBe(2);
});

test('getMaxBaseHigh(' + JSON.stringify(zone) + ') expects 12', () => {
    expect(ch.getMaxBaseHigh(zone)).toBe(12);
});

test('getMaxBaseBody(' + JSON.stringify(zone) + ') expects 11', () => {
    expect(ch.getMaxBaseBody(zone)).toBe(11);
});

test('getBaseBodyMid(' + JSON.stringify(zone) + ') expects 6.5', () => {
    expect(ch.getBaseBodyMid(zone)).toBe(6.5);
});

test('getBarBody(' + JSON.stringify(zone) + ') expects 1,1,1', () => {
    expect(ch.getBarBody(bar1)).toBe(1);
    expect(ch.getBarBody(bar2)).toBe(1);
    expect(ch.getBarBody(bar3)).toBe(1);
});

test('getBarRange(' + JSON.stringify(zone) + ') expects 3,3,3', () => {
    expect(ch.getBarRange(bar1)).toBe(3);
    expect(ch.getBarRange(bar2)).toBe(3);
    expect(ch.getBarRange(bar3)).toBe(3);
});

test('isBoringBar(' + JSON.stringify([barBoring, barExciting]) + ') expects true,false', () => {
    expect(ch.isBoringBar(barBoring)).toBe(true);
    expect(ch.isBoringBar(barExciting)).toBe(false);
});

test('isExcitingBar(' + JSON.stringify([barBoring, barExciting]) + ') expects false,true', () => {
    expect(ch.isExcitingBar(barBoring)).toBe(false);
    expect(ch.isExcitingBar(barExciting)).toBe(true);
});

const supplyZonePropertiesExpect = {
    proximal: supplyBar.close,
    distal: supplyBar.open,
    isSupply: true,
    isDemand: false
}

const demandZonePropertiesExpect = {
    proximal: demandBar.close,
    distal: demandBar.open,
    isSupply: false,
    isDemand: true
}

test('getZoneProperties(' + JSON.stringify([supply, demand]) + ') expects ' + JSON.stringify(supplyZonePropertiesExpect) + ', true, ' + JSON.stringify(demandZonePropertiesExpect) + ', true', () => {
    expect(ch.getZoneProperties(supply, currentPrice)).toEqual(supplyZonePropertiesExpect);
    expect(ch.getZoneProperties(supply, currentPrice)).not.toBe(supplyZonePropertiesExpect);
    expect(ch.getZoneProperties(demand, currentPrice)).toEqual(demandZonePropertiesExpect);
    expect(ch.getZoneProperties(demand, currentPrice)).not.toBe(demandZonePropertiesExpect);
});


test('isSupply(' + JSON.stringify([supply, demand]) + ') expects true,false', () => {
    expect(ch.isSupply(supply, currentPrice)).toBe(true);
    expect(ch.isSupply(demand, currentPrice)).toBe(false);
});

test('isDemand(' + JSON.stringify([supply, demand]) + ') expects false,true', () => {
    expect(ch.isDemand(supply, currentPrice)).toBe(false);
    expect(ch.isDemand(demand, currentPrice)).toBe(true);
});

test('getZoneTimeStampMilli(' + JSON.stringify(zone) + ') expects '+time, () => {
    expect(ch.getZoneTimeStampMilli(zone)).toBe(time);
    expect(ch.getZoneTimeStampMilli(zone)).toBe(zone[0].time);
});

test('getZoneTimeStampSeconds(' + JSON.stringify(zone) + ') expects '+parseInt(time/1000), () => {
    expect(ch.getZoneTimeStampSeconds(zone)).toBe(parseInt(time/1000));
    expect(ch.getZoneTimeStampSeconds(zone)).toBe(parseInt(bar1.time/1000));
});

test('getZoneTimeStampMinutes(' + JSON.stringify(zone) + ') expects '+parseInt(time/(1000*60)), () => {
    expect(ch.getZoneTimeStampMinutes(zone)).toBe(parseInt(time/(1000*60)));
    expect(ch.getZoneTimeStampMinutes(zone)).toBe(parseInt(bar1.time/(1000*60)));
});









