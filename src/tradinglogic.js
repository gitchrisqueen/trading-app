/*
* Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
*/

const chalk = require("chalk");
const dBit = require('./deribit.js');

class TradingLogic {

    /*

    currentCash = 0;
    totalPL = 0;
    totalPLUSD = 0;
    potentialProfitLossUSD = 0;
    realizedProfitLossUSD = 0;

    myPosition = false;
    orders = new Map();
     */

    constructor() {
        this.DEBUG = true;

        this.scriptName = '';
        this.Deribit = new dBit();

        this.incomeLevels = {
            intraday: "Intra-Day",
            hourly: "Hourly",
            daily: "Daily",
            weekly: "Weekly",
            monthly: "Monthly"
        }

        this.htfReward = 1;
        this.htfRisk = 11;
        this.minRewardRiskRatio = 3;

        this.barMap = new Map();
        this.baseMap = new Map();
        this.zoneMap = new Map();

        this.baseMinSize = 2;


        this.curvePlacements = {
            HIGH:
                {
                    text: "High"
                },
            EQUAL:
                {
                    text: "Equal"
                },
            LOW:
                {
                    text: "Low"
                },
            UNKOWN: {
                text: "Unknown"
            }
        };

        this.trends = {
            UP:
                {
                    text: "Uptrend"
                },
            STRONGUP:
                {
                    text: "Strong Uptrend"
                },
            DOWN:
                {
                    text: "Downtrend"
                },
            STRONGDOWN:
                {
                    text: "Strong Downtrend"
                },
            SIDEWAYS:
                {
                    text: "Sideways"
                },
            UNKOWN:
                {
                    text: "UNKOWN"
                },
        };

        this.curve = this.curvePlacements.UNKOWN;
        this.trend = this.trends.UNKOWN;

        this.minRiskMultiplier = 1;
        this.tickValue = 10; // USD
        this.minTickSize = .5; // USD
        this.contractMultiple = 10;
        this.minOddsEnhancerScore = 0; // TODO: Keep stats and pick the lowest score with the highest win %
        this.bracketOrder = this.getBracketOrderBlank();

        this.orders = new Map();
    }

    getIncomeLevels() {
        return this.incomeLevels;
    }

    getIncomeLevel() {
        return this.incomeLevel;
    }

    setIncomeLevel(incomeLevel) {
        this.incomeLevel = incomeLevel;
        switch (incomeLevel) {
            case this.incomeLevels.intraday:
                //  <---- Intraday Income ---->
                this.HTF = 30; // in minutes
                this.ITF = 5; // in minutes
                this.LTF = 1; // in minutes
                break;
            case this.incomeLevels.hourly:
                //  <---- Hourly Income ---->
                this.HTF = 60; // in minutes
                this.ITF = 15; // in minutes
                this.LTF = 5; // in minutes
                break;
            case this.incomeLevels.daily:
                //  <---- Daily Income ---->
                this.HTF = '1D'; // in minutes
                this.ITF = 60; // in minutes
                this.LTF = 15; // in minutes
                break;

            /*
            // Cant currently do anything larger than 1 day on Deribit
         case this.incomeLevels.weekly:
             //  <---- Weekly Income ---->
             this.HTF = '1W'; // in minutes
             this.ITF = '1D'; // in minutes
             this.LTF = '60'; // in minutes
             break;
         case this.incomeLevels.monthly:
             //  <---- Monthly Income ---->
             this.HTF = '1M'; // in minutes
             this.ITF = '1W'; // in minutes
             this.LTF = '1D'; // in minutes
             break;


             */


        }
    }

    async init() {
        this.setScriptName(this.getScriptName());
        this.log('Started');
        await this.Deribit.init();

        // Get All Open Orders so they aren't duplicated if system restarts
        await this.trackAllOpenOrders();


        await this.Deribit.subscribeOrderUpdates(async (orders) => {
            await this.handleOrderUpdates(orders);
        });

        for (const timeframe of [this.HTF, this.ITF, this.LTF]) {

            // Setup bar map for each time frame
            this.barMap.set(timeframe, new Map());

            // Get All bars for each time frame
            await this.getAPIBars(timeframe);

            // Assess information for each timeframe
            await this.assessTimeFrame(timeframe);

            // Subscribe to the api for new bar data for each time frame
            this.Deribit.subscribeBars(timeframe, async (data) => {

                // Add new Bar to Bar Map
                let newBarAdded = this.addSubscribedBarToMap(timeframe, data);

                // Only make new assessments when a new bars is added. Not updated.
                if (newBarAdded) {
                    await this.assessTimeFrame(timeframe);
                }
            }).catch(error => {
                this.log(`subscribeBars() Error:`, error);
            });

        }
    }

    async assessTimeFrame(timeframe) {
        // Map out the bases for the timeframe
        this.updateBaseMap(timeframe);

        // Need to setup New zoneMap for the timeframe
        this.zoneMap.set(timeframe, this.getZoneTypes());

        // Discover supply, demand, and fresh zones on every new zone
        this.discoverZones(timeframe);

        // Determine important information for the timeframe
        await this.determineByTimeFrame(timeframe);
    }

    async determineByTimeFrame(timeframe) {

        switch (timeframe) {
            case this.HTF:
                // Find the freshest supply and demand. Divide it into 3 parts. Draw Highlighted Curve zones. Determine place on curve
                await this.determineCurve();
                this.log(`Curve: ${this.getCurve()}`);
                break;
            case this.ITF:
                // Determine Trend
                await this.determineTrend();
                this.log(`Trend: ${this.getTrend()}`);
                break;
            case this.LTF:
                // Determine the trades to make
                await this.determineTrades();

                // Update any trail stops for better profits or lingering trail stops
                // Handle missed or straggling entry orders
                await this.handleOpenOrders();

                //this.forceGC();
                break;
        }
    }

    getZoneTypes() {
        return {
            supply: new Map(),
            demand: new Map(),
            freshsupply: new Map(),
            freshdemand: new Map()
        };
    }

    async trackAllOpenOrders() {
        this.orders = await this.getOpenOrdersAsBracketOrdersMap();
        this.log(`Total Open Bracket Orders: ${this.orders.size}`);
        let totalOrders = 0;
        for (const uid of this.orders.keys()) {
            totalOrders += this.orders.get(uid).size;
        }
        this.log(`Total Open Orders: ${totalOrders}`);
    }


    getHTFRisk() {
        return this.htfRisk;
    }

