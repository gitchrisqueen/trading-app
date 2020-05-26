/*
* Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
*/

const dBit = require('./deribit.js');
const tlUtils = new utils(true);
tlUtils.setLogColor('#FFDF00');
tlUtils.setScriptName('TradingLogic.js');


// noinspection DuplicatedCode
class TradingLogic {

    constructor() {
        this.testRan = false;

        this.scriptName = '';
        this.Deribit = new dBit();

        this.lastAssessmentTime = Date.now();

        this.incomeLevels = {
            intraday: "Intra-Day",
            hourly: "Hourly",
            daily: "Daily",
            weekly: "Weekly",
            monthly: "Monthly"
        };

        this.htfReward = 1;
        this.htfRisk = 11;
        this.minRewardRiskRatio = 3;

        this.barMap = new Map();
        this.baseMap = new Map();
        this.zoneMap = new Map();

        this.maxAPIBarInterval = 5000; // TODO: Determine best number of bars to retrieve

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
        this.minOddsEnhancerScore = 7; // TODO: Keep stats and pick the lowest score with the highest win %. NOTE: Setting to 5 to see if we only take halfway good trades (Max OEScore is 10)
        this.minLeverage = 40;
        this.maxLeverage = 50;

        this.bracketOrder = this.getBracketOrderBlank();
        this.orders = new Map();
        this.ordersQueue = new Map();
    }

    /**
     *  Returns the income levels as object array with  name and corresponding timeframes to determine trades
     * @returns {{intraday: string, daily: string, monthly: string, hourly: string, weekly: string}}
     */
    getIncomeLevels() {
        return this.incomeLevels;
    }

    /**
     * Returns the income level set for this trading logic instance with corresponding timeframes used to determine treads
     * @returns {*}
     */
    getIncomeLevel() {
        return this.incomeLevel;
    }

    /**
     *  Set the income level to use for trading decisions
     * @param incomeLevel
     */
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
            default:
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

    /**
     *  Determine which instrument returned from marketplace is most liquid (Highest volume followed by highest open interest)
     * @returns {unknown}
     */
    getMostLiquidInstrument() {
        let instruments = this.Deribit.getInstruments();

        // TODO: Determine if Perpetual should be removed or not
        // remove the perpetual so it doesnt sort using it
        //instruments.delete('BTC-PERPETUAL');

        //tlUtils.log(`Deribit Instruments: ${JSON.stringify([...instruments.entries()])}`);
        let instrumentsSorted = new Map([...instruments.entries()].sort(function ([, x], [, y]) {
            return (x['volume'] - y['volume'] || x['open_interest'] - y['open_interest']);
        }));

        //tlUtils.log(`Instruments Sorted by Liquidity: ${JSON.stringify([...instrumentsSorted.entries()])}`);
        let iMap = Array.from(instrumentsSorted.keys());
        let mostLiquidInstrument = iMap.pop();

        tlUtils.log(`Most Liquid Instrument: ${mostLiquidInstrument}`);

        return mostLiquidInstrument;
    }

    /**
     * Initiate all the asynchronous methods that need to run for this instance
     * @returns {Promise<void>}
     */
    async init() {
        tlUtils.log('Started');
        await this.Deribit.init();

        // Determine the Dated Contract that is most liquid (highest volume [more important] and open interest)
        let mostLiquidInstrument = this.getMostLiquidInstrument();

        // Put the instruments in to the map for later use. HTF and ITF use perpetual. LTF uses the most liquid instrument
        this.insturmentTimeframeMap = new Map();
        this.insturmentTimeframeMap.set(this.HTF, 'BTC-PERPETUAL');
        this.insturmentTimeframeMap.set(this.ITF, 'BTC-PERPETUAL');
        this.insturmentTimeframeMap.set(this.LTF, mostLiquidInstrument);

        // Setup the subscriptions for the instrument we will be executing trades on
        await this.Deribit.setupPositionSubscriptions(mostLiquidInstrument);

        // Get All Open Orders so they aren't duplicated if system restarts
        await this.trackAllOpenOrders();

        await this.Deribit.subscribeOrderUpdates(this.getInstrumentByTimeFrame(this.LTF), async (orders) => {
            await this.handleOrderUpdates(orders);
        });

        for (const timeframe of [this.HTF, this.ITF, this.LTF]) {

            // Setup bar map for each time frame
            this.barMap.set(timeframe, new Map());

            // Get All bars for each time frame
            await this.getAPIBars(timeframe)

            // Assess information for each timeframe
            await this.assessTimeFrame(timeframe);
            // Determine important information for the timeframe
            this.determineByTimeFrame(timeframe);

            // Subscribe to the api for new bar data for each time frame
            await this.Deribit.subscribeBars(this.getInstrumentByTimeFrame(timeframe), timeframe, async (data) => {

                // Add new Bar to Bar Map
                let newBarAdded = this.addSubscribedBarToMap(timeframe, data);

                // Need to place queued orders on every bar movement of LTF
                if (timeframe == this.LTF) {
                    //await this.test(); // TODO: Delete or comment out this line

                    // Place Queue Orders
                    await this.placeQueuedBracketOrders();
                }

                // Only make new assessments when a new bars is added. Not updated.
                if (newBarAdded) {
                    this.assessTimeFrame(timeframe);
                    // Determine important information for the timeframe
                    this.determineByTimeFrame(timeframe);
                }

                // Need to update our orders on every bar movement of LTF
                if (timeframe == this.LTF) {
                    // Update any trail stops for better profits or lingering trail stops
                    // Handle missed or straggling entry orders
                    await this.handleOpenOrders();
                }
            }).catch((error) => {
                tlUtils.log(`subscribeBars() Error:`, error);
            });

        }
    }

    //TODO: Move these test to their own testing file
    /*
    async test() {
        if (!this.testRan) {
            await this.test1();
            await this.test2()
            this.test3();
            this.test4()
            this.test5();
            this.testRan = true;
        } else {
            tlUtils.log(`Test Have Run. Exiting Program`);
            process.exit(1);
        }
    }

    async test1() {
        tlUtils.log(`Test 1: Create a sell bracket order to be placed where the price is between target and entry`)
        // Create a sell bracket order to be placed where the price is between target and entry
        let calculatedOddEnhancers = {
            freshness: 3,
            strength: 2,
            time: 2,
            profitZone: 3
        };
        let currentPrice = this.getCurrentPrice(this.LTF);
        let entry = currentPrice + 500;
        let stop = currentPrice + 1000
        let target = currentPrice - 1000;
        let bracketOrder = this.createCompleteBracketOrder(this.getBracketOrderBlank().SELL, stop, entry, target, calculatedOddEnhancers);
        let targetZoneTimeStampMili = Date.now();
        let entryZoneTimeStampMili = Date.now();
        let uid = this.getBOUID(bracketOrder, targetZoneTimeStampMili, entryZoneTimeStampMili);
        await this.placeBracketOrder(uid, bracketOrder);

    }

    async test2() {
        tlUtils.log(`Test 2: Create a buy bracket order to be placed where the price is between entry and stop`);
        // Create a buy bracket order to be placed where the price is between entry and stop
        let calculatedOddEnhancers = {
            freshness: 3,
            strength: 2,
            time: 2,
            profitZone: 3
        };
        let currentPrice = this.getCurrentPrice(this.LTF);
        let entry = currentPrice + 500;
        let stop = currentPrice - 500
        let target = currentPrice + 1750;
        let bracketOrder = this.createCompleteBracketOrder(this.getBracketOrderBlank().BUY, stop, entry, target, calculatedOddEnhancers);
        let targetZoneTimeStampMili = Date.now();
        let entryZoneTimeStampMili = Date.now();
        let uid = this.getBOUID(bracketOrder, targetZoneTimeStampMili, entryZoneTimeStampMili);
        await this.placeBracketOrder(uid, bracketOrder);

    }

    test3() {
        tlUtils.log(`Test 3: Queue a sell entry bracket order to be placed where the price is between stop and entry`);
        // Queue a sell bracket order to be placed where the price is between stop and entry
        let calculatedOddEnhancers = {
            freshness: 3,
            strength: 2,
            time: 2,
            profitZone: 3
        };
        let currentPrice = this.getCurrentPrice(this.LTF);
        let entry = currentPrice - 250;
        let stop = currentPrice + 250
        let target = currentPrice - 1750;
        let bracketOrder = this.createCompleteBracketOrder(this.getBracketOrderBlank().SELL, stop, entry, target, calculatedOddEnhancers);
        let targetZoneTimeStampMili = Date.now();
        let entryZoneTimeStampMili = Date.now();
        this.queueOrder(bracketOrder, targetZoneTimeStampMili, entryZoneTimeStampMili)

    }

    test4() {
        tlUtils.log(`Test 4: Queue a buy bracket order to be placed where the price is between target and entry`);
        // Queue a buy bracket order to be placed where the price is between target and entry
        let calculatedOddEnhancers = {
            freshness: 3,
            strength: 2,
            time: 2,
            profitZone: 3
        };
        let currentPrice = this.getCurrentPrice(this.LTF);
        let entry = currentPrice - 500;
        let stop = currentPrice - 1000
        let target = currentPrice + 1000;
        let bracketOrder = this.createCompleteBracketOrder(this.getBracketOrderBlank().BUY, stop, entry, target, calculatedOddEnhancers);
        let targetZoneTimeStampMili = Date.now();
        let entryZoneTimeStampMili = Date.now();
        this.queueOrder(bracketOrder, targetZoneTimeStampMili, entryZoneTimeStampMili)

    }

    test5() {
        tlUtils.log(`Test 5: Queue a buy bracket order to be placed where the price is between target and entry but closer to the target`);
        // Queue a buy bracket order to be placed where the price is between target and entry but closer to the target
        let calculatedOddEnhancers = {
            freshness: 3,
            strength: 2,
            time: 2,
            profitZone: 3
        };
        let currentPrice = this.getCurrentPrice(this.LTF);
        let entry = currentPrice - 1000;
        let stop = currentPrice - 1500
        let target = currentPrice + 500;
        let bracketOrder = this.createCompleteBracketOrder(this.getBracketOrderBlank().BUY, stop, entry, target, calculatedOddEnhancers);
        let targetZoneTimeStampMili = Date.now();
        let entryZoneTimeStampMili = Date.now();
        this.queueOrder(bracketOrder, targetZoneTimeStampMili, entryZoneTimeStampMili)

    }
     */

    /**
     * For the given timeframe map all bases, and discover supply, demand, and fresh zones
     * @param timeframe
     */
    assessTimeFrame(timeframe) {
        // Map out the bases for the timeframe
        tlUtils.log(`Mapping all Bases for Timeframe: ${timeframe}`);
        this.updateBaseMap(timeframe);

        // Need to setup New zoneMap for the timeframe
        this.zoneMap.set(timeframe, this.getZoneTypes());

        // Discover supply, demand, and fresh zones on every new zone
        tlUtils.log(`Discovering all Zones for Timeframe: ${timeframe}`);
        this.discoverZones(timeframe);

    }

    /**
     * Determine either the Curve (HTF), Trend (ITF), or Trade (LTF) for the given timeframe
     * @param timeframe
     */
    determineByTimeFrame(timeframe) {

        switch (timeframe) {
            case this.HTF:
                // Find the freshest supply and demand. Divide it into 3 parts. Draw Highlighted Curve zones. Determine place on curve
                this.determineCurve();
                tlUtils.log(`Curve: ${this.getCurve()}`);
                break;
            case this.ITF:
                // Determine Trend
                this.determineTrend();
                tlUtils.log(`Trend: ${this.getTrend()}`);
                break;
            case this.LTF:
                // Determine the trades to make
                this.determineTrades();
                //this.forceGC();
                break;
        }
    }

    /**
     * Return the properties (distal, proximal, isFresh, isSupply, isDemand) of the given zone in the given timeframe.
     * @param zone
     * @param timeframe
     * @returns {{distal, proximal: number}|{distal, proximal}}
     */
    getZonePropertiesAdvanced(zone, timeframe) {
        let zoneProperties = ch.getZoneProperties(zone, this.getCurrentPrice(timeframe));
        zoneProperties['isFresh'] = this.isFreshZone(zone, timeframe);
        return zoneProperties;
    }

    /**
     * Return an object array with indexes (supply, demand, freshsupply, freshdemand) that each hold a Map of zones with the zone's first bar time as the key
     * @returns {{freshdemand: Map<any, any>, freshsupply: Map<any, any>, supply: Map<any, any>, demand: Map<any, any>}}
     */
    getZoneTypes() {
        return {
            supply: new Map(),
            demand: new Map(),
            freshsupply: new Map(),
            freshdemand: new Map()
        };
    }

    /**
     * Call getOpenOrdersAsBracketOrdersMap() to map open orders placed on the market and mapped as brackets (Set, Entry, Target)
     * @returns {Promise<void>}
     */
    async trackAllOpenOrders() {
        this.orders = await this.getOpenOrdersAsBracketOrdersMap();
        tlUtils.log(`Total Open Bracket Orders: ${this.orders.size}`);
        let totalOrders = 0;
        for (const uid of this.orders.keys()) {
            totalOrders += this.orders.get(uid).size;
        }
        tlUtils.log(`Total Open Orders: ${totalOrders}`);
    }

    /**
     * Return the pre-calculated HTF risk determined when the Curve was calculated
     * @returns {number}
     */
    getHTFRisk() {
        return this.htfRisk;
    }

    /**
     * Return the pre-calculated HTF reward determined when the Curve was calculated
     * @returns {number}
     */
    getHTFReward() {
        return this.htfReward;
    }

    /**
     * Return the assessed Curve (High, Equal, Low, Unknown)
     * @returns {string}
     */
    getCurve() {
        return this.curve.text;
    }

    /**
     * Return the assessed Trend (Uptrend, Strong Uptrend, Sideways, Downtrend, Strong Downtrend, Unknown)
     * @returns {string}
     */
    getTrend() {
        return this.trend.text;
    }

    /**
     *  Return the current price for the timeFrame from the market
     *  TODO: Change this so its just current price. Timeframe shouldn't matter
     * @param timeframe
     * @returns {number}
     */
    getCurrentPrice(timeframe) {
        //let currentPrice =  this.getLastBar(timeframe).close;
        //let currentPrice = this.Deribit.getCurrentPriceStored(this.getInstrumentByTimeFrame(timeframe));
        //tlUtils.log(`Current Price: ${currentPrice}`);
        //return currentPrice;
        return this.Deribit.getCurrentPriceStored(this.getInstrumentByTimeFrame(timeframe));
    }

    /**
     * Return the last bar (open, close, high, low, time) for the given timeframe
     * @param timeframe
     * @returns {unknown}
     */
    getLastBar(timeframe) {
        let mapDesc = new Map([...this.barMap.get(timeframe).entries()].sort());
        let barsDesc = Array.from(mapDesc.values());
        //tlUtils.log(`Last bar time: ${lastBar.time}`);
        return barsDesc.pop();
    }

    /**
     * Return the first bar (open, close, high, low, time) for the given timeframe
     * @param timeframe
     * @returns {unknown}
     */
    getFirstBar(timeframe) {
        let mapDesc = new Map([...this.barMap.get(timeframe).entries()].sort());
        let barsDesc = Array.from(mapDesc.values());
        //tlUtils.log(`First bar: ${firstBar.time}`);
        return barsDesc.shift();
    }

    /**
     * Discover and map zones (supply, demand, freshSupply, freshDemand ) for the given timeframe
     * TODO: Determine if going from latest zone to oldets and keeping only a small subset is better than traversing all zones each time
     * @param timeframe
     */
    discoverZones(timeframe) {

        let currentPrice = this.getCurrentPrice(timeframe);
        let bases = this.getBasesTimeFrame(timeframe);

        //tlUtils.log(`Bases Found: ${bases.length}`);
        // tlUtils.log(`ZoneMap:`,this.zoneMap);

        // Discover each zone (Direction doesnt matter because we map on first base time and sort latter when needed
        for (const base of bases) {
            //tlUtils.log(`Base:`,base);

            let baseTime = base[0].time;

            // Find fresh zone
            let isFresh = false;

            isFresh = this.isFreshZone(base, timeframe);

            // Remove previous zone mapping
            //this.zoneMap.get(timeframe).supply.delete(baseTime);
            //this.zoneMap.get(timeframe).demand.delete(baseTime);
            //this.zoneMap.get(timeframe).freshdemand.delete(baseTime);
            //this.zoneMap.get(timeframe).freshsupply.delete(baseTime);

            if (ch.isSupply(base, currentPrice) === true) {
                //tlUtils.log(`Found Supply`);

                this.zoneMap.get(timeframe).supply.set(baseTime, base);
                //this.zoneMap.get(timeframe).demand.delete(baseTime);
                if (isFresh) {
                    //tlUtils.log(`Fresh Supply`);
                    this.zoneMap.get(timeframe).freshsupply.set(baseTime, base);
                } else {
                    //this.zoneMap.get(timeframe).freshsupply.delete(baseTime);
                }
            } else if (ch.isDemand(base, currentPrice) === true) {
                //tlUtils.log(`Found Demand`);

                this.zoneMap.get(timeframe).demand.set(baseTime, base);
                //this.zoneMap.get(timeframe).supply.delete(baseTime);
                if (isFresh) {
                    //tlUtils.log(`Fresh Demand`);
                    this.zoneMap.get(timeframe).freshdemand.set(baseTime, base);
                } else {
                    //this.zoneMap.get(timeframe).freshdemand.delete(baseTime);
                }
            }
        }
    }

    /**
     *
     * @param timeframe
     */
    updateBaseMap(timeframe) {
        //Dont delete bases. They dont change. Just update since last bar time
        //tlUtils.log(`Updating BaseMap for Timeframe: ${timeframe}`);
        let merged;
        if (this.baseMap.has(timeframe)) {

            let currentBaseMap = this.baseMap.get(timeframe);
            let currentBaseMapKeys = Array.from(currentBaseMap.keys()).sort();
            let lastBaseTime = currentBaseMapKeys.pop;

            // Get bars from the last base time to now to add new basses
            let bars = this.getBarsMapped(timeframe, lastBaseTime);
            //tlUtils.log(`Bars Count: ${bars.size}`);

            let newBaseMap = ch.discoverBasesFromBars(bars);
            merged = new Map([...currentBaseMap, ...newBaseMap]);
        } else {
            let bars = this.getBarsMapped(timeframe);
            //tlUtils.log(`Bars Count: ${bars.size}`);
            merged = ch.discoverBasesFromBars(bars);
        }

        this.baseMap.set(timeframe, merged);
        //tlUtils.log(`Bases Found: ${merged.length}`);

    }

    getBasesTimeFrame(timeframe) {
        let bases = [];
        if (this.baseMap.has(timeframe)) {
            bases = Array.from(this.baseMap.get(timeframe).values());
        }
        return bases
    }

    getBars(timeframe, from = 0, to = Date.now()) {
        let barsMapped = this.getBarsMapped(timeframe, from, to);
        return Array.from([...barsMapped.values()]);
    }

    getBarsMapped(timeframe, from = 0, to = Date.now()) {
        from = Math.min(Math.max(from, this.getFirstBar(timeframe).time), Date.now());
        to = Math.min(Math.min(to, this.getLastBar(timeframe).time), Date.now());

        let bars = this.barMap.get(timeframe);
        //tlUtils.log(`barMap(${timeframe}) has (${bars.size}) bars.`);

        return new Map([...bars.entries()].sort().filter(([, v]) => (from <= v.time && v.time <= to)));
    }

    async getAPIBars(timeframe, from = false, to = false) {

        tlUtils.log(`Getting API Bars for Timeframe: ${timeframe}`);
        let timeFrameInMinutes = ut.getTimeFrameInMinutes(timeframe); // Minute(s)
        let timeFrameMinuteMultiplier = 1;

        // TODO: Need to adjust for higher timeframes ???
        // Multiply/Divide by the delta of the next level

        //let divisor = 1;
        switch (timeframe) {
            case this.HTF:
                //divisor = this.div_mod(this.getTimeFrameInMinutes(this.HTF),this.getTimeFrameInMinutes(this.ITF))[0];
                timeFrameMinuteMultiplier = (60 * 24 * 31 * 3); // 3 months
                break;
            case this.ITF:
                //divisor = this.div_mod(this.getTimeFrameInMinutes(this.ITF),this.getTimeFrameInMinutes(this.LTF))[0];
                timeFrameMinuteMultiplier = (60 * 24 * 31); // 31 days (1 month)
                break;
            case this.LTF:
                timeFrameMinuteMultiplier = (60 * 24 * 3); // 3 days
                break;
        }


        from = (from) ? from : new Date(Date.now() - (1000 * 60 * timeFrameMinuteMultiplier)).getTime();
        to = (to) ? Math.min(to, Date.now()) : Date.now();

        /*
        let date = new Date();
        date.setTime(from);
        let fromUTC = date.toUTCString();
        date.setTime(to);
        let toUTC = date.toUTCString();
        tlUtils.log(`Requesting Bars From: ${fromUTC} - To: ${toUTC}`);

         */

        //Break this down into max Interval of bars and loop through
        let timeFrameInMilliseconds = timeFrameInMinutes * 60 * 1000;
        let delta = timeFrameInMilliseconds * this.maxAPIBarInterval; // Looping 1000 bars at a time
        let instrument = this.getInstrumentByTimeFrame(timeframe);
        for (let i = from; i < to; i += delta) {

            let nextTo = Math.min(i + delta - timeFrameInMilliseconds, to);

            await this.Deribit.getBars(instrument, i, nextTo, timeframe)
                .then(bars => {
                    //tlUtils.log(`getAllBars Found Count:`,bars.length);
                    for (const bar of bars) {
                        //bar['status'] = 'data';
                        this.addBarToMap(timeframe, bar);
                    }
                });
        }

        tlUtils.log(`Finished Getting API Bars for Timeframe: ${timeframe}`);
    }

    addBarToMap(timeframe, bar) {
        //tlUtils.log(`Adding Bar`);
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
        //tlUtils.log(`Removing Bar: ${firstBar.time}`);
        this.barMap.delete(firstBar.time);
    }

    /**
     * Add a bar to the barMap with the passed data
     * @param timeframe
     * @param data {{status:string,tick: number,close:number,open:number,high:number,low:number}}
     * @returns {boolean}
     */
    addSubscribedBarToMap(timeframe, data) {
        let bar;
        if (data.status !== 'no_data') {
            bar = {
                time: data.tick,
                close: data.close,
                open: data.open,
                high: data.high,
                low: data.low,
                //volume: data.cost // We dont care about volume. Less data to store
            };
            let newBarAdded = this.addBarToMap(timeframe, bar);
            if (newBarAdded) {
                // If we add a bar then remove a bar
                this.removeFirstBarFromMap(timeframe);
            }
            return newBarAdded;
        }
    }

