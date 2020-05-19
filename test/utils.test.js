/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const ut = require('../src/utils');
//const ut = new utils();

test('daysInMonth(2,2020) expects 29', () => {
    expect(ut.daysInMonth(2,2020)).toBe(29);
});

test('daysInMonth(2,2021) expects 28', () => {
    expect(ut.daysInMonth(2,2021)).toBe(28);
});

test('daysInMonth(11,2020) expects 30', () => {
    expect(ut.daysInMonth(11,2020)).toBe(30);
});

test('daysInMonth(11,2021) expects 30', () => {
    expect(ut.daysInMonth(11,2021)).toBe(30);
});

test('daysInMonth(12,2020) expects 31', () => {
    expect(ut.daysInMonth(12,2020)).toBe(31);
});

test('daysInMonth(12,2021) expects 31', () => {
    expect(ut.daysInMonth(12,2021)).toBe(31);
});

test('btw(5,1,10) and btw(5,10,11) expects true', () => {
    expect(ut.btw(5,1,10)).toBe(true);
    expect(ut.btw(5,10,1)).toBe(true);
});

test('btw(1,5,10) and btw(1,10,5) expects false', () => {
    expect(ut.btw(1,5,10)).toBe(false);
    expect(ut.btw(1,10,5)).toBe(false);
});

test('btw(5,5,10) expects true', () => {
    expect(ut.btw(5,5,10)).toBe(true);
});

test('btw(5,5,10,false) expects false', () => {
    expect(ut.btw(5,5,10,false)).toBe(false);
});

test('myXOR(false,false) expects false', () => {
    expect(ut.myXOR(false,false)).toBe(false);
});

test('myXOR(false,true) expects true', () => {
    expect(ut.myXOR(false,true)).toBe(true);
});

test('myXOR(true,false) expects true', () => {
    expect(ut.myXOR(true,false)).toBe(true);
});

test('myXOR(false,false) expects false', () => {
    expect(ut.myXOR(true,true)).toBe(false);
});

test('div_mod(5,2) expects [2,1]', () => {
    expect(ut.div_mod(5,2)).toEqual([2,1]);
});

test('div_mod(25,3) expects [8,1]', () => {
    expect(ut.div_mod(25,3)).toEqual([8,1]);
});

test('div_mod(11,0) expects Thrown Error containing error about second arg being zero', () => {
    function badMod() {
        ut.div_mod(11,0);
    }
    expect(badMod).toThrow();
    expect(badMod).toThrowError('zero');
});

test('setScriptName(UtilsTesting) expects to have property scriptName equal UtilsTesting', () => {
    ut.setScriptName('UtilsTesting');
    expect(ut).toHaveProperty('scriptName','UtilsTesting');
});

test('getScriptName(UtilsTesting) expects UtilsTesting', () => {
    ut.setScriptName('UtilsTesting');
    expect(ut.getScriptName()).toBe('UtilsTesting');
});

//TODO: Fix this test and function
/*
test('getScriptName() expects utils.test.js', () => {
    ut.setScriptName(null);
    expect(ut.getScriptName()).toBe('utils.test.js');
});
 */

test('log expected to be defined', () => {
    expect(ut.log).toBeDefined();
});

test('log(test,1,testing) expected to be undefined', () => {
    expect(ut.log('test',1,'testing')).toBeUndefined();
});

test('forceGC expected to be defined', () => {
    expect(ut.forceGC).toBeDefined();
});

test('forceGC() expected to be undefined', () => {
    expect(ut.forceGC()).toBeUndefined();
});