    getHTFReward() {
        return this.htfReward;
    }

    getCurve() {
        return this.curve.text;
    }

    getTrend() {
        return this.trend.text;
    }

    getCurrentPrice(timeframe) {
        let price = this.getLastBar(timeframe).close;
        //this.log(`Current Price: ${price}`);
        return price;
    }

    getLastBar(timeframe) {
        let mapDesc = new Map([...this.barMap.get(timeframe).entries()].sort());
        let barsDesc = Array.from(mapDesc.values());
        let lastBar = barsDesc.pop();
        //this.log(`Last bar time: ${lastBar.time}`);
        return lastBar;
    }

    getFirstBar(timeframe) {
        let mapDesc = new Map([...this.barMap.get(timeframe).entries()].sort());
        let barsDesc = Array.from(mapDesc.values());
        let firstBar = barsDesc.shift();
        //this.log(`First bar: ${firstBar.time}`);
        return firstBar;
    }

    discoverZones(timeframe) {

        let currentPrice = this.getCurrentPrice(timeframe);
        let bases = this.getBasesTimeFrame(timeframe);

        //this.log(`Bases Found: ${bases.length}`);
        // this.log(`ZoneMap:`,this.zoneMap);

        // Discover each zone (Direction doesnt matter because we map on first base time and sort latter when needed
        for (const base of bases) {
            //this.log(`Base:`,base);

            let baseTime = base[0].time;

            // Find fresh zone
            let isFresh = false;

            isFresh = this.isFreshZone(base, timeframe);

            // Remove previous zone mapping
            //this.zoneMap.get(timeframe).supply.delete(baseTime);
            //this.zoneMap.get(timeframe).demand.delete(baseTime);
            //this.zoneMap.get(timeframe).freshdemand.delete(baseTime);
            //this.zoneMap.get(timeframe).freshsupply.delete(baseTime);

            if (this.isSupply(base, currentPrice) === true) {
                //this.log(`Found Supply`);

                this.zoneMap.get(timeframe).supply.set(baseTime, base);
                //this.zoneMap.get(timeframe).demand.delete(baseTime);
                if (isFresh) {
                    //this.log(`Fresh Supply`);
                    this.zoneMap.get(timeframe).freshsupply.set(baseTime, base);
                } else {
                    //this.zoneMap.get(timeframe).freshsupply.delete(baseTime);
                }
            } else if (this.isDemand(base, currentPrice) === true) {
                //this.log(`Found Demand`);

                this.zoneMap.get(timeframe).demand.set(baseTime, base);
                //this.zoneMap.get(timeframe).supply.delete(baseTime);
                if (isFresh) {
                    //this.log(`Fresh Demand`);
                    this.zoneMap.get(timeframe).freshdemand.set(baseTime, base);
                } else {
                    //this.zoneMap.get(timeframe).freshdemand.delete(baseTime);
                }
            }
        }
    }


    updateBaseMap(timeframe) {
        //this.log(`Updating BaseMap for Timeframe: ${timeframe}`);
        this.baseMap.delete(timeframe);
        let bars = this.getBarsMapped(timeframe);
        //this.log(`Bars Count: ${bars.size}`);
        this.baseMap.set(timeframe, this.discoverBasesFromBars(bars));
        //let bases = this.getBasesTimeFrame(timeframe);
        //this.log(`Bases Found: ${bases.length}`);

    }

    getBasesTimeFrame(timeframe) {
        return this.baseMap.get(timeframe);
    }

    discoverBasesFromBars(bars) {
        //this.log(`Bars: `,bars);
        //this.log(`Bars Entries: `,bars.entries());

        let bases = [];
        let base = [];

        for (const bar of bars.values()) {
            //this.log(`Bar: `,bar);

            if (this.isExcitingBar(bar)) {
                if (base.length >= this.baseMinSize) {
                    bases.push(base);
                }
                base = [];
            } else if (this.isBoringBar(bar)) {
                base.push(bar);
            }
        }

        if (base.length >= this.baseMinSize) {
            bases.push(base);
        }
        return bases;
    }

    getBars(timeframe, from = 0, to = Date.now()) {
        let barsMapped = this.getBarsMapped(timeframe, from, to);
        return Array.from([...barsMapped.values()]);
    }

    getBarsMapped(timeframe, from = 0, to = Date.now()) {
        from = Math.min(Math.max(from, this.getFirstBar(timeframe).time), Date.now());
        to = Math.min(Math.min(to, this.getLastBar(timeframe).time), Date.now());

        let bars = this.barMap.get(timeframe);
        //this.log(`barMap(${timeframe}) has (${bars.size}) bars.`);

        return new Map([...bars.entries()].sort().filter(([k, v]) => (from <= v.time && v.time <= to)));
    }

    async getAPIBars(timeframe) {
        // 8 weeks ago
        let timeFrameMinuteMultiplier = this.getTimeFrameInMinutes(timeframe); // Minute(s)
        // TODO: Need to adjust for higher timeframes ???
        // Multiply/Divide by the delta of the next level

        switch (timeframe) {
            case this.HTF:
                timeFrameMinuteMultiplier *= (60 * 24 * 30 * 3); // 3 months
                break;
            case this.ITF:
                timeFrameMinuteMultiplier *= (60 * 24 * 30); // 30 days
                break;
            case this.LTF:
                timeFrameMinuteMultiplier *= (60 * 24 * 2); //2 days
                break;
        }

        let from = new Date(Date.now() - (1000 * 60 * timeFrameMinuteMultiplier)).getTime();
        let to = Date.now();

        /*
        let date = new Date();
        date.setTime(from);
        let fromUTC = date.toUTCString();
        date.setTime(to);
        let toUTC = date.toUTCString();
        this.log(`Requesting Bars From: ${fromUTC} - To: ${toUTC}`);

         */


        await this.Deribit.getBars(from, to, timeframe)
            .then(bars => {
                //this.log(`getAllBars Found Count:`,bars.length);
                for (const bar of bars) {
                    //bar['status'] = 'data';
                    this.addBarToMap(timeframe, bar);
                }
            });

    }

    addBarToMap(timeframe, bar) {
        //this.log(`Adding Bar`);
        let map = this.barMap.get(timeframe);
        let newBarAdded = false;
        if (!map.has(bar.time)) {
            newBarAdded = true;
        }
        // Update or add the new bar
        map.set(bar.time, bar);
        return newBarAdded;
    }