    getZoneTouchCount(zone, timeframe) {
        let lastZoneBar = zone[zone.length - 1];
        let lastZoneBarTime = lastZoneBar.time;
        let zoneMin = ch.getMinBaseLow(zone);
        let zoneMax = ch.getMaxBaseHigh(zone);
        let searchBars = this.getBarsMapped(timeframe, lastZoneBarTime);

        let inside;
        let currentInside;
        let currentAbove;
        let currentBelow;
        let crosses = 0;
        let processFirstBar = true;

        for (const [, bar] of searchBars) {
            currentAbove = Math.max(bar.open, bar.close, bar.low, bar.high) > zoneMax;
            currentBelow = Math.min(bar.open, bar.close, bar.low, bar.high) < zoneMin;
            currentInside = !currentAbove && !currentBelow;
            if (processFirstBar) {
                inside = currentInside;
                processFirstBar = false;
            }

            if (currentInside !== inside) {
                crosses++;
            }

            inside = currentInside;
        }

        return crosses;
    }

    isFreshZone(zone, timeframe) {
        let crosses = this.getZoneTouchCount(zone, timeframe);
        //tlUtils.log(`Crosses: ${crosses}`);

        let isFresh = true;
        if (crosses > 1) {
            isFresh = false;
        }
        return isFresh;
    }

    determineCurve() {

        let freshSupply = this.getFreshSupplyTimeFrame(this.HTF);
        if (!freshSupply) {
            freshSupply = this.getLatestSupplyTimeFrame(this.HTF);
        }

        let freshDemand = this.getFreshDemandTimeFrame(this.HTF);
        if (!freshDemand) {
            freshDemand = this.getLatestDemandTimeFrame(this.HTF);
        }


        if (freshSupply !== false && freshDemand !== false) {
            let freshSupplyZoneProperties = ch.getZoneProperties(freshSupply, this.getCurrentPrice(this.HTF));
            let supplyProximal = freshSupplyZoneProperties['proximal'];
            let supplyDistal = freshSupplyZoneProperties['distal'];
            let freshDemandZoneProperties = ch.getZoneProperties(freshDemand, this.getCurrentPrice(this.HTF));
            let demandProximal = freshDemandZoneProperties['proximal'];
            let demandDistal = freshDemandZoneProperties['distal'];
            this.htfReward = Math.abs(supplyProximal - demandProximal);
            let htfDelta = this.getHTFReward() / 3;
            let equHigh = supplyProximal - htfDelta;
            let equLow = demandProximal + htfDelta;
            //let htfFrom = Math.min(freshSupply[0].time, freshDemand[0].time);
            //let htfTo = Math.max(freshSupply[freshSupply.length - 1].time, freshDemand[freshDemand.length - 1].time);

            // Determine Risk - whatever zone is oldest there diff (proximal-distal) = risk
            if (ch.getZoneTimeStampMilli(freshSupply) < ch.getZoneTimeStampMilli(freshDemand)) {
                this.htfRisk = Math.abs(supplyDistal - supplyProximal);
            } else {
                this.htfRisk = Math.abs(demandDistal - demandProximal);
            }

            let priceArray = [
                {type: 'currentPrice', price: this.getCurrentPrice(this.HTF)},
                {type: 'supplyProx', price: supplyProximal},
                {type: 'equLow', price: equLow},
                {type: 'equHigh', price: equHigh},
                {type: 'demandProx', price: demandProximal}
            ];
            let priceArraySorted = priceArray.sort((a, b) => (a.price < b.price) ? 1 : -1);
            let curvePlacementIndex = priceArraySorted.findIndex(item => item.type == "currentPrice");

            //tlUtils.log(`[Chart] Price Array Sorted`);
            //tlUtils.log(priceArraySorted);
            //tlUtils.log(`[Chart] Placement: ${placement}`);
            //tlUtils.log(priceArraySorted);

            switch (curvePlacementIndex) {
                case 1:
                    this.curve = this.curvePlacements.HIGH;
                    break;
                default:
                // Equilibrium is the default if we cant determine a curve
                case 2:
                    this.curve = this.curvePlacements.EQUAL;
                    break;
                case 3:
                    this.curve = this.curvePlacements.LOW;
                    break;
            }
        } else {
            tlUtils.log(`Cant determine curve without both supply and demand. Setting to EQUAL`);
            this.curve = this.curvePlacements.EQUAL;
        }
    }

    // noinspection DuplicatedCode
    getLatestSupplyTimeFrame(timeframe) {
        // Note: This is correctly sorting from newest to oldest
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        let mapDesc = new Map([...this.zoneMap.get(timeframe).supply.entries()].sort());
        let supplyDesc = Array.from(mapDesc.values());
        let supply = supplyDesc.pop();
        return (supply) ? supply : false;
    }

    // noinspection DuplicatedCode
    getFreshSupplyTimeFrame(timeframe) {
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        // Note: This is correctly sorting from newest to oldest
        let mapDesc = new Map([...this.zoneMap.get(timeframe).freshsupply.entries()].sort());
        let supplyDesc = Array.from(mapDesc.values());
        let freshSupply = supplyDesc.pop();
        return (freshSupply) ? freshSupply : false;
    }

    // noinspection DuplicatedCode
    getLatestDemandTimeFrame(timeframe) {
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        // Note: This is correctly sorting from newest to oldest
        let mapDesc = new Map([...this.zoneMap.get(timeframe).demand.entries()].sort());
        let demandDesc = Array.from(mapDesc.values());
        let demand = demandDesc.pop();
        return (demand) ? demand : false;
    }

    // noinspection DuplicatedCode
    getFreshDemandTimeFrame(timeframe) {
        if (!this.zoneMap.has(timeframe)) {
            return false;
        }
        // Note: This is correctly sorting from newest to oldest
        let mapDesc = new Map([...this.zoneMap.get(timeframe).freshdemand.entries()].sort());
        let demandDesc = Array.from(mapDesc.values());
        let freshDemand = demandDesc.pop();
        return (freshDemand) ? freshDemand : false;

    }

    getOpposingZone(timeframe, zone) {
        if (ch.isDemand(zone, this.getCurrentPrice(timeframe))) {
            return this.getOpposingSupplyZone(timeframe, zone);
        } else {
            return this.getOpposingDemandZone(timeframe, zone);
        }
    }

