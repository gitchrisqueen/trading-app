/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

class ChartHelper {

    /**
     * Takes array [[high,low,open,close,time],...] as base and returns the minimum low value found
     * @param base
     * @returns {number}
     */
    getMinBaseLow(base) {
        return parseFloat(base.reduce((min, bar) => Math.min(bar.low, min), base[0].low));
    }

    /**
     * Takes array [[high,low,open,close,time],...] as base and returns the minimum open or close value found
     * @param base
     * @returns {number}
     */
    getMinBaseBody(base) {
        //this.log(`getMinBaseBody[base]:`, base);
        return parseFloat(base.reduce((min, bar) => Math.min(bar.open, bar.close) < min ? Math.min(bar.open, bar.close) : min, Math.min(base[0].open, base[0].close)));
    }

    /**
     * Takes array [[high,low,open,close,time],...] as base and returns the maximum high value found
     * @param base
     * @returns {number}
     */
    getMaxBaseHigh(base) {
        return parseFloat(base.reduce((max, bar) => Math.max(bar.high, max), base[0].high));
    }

    /**
     * Takes array [[high,low,open,close,time],...] as base and returns the maximum open or close value found
     * @param base
     * @returns {number}
     */
    getMaxBaseBody(base) {
        return parseFloat(base.reduce((max, bar) => Math.max(bar.open, bar.close) > max ? Math.max(bar.open, bar.close) : max, Math.max(base[0].open, base[0].close)));
    }

    /**
     * Takes array [[high,low,open,close,time],...] as base and returns the half point of the sum of the max base body and the min base body
     * @param base
     * @returns {number}
     */
    getBaseBodyMid(base) {
        return parseFloat((this.getMaxBaseBody(base) + this.getMinBaseBody(base)) / 2);
    }

    /**
     * Takes array [high,low,open,close,time] as bar and returns the absolute value of the difference between the open and close
     * @param bar
     * @returns {number}
     */
    getBarBody(bar) {
        return parseFloat(Math.abs(bar.open - bar.close));
    }

    /**
     * Takes array [high,low,open,close,time] as bar and returns the absolute value of the difference between the high and low
     * @param bar
     * @returns {number}
     */
    getBarRange(bar) {
        return parseFloat(Math.abs(bar.high - bar.low));
    }

    /**
     * Takes array [high,low,open,close,time] as bar and returns true if the bar body is <= 50% of the bar range
     * @param bar
     * @returns {boolean}
     */
    isBoringBar(bar) {
        // Body <= 50% of the range
        return this.getBarBody(bar) <= (this.getBarRange(bar) / 2);
    }

    /**
     * Takes array [high,low,open,close,time] as bar and returns true if the bar body is > 50% of the bar range
     * @param bar
     * @returns {boolean}
     */
    isExcitingBar(bar) {
        // Body > 50% of the range
        return this.getBarBody(bar) > (this.getBarRange(bar) / 2);
    }

    /**
     * Returns array with distal,proximal,isSupply,isDemand properties for the given zone
     * @param zone
     * @param currentPrice
     * @returns {{distal: number, proximal: number, isDemand: boolean, isSupply: boolean}}
     */
    getZoneProperties(zone, currentPrice) {
        let min = this.getMinBaseBody(zone);
        let max = this.getMaxBaseBody(zone);
        let d1 = Math.abs(currentPrice - min);
        let d2 = Math.abs(currentPrice - max);

        let prop = (d1 < d2) ? {proximal: min, distal: max} : {proximal: max, distal: min};
        prop['isSupply'] = prop.proximal > currentPrice;
        prop['isDemand'] = prop.proximal < currentPrice;
        return prop;
    }

    /**
     * Takes array [[high,low,open,close,time],...] as base and returns true if the proximal line is above the given currentPrice
     * @param base
     * @param currentPrice
     * @returns {boolean}
     */
    isSupply(base, currentPrice) {
        return this.getZoneProperties(base, currentPrice).isSupply; // Base body (proximal line) is above current price
    }

    /**
     * Takes array [[high,low,open,close,time],...] as base and returns true if the proximal line is below the given currentPrice
     * @param base
     * @param currentPrice
     * @returns {boolean}
     */
    isDemand(base, currentPrice) {
        return this.getZoneProperties(base, currentPrice).isDemand; // Base body (proximal line) is below current price
    }

    /**
     * Takes array [[high,low,open,close,time],...] as zone and returns the the time as milliseconds of the first bar within the zone
     * @param zone
     * @returns {number}
     */
    getZoneTimeStampMilli(zone) {
        // Return earliest zone time
        return parseFloat(zone.reduce((min, bar) => Math.min(bar.time, min), zone[0].time));
    }

    /**
     * Takes array [[high,low,open,close,time],...] as zone and returns the the time as seconds of the first bar within the zone
     * @param zone
     * @returns {number}
     */
    getZoneTimeStampSeconds(zone) {
        return parseInt(this.getZoneTimeStampMilli(zone) / 1000);
    }

    /**
     * Takes array [[high,low,open,close,time],...] as zone and returns the the time as minutes of the first bar within the zone
     * @param zone
     * @returns {number}
     */
    getZoneTimeStampMinutes(zone) {
        return parseInt(this.getZoneTimeStampSeconds(zone) / 60);
    }

    /**
     * Takes array [[high,low,open,close,time],...] as bars and returns a Map that contains bases with length >= baseMinSize and mapped by their base time (first bar time)
     * @param bars
     * @param baseMinSize
     * @returns {Map<any, any>}
     */
    discoverBasesFromBars(bars, baseMinSize = 2) {
        //this.log(`Bars: `,bars);
        //this.log(`Bars Entries: `,bars.entries());
        let bases = new Map();
        let base = [];

        for (const bar of bars.values()) {
            //this.log(`Bar: `,bar);

            if (this.isExcitingBar(bar)) {
                if (base.length >= baseMinSize) {
                    bases.set(this.getZoneTimeStampMilli(base), base);
                }
                base = [];
            } else {
                base.push(bar);
            }
        }

        if (base.length >= baseMinSize) {
            bases.set(this.getZoneTimeStampMilli(base), base);
        }
        return bases;
    }
}

module.exports = ChartHelper;