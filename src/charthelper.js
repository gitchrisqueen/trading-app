/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

class ChartHelper {

    getMinBaseLow(base) {
        return parseFloat(base.reduce((min, bar) => Math.min(bar.low, min), base[0].low));
    }

    getMinBaseBody(base) {
        //this.log(`getMinBaseBody[base]:`, base);
        return parseFloat(base.reduce((min, bar) => Math.min(bar.open, bar.close) < min ? Math.min(bar.open, bar.close) : min, Math.min(base[0].open, base[0].close)));
    }


    getMaxBaseHigh(base) {
        return parseFloat(base.reduce((max, bar) => Math.max(bar.high, max), base[0].high));
    }

    getMaxBaseBody(base) {
        return parseFloat(base.reduce((max, bar) => Math.max(bar.open, bar.close) > max ? Math.max(bar.open, bar.close) : max, Math.max(base[0].open, base[0].close)));
    }

    getBaseBodyMid(base) {
        return parseFloat((this.getMaxBaseBody(base) + this.getMinBaseBody(base)) / 2);
    }


    getBarBody(bar) {
        return parseFloat(Math.abs(bar.open - bar.close));
    }

    getBarRange(bar) {
        return parseFloat(Math.abs(bar.high - bar.low));
    }


    isBoringBar(bar) {
        // Body <= 50% of the range
        return this.getBarBody(bar) <= (this.getBarRange(bar) / 2);
    }

    isExcitingBar(bar) {
        // Body > 50% of the range
        return this.getBarBody(bar) > (this.getBarRange(bar) / 2);
    }

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


    isSupply(base, currentPrice) {
        return this.getZoneProperties(base, currentPrice).isSupply; // Base body (proximal line) is above current price
    }

    isDemand(base, currentPrice) {
        return this.getZoneProperties(base, currentPrice).isDemand; // Base body (proximal line) is below current price
    }

    getZoneTimeStampMilli(zone) {
        return (zone[0] && zone[0].time) ? zone[0].time : 1;
    }

    getZoneTimeStamp(zone){
        return this.getZoneTimeStampMilli()/1000;
    }


}

module.exports = ChartHelper;