    removeFirstBarFromMap(timeframe) {
        let barsMapped = this.barMap.get(timeframe);
        let firstBar = Array.from(barsMapped.values()).shift();
        //this.log(`Removing Bar: ${firstBar.time}`);
        this.barMap.delete(firstBar.time);
    }


    addSubscribedBarToMap(timeframe, data) {
        let bar;
        if (data.status !== 'no_data') {
            bar = {
                time: data.tick,
                close: data.close,
                open: data.open,
                high: data.high,
                low: data.low,
                volume: data.cost
            };
            let newBarAdded = this.addBarToMap(timeframe, bar);
            if (newBarAdded) {
                // If we add a bar then remove a bar
                this.removeFirstBarFromMap(timeframe);
            }
            return newBarAdded;
        }
    }

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

    getZoneTouchCount(zone, timeframe) {
        let lastZoneBar = zone[zone.length - 1];
        let lastZoneBarTime = lastZoneBar.time;
        let zoneMin = this.getMinBaseLow(zone);
        let zoneMax = this.getMaxBaseHigh(zone);
        let searchBars = this.getBarsMapped(timeframe, lastZoneBarTime);

        let inside = true;
        let above = false;
        let below = false;
        let currentInside;
        let currentAbove;
        let currentBelow;
        let crosses = 0;

        for (const [index, bar] of searchBars) {
            currentAbove = Math.max(zoneMax, bar.open, bar.close, bar.low, bar.high) > zoneMax;
            currentBelow = Math.min(zoneMin, bar.open, bar.close, bar.low, bar.high) < zoneMin;
            currentInside = !currentAbove && !currentBelow;

            if ((currentInside !== inside) || (currentAbove !== above) || (currentBelow !== below)) {
                crosses++;
            }

            inside = currentInside;
            above = currentAbove;
            below = currentBelow;
        }

        return crosses;
    }

    isFreshZone(zone, timeframe) {
        let crosses = this.getZoneTouchCount(zone, timeframe);
        //this.log(`Crosses: ${crosses}`);

        let isFresh = true;
        if (crosses > 1) {
            isFresh = false;
        }
        return isFresh;
    }

    setScriptName() {
        return this.scriptName;
    }

