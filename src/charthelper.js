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
        return parseFloat(bar.high - bar.low);
    }


    isBoringBar(bar) {
        // Body <= 50% of the range
        return this.getBarBody(bar) <= (this.getBarRange(bar) / 2);
    }

    isExcitingBar(bar) {
        // Body > 50% of the range
        return this.getBarBody(bar) > (this.getBarRange(bar) / 2);
    }

    isSupply(base, currentPrice) {
        return (this.getSupplyProximalLine(base) > currentPrice); // Base body (proximal line) is above current price
    }

    isDemand(base, currentPrice) {
        return this.getDemandProximalLine(base) < currentPrice; // Base body (proximal line) is below current price
    }

    getDemandProximalLine(base) {
        return this.getMaxBaseBody(base);
    }

    getDemandDistalLine(base) {
        return this.getMinBaseLow(base);
    }

    getSupplyProximalLine(base) {
        return this.getMinBaseBody(base);
    }

    getSupplyDistalLine(base) {
        return this.getMaxBaseHigh(base);
    }

}

module
    .exports = ChartHelper;
