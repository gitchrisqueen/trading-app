/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

class Utils {

    constructor() {
        this.scriptName = '';
    }

    daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    btw(search, end1, end2, inclusive = true) {
        search = parseFloat(search);
        end1 = parseFloat(end1);
        end2 = parseFloat(end2);
        let trueMin = Math.min(end1, end2);
        let trueMax = Math.max(end1, end2);

        if (inclusive) {
            return (trueMin <= search && search <= trueMax);
        } else {
            return (trueMin < search && search < trueMax);
        }
    }

    myXOR(a, b) {
        return (a || b) && !(a && b);
    }

    div_mod(a, b) {
        a = parseInt(a);
        b = parseInt(b);
        if (b <= 0)
            throw new Error("b cannot be zero. Undefined.");

        return [Math.floor(a / b), a % b];
    }

    forceGC() {
        if (global.gc) {
            global.gc();
        } else {
            this.log('No GC hook! Start your program as `node --expose-gc ' + this.getScriptName() + '`.');
        }
    }

    setScriptName() {
        return this.scriptName;
    }

    getScriptName() {
        if (this.scriptName) {
            return this.scriptName
        }

        let error = new Error()
            , source
            , lastStackFrameRegex = new RegExp(/.+\/(.*?):\d+(:\d+)*$/)
            , currentStackFrameRegex = new RegExp(/getScriptName \(.+\/(.*):\d+:\d+\)/);

        if ((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] != "")
            return source[1];
        else if ((source = currentStackFrameRegex.exec(error.stack.trim())))
            return source[1];
        else if (error.fileName != undefined)
            return error.fileName;
    }

    // noinspection DuplicatedCode
    log(message, variable = false) {
        let fileName = `[${this.getScriptName()}] (${this.getIncomeLevel()})`;
        let minLength = 33;
        let maskedFileName = fileName.padEnd(minLength, '-') + '> ';

        if (variable !== false) {
            message = message + JSON.stringify(variable);
        }
        message = chalk.yellow.bold(maskedFileName) + chalk.bgYellow.hex('#000000').bold(` ${message} `);
        if (this.DEBUG) {
            console.log(message);
        }
    }

}

module.exports = Utils;
