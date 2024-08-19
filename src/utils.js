/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */



class Utils {
     constructor() {
        this.chalk = null;
        this.loadChalk();
    }

    async loadChalk() {
        this.chalk = await import('chalk');
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
            throw new Error('No GC hook! Start your program as `node --expose-gc`');
        }
    }


    /**
     * Display a log to the console using the parameters and prefix with the script name and the income name
     * @param {string} fileName - File name to pref
     * @param {string} message - message to display to the log
     * @param {Object} variable - optional variable to append as json string to the message
     * @param {string} logColor - Hexadecimal value representing the desired color for log output.
     * @param {number} padLength - length to pad after the fileName with '-'
     */
    async log(fileName, message, variable = false, logColor = "#000000", padLength = 33) {
        if (!this.chalk) {
            await this.loadChalk();
        }
        let maskedFileName = fileName.padEnd(padLength, '-') + '> ';
        if (variable !== false) {
            message = message + JSON.stringify(variable);
        }
        message = chalk.hex(logColor).bold(maskedFileName) + chalk.bgHex(logColor).hex('#000000').bold(` ${message} `);
        console.log(message);
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
module.exports = new Utils();
