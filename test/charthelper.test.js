/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const charthelper = require('../src/charthelper');
const ch = new charthelper();

const bar1 =
    {
        high: 10,
        low: 2,
        open: 3,
        close: 4
    }

const bar2 =
    {
        high: 9,
        low: 3,
        open: 3,
        close: 6
    }


const bar3 =
    {
        high: 11,
        low: 5,
        open: 2,
        close: 6
    }


const zone = [bar1, bar2, bar3];


test('getMinBaseLow(' + JSON.stringify(zone) + ') expects 2', () => {
    expect(ch.getMinBaseLow(zone)).toBe(2);
});

