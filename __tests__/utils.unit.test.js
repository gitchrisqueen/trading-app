/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const ut = require('../src/utils');

describe.each([
    [2, 2020, 29],
    [2, 2021, 28],
    [11, 2020, 30],
    [11, 2021, 30],
    [12, 2020, 31],
    [12, 2021, 31]
])('daysInMonth()', (m, y, expected) => {
    test(`(${m},${y}) expects ${expected}`, () => {
        expect(ut.daysInMonth(m, y)).toBe(expected);
    });
});

describe.each([
    [5, 1, 10, true, true],
    [8, 7, 9, false, true],
    [1, 5, 10, true, false],
    [1, 5, 10, false, false],
    [5, 5, 10, true, true],
    [5, 5, 10, false, false]
])('btw()', (s, e1, e2, incl, expected) => {
    test(`btw(${s},${e1},${e2},${incl}) expects ${expected}`, () => {
        expect(ut.btw(s, e1, e2, incl)).toBe(expected);
    });
    test(`btw(${s},${e2},${e1},${incl}) expects ${expected}`, () => {
        expect(ut.btw(s, e2, e1, incl)).toBe(expected);
    });
});

describe.each([
    [false, false, false],
    [false, true, true],
    [true, false, true],
    [true, true, false]
])('myXOR()', (a, b, expected) => {
    test(`(${a},${b}) expects ${expected}`, () => {
        expect(ut.myXOR(a, b)).toBe(expected);
    });
});

describe.each([
    [5, 2, false, '', [2, 1]],
    [25, 3, false, '', [8, 1]],
    [11, 0, true, 'zero'],
])('div_mod()', (a, b, toThrow, throwMessage, expected) => {
    function badMod() {
        ut.div_mod(a, b);
    }

    if (toThrow) {
        test(`(${a},${b}) expects to Throw Error ${throwMessage}`, () => {
            expect(badMod).toThrow();
            expect(badMod).toThrowError(throwMessage);
        });
    } else {
        test(`(${a},${b}) expects ${expected}`, () => {
            expect(ut.div_mod(a, b)).toEqual(expected);
        });
    }
});

describe(`log() Test`, () => {
    test('expected to be defined', () => {
        expect(ut.log).toBeDefined();
    });

    test('(test,1,testing) expected to be undefined', () => {
        expect(ut.log('utils.test.js', 'testing', {testVariable: 1}, '#ffa500')).toBeUndefined();
    });
});

describe(`forceGC() Test`, () => {

    test('expected to be defined', () => {
        expect(ut.forceGC).toBeDefined();
    });

    test('() expected to be undefined', () => {
        expect(ut.forceGC()).toBeUndefined();
    });
});

describe(`removePriceOption() Test`, () => {
    let options = {
        color: "red",
        size: "large",
        price: 13.99,
        msrp_price: 11.99
    };
    test('expected to have property color = red', () => {
        expect(ut.removePriceOption(options)).toHaveProperty('color', 'red');
    });
    test('expected to have property size = large', () => {
        expect(ut.removePriceOption(options)).toHaveProperty('size', 'large');
    });
    test('expected to have property msrp_price = 11.99', () => {
        expect(ut.removePriceOption(options)).toHaveProperty('msrp_price', 11.99);
    });
    test('expected to not have property price', () => {
        expect(ut.removePriceOption(options)).not.toHaveProperty('price');
    });
});

let daysInMonth = ut.daysInMonth(new Date().getMonth() + 1, new Date().getFullYear());

describe.each([
    [1, 1],
    [30, 30],
    [60, 60],
    ['1D', (60 * 24)],
    ['5d', (60 * 24 * 5)],
    ['1W', (60 * 24 * 7)],
    ['3w', (60 * 24 * 7 * 3)],
    ['1M', (60 * 24 * daysInMonth)],
    ['6M', (60 * 24 * daysInMonth * 6)],
])('getTimeFrameInMinutes()', (t, expected) => {
    let result = ut.getTimeFrameInMinutes(t);
    test(`(${t}) expects ${expected}`, () => {
        expect(result).toBe(expected);
    });
    test(`(${t}) expects to not be NaN`, () => {
        expect(result).not.toBeNaN();
    });
});







