/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

let timeIncrement = 0;

const time = Date.now();

function getNextTime(){
    timeIncrement += 1000;
    return time + (timeIncrement);
}

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
        time: getNextTime()
    }


const bar3 =
    {
        high: 12,
        open: 11,
        close: 10,
        low: 9,
        time: getNextTime()
    }

const barBoring =
    {
        high: 10,
        open: 6,
        close: 5,
        low: 1,
        time:getNextTime()
    }

const barExciting =
    {
        high: 10,
        open: 9,
        close: 2,
        low: 1,
        time: getNextTime()
    }

const currentPrice = 20;

const boringBarArray1 = Object.entries(barBoring);
const demandBar = boringBarArray1.reduce(function (map, obj) {
    let key = obj.shift();
    let value = obj.shift();
    if (key != 'time') {
        map[key] = currentPrice - (value * 2)
    }else{
        map[key] = getNextTime();
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
    }else{
        map[key] = getNextTime();
    }
    return map;
}, {});

const supply = [supplyBar, supplyBar, supplyBar];


const zone = [bar2, bar1, bar3];


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

function getNewBoringBar() {
    let b = JSON.parse(JSON.stringify(barBoring));
    b.time = getNextTime();
    return b;
}

function getNewExcitingBar() {
    let b = JSON.parse(JSON.stringify(barExciting));
    b.time= getNextTime();
    return b;
}

const bars = new Map([
    [1, getNewExcitingBar()],
    [2, getNewExcitingBar()],
    [3, getNewBoringBar()], // Zone 1
    [4, getNewBoringBar()],  // Zone 1
    [5, getNewBoringBar()],  // Zone 1
    [6, getNewExcitingBar()],
    [7, getNewBoringBar()], // Zone 2 ( length 1)
    [8, getNewExcitingBar()],
    [9, getNewBoringBar()], // Zone 3
    [10, getNewBoringBar()], // Zone 3
    [11, getNewBoringBar()], // Zone 3
    [12, getNewBoringBar()], // Zone 3
    [13, getNewExcitingBar()],
    [14, getNewBoringBar()], // Zone 4
    [15, getNewBoringBar()] // Zone 4
    ]
)

module.exports = {
    time,
    bar1,
    bar2,
    bar3,
    barBoring,
    barExciting,
    currentPrice,
    demandBar,
    supplyBar,
    demand,
    supply,
    zone,
    supplyZonePropertiesExpect,
    demandZonePropertiesExpect,
    bars

}