    getScriptName() {
        if (this.scriptName) {
            return this.scriptName
        }

        var error = new Error()
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

    log(message, variable = false) {
        let fileName = `[${this.getScriptName()}] (${this.getIncomeLevel()})`;
        let minLength = 33;
        let maskedFileName = fileName.padEnd(minLength, '-') + '> ';

        message = chalk.yellow.bold(maskedFileName) + chalk.bgYellow.hex('#000000').bold(` ${message} `);
        if (this.DEBUG) {
            if (variable !== false) {
                console.log(message + JSON.stringify(variable));
            } else {
                console.log(message);
            }
        }
    }

    forceGC() {
        if (global.gc) {
            global.gc();
        } else {
            this.log('No GC hook! Start your program as `node --expose-gc ' + this.getScriptName() + '`.');
        }
    }

    async determineCurve() {

        let freshSupply = this.getFreshSupplyTimeFrame(this.HTF);
        if (!freshSupply) {
            freshSupply = this.getLatestSupplyTimeFrame(this.HTF);
        }

        let freshDemand = this.getFreshDemandTimeFrame(this.HTF);
        if (!freshDemand) {
            freshDemand = this.getLatestDemandTimeFrame(this.HTF);
        }


        if (freshSupply !== false && freshDemand !== false) {
            let supplyProximal = this.getSupplyProximalLine(freshSupply);
            let demandProximal = this.getDemandProximalLine(freshDemand);
            this.htfReward = Math.abs(supplyProximal - demandProximal);
            let htfDelta = this.getHTFReward() / 3;
            let equHigh = supplyProximal - htfDelta;
            let equLow = demandProximal + htfDelta;
            let htfFrom = Math.min(freshSupply[0].time, freshDemand[0].time);
            let htfTo = Math.max(freshSupply[freshSupply.length - 1].time, freshDemand[freshDemand.length - 1].time);

            // Determine Risk - whatever zone is oldest there diff (proximal-distal) = risk
            if (freshSupply[0].time < freshDemand[0].time) {
                this.htfRisk = Math.abs(this.getSupplyDistalLine(freshSupply) - supplyProximal);
            } else {
                this.htfRisk = Math.abs(this.getDemandDistalLine(freshDemand) - demandProximal);
            }

            let priceArray = [
                {type: 'currentPrice', price: this.getCurrentPrice(this.HTF)},
                {type: 'supplyProx', price: supplyProximal},
                {type: 'equLow', price: equLow},
                {type: 'equHigh', price: equHigh},
                {type: 'demandProx', price: demandProximal}
            ];
            let priceArraySorted = priceArray.sort((a, b) => (a.price < b.price) ? 1 : -1);
            let curvePlacementIndex = priceArraySorted.findIndex(item => item.type === "currentPrice");

            //this.log(`[Chart] Price Array Sorted`);
            //this.log(priceArraySorted);
            //this.log(`[Chart] Placement: ${placement}`);
            //this.log(priceArraySorted);

            switch (curvePlacementIndex) {
                case 1:
                    this.curve = this.curvePlacements.HIGH;
                    break;
                case 2:
                    this.curve = this.curvePlacements.EQUAL;
                    break;
                case 3:
                    this.curve = this.curvePlacements.LOW;
                    break;
                default:
                    this.curve = this.curvePlacements.UNKOWN;
                    break;
            }
        } else {
            this.log(`Cant determine curve without both supply and demand`);
        }
    }

    getLatestSupplyTimeFrame(timeframe) {
        // Note: This is correctly sorting from newest to oldest
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        let mapDesc = new Map([...this.zoneMap.get(timeframe).supply.entries()].sort());
        let supplyDesc = Array.from(mapDesc.values());
        let supply = supplyDesc.pop();
        return (supply && supply.length >= this.baseMinSize) ? supply : false;
    }


    getFreshSupplyTimeFrame(timeframe) {
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        // Note: This is correctly sorting from newest to oldest
        let mapDesc = new Map([...this.zoneMap.get(timeframe).freshsupply.entries()].sort());
        let supplyDesc = Array.from(mapDesc.values());
        let freshSupply = supplyDesc.pop();
        return (freshSupply && freshSupply.length >= this.baseMinSize) ? freshSupply : false;
    }

    getLatestDemandTimeFrame(timeframe) {
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        // Note: This is correctly sorting from newest to oldest
        let mapDesc = new Map([...this.zoneMap.get(timeframe).demand.entries()].sort());
        let demandDesc = Array.from(mapDesc.values());
        let demand = demandDesc.pop();
        return (demand && demand.length >= this.baseMinSize) ? demand : false;
    }

    getFreshDemandTimeFrame(timeframe) {
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        // Note: This is correctly sorting from newest to oldest
        let mapDesc = new Map([...this.zoneMap.get(timeframe).freshdemand.entries()].sort());
        let demandDesc = Array.from(mapDesc.values());
        let freshDemand = demandDesc.pop();
        return (freshDemand && freshDemand.length >= this.baseMinSize) ? freshDemand : false;

    }

    getOpposingDemandZone(timeframe, supplyZone) {
        let zoneFirstTime = supplyZone[0].time;
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        let mapDesc = new Map([...this.zoneMap.get(timeframe).demand.entries()].sort());
        let demandDesc = Array.from(mapDesc.values());
        let demand = false;
        if (demandDesc.length > 0) {
            do {
                demand = demandDesc.pop();
            } while (demandDesc.length > 0 && demand[0].time >= zoneFirstTime);
            //this.log(`Opposing Demand: ${zoneFirstTime}`, demand);
        }
        return demand;
    }

    getOpposingSupplyZone(timeframe, demandZone) {
        let zoneFirstTime = demandZone[0].time;
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        let mapDesc = new Map([...this.zoneMap.get(timeframe).supply.entries()].sort());
        let supplyDesc = Array.from(mapDesc.values());
        let supply = false;
        if (supplyDesc.length > 0) {
            do {
                supply = supplyDesc.pop();
            } while (supplyDesc.length > 0 && supply[0].time >= zoneFirstTime);
            //this.log(`Opposing Supply: ${zoneFirstTime}`, supply);
        }
        return supply;

    }

    daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    getTimeFrameInMinutes(timeframe) {
        let minutes = parseInt(timeframe);

        const INTERVALS_MAP = { // In minutes
            'h': 60,
            'd': 60 * 24,
            'w': 60 * 24 * 7,
            'm': 60 * 24 * this.daysInMonth(new Date().getMonth() + 1, new Date().getFullYear()),
        }

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

    async determineTrend() {
        let pivotSize = (this.getTimeFrameInMinutes(this.HTF) / this.getTimeFrameInMinutes(this.ITF)) - 1;
        //this.log(`Pivot Size: ${pivotSize}`);
        // Find 2 pivot highs and 2 pivot lows
        let pivotHighs = [];
        let pivotLows = [];
        let barRange = [];
        let barRangeMaxLength = (pivotSize * 2) + 1;
        let barMidRangeIndex = pivotSize;

        let allBars = this.getBars(this.ITF);

        for (let i = 0; i < allBars.length; i++) {
            let rBar = allBars[allBars.length - 1 - i];
            //this.log(`RBar :`,rBar);
            barRange.unshift(rBar);
            if (barRange.length > barRangeMaxLength) {
                barRange.pop();
            }

            if (barRange.length == barRangeMaxLength) {

                //this.log(`Bar Range Length: ${barRange.length}`);
                //this.log(`Bar Mid Range Index: ${barMidRangeIndex}`);
                //this.log(`Bar Range :`);
                //this.log(barRange);

                // Is Pivot High
                let barRangeHigh = this.getMaxBaseHigh(barRange);
                if (barRangeHigh == barRange[barMidRangeIndex].high && pivotHighs.length < 2) {
                    //this.log('Found Pivot High');
                    pivotHighs.unshift(barRange[barMidRangeIndex]);
                }
                // Is Pivot Low
                let barRangeLow = this.getMinBaseLow(barRange);
                if (barRangeLow == barRange[barMidRangeIndex].low && pivotLows.length < 2) {
                    //this.log('Found Pivot Low');
                    pivotLows.unshift(barRange[barMidRangeIndex]);
                }
            }

            if (pivotHighs.length >= 2 && pivotLows.length >= 2) {
                break;
            }
        }

        // If we have 2 pivot highs and 2 pivot lows access the trend
        if (pivotHighs.length >= 2 && pivotLows.length >= 2) {
            let HL = pivotLows[0].low < pivotLows[1].low;
            let HH = pivotHighs[0].high < pivotHighs[1].high;
            let LL = pivotLows[0].low > pivotLows[1].low;
            let LH = pivotHighs[0].high > pivotHighs[1].high;
            this.log(`HL = ${HL} | HH = ${HH} | LL = ${LL} | LH = ${LH}`);

            this.trend = this.trends.SIDEWAYS;
            if (HL) {
                if (HH) {
                    this.trend = this.trends.STRONGUP;
                } else {
                    this.trend = this.trends.UP;
                }
                if (LH) {
                    this.trend = this.trends.SIDEWAYS;
                }
            }
            if (LH) {
                if (LL) {
                    this.trend = this.trends.STRONGDOWN;
                } else {
                    this.trend = this.trends.DOWN;
                }
                if (HL) {
                    this.trend = this.trends.SIDEWAYS;
                }
            }
        }
    }

    async determineTrades() {
        this.log(`Determining Trades`);

        if (!this.curve == this.curvePlacements.UNKOWN) {
            throw new Error("Curve is not known");
        }

        if (!this.trend == this.trends.UNKOWN) {
            throw new Error("trend is not known");
        }


        let tradeOrders = [], stop, entry, target;
        let calculatedOddEnhancers;
        let targetZoneTimeStamp = Date.now();
        let entryZoneTimeStamp = Date.now();

        // Get Fresh Supply
        let supplyLTF = this.getLatestSupplyTimeFrame(this.LTF);
        let supplyITF = this.getLatestSupplyTimeFrame(this.ITF);
        //this.log(`Latest LTF Supply: `, supplyLTF);
        //this.log(`Latest ITF Supply: `, supplyITF);

        // Get Fresh Demands
        let demandLTF = this.getLatestDemandTimeFrame(this.LTF);
        let demandITF = this.getLatestDemandTimeFrame(this.ITF);
        //this.log(`Latest LTF Demand: `, demandLTF)
        // //this.log(`Latest ITF Demand: `, demandITF);

        // Look at curve, then trend, then what type of order based on supply or demand zones
        switch (this.curve) {
            case this.curvePlacements.HIGH:
                // "High On Curve" - Sell in big picture supply or wait for pullback to smaller timeframe supply zone

                switch (this.trend) {
                    case this.trends.UP:
                    case this.trends.STRONGUP:
                        // Sell in big picture supply
                        if (supplyITF) {
                            entryZoneTimeStamp = supplyITF[0].time;
                            stop = this.getSupplyDistalLine(supplyITF);
                            entry = this.getSupplyProximalLine(supplyITF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingDemandZone = this.getOpposingDemandZone(this.ITF, supplyITF);
                            if (opposingDemandZone) {
                                target = this.getDemandProximalLine(opposingDemandZone);
                                targetZoneTimeStamp = opposingDemandZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(supplyITF, this.ITF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().SELL, stop, entry, target));
                            }
                        }
                        break;
                    case this.trends.SIDEWAYS:
                    case this.trends.DOWN:
                    case this.trends.STRONGDOWN:
                        //wait for pullback to smaller timeframe supply zone to sell

                        if (supplyLTF) {
                            entryZoneTimeStamp = supplyLTF[0].time;
                            stop = this.getSupplyDistalLine(supplyLTF);
                            entry = this.getSupplyProximalLine(supplyLTF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingDemandZone = this.getOpposingDemandZone(this.LTF, supplyLTF);
                            if (opposingDemandZone) {
                                target = this.getDemandProximalLine(opposingDemandZone);
                                targetZoneTimeStamp = opposingDemandZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(supplyLTF, this.LTF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().SELL, stop, entry, target));
                            }
                        }
                        break;
                }
                break;
            case this.curvePlacements.EQUAL:
                // "Equilibrium" - Wait for pull back to smaller timeframe demand to buy or supply to sell
                switch (this.trend) {
                    case this.trends.UP:
                    case this.trends.STRONGUP:
                        // Wait for pull back to smaller timeframe  demand to buy

                        if (demandLTF) {
                            entryZoneTimeStamp = demandLTF[0].time;
                            stop = this.getDemandDistalLine(demandLTF);
                            entry = this.getDemandProximalLine(demandLTF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingSupplyZone = this.getOpposingSupplyZone(this.LTF, demandLTF);
                            if (opposingSupplyZone) {
                                target = this.getSupplyProximalLine(opposingSupplyZone);
                                targetZoneTimeStamp = opposingSupplyZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(demandLTF, this.LTF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().BUY, stop, entry, target));
                            }
                        }
                        break;
                    case this.trends.SIDEWAYS:
                        // Sell in a LTF Supply or Buy in a LTF Demand

                        if (demandLTF) {
                            entryZoneTimeStamp = demandLTF[0].time;
                            stop = this.getDemandDistalLine(demandLTF);
                            entry = this.getDemandProximalLine(demandLTF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingSupplyZone = this.getOpposingSupplyZone(this.LTF, demandLTF);
                            if (opposingSupplyZone) {
                                target = this.getSupplyProximalLine(opposingSupplyZone);
                                targetZoneTimeStamp = opposingSupplyZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(demandLTF, this.LTF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().BUY, stop, entry, target));
                            }
                        }
                        if (supplyLTF) {
                            entryZoneTimeStamp = supplyLTF[0].time;
                            stop = this.getSupplyDistalLine(supplyLTF);
                            entry = this.getSupplyProximalLine(supplyLTF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingDemandZone = this.getOpposingDemandZone(this.LTF, supplyLTF);
                            if (opposingDemandZone) {
                                target = this.getDemandProximalLine(opposingDemandZone);
                                targetZoneTimeStamp = opposingDemandZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(supplyLTF, this.LTF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().SELL, stop, entry, target));
                            }
                        }
                        break;
                    case this.trends.DOWN:
                    case this.trends.STRONGDOWN:
                        //Wait for pull back to smaller timeframe supply to sell

                        if (supplyLTF) {
                            entryZoneTimeStamp = supplyLTF[0].time;
                            stop = this.getSupplyDistalLine(supplyLTF);
                            entry = this.getSupplyProximalLine(supplyLTF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingDemandZone = this.getOpposingDemandZone(this.LTF, supplyLTF);
                            if (opposingDemandZone) {
                                target = this.getDemandProximalLine(opposingDemandZone);
                                targetZoneTimeStamp = opposingDemandZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(supplyLTF, this.LTF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().SELL, stop, entry, target));
                            }
                        }
                }

                break;
            case this.curvePlacements.LOW:
                // "Low On Curve" - Buy in big picture demand or wait for pullback to smaller timeframe demand zone to buy
                switch (this.trend) {
                    case this.trends.UP:
                    case this.trends.STRONGUP:
                    case this.trends.SIDEWAYS:
                        //Wait for pullback to smaller timeframe demand zone to buy

                        if (demandLTF) {
                            entryZoneTimeStamp = demandLTF[0].time;
                            stop = this.getDemandDistalLine(demandLTF);
                            entry = this.getDemandProximalLine(demandLTF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingSupplyZone = this.getOpposingSupplyZone(this.LTF, demandLTF);
                            if (opposingSupplyZone) {
                                target = this.getSupplyProximalLine(opposingSupplyZone);
                                targetZoneTimeStamp = opposingSupplyZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(demandLTF, this.LTF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().BUY, stop, entry, target));
                            }
                        }
                        break;
                    case this.trends.DOWN:
                    case this.trends.STRONGDOWN:
                        //Buy in big picture demand

                        if (demandITF) {
                            entryZoneTimeStamp = demandITF[0].time;
                            stop = this.getDemandDistalLine(demandITF);
                            entry = this.getDemandProximalLine(demandITF);
                            let risk = Math.abs(entry - stop);
                            if (risk == 0) {
                                break;
                            }

                            let opposingSupplyZone = this.getOpposingSupplyZone(this.ITF, demandITF);
                            if (opposingSupplyZone) {
                                target = this.getSupplyProximalLine(opposingSupplyZone);
                                targetZoneTimeStamp = opposingSupplyZone[0].time;
                                calculatedOddEnhancers = this.getOddEnhancers(demandITF, this.ITF);
                                tradeOrders.push(this.setBracketOrder(this.getBracketOrderBlank().BUY, stop, entry, target));
                            }
                        }
                        break;
                }
                break;
            default:
                // do nothing
                break;

        }

        for (let order of tradeOrders) {

            // Add Odds Enhancer Info
            order.oddsEnhancer.freshness = calculatedOddEnhancers.freshness;
            order.oddsEnhancer.strength = calculatedOddEnhancers.strength;
            order.oddsEnhancer.time = calculatedOddEnhancers.time;
            order.oddsEnhancer.profitZone = calculatedOddEnhancers.profitZone;

            // Order target must have atleast 3:1 Reward to Risk ratio
            let rr = this.getBORRratio(order);
            // Determine if the order has acceptable oddEnhancerScore
            let oeScoreTotal = this.getOrderOddsEnhancerScore(order);

            if (rr >= this.minRewardRiskRatio) {

                if (oeScoreTotal >= this.minOddsEnhancerScore) {

                    await this.placeOrder(order, targetZoneTimeStamp, entryZoneTimeStamp, rr, oeScoreTotal);

                } else {
                    this.log(`Didnt place order. R:R (${rr})| oeScore: ${oeScoreTotal}| OE: ${JSON.stringify(order.oddsEnhancer)} | Score was too low`);
                }
            } else {
                this.log(`Didnt place order. R:R (${rr})| oeScore: ${oeScoreTotal}| OE: ${JSON.stringify(order.oddsEnhancer)} | RR was too low`);
            }
        }

    }

    getOddEnhancers(zoneLTF, timeframe) {

        //this.log(`[TradingLocig.js] zoneLTF: `, zoneLTF);

        let freshnessCount = this.getZoneTouchCount(zoneLTF, timeframe);
        let freshnessLTF = (freshnessCount <= 1) ? 3 : ((freshnessCount == 2) ? 1.5 : 0);

        let legs = this.getLegsOut(zoneLTF, timeframe);
        let strengthLTF = 0;
        if (legs) {

            //this.log(`[TradingLocig.js] legs: `, legs);
            let legStart = legs[0];
            let legEnd = legs[legs.length - 1];
            let strengthHeight = Math.max(legStart.high, legEnd.low) - Math.min(legStart.low, legEnd.low);
            let strengthAngle = Math.abs(Math.atan(strengthHeight / (legEnd.time - legStart.time)) * 180 / Math.PI);
            strengthLTF = !isNaN(strengthAngle) ? ((strengthAngle >= 60) ? 2 : ((strengthAngle >= 45) ? 1 : 0)) : 0;
        }

        let zoneCandles = zoneLTF.length;
        let zoneTimeLTF = (zoneCandles <= 3) ? 2 : ((zoneCandles <= 6) ? 1 : 0);

        let htfRR = this.getHTFReward() / this.getHTFRisk();
        let zoneProfitHTF = (htfRR >= 3) ? 3 : ((htfRR >= 2) ? 1.5 : 0);

        return {
            freshness: freshnessLTF,
            strength: strengthLTF,
            time: zoneTimeLTF,
            profitZone: zoneProfitHTF
        };
    }

    getLegsOut(zone, timeframe) {
        let lastZoneBar = zone[zone.length - 1];
        let lastZoneBarTime = lastZoneBar.time;
        let allBars = this.getBars(timeframe, lastZoneBarTime);
        //this.log(`getLegsOut| Timeframe: ${timeframe} | allBars ${allBars.length}`);

        let legs = [];
        for (let bar of allBars) {
            if (this.isExcitingBar(bar)) {
                legs.push(bar);
            } else if (legs.length > 0) {
                break;
            }
        }
        return (legs.length > 0) ? legs : false;
    }

    getBracketOrderBlank() {
        let bob = {
            BUY: {
                target: {
                    price: 0,
                    orderType: this.Deribit.getOrderTypes().selllimit,
                    chartText: 'ST',

                },
                entry: {
                    price: 0,
                    orderType: this.Deribit.getOrderTypes().buylimit,
                    chartText: 'BE',


                },
                stop: {
                    price: 0,
                    orderType: this.Deribit.getOrderTypes().sellstopmarket,
                    chartText: 'SS',


                },
                text: "Buy Order Entry",
                status: {
                    pending: 'pending',
                    open: 'open',
                    closed: 'closed'
                },
                entryPrice: 0,
                exitPrice: 0,
                tradeSize: this.contractMultiple,
                oddsEnhancer: {
                    freshness: 0,
                    strength: 0,
                    time: 0,
                    profitZone: 0
                }
            },
            SELL: {
                target: {
                    price: 0,
                    orderType: this.Deribit.getOrderTypes().buylimit,
                    chartText: 'BT',
                },
                entry: {
                    price: 0,
                    orderType: this.Deribit.getOrderTypes().selllimit,
                    chartText: 'SE',
                },
                stop: {
                    price: 0,
                    orderType: this.Deribit.getOrderTypes().buystopmarket,
                    chartText: 'BS',
                },
                text: "Sell Order Entry",
                status: {
                    pending: 'pending',
                    open: 'open',
                    closed: 'closed'
                },
                entryPrice: 0,
                exitPrice: 0,
                tradeSize: this.contractMultiple,
                oddsEnhancer: {
                    freshness: 0,
                    strength: 0,
                    time: 0,
                    profitZone: 0
                }
            }
        };
        return bob;
    }

    getOrderOddsEnhancerScore(order) {
        let score = 0;
        for (let index in order.oddsEnhancer) {
            let sc = order.oddsEnhancer[index];
            score += sc;
        }
        return score;
    }

    async placeOrder(bracketOrder, targetZoneTimeStamp, entryZoneTimeStamp, rewardRisk = 0, oeScore = 0) {
        // see if order already placed
        let sp = bracketOrder.stop.price;
        let ep = bracketOrder.entry.price;
        let tp = bracketOrder.target.price;

        let risk = Math.abs(ep - sp);
        //this.log(`Risk: ${risk}`);
        // Set the trade size
        let uid = `S:${sp}|E:${ep}|T:${tp}|${targetZoneTimeStamp}|${entryZoneTimeStamp}`;
        if (uid.length + 7 > 64) { // Add 7 for the '|' + index concat
            this.log(`!!! WARNING !!! UID char length (${uid.length}) is greater than 64`)
        }
        //let uid = `${targetZoneTimeStamp}|${entryZoneTimeStamp}`;
        //let uid = `${sp}${ep}${tp}${targetZoneTimeStamp}${entryZoneTimeStamp}`;

        if (!this.orders.has(uid)) {
            this.orders.set(uid, bracketOrder);

            let tradeSize = this.getTradeSize(this.getRiskInTicks(risk)) * await this.getRiskMultiplier(oeScore);
            bracketOrder.tradeSize = tradeSize;

            if (tradeSize == 0 || !isFinite(tradeSize)) {
                this.orders.delete(uid);
                this.log(`Will not place order with 0 or infinity +/- value. | Determined Trade Size: ${tradeSize}`);
                return;
            }

            this.log(`Placing Order. R:R (${rewardRisk})| OE: ${oeScore} | UID: ${uid} | Order Size: ${tradeSize}`);

            //order.entry.orderType = order.text;
            let oArray = {'stop': bracketOrder.stop, 'entry': bracketOrder.entry, 'target': bracketOrder.target};

            // !!! WARNING: Leave this for loop ALONE!!!!
            for (const index in oArray) {
                let item = oArray[index];
                //this.log(`Here: Index: ${index} | Item: ${item}`);
                await this.Deribit.placeOrder(item.orderType, tradeSize, item.price, uid + '|' + index);
            }
        } else {
            //this.log(`Order (${uid}) Already placed`);
        }
    }

    btw(search, end1, end2) {
        let trueMin = Math.min(end1, end2);
        let trueMax = Math.max(end1, end2);

        return (trueMin <= search && search >= trueMax);
    }

    getMaxAccountRiskUSD(percent = .02) {
        return Math.max(this.getAccountTotalUSD() * percent, 0);
    }

    getAccountTotalUSD() {
        let total = 0;
        if (this.Deribit.isLoggedIn()) {
            let totalBTC = this.Deribit.getAccountTotalBTC();
            // Convert to USD
            let price = this.getLastBar(this.LTF).close;
            price = isFinite(price) ? price : 0;
            total = totalBTC * price;
        }
        return total;
    }

    async getOpenOrdersAsBracketOrdersMap() {
        // Rebuild bracket orders
        return await this.Deribit.getOpenOrders()
            .then(openData => {
                let bracketOrderMap = new Map();
                let openOrders = openData['result'];
                for (let order of openOrders) {
                    let orderLabel = order['label'];
                    let orderLabelArray = orderLabel.split('|');
                    let orderType = orderLabelArray.pop();
                    let uid = orderLabelArray.join('|');
                    if (!bracketOrderMap.has(uid)) {
                        bracketOrderMap.set(uid, new Map());
                    }
                    let orderDetails = {
                        'price': order['price'],
                        'direction': order['direction'],
                        'stop_price': order['stop_price'],
                        'order_id': order['order_id'],
                        'amount': order['amount'],
                        'label': orderLabel
                    };
                    bracketOrderMap.get(uid).set(orderType, orderDetails);
                }

                return bracketOrderMap;
            })
            .catch(error => {
                this.log(`Error Getting Open Orders As BracketOrderMap: ${error}`);
                return new Map();
            });

    }

    async handleOpenOrders() {
        this.log(`Handling Open Orders`);

        await this.getOpenOrdersAsBracketOrdersMap()
            .then(async (ordersData) => {
                this.orders = ordersData;
            })
            .then(async () => {
                let position = await this.Deribit.getPosition()
                    .catch(error => {
                    this.log(`Error Getting Position While Handling Open Orders`,error);
                    return {'size': 0};
                });
                let positionSize = position['size'];
                if (this.orders.size === 0 && positionSize !== 0) {
                    //TODO: Determine if this is a good idea or not ?!?!?
                    // If there are no open orders then close any open position
                    this.log(`No open Orders. Closing Open Position(s)`);
                    await this.Deribit.closeOpenPosition()
                        .catch(error=>{
                        this.log(`Error Closing Position While Handling Open Orders`,error);
                    });
                } else {
                    this.log(`Open Bracket Orders = ${this.orders.size}`);
                    await this.handleMissedEntries(this.orders)
                        .catch(error=>{
                        this.log(`Error Handling Missed Entries While Handling Open Orders`,error);
                    });
                    await this.updateTrailStops(this.orders)
                        .catch(error=>{
                            this.log(`Error Updating Trail Stops While Handling Open Orders`,error);
                        });
                }
            })
            .catch(error => {
                this.log(`Error While Handling Open Orders:`, error);
            })
            .then(() => {
                this.log(`Finished Handling Open Orders`);
            })
    }

    async handleMissedEntries(bracketOrderMap) {
        this.log(`Handling Missed Entries`);
        let currentPrice = this.getCurrentPrice(this.LTF);
        for (const uid of bracketOrderMap.keys()) {
            let currentBracketOrder = bracketOrderMap.get(uid);
            let entryLabel = uid + '|entry';
            //let stopLabel = uid + '|stop';
            //let targetLabel = uid + '|target';

            // ONLY dealing with fully open bracket orders
            if (currentBracketOrder.has('stop') && currentBracketOrder.has('target') && currentBracketOrder.has('entry')) {
                let entryPrice = currentBracketOrder.get('entry')['price'];
                let stopPrice = currentBracketOrder.get('stop')['stop_price'];
                let targetPrice = currentBracketOrder.get('target')['price'];

                //let risk = Math.abs(entryPrice - stopPrice);
                let reward = Math.abs(entryPrice - targetPrice);
                //let rr = Math.floor(reward / risk);
                let priceDelta = Math.abs(entryPrice - currentPrice);

                // Remove bracket order where the reward to risk has now fallen do to moving the trail stops
                // OR
                // Remove bracket orders where the price is closer to the target than the entry
                //if (rr < this.minRewardRiskRatio || priceDelta > (reward / 2)) {
                if (priceDelta > (reward * .75)) { // Price is 75% the way to the reward
                    this.log(`Price has moved too close to the target without hitting the entry. Cancelling the bracket orders.`);
                    // Should be able to cancel the entry and all other get canceled on update from the system
                    await this.Deribit.cancelByLabel(entryLabel);
                }
            }
        }
        this.log(`Finished Handling Missed Entries`);
    }

    async updateTrailStops(bracketOrderMap) {
        this.log(`Updating Trail Stops`);
        // Get all Stop Market Orders where the entry is filled
        for (const uid of bracketOrderMap.keys()) {
            let currentBracketOrder = bracketOrderMap.get(uid);

            // If we have a stop and target but no entry then we want to update trail stops accordingly
            if (currentBracketOrder.has('stop') && currentBracketOrder.has('target') && !currentBracketOrder.has('entry')) {

                let stopOrder = currentBracketOrder.get('stop');
                let direction = stopOrder['direction'];
                let stopPrice = stopOrder['stop_price'];
                let orderId = stopOrder['order_id'];
                let tradeSize = stopOrder['amount'];

                if (direction.indexOf('sell') !== -1) {
                    // If sell stop market
                    // get freshest demand and move stop price to the distal line (has to be greater than the time entry for the stop
                    let freshDemand = this.getFreshDemandTimeFrame(this.LTF);
                    if (freshDemand) {
                        let freshDemandDistal = this.getDemandDistalLine(freshDemand);
                        if (stopPrice < freshDemandDistal) {
                            this.log(`^^^ Updating Sell Stop Market Order to ${freshDemandDistal} ^^^`);
                            await this.Deribit.editStopOrder(orderId, tradeSize, freshDemandDistal);
                        }
                    }
                } else {
                    // If buy stop market
                    //get freshest supply and move stop price to the distal line (has to be greater than the time entry for the stop
                    let freshSupply = this.getFreshSupplyTimeFrame(this.LTF);
                    if (freshSupply) {
                        let freshSupplyDistal = this.getSupplyDistalLine(freshSupply);
                        if (stopPrice > freshSupplyDistal) {
                            this.log(`VVV Updating Buy Stop Market Order to ${freshSupplyDistal} VVV`);
                            await this.Deribit.editStopOrder(orderId, tradeSize, freshSupplyDistal)
                        }
                    }
                }
            } else if (currentBracketOrder.has('stop') && !currentBracketOrder.has('target') && !currentBracketOrder.has('entry')) {
                // Remove lingering trail stops that have no targets and no entries
                let stopLabel = uid + '|stop';
                await this.Deribit.cancelByLabel(stopLabel);
            }
        }
        this.log(`Finished Updating Trail Stops`);
    }

    getBORisk(bo) {
        return Math.abs(bo.entry.price - bo.stop.price);
    }

    getBOReward(bo) {
        return Math.abs(bo.entry.price - bo.target.price);
    }

    getBORRratio(bo) {
        return Math.floor(this.getBOReward(bo) / this.getBORisk(bo));
    }

    async getRiskMultiplier(oeScore = 5) {
        let maxOEScore = 10;
        let oeScorePercentage = oeScore / maxOEScore;
        let position = await this.Deribit.getPosition();
        //this.log(`Position: `, position);
        let leverage = (position['leverage']) ? position['leverage'] : 2; //  Deribit allows 100x leverage ???

        let maxLeverage = leverage * oeScorePercentage;
        let riskMultiplier = Math.max(this.minRiskMultiplier, Math.floor(maxLeverage * .75));
        this.log(`Risk Multiplier: ${riskMultiplier}| oeScore: ${oeScore} | oeScorePercent: ${oeScorePercentage} | leverage: ${leverage} | maxLeverage: ${maxLeverage}`);
        return riskMultiplier;

    }

    setBracketOrder(buysell, stop, entry, target) {
        let myOrder = Object.create(buysell);

        myOrder.stop.price = stop;
        myOrder.entry.price = entry;
        myOrder.target.price = target;
        myOrder.status = this.bracketOrder.BUY.status.pending;
        myOrder.oddsEnhancer = this.bracketOrder.BUY.oddsEnhancer;

        return myOrder;
    }

    getRiskInTicks(risk) {
        return Math.min(risk, this.minTickSize) / this.tickValue;
    }

    getTradeSize(riskInTicks) {
        // Maximum Account Risk (in dollars) / (Trade Risk (in ticks) x Tick Value) = Trade Size
        let tradeSize = Math.floor(this.getMaxAccountRiskUSD() / (riskInTicks * this.tickValue));
        let draftTS = isFinite(tradeSize) ? tradeSize : this.contractMultiple;
        let finalTS = Math.ceil(draftTS / this.contractMultiple) * this.contractMultiple;

        //this.log(`Tradesize: ${finalTS} | Max Account Risk \$${getMaxAccountRiskUSD()} | Trade Risk in Ticks: ${riskInTicks} | Tick Value: ${tickValue}`);
        return finalTS;
    }

    async handleOrderUpdates(orders) {
        for (let index in orders) {
            let order = orders[index];
            let orderLabel = order['label'];
            let orderState = order['order_state'];
            let closedOrderStates = ["filled", "rejected", "cancelled"];
            let orderLabelArray = orderLabel.split('|');
            let orderType = orderLabelArray.pop();
            let uid = orderLabelArray.join('|');
            let exitTypes = ['stop', 'target'];
            let stop = uid + '|stop';
            let target = uid + '|target';
            let entry = uid + '|entry';

            //this.log(`Order Sub. Label: ${orderLabel} | Type: ${orderType}`, order);

            // Add open Orders to Orders Map for tracking to not duplicate placing orders
            /*
            // Not needed because we handle open orders frequently
            if (!closedOrderStates.includes(orderState)) {
                let bracketOrder;
                if (!this.orders.has(uid)) {
                    this.log(`Found Open Order: ${uid}`);
                    this.orders.set(uid, order); // Just placing an order here so that it tracks something is already placed
                }
            }

             */

            // If order type is not entry OR order type is not filled then cancel the other tied (bracket) orders that are in closed order states/statuses
            if (orderType && (orderType.indexOf("entry") === -1 || orderState.indexOf('filled') === -1) && closedOrderStates.includes(orderState)) {
                this.log(`${orderType} Order ${orderState} | Canceling Bracket Orders`);
                await this.Deribit.cancelByLabel(stop);
                await this.Deribit.cancelByLabel(target);
                await this.Deribit.cancelByLabel(entry);
            }


            /*

            // If an exit order type gets filled, cancelled or rejected than close the other exits
            if (exitTypes.includes(orderType)) {
                // Cancel all other exits with same label
                if (closedOrderStates.includes(orderState)) {

                    if(orderType !== 'entry' || orderState.indexOf('filled')=== -1){

                    }

                    this.log(`${orderType} Order Closed | Canceling Bracket Orders`);
                    this.Deribit.cancelByLabel(stop);
                    this.Deribit.cancelByLabel(target);
                }
            } else if (orderType === 'entry') {
                // If entry gets canclled or rejected then close the other exits
                // this.log(`Canceling Bracket Orders Labeled: ${orderLabel}`);
                closedOrderStates = ["rejected", "cancelled"];
                if (closedOrderStates.includes(orderState)) {
                    this.log(`${orderType} Order Closed | Canceling Bracket Orders`);

                    this.Deribit.cancelByLabel(stop);
                    this.Deribit.cancelByLabel(target)
                }
            }

            */

        }
    }


}


module
    .exports = TradingLogic;