    // noinspection DuplicatedCode
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
            //tlUtils.log(`Opposing Demand: ${zoneFirstTime}`, demand);
        }
        return demand;
    }

    // noinspection DuplicatedCode
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
            //tlUtils.log(`Opposing Supply: ${zoneFirstTime}`, supply);
        }
        return supply;

    }

    getInstrumentByTimeFrame(timeframe) {
        return (this.insturmentTimeframeMap.has(timeframe)) ? this.insturmentTimeframeMap.get(timeframe) : 'BTC-PERPETUAL';
    }

    determineTrend() {
        let pivotSize = (ut.getTimeFrameInMinutes(this.HTF) / ut.getTimeFrameInMinutes(this.ITF)) - 1;
        //tlUtils.log(`Pivot Size: ${pivotSize}`);
        // Find 2 pivot highs and 2 pivot lows
        let pivotHighs = [];
        let pivotLows = [];
        let barRange = [];
        let barRangeMaxLength = (pivotSize * 2) + 1;
        let barMidRangeIndex = pivotSize;

        let allBars = this.getBars(this.ITF);

        for (let i = 0; i < allBars.length; i++) {
            let rBar = allBars[allBars.length - 1 - i];
            //tlUtils.log(`RBar :`,rBar);
            barRange.unshift(rBar);
            if (barRange.length > barRangeMaxLength) {
                barRange.pop();
            }

            if (barRange.length === barRangeMaxLength) {

                //tlUtils.log(`Bar Range Length: ${barRange.length}`);
                //tlUtils.log(`Bar Mid Range Index: ${barMidRangeIndex}`);
                //tlUtils.log(`Bar Range :`);
                //tlUtils.log(barRange);

                // Is Pivot High
                let barRangeHigh = ch.getMaxBaseHigh(barRange);
                if (barRangeHigh === barRange[barMidRangeIndex].high && pivotHighs.length < 2) {
                    //tlUtils.log('Found Pivot High');
                    pivotHighs.unshift(barRange[barMidRangeIndex]);
                }
                // Is Pivot Low
                let barRangeLow = ch.getMinBaseLow(barRange);
                if (barRangeLow === barRange[barMidRangeIndex].low && pivotLows.length < 2) {
                    //tlUtils.log('Found Pivot Low');
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
            tlUtils.log(`HL = ${HL} | HH = ${HH} | LL = ${LL} | LH = ${LH}`);

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

    getTradeOrder(zone, timeframe) {
        let tradeOrder = false;
        let zoneProperties = ch.getZoneProperties(zone, this.getCurrentPrice((timeframe)));
        let entryZoneTimeStampMilli = ch.getZoneTimeStampMilli(zone);
        let stop = zoneProperties['distal'];
        let entry = zoneProperties['proximal'];
        let risk = Math.abs(entry - stop);
        if (risk !== 0) {
            let opposingZone = this.getOpposingZone(timeframe, zone);
            if (opposingZone) {
                let opposingZoneProperties = ch.getZoneProperties(opposingZone, this.getCurrentPrice((timeframe)));
                let target = opposingZoneProperties['proximal'];
                let targetZoneTimeStampMilli = ch.getZoneTimeStampMilli(opposingZone);
                let calculatedOddEnhancers = this.getOddEnhancers(opposingZone, timeframe); // TODO: Should this be on the opposing zone or the target entry zone
                tradeOrder = {
                    'bracketOrder': this.createCompleteBracketOrder(this.getBracketOrderBlank().SELL, stop, entry, target, calculatedOddEnhancers),
                    'entryZoneTimeStampMilli': entryZoneTimeStampMilli,
                    'targetZoneTimeStampMilli': targetZoneTimeStampMilli
                };
            }
        }
        return tradeOrder;
    }

    determineTrades() {
        tlUtils.log(`Determining Trades`);

        if (this.curve == this.curvePlacements.UNKOWN) {
            throw new Error("Curve is not known");
        }

        if (this.trend == this.trends.UNKOWN) {
            throw new Error("Trend is not known");
        }

        let tradeOrders = [], tmpTradeOrder = false;

        // Get Fresh Supply
        let supplyLTF = this.getLatestSupplyTimeFrame(this.LTF);
        let supplyITF = this.getLatestSupplyTimeFrame(this.ITF);
        //tlUtils.log(`Latest LTF Supply: `, supplyLTF);
        //tlUtils.log(`Latest ITF Supply: `, supplyITF);

        // Get Fresh Demands
        let demandLTF = this.getLatestDemandTimeFrame(this.LTF);
        let demandITF = this.getLatestDemandTimeFrame(this.ITF);
        //tlUtils.log(`Latest LTF Demand: `, demandLTF)
        // //tlUtils.log(`Latest ITF Demand: `, demandITF);

        // Look at curve, then trend, then what type of order based on supply or demand zones
        switch (this.curve) {
            case this.curvePlacements.HIGH:
                // "High On Curve" - Sell in big picture supply or wait for pullback to smaller timeframe supply zone

                // noinspection DuplicatedCode
                switch (this.trend) {
                    case this.trends.UP:
                    case this.trends.STRONGUP:
                        // Sell in big picture supply
                        if (supplyITF && (tmpTradeOrder = this.getTradeOrder(supplyITF, this.ITF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                        break;
                    case this.trends.SIDEWAYS:
                    case this.trends.DOWN:
                    case this.trends.STRONGDOWN:
                        //wait for pullback to smaller timeframe supply zone to sell
                        if (supplyLTF && (tmpTradeOrder = this.getTradeOrder(supplyLTF, this.LTF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                        break;
                }
                break;
            case this.curvePlacements.EQUAL:
                // "Equilibrium" - Wait for pull back to smaller timeframe demand to buy or supply to sell
                // noinspection DuplicatedCode,DuplicatedCode,DuplicatedCode,DuplicatedCode
                switch (this.trend) {
                    case this.trends.UP:
                    case this.trends.STRONGUP:
                        // Wait for pull back to smaller timeframe  demand to buy
                        if (demandLTF && (tmpTradeOrder = this.getTradeOrder(demandLTF, this.LTF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                        break;
                    case this.trends.SIDEWAYS:
                        // Sell in a LTF Supply or Buy in a LTF Demand
                        if (demandLTF && (tmpTradeOrder = this.getTradeOrder(demandLTF, this.LTF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                        if (supplyLTF && (tmpTradeOrder = this.getTradeOrder(supplyLTF, this.LTF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                        break;
                    case this.trends.DOWN:
                    case this.trends.STRONGDOWN:
                        //Wait for pull back to smaller timeframe supply to sell
                        if (supplyLTF && (tmpTradeOrder = this.getTradeOrder(supplyLTF, this.LTF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                }
                break;
            case this.curvePlacements.LOW:
                // "Low On Curve" - Buy in big picture demand or wait for pullback to smaller timeframe demand zone to buy
                // noinspection DuplicatedCode
                switch (this.trend) {
                    case this.trends.UP:
                    case this.trends.STRONGUP:
                    case this.trends.SIDEWAYS:
                        //Wait for pullback to smaller timeframe demand zone to buy
                        if (demandLTF && (tmpTradeOrder = this.getTradeOrder(demandLTF, this.LTF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                        break;
                    case this.trends.DOWN:
                    case this.trends.STRONGDOWN:
                        //Buy in big picture demand
                        if (demandITF && (tmpTradeOrder = this.getTradeOrder(demandITF, this.ITF)) !== false) {
                            tradeOrders.push(tmpTradeOrder);
                        }
                        break;
                }
                break;
            default:
                // do nothing
                break;
        }

        for (let tOrder of tradeOrders) {

            let targetZoneTimeStampMilli = tOrder['targetZoneTimeStampMilli'];
            let entryZoneTimeStampMilli = tOrder['entryZoneTimeStampMilli'];
            let bracketOrder = tOrder['bracketOrder'];

            // Order target must have at least 3:1 Reward to Risk ratio
            let rr = this.getBORRratio(bracketOrder);
            // Determine if the order has acceptable oddEnhancerScore
            let oeScoreTotal = this.getBracketOrderOddsEnhancerScore(bracketOrder);

            if (rr >= this.minRewardRiskRatio) {

                if (oeScoreTotal >= this.minOddsEnhancerScore) {

                    this.queueOrder(bracketOrder, targetZoneTimeStampMilli, entryZoneTimeStampMilli);

                } else {
                    tlUtils.log(`Didnt place order. R:R (${rr})| oeScore: ${oeScoreTotal}| OE: ${JSON.stringify(bracketOrder.oddsEnhancer)} | Score was too low`);
                }
            } else {
                tlUtils.log(`Didnt place order. R:R (${rr})| oeScore: ${oeScoreTotal}| OE: ${JSON.stringify(bracketOrder.oddsEnhancer)} | RR was too low`);
            }
        }

    }

    getOddEnhancers(zoneLTF, timeframe) {
        //tlUtils.log(`[TradingLocig.js] zoneLTF: `, zoneLTF);

        // Calculate Freshness
        let freshnessCount = this.getZoneTouchCount(zoneLTF, timeframe);
        let freshnessLTF = (freshnessCount <= 1) ? 3 : ((freshnessCount == 2) ? 1.5 : 0);

        // calculate Strength
        let legs = this.getLegsOut(zoneLTF, timeframe);
        let strengthLTF = 0;
        if (legs) {

            //tlUtils.log(`[TradingLocig.js] legs: `, legs);
            let legStart = legs[0];
            let legEnd = legs[legs.length - 1];
            let strengthHeight = Math.max(legStart.high, legEnd.low) - Math.min(legStart.low, legEnd.low);
            let strengthAngle = Math.abs(Math.atan(strengthHeight / (legEnd.time - legStart.time)) * 180 / Math.PI);
            strengthLTF = !isNaN(strengthAngle) ? ((strengthAngle >= 60) ? 2 : ((strengthAngle >= 45) ? 1 : 0)) : 0;
        }

        // Calculate Time
        let zoneCandles = zoneLTF.length;
        let zoneTimeLTF = (zoneCandles <= 3) ? 2 : ((zoneCandles <= 6) ? 1 : 0);

        // Calculate Profit Zone
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
        //tlUtils.log(`getLegsOut| Timeframe: ${timeframe} | allBars ${allBars.length}`);

        let legs = [];
        for (let bar of allBars) {
            if (ch.isExcitingBar(bar)) {
                legs.push(bar);
            } else if (legs.length > 0) {
                break;
            }
        }
        return (legs.length > 0) ? legs : false;
    }

    getBracketOrderBlank() {
        return {
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
                direction: "buy",
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
                direction: "sell",
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
    }

    getBracketOrderOddsEnhancerScore(brackerOrder) {
        let score = 0;
        let oeScores = brackerOrder.oddsEnhancer;
        for (let index in oeScores) {
            let sc = oeScores[index];
            score += sc;
        }
        return score;
    }

    getBOUID(bracketOrder, targetZoneTimeStampMilli, entryZoneTimeStampMilli) {
        let sp = bracketOrder.stop.price;
        let ep = bracketOrder.entry.price;
        let tp = bracketOrder.target.price;

        // Take off the milliseconds of the timestamps
        let targetZoneTimeStamp = targetZoneTimeStampMilli / 1000;
        let entryZoneTimeStamp = entryZoneTimeStampMilli / 1000;

        //tlUtils.log(`Risk: ${risk}`);
        // Set the trade size
        let uid = `S:${sp}|E:${ep}|T:${tp}|${targetZoneTimeStamp}|${entryZoneTimeStamp}`;
        if (uid.length + 7 > 64) { // Add 7 for the '|' + index concat
            tlUtils.log(`!!! WARNING !!! UID char length (${uid.length}) is greater than 64`)
        }
        //let uid = `${targetZoneTimeStamp}|${entryZoneTimeStamp}`;
        //let uid = `${sp}${ep}${tp}${targetZoneTimeStamp}${entryZoneTimeStamp}`;

        return uid;
    }

    queueOrder(bracketOrder, targetZoneTimeStampMilli, entryZoneTimeStampMilli) {

        //TODO: Make these go into and pull from a database

        let uid = this.getBOUID(bracketOrder, targetZoneTimeStampMilli, entryZoneTimeStampMilli);

        // see if order already queued
        if (!this.ordersQueue.has(uid)) {
            this.ordersQueue.set(uid, bracketOrder);
        } else {
            //tlUtils.log(`Bracket Order (${uid}) Already Queue'd`);
        }
    }

    async placeQueuedBracketOrders() {
        //TODO: Make these pull from a database

        tlUtils.log(`Queued Bracket Orders: ${this.ordersQueue.size}`);

        for (let [uid, bracketOrder] of this.ordersQueue) {
            let currentPrice = this.getCurrentPrice(this.LTF);
            let reward = this.getBOReward(bracketOrder);
            let priceDelta = Math.abs(bracketOrder.entry.price - currentPrice);
            let orderReady = false;

            //TODO: Determine if the potential profit is not wiped out by the fees and if so remove the queued order

            // If price is between stop and entry than change entry to "stop_market type" and place order
            if (ut.btw(currentPrice, bracketOrder.stop.price, bracketOrder.entry.price, false)) {
                tlUtils.log(`Order ${bracketOrder.entry.orderType}| UID: ${uid} | Entry Changed to Stop Market Entry | Current Price: ${currentPrice}`);
                if (bracketOrder.entry.orderType.includes("buy")) {
                    bracketOrder.entry.orderType = this.Deribit.getOrderTypes().buystopmarket;
                } else {
                    bracketOrder.entry.orderType = this.Deribit.getOrderTypes().sellstopmarket;
                }
                orderReady = true;

                // If price is between entry and less than 50% toward target place order
            } else if (priceDelta <= (reward * (1 / 3))) {
                tlUtils.log(`Order ${bracketOrder.entry.orderType}| UID: ${uid} | Entry Changed to Limit Entry | Current Price: ${currentPrice}`);
                // Change to proper order type in case it was changed before
                if (bracketOrder.entry.orderType.includes("buy")) {
                    bracketOrder.entry.orderType = this.Deribit.getOrderTypes().buylimit;
                } else {
                    bracketOrder.entry.orderType = this.Deribit.getOrderTypes().selllimit;
                }
                orderReady = true;
            }
            if (orderReady) {
                let placed = await this.placeBracketOrder(uid, bracketOrder);
                if (placed) {
                    tlUtils.log(`Order UID: ${uid} | Removed from Queue`);
                    this.ordersQueue.delete(uid);
                }
            } else {
                tlUtils.log(`Order UID: ${uid} | Not ready to be placed`);
            }
        }
    }


    async placeBracketOrder(uid, bracketOrder) {
        let risk = this.getBORisk(bracketOrder);
        let rewardRisk = this.getBORRratio(bracketOrder);
        let oeScore = this.getBracketOrderOddsEnhancerScore(bracketOrder);

        // TODO: Determine if using a variable leveraged multiplier makes since of if causing more loss than gain.
        bracketOrder.tradeSize = this.getTradeSize(this.getRiskInTicks(risk)) * this.getRiskMultiplier(oeScore, this.minLeverage, this.maxLeverage);//Using leveraged multiplier
        //bracketOrder.tradeSize = this.getTradeSize(this.getRiskInTicks(risk)); // Not using leveraged multiplier

        if (bracketOrder.tradeSize == 0 || !isFinite(bracketOrder.tradeSize)) {
            tlUtils.log(`Will not place order with 0 or infinity +/- value. | Determined Trade Size: ${bracketOrder.tradeSize}`);
            return false;
        }

        tlUtils.log(`Placing Order. R:R (${rewardRisk})| OE: ${oeScore} | UID: ${uid} | Order Size: ${bracketOrder.tradeSize}`);

        let promises = [];
        promises.push(this.getOrderPromise(bracketOrder.stop, uid, 'stop', bracketOrder.tradeSize));
        promises.push(this.getOrderPromise(bracketOrder.target, uid, 'target', bracketOrder.tradeSize));
        promises.push(this.getOrderPromise(bracketOrder.entry, uid, 'entry', bracketOrder.tradeSize));

        await Promise.all(promises)
            .then((responses) => {
                //responses.map(response => tlUtils.log(`Promise Response: ` + response));
                tlUtils.log(`Bracket Order Placed. R:R (${rewardRisk})| OE: ${oeScore} | UID: ${uid} | Order Size: ${bracketOrder.tradeSize}`);
            })
            .catch(async (e) => {
                // Cancel all if one fails
                tlUtils.log(`Order UID: ${uid} | Failed to place. Closing other bracket order | Error: `, e);
                await this.closeBracket(uid + '|stop', uid + '|target', uid + '|entry')
                return false;
            });

        return true;
    }

    getOrderPromise(order, uid, index, orderSizeUSD) {
        return new Promise(async (resolve, reject) => {
            await this.Deribit.placeOrder(this.getInstrumentByTimeFrame(this.LTF), order.orderType, orderSizeUSD, order.price, uid + '|' + index)
                .then((result) => {
                    resolve(`Order ${uid}|${index} | Promised Resolved | ${result}`);
                })
                .catch((error) => {
                    tlUtils.log(error.message);
                    reject('Order ' + uid + '|' + index + ' | Promised Rejected');
                });
        });
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

    getBracketOrderLabelAsArray(orderLabel) {

        let [sp, ep, tp, targetZoneTimeStamp, entryZoneTimeStamp, ordertype] = orderLabel.split('|');
        sp = sp.slice(2);
        ep = ep.slice(2);
        tp = tp.slice(2);

        return {
            stopPrice: sp,
            entryPrice: ep,
            targetPrice: tp,
            targetZoneTimeStampMilli: targetZoneTimeStamp * 1000,
            entryZoneTimeStampMili: entryZoneTimeStamp * 1000,
            targetZoneTimeStamp: targetZoneTimeStamp,
            entryZoneTimeStamp: entryZoneTimeStamp,
            orderType: ordertype
        };
    }

    async getOpenOrdersAsBracketOrdersMap() {
        // Rebuild bracket orders
        return await this.Deribit.getOpenOrders(this.getInstrumentByTimeFrame(this.LTF))
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
            .catch((error) => {
                tlUtils.log(`Error Getting Open Orders As BracketOrderMap:`, error);
                return new Map();
            });

    }

    async handleOpenOrders() {
        this.orders = await this.getOpenOrdersAsBracketOrdersMap();

        if (this.orders.size == 0) {
            tlUtils.log(`No Open Orders.`);
            let position = this.Deribit.getPosition();
            //tlUtils.log(`Position: ${JSON.stringify(position)}`);
            let positionSize = parseFloat(position['size'] + '');
            let floating_profit_loss = parseFloat(position['floating_profit_loss'] + '');

            //TODO: Determine if this is a good idea or not ?!?!?
            // If there are no open orders then close any open position

            if (positionSize == 0) {
                tlUtils.log(`No Open Position(s)`);
            } else if (floating_profit_loss > 0) {
                // Close when profit/loss is positive
                tlUtils.log(`Closing Open Position(s)`);
                await this.Deribit.closeOpenPosition(this.getInstrumentByTimeFrame(this.LTF))
                    .catch((error) => {
                        tlUtils.log(`Error Closing Position While Handling Open Orders`, error);
                    });
            } else {
                tlUtils.log(`Waiting for positive profit on position to close`);
            }

        } else {
            tlUtils.log(`Handling Open Bracket Orders = ${this.orders.size}`);
            await this.removeBrokenBracketOrders(this.orders)
                .catch((error) => {
                    tlUtils.log(`Error Removing Broken Bracket Orders While Handling Open Orders`, error);
                });

            await this.handleMissedEntries(this.orders)
                .catch((error) => {
                    tlUtils.log(`Error Handling Missed Entries While Handling Open Orders`, error);
                });
            await this.updateTrailStops(this.orders)
                .catch((error) => {
                    tlUtils.log(`Error Updating Trail Stops While Handling Open Orders`, error);
                });
            tlUtils.log(`Finished Handling Open Bracket Orders`);
        }

    }

    async handleMissedEntries(bracketOrderMap) {
        tlUtils.log(`Handling Missed Entries`);
        let currentPrice = this.getCurrentPrice(this.LTF);
        for (const uid of bracketOrderMap.keys()) {
            let currentBracketOrder = bracketOrderMap.get(uid);
            let stopLabel = (currentBracketOrder.has('stop')) ? uid + '|stop' : false;
            let targetLabel = currentBracketOrder.has('target') ? uid + '|target' : false;
            let entryLabel = currentBracketOrder.has('entry') ? uid + '|entry' : false;

            // ONLY dealing with fully open bracket orders
            if (currentBracketOrder.has('stop') && currentBracketOrder.has('target') && currentBracketOrder.has('entry')) {
                let entryPrice = currentBracketOrder.get('entry')['price'];
                //let stopPrice = currentBracketOrder.get('stop')['stop_price'];
                let targetPrice = currentBracketOrder.get('target')['price'];

                //let risk = Math.abs(entryPrice - stopPrice);
                let reward = Math.abs(entryPrice - targetPrice);
                //let rr = Math.floor(reward / risk);
                let priceDelta = Math.abs(entryPrice - currentPrice);

                // Remove bracket order where the reward to risk has now fallen do to moving the trail stops
                // OR
                // Remove bracket orders where the price is closer to the target than the entry
                //if (rr < this.minRewardRiskRatio || priceDelta > (reward / 2)) {
                if (priceDelta > (reward * (2 / 3))) { // Price is 75% the way to the reward
                    tlUtils.log(`Price has moved (2/3 toward) too close to the target without hitting the entry. Cancelling the bracket orders.`);
                    // Should be able to cancel the entry and all other get canceled on update from the system
                    //await this.Deribit.cancelByLabel(entryLabel);
                    await this.closeBracket(stopLabel, targetLabel, entryLabel);
                }
            }
        }
        tlUtils.log(`Finished Handling Missed Entries`);
    }

    async removeBrokenBracketOrders(bracketOrderMap) {
        tlUtils.log(`Removing Broken Bracket Orders`);
        // Broken Criteria:
        // -- A Stop with out a target
        // -- A Target without a stop
        // -- A Entry without both a target and a stop

        for (const uid of bracketOrderMap.keys()) {
            let currentBracketOrder = bracketOrderMap.get(uid);
            if (ut.myXOR(currentBracketOrder.has('stop'), currentBracketOrder.has('target')) ||
                (currentBracketOrder.has('entry') && (!currentBracketOrder.has('stop') || !currentBracketOrder.has('target')))) {
                // Remove lingering trail stops that have no targets and no entries
                tlUtils.log(`Found Broken Bracket Order: Removing it Now!`);
                let stopLabel = (currentBracketOrder.has('stop')) ? uid + '|stop' : false;
                let targetLabel = currentBracketOrder.has('target') ? uid + '|target' : false;
                let entryLabel = currentBracketOrder.has('entry') ? uid + '|entry' : false;
                await this.closeBracket(stopLabel, targetLabel, entryLabel);
            }
        }
        tlUtils.log(`Finished Removing Broken Bracket Orders`);
    }

    async closeBracket(stop = false, target = false, entry = false) {
        let promises = [];
        let bracketOrdersClosing = [];
        if (stop) {
            promises.push(this.getClosePromise(stop));
            bracketOrdersClosing.push(stop);
        }
        if (target) {
            promises.push(this.getClosePromise(target));
            bracketOrdersClosing.push(target);
        }
        if (entry) {
            promises.push(this.getClosePromise(entry));
            bracketOrdersClosing.push(entry);
        }

        await Promise.allSettled(promises)
            .then((results) => {
                results.forEach((result) => tlUtils.log(result.status));
            })
            .then(() => {
                tlUtils.log(`Brackets Orders Closed: ${JSON.stringify(bracketOrdersClosing)}`);
            })
            .catch(async (e) => {
                tlUtils.log(`Error Closing Bracket Order. | Error: ${e.message}`)
            })
    }

    getClosePromise(label) {
        return new Promise(async (resolve, reject) => {
            await this.Deribit.cancelByLabel(label)
                .then((result) => {
                    resolve(`Closing Order ${label} | Result: ${JSON.stringify(result)}`);
                })
                .catch((error) => {
                    reject(new Error(`Couldn't close ${label} | Error: ${error.message}`));
                });
        });
    }

    async updateTrailStops(bracketOrderMap) {
        tlUtils.log(`Updating Trail Stops`);
        let currentPrice = this.getCurrentPrice(this.LTF);

        // Get all Stop Market Orders where the entry is filled
        for (const uid of bracketOrderMap.keys()) {
            let currentBracketOrder = bracketOrderMap.get(uid);

            // If we have a stop and target but no entry then we want to update trail stops accordingly
            if (currentBracketOrder.has('stop') && currentBracketOrder.has('target') && !currentBracketOrder.has('entry')) {

                // Get the risk delta from the order label
                let entryOrderLabelArray = this.getBracketOrderLabelAsArray(uid + '|entry');
                let riskDelta = Math.abs(entryOrderLabelArray.entryPrice - entryOrderLabelArray.stopPrice);
                let entryPrice = entryOrderLabelArray.entryPrice;


                let stopOrder = currentBracketOrder.get('stop');
                let direction = stopOrder['direction'];
                let stopPrice = stopOrder['stop_price'];
                let orderId = stopOrder['order_id'];
                let tradeSize = stopOrder['amount'];
                let zoneProperties;

                if (direction.indexOf('sell') !== -1) {
                    // If sell stop market move the stop price up to the next 1:1 reward point or fresh demand distal line. Whichever is higher
                    let nextStop = Math.max(stopPrice, entryPrice) + riskDelta;

                    // get freshest demand and move stop price to the distal line (has to be greater than the time entry for the stop
                    let freshDemand = this.getFreshDemandTimeFrame(this.LTF);
                    if (freshDemand) {
                        zoneProperties = ch.getZoneProperties(freshDemand, this.getCurrentPrice(this.LTF));
                        nextStop = Math.max(nextStop, zoneProperties['distal']);
                    }

                    if (currentPrice >= nextStop) {
                        tlUtils.log(`^^^ Updating Sell Stop Market Order to ${nextStop} ^^^`);
                        await this.Deribit.editStopOrder(orderId, tradeSize, nextStop);
                    }


                } else {
                    // If buy stop market move the stop price down to the next 1:1 reward point or fresh demand distal line. Whichever is lower
                    let nextStop = Math.min(stopPrice, entryPrice) - riskDelta;

                    //get freshest supply and move stop price to the distal line (has to be greater than the time entry for the stop
                    let freshSupply = this.getFreshSupplyTimeFrame(this.LTF);
                    if (freshSupply) {
                        zoneProperties = ch.getZoneProperties(freshSupply, this.getCurrentPrice(this.LTF));
                        nextStop = Math.min(nextStop, zoneProperties['distal']);
                    }

                    if (currentPrice <= nextStop) {
                        tlUtils.log(`VVV Updating Buy Stop Market Order to ${nextStop} VVV`);
                        await this.Deribit.editStopOrder(orderId, tradeSize, nextStop);
                    }
                }
            }
        }
        tlUtils.log(`Finished Updating Trail Stops`);
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

    getLeverage(minDefault = 1, max = 100) {
        let position = this.Deribit.getPosition();
        tlUtils.log(`Position (from API): ${JSON.stringify(position)}`,);
        let leverage = (position['leverage']) ? (position['leverage'] * .75) : 1; //  Deribit allows 100x leverage. We are capping at 75% of current leverage allowed
        leverage = Math.max(1, Math.min(minDefault, leverage));
        leverage = Math.min(max, leverage);
        return leverage;
    }

    getRiskMultiplier(oeScore = 5, minLeverage, maxLeverage) {
        let maxOEScore = 10;
        let oeScorePercentage = oeScore / maxOEScore;
        let leverage = this.getLeverage(minLeverage, maxLeverage);
        let finalMaxLeverage = leverage * oeScorePercentage;
        let riskMultiplier = Math.max(this.minRiskMultiplier, Math.floor(finalMaxLeverage));
        tlUtils.log(`Risk Multiplier: ${riskMultiplier}| oeScore: ${oeScore} | oeScorePercent: ${oeScorePercentage} | leverage: ${leverage} | maxLeverage: ${finalMaxLeverage}`);
        return riskMultiplier;

    }

    createCompleteBracketOrder(buysell, stop, entry, target, calculatedOddEnhancers) {
        let myOrder = Object.create(buysell);

        myOrder.stop.price = stop;
        myOrder.entry.price = entry;
        myOrder.target.price = target;
        myOrder.status = this.bracketOrder.BUY.status.pending;
        // Add Odds Enhancer Info
        myOrder.oddsEnhancer = calculatedOddEnhancers;
        //myOrder.oddsEnhancer.freshness = calculatedOddEnhancers.freshness;
        //myOrder.oddsEnhancer.strength = calculatedOddEnhancers.strength;
        //myOrder.oddsEnhancer.time = calculatedOddEnhancers.time;
        //myOrder.oddsEnhancer.profitZone = calculatedOddEnhancers.profitZone;

        return myOrder;
    }

    getRiskInTicks(risk) {
        return Math.min(risk, this.minTickSize) / this.tickValue;
    }

    getTradeSize(riskInTicks) {
        // Maximum Account Risk (in dollars) / (Trade Risk (in ticks) x Tick Value) = Trade Size
        let tradeSize = Math.floor(this.getMaxAccountRiskUSD() / (riskInTicks * this.tickValue));
        let draftTS = isFinite(tradeSize) ? tradeSize : this.contractMultiple;
        //tlUtils.log(`Tradesize: ${finalTS} | Max Account Risk \$${getMaxAccountRiskUSD()} | Trade Risk in Ticks: ${riskInTicks} | Tick Value: ${tickValue}`);
        return Math.ceil(draftTS / this.contractMultiple) * this.contractMultiple;
    }

    async handleOrderUpdates(orders) {

        await this.handleOpenOrders();

        //TODO: Do we need to do this (below VVV)

        /*
        for (let index in orders) {
            let order = orders[index];
            let orderLabel = order['label'];
            let orderState = order['order_state'];
            let closedOrderStates = ["filled", "rejected", "cancelled"];
            let orderLabelArray = orderLabel.split('|');
            let orderType = orderLabelArray.pop();
            let uid = orderLabelArray.join('|');
            //let exitTypes = ['stop', 'target'];
            let stop = uid + '|stop';
            let target = uid + '|target';
            let entry = uid + '|entry';

            //tlUtils.log(`Order Sub. Label: ${orderLabel} | Type: ${orderType}`, order);

            // Add open Orders to Orders Map for tracking to not duplicate placing orders
            /*
            // Not needed because we handle open orders frequently
            if (!closedOrderStates.includes(orderState)) {
                let bracketOrder;
                if (!this.orders.has(uid)) {
                    tlUtils.log(`Found Open Order: ${uid}`);
                    this.orders.set(uid, order); // Just placing an order here so that it tracks something is already placed
                }
            }

             */

        /*

            // TODO: Handle partially filled entries by fixing the stop and target trades size to match


            // If order type is not entry OR order type is not filled then cancel the other tied (bracket) orders that are in closed order states/statuses
            if (orderType && (orderType.indexOf("entry") === -1 || orderState.indexOf('filled') === -1) && closedOrderStates.includes(orderState)) {
                tlUtils.log(`${orderType} Order ${orderState} | Canceling Bracket Orders`);
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

                    tlUtils.log(`${orderType} Order Closed | Canceling Bracket Orders`);
                    this.Deribit.cancelByLabel(stop);
                    this.Deribit.cancelByLabel(target);
                }
            } else if (orderType === 'entry') {
                // If entry gets canclled or rejected then close the other exits
                // tlUtils.log(`Canceling Bracket Orders Labeled: ${orderLabel}`);
                closedOrderStates = ["rejected", "cancelled"];
                if (closedOrderStates.includes(orderState)) {
                    tlUtils.log(`${orderType} Order Closed | Canceling Bracket Orders`);

                    this.Deribit.cancelByLabel(stop);
                    this.Deribit.cancelByLabel(target)
                }
            }


        }

         */
    }
}

module.exports = TradingLogic;