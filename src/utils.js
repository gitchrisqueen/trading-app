/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const chalk = require("chalk");

class Utils {

    constructor(debug = false) {
        this.DEBUG = debug;
    }

    /**
     * Return the number of days in the given month and year
     * @param month
     * @param year
     * @returns {number}
     */
    daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    /**
     * Return true if the search value is between end1 and end2 depending on the inclusive flag
     * @param search
     * @param end1
     * @param end2
     * @param inclusive
     * @returns {boolean}
     */
    btw(search, end1, end2, inclusive = true) {
        search = parseFloat(search);
        end1 = parseFloat(end1);
        end2 = parseFloat(end2);
        let trueMin = Math.min(end1, end2);
        let trueMax = Math.max(end1, end2);

        let btw = false;

        if (inclusive) {
            btw = (trueMin <= search && search <= trueMax);
        } else {
            btw = (trueMin < search && search < trueMax);
        }
        return btw;
    }

    /**
     * Returns the result of exclusive or from params a and b
     * @param a
     * @param b
     * @returns boolean
     */
    myXOR(a, b) {
        return (a || b) && !(a && b);
    }

    /**
     * Returns an array containing [Greatest Denominator, Remainder]
     * @param a
     * @param b
     * @returns {(number)[]}
     */
    div_mod(a, b) {
        a = parseInt(a);
        b = parseInt(b);
        if (b <= 0)
            throw new Error("b cannot be zero. Undefined.");

        return [Math.floor(a / b), a % b];
    }

    /**
     * Calls on the global garbage collector function if it is available
     */
    forceGC() {
        if (global.gc) {
            global.gc();
        } else {
            this.log('No GC hook! Start your program as `node --expose-gc`');
        }
    }

    /**
     * Set the script name to be used in logging functions
     * @param name
     */
    setScriptName(name) {
        this.scriptName = name;
    }

    /**
     * Return the script name as determined by stack trace from the parent function
     * @returns {string|*}
     */
    getScriptName() {
        if (this.scriptName) {
            return this.scriptName
        }

        let error = new Error()
            , source
            , lastStackFrameRegex = new RegExp(/.+\/(.*?):\d+(:\d+)*$/)
            , parentStackFrameRegex = (/ \(.+\/(.*):\d+:\d+\)/g)
            , currentStackFrameRegex = new RegExp(/getScriptName \(.+\/(.*):\d+:\d+\)/);

        if ((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] != "") {
            return source[1];
        } else if ((source = [...error.stack.trim().matchAll(parentStackFrameRegex)]) && source[1] && source[1][1] != "") {
            return source[1][1];
        } else if ((source = currentStackFrameRegex.exec(error.stack.trim())) && source[1] != "") {
            return source[1];
        } else if (error.fileName != undefined)
            return error.fileName;
    }

    setLogColor(color){
        this.setBGLogColor(color);
        this.setFGLogColor(color);
    }

    setBGLogColor(color) {
        this.bgLogColor = color;
    }

    setFGLogColor(color) {
        this.fgLogColor = color;
    }

    getBGLogColor() {
        return this.bgLogColor;
    }

    getFGLogColor() {
        return this.fgLogColor;
    }

    /**
     * Display a log to the console using the parameters and prefix with the script name and the income name
     * @param message
     * @param variable
     * @param incomeLevel
     */
    log(message, variable = false, incomeLevel = '') {
        let fileName = `[${this.getScriptName()}] (${incomeLevel})`;
        let minLength = 33;
        let maskedFileName = fileName.padEnd(minLength, '-') + '> ';

        if (variable !== false) {
            message = message + JSON.stringify(variable);
        }
        message = chalk.hex(this.getFGLogColor()).bold(maskedFileName) + chalk.bgHex(this.getBGLogColor()).hex('#000000').bold(` ${message} `);
        if (this.DEBUG) {
            console.log(message);
        }
    }

    /**
     * Remove the index "price" from any options object array that is passed and returns the resulting object array
     * @param orderOptions
     * @returns {{}}
     */
    removePriceOption(orderOptions) {
        let oArray = Object.entries(orderOptions);
        return oArray.reduce(function (map, obj) {
            let key = obj.shift();
            let value = obj.shift();
            if (key !== 'price') {
                map[key] = value;
            }
            return map;
        }, {});
    }

    /**
     * Return the timeframe as the number of minutes it represents
     * @param timeframe
     * @returns {number}
     */
    getTimeFrameInMinutes(timeframe) {
        let minutes = parseInt(timeframe);

        const INTERVALS_MAP = { // In minutes
            'h': 60,
            'd': 60 * 24,
            'w': 60 * 24 * 7,
            'm': 60 * 24 * this.daysInMonth(new Date().getMonth() + 1, new Date().getFullYear()),
        };

        let interval = ('' + timeframe).toLowerCase();
        for (let index in INTERVALS_MAP) {
            let value = INTERVALS_MAP[index];
            if (interval.indexOf(index) !== -1) {
                let increment = interval.replace(index, '');
                minutes = parseInt(increment) * value;
                break;
            }
        }
        //this.log(`${timeframe} = ${minutes} minutes`);
        return minutes;
    }


}

module.exports = Utils;
