/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const Connection = require('deribit-v2-ws-gitchrisqueen');
let bluebird = require('bluebird');
const utils = require('./utils');

class Deribit {

    /**
     * Utilizes a connection to the deribit API and initialized a few local variables
     * @param {Connection} deribitApi
     * @param {boolean} debug - flag used to decide when to print logging information
     */
    constructor(deribitApi, debug = false) {
        this._debug = debug;
        this._deribitApi = deribitApi;
        this.chalk = null;
        this.loadChalk();

        if (this._debug) {
            process.on("unhandledRejection", function (reason, promise) {
                /* You might start here by adding code to examine the
                   promise specified by event.promise and the reason in
                   event.reason */

                console.log(chalk.red.bold("[PROCESS] Unhandled Promise Rejection"));
                console.log(chalk.red.bold("- ".padEnd(30, '- ')));
                console.log(`Reason`);
                console.log(reason);
                console.log(`Promise`);
                console.log(promise);
                console.log(chalk.red.bold("- ".padEnd(30, '- ')));

            });
        }

        this.defaultPosition = {
            'leverage': 1,
            'size': 0,
            'floating_profit_loss': 0
        };

        this.instruments = new Map();
        this.currentPriceMap = new Map();

        this.position = this.defaultPosition;

        this.portfolio = {
            "total_pl": 0,
            "session_upl": 0,
            "session_rpl": 0,
            "session_funding": 0,
            "portfolio_margining_enabled": false,
            "options_vega": 0,
            "options_value": 0,
            "options_theta": 0,
            "options_session_upl": 0,
            "options_session_rpl": 0,
            "options_pl": 0,
            "options_gamma": 0,
            "options_delta": 0,
            "margin_balance": 0,
            "maintenance_margin": 0,
            "initial_margin": 0,
            "futures_session_upl": 0,
            "futures_session_rpl": 0,
            "futures_pl": 0,
            "equity": 0,
            "delta_total": 0,
            "currency": "BTC",
            "balance": 0,
            "available_withdrawal_funds": 0,
            "available_funds": 0
        };

        this.orderTypes = {
            buylimit: "buy_limit",
            buystopmarket: "buy_stop_market",
            selllimit: "sell_limit",
            sellstopmarket: "sell_stop_market"
        };
    }

    async loadChalk() {
        this.chalk = await import('chalk');
    }

     async log(message, variable = false) {
        if (!this.chalk) {
            await this.loadChalk();
        }
        if (this._debug) {
            utils.log(`[Deribit.js]`, message, variable, '#008000');
        }
    }

    /**
     * Calls on the end method from the _deribitApi variable.
     * @returns {Promise<void>}
     */
    async disconnect() {
        await this._deribitApi.end();
    }

    /**
     * Calls the connect and disable_cancel_on_disconnect functions of _deribitApi. Setup subscriptions
     * @returns {Promise<void>}
     */
    async init() {
        await this._deribitApi.connect()
            .then(() => {
                this.log(`${new Date} | connected`);
            })
            .catch((error) => {
                this.log(`${new Date} | could not connect`, error);
                throw new Error('Could not connect: Error: ' + error.message);
            });

        /*
        // TODO: Determine if this is necessary if you are able to keep the connection open indefinitely
        await this._deribitApi.enable_cancel_on_disconnect()
            .then(() => {
                 dbthis.log(`${new Date} | Enable cancel on disconnect`);
            })
            .catch((error) => {
                 dbthis.log(`${new Date} | Could not enable cancel on disconnect.`, error);
            });
         */

        await this._deribitApi.disable_cancel_on_disconnect()
            .then(() => {
                this.log(`${new Date} | Disable cancel on disconnect`);
            })
            .catch((error) => {
                this.log(`${new Date} | Could not disable cancel on disconnect.`, error);
            });

        // Get available instruments from the API
        await this.retrieveAPIInstruments();

        // Get the account summary so you know amounts to trade
        await this.retrieveAccountSummary();

        // Subscribe to portfolio updates so we have current amounts
        await this.subscribePortfolioUpdates();
    }

    /**
     * Return Object array of valid order types
     * @returns {{sellstopmarket: string, buylimit: string, selllimit: string, buystopmarket: string}}
     */
    getOrderTypes() {
        return this.orderTypes;
    }

    /**
     * Returns the equity property value of the portfolio property
     * @returns {number}
     */
    getPortfolioEquityBTC() {
        return this.portfolio.equity;
    }

    /**
     * Returns the total profit and loss of the portfolio in bitcoin
     * @returns {number}
     */
    getPortfolioTotalPLBTC() {
        return this.portfolio.total_pl;
    }

    /**
     * Returns the account total in bitcoin which equals the portfolio equity + the portfolio total profit and loss
     * @returns {number}
     */
    getAccountTotalBTC() {
        return this.getPortfolioEquityBTC() + this.getPortfolioTotalPLBTC();
    }

    /**
     * Return the requested bars for instrument from start to stop in the increments designated by resolution as an array containing properties (high,low,open,close,time)
     * @param instrument
     * @param start
     * @param stop
     * @param resolution
     * @returns {Promise<*|*[]>}
     */
    async getBars(instrument, start, stop, resolution) {
        let date = new Date();
        date.setTime(start);
        let startUTC = date.toUTCString();
        date.setTime(stop);
        let stopUTC = date.toUTCString();
        this.log(`Getting Bars From: ${startUTC} - To: ${stopUTC}`);
        return await this._deribitApi.get_tradingview_chart_data(instrument, start, stop, resolution)
            .then(response => {

                let bars = [];

                if (!response.result) {
                    this.log(`Error Getting Bars from API No Results. Error: `, response.error);
                    return bars;
                }
                const data = response.result;

                //dbthis.log(`Get Bars Response`);
                //dbthis.log(response);

                let nodata = data.status === 'no_data';

                if (data.status !== 'ok' && !nodata) {
                    return bars;
                }


                let barsCount = nodata ? 0 : data.ticks.length;
                //dbthis.log(`Get Bars Count: ${barsCount}`);

                //let volumePresent = typeof data.cost != 'undefined';
                let ohlPresent = typeof data.open != 'undefined';

                for (let i = 0; i < barsCount; ++i) {
                    let barValue = {
                        time: data.ticks[i],
                        close: data.close[i]
                    };

                    if (ohlPresent) {
                        barValue.open = data.open[i];
                        barValue.high = data.high[i];
                        barValue.low = data.low[i];
                    } else {
                        barValue.open = barValue.high = barValue.low = barValue.close;
                    }

                    // Note: We dont care about volume. Less data to store
                    //if (volumePresent) {
                    //barValue.volume = data.cost[i];
                    //}

                    bars.push(barValue);

                }
                return bars;
            })
            .catch(async (error) => {
                this.log(`Error Getting Bars from API.`, error);
                return [];
            });
    }

    /**
     * Returns array of open orders for instrument parameter
     * @param instrument
     * @param type
     * @returns {Promise<*|{result: []}>}
     */
    async getOpenOrders(instrument, type = "all") {
        return await this._deribitApi.get_open_orders_by_instrument(instrument, type)
            .catch((error) => {
                this.log(`getOpenOrders Error:`, error);
                return {'result': []};
            });
    }

    /**
     * Returns array of open orders that are type stop_all for instrument parameter
     *  * @param instrument
     * @returns {Promise<*|{result: *[]}|{result: []}>}
     */
    async getOpenStopOrders(instrument) {
        return await this.getOpenOrders(instrument, 'stop_all')
            .catch((error) => {
                this.log(`getOpenStopOrders Error:`, error);
                return {'result': []};
            });
    }

    /**
     * Return the position array stored from calling getInitialPosition or any subscripotion call returning the position
     *  @returns {{leverage: number, floating_profit_loss: number, size: number}}
     */
    getPosition() {
        return this.position;
    }

    /**
     * Get the initial position of the account for the given instrument from the _DataConnector API
     * @param instrument
     * @returns {Promise<void>}
     */
    async getInitialPosition(instrument) {
        await this._deribitApi.getPosition(instrument)
            .then((data) => {
                if (data['result']) {
                    this.position = data['result'];
                } else {
                    this.log(`Using Default Position`);
                    this.position = this.defaultPosition;
                }
            })
            .catch((error) => {
                this.log(`Could not Get Initial Position Error:`, error);
            });
    }

    /**
     * Returns the instruments available from the api as map object. Should have info for property BTC-PERPETUAL at minimum
     * @returns {Map}
     */
    getInstruments() {
        return this.instruments;
    }

    /**
     * Stores the given price for the instrument to the currentPriceMap
     * @param instrument
     * @param price
     */
    setCurrentPriceStored(instrument,price) {
        this.currentPriceMap.set(instrument,price);
    }

    /**
     * Returns the value of the current price for the given instrument stored in a Map object
     * @param instrument
     * @returns {number}
     */
    getCurrentPriceStored(instrument) {
        return parseFloat((this.currentPriceMap.has(instrument)) ? this.currentPriceMap.get(instrument) : 0);
    }

    /**
     * Returns the current price for the given instrument live from the deribit API
     * @param instrument
     * @returns {Promise<*>}
     */
    async getCurrentPriceLive(instrument) {
        return await this._deribitApi.get_ticker(instrument)
            .then((data) => {
                if (data['result']) {
                    return data['result']['mark_price'];
                } else {
                    return 0;
                }

                // dbthis.log(`Close Position(s) Result: ${JSON.stringify(data)}`);
            })
            .catch((error) => {
                this.log(`Could Not Get Current Price for ${instrument}`, error);
            });
    }

    /**
     * Calls methods getInitialPosition(),subscribePositionChanges(), and subscribeTicker() with instrument as parameter to each
     * @param instrument
     * @returns {Promise<void>}
     */
    async setupPositionSubscriptions(instrument) {

        await this.getInitialPosition(instrument);

        this.log(`My Position: ${JSON.stringify(await this.getPosition())}`);

        // Subscribe to Users Changes (updates related to orders, trades, etc)
        await this.subscribePositionChanges(instrument);

        // Subscribe to ticker for current price updates
        await this.subscribeTicker(instrument);
    }

    async subscribePositionChanges(instrument) {
        let channel = 'user.changes.' + instrument + '.100ms';

        await this._deribitApi.subscribe('private', channel)
            .then(() => {
                    this.log(`Subscribed To Channel: ${channel}`);
                }
            )
            .then(() => {
                this._deribitApi.on(channel, async (data) => {
                    this.log(`Data from channel: ${channel}: ${JSON.stringify(data)}`);
                    if (data['positions']) {
                        if (data['positions'][0]) {
                            let position = data['positions'][0];
                            this.position['leverage'] = (position['leverage']) ? position['leverage'] : this.position['leverage'];
                            this.position['size'] = (position['size']) ? position['size'] : this.position['size'];
                            this.position['floating_profit_loss'] = (position['floating_profit_loss']) ? position['floating_profit_loss'] : this.position['floating_profit_loss'];
                            this.log(`Position Update: ${JSON.stringify(this.position)}`);
                        } else {
                            this.log(`No Positions Returned. Getting Directly.`);
                            await this.getInitialPosition(instrument);
                        }
                    } else {
                        this.log(`No Position Change`);
                    }
                });
            })
            .catch((error) => {
                this.log(`Could Not Subscribe to Channel: ${channel}`, error);

            });
    }

    async subscribePortfolioUpdates() {
        let channel = 'user.portfolio.btc';

        await this._deribitApi.subscribe('private', channel)
            .then(() => {
                    this.log(`Subscribed To Channel: ${channel}`);
                }
            )
            .then(() => {
                this._deribitApi.on(channel, (data) => {
                    this.portfolio = data;
                    //dbthis.log(`Portfolio Update: `, this.portfolio);
                });
            })
            .catch((error) => {
                this.log(`Could Not Subscribe Channel: ${channel}`, error);

            });

    }

    async subscribeBars(instrument, timeframe, onCallback) {
        let channel = "chart.trades." + instrument + "." + timeframe;
        await this._deribitApi.subscribe('private', channel)
            .then(() => {
                    this.log(`Subscribed To Channel: ${channel}`);
                }
            ).then(() => {
                this._deribitApi.on(channel, onCallback);
            })
            .catch((error) => {
                this.log(`Could Not Subscribe to Channel: ${channel}`, error);
            });

    }

    async subscribeTicker(instrument) {
        let channel = 'ticker.' + instrument + '.100ms';
        if (!this.currentPriceMap.has(instrument)) {
            await this._deribitApi.subscribe('private', channel)
                .then(() => {
                        this.log(`Subscribed To Channel: ${channel}`);
                    }
                ).then(() => {
                    this._deribitApi.on(channel, (data) => {
                        if (data['mark_price']) {
                            this.setCurrentPriceStored(instrument,data['mark_price']);
                        }
                        //dbthis.log(`Portfolio Update: `, this.portfolio);
                    });
                })
                .catch((error) => {
                    this.log(`Could Not Subscribe to Channel: ${channel}`, error);
                });
        } else {
            this.log(`Already Subscribed to ${channel}`);
        }

    }

    async subscribeOrderUpdates(instrument, onCallback) {
        let channel = 'user.orders.' + instrument + '.100ms';
        await this._deribitApi.subscribe('private', channel)
            .then(() => {
                    this.log(`Subscribed To Channel: ${channel}`);
                }
            ).then(() => {
                this._deribitApi.on(channel, onCallback);
            })
            .catch((error) => {
                this.log(`Could Not Subscribe to Channel: ${channel}`, error);
            });

    }

    /**
     * Retrieves the account summary data and stores to portfolio property.
     */
    async retrieveAccountSummary() {
        await this._deribitApi.get_account_summary('BTC', true)
            .then((data) => {
                if (data['result']) {
                    this.portfolio = data['result'];
                }
                this.log(`Account Summary Retrieved: ${JSON.stringify(this.portfolio)}`);
            })
            .catch((error) => {
                this.log(`Could not get Account Summary Error:`, error);
            });
    }

    /**
     * Retrieve the instruments available from the deribit api and store them to the instruments (map) property
     */
    async retrieveAPIInstruments() {
        this.instruments = new Map();
        await this._deribitApi.get_instruments('BTC', 'future', false)
            .then(async (data) => {
                //dbthis.log(`Data from _deribitApi.get_instruments(): ${JSON.stringify(data)}`);
                if (data['result']) {
                    for (let i = 0; i < data['result'].length; ++i) {
                        let instrumentName = data['result'][i]['instrument_name'];
                        //dbthis.log(`Instrument Name : ${instrumentName}`);
                        let bookSummaryArray = await this._deribitApi.get_book_summary_by_instrument(instrumentName)
                            .then((bookSummaryData) => {
                                if (bookSummaryData['result']) {
                                    return bookSummaryData['result'][0];
                                }
                            })
                            .catch((error) => {
                                this.log(`Could not get Book Summary Error:`, error.message);
                                return {'volume': 0, 'open_interest': 0};
                            });
                        //dbthis.log(`Instrument (${instrumentName}) Book Summary: ${JSON.stringify(bookSummaryArray)}`);
                        this.instruments.set(instrumentName, bookSummaryArray);
                    }
                    //dbthis.log(`Instruments Retrieved: ${JSON.stringify([...this.instruments.entries()])}`);
                }
            })
            .catch((error) => {
                this.log(`Could not get Instruments Error:`, error.message);
            });
    }

    async editStopOrder(orderId, orderSizeUSD, stopPrice) {
        await this._deribitApi.editOrder(orderId, orderSizeUSD, false, stopPrice)
            .catch((error) => {
                this.log(`getStopOrders Error:`, error);
            });
    }

    async closeOpenPosition(instrument) {
        await this._deribitApi.close_position(instrument, 'market')
            .then((data) => {
                //dbthis.log(`Position(s) Closed`);
                this.log(`Close Position(s) Result: ${JSON.stringify(data)}`);
            })
            .catch((error) => {
                this.log(`Could Not Close Open Position`, error);
            });
    }

    async cancelByLabel(label) {
        await this._deribitApi.cancel_order_by_label(label)
            .catch((error) => {
                this.log(`Could Not Cancel By Label: ${label}`, error);
            });
    }

    async placeOrder(instrument, orderType, orderSizeUSD, price, label = "tradingapp") {

        let orderLabelArray = label.split('|');
        let orderSETType = orderLabelArray.pop(); // Is this a stop, entry, or target
        let dOrderType = orderType.replace(/buy_|sell_/g, '');
        orderSizeUSD = parseFloat(orderSizeUSD);
        price = parseFloat(price);
        //dbthis.log(`_DataConnector Order Type: ${dOrderType}`);
        let orderOptions = {
            "instrument_name": instrument,
            "amount": orderSizeUSD,
            "type": dOrderType,
            "label": label,
            "price": price
        };

        // NOTE: Dont use reduce. That is what the target and stops are for in the bracket order. If you do and there is another bracket order in between a previous one it will only reduce the the offset and mess up the encompassing bracket order size.
        /*
        if (orderSETType === 'stop') {
            orderOptions['reduce_only'] = true; // This will cause stop orders to only reduce the position size. That way we wont stop higher than our current position
        }
         */

        //dbthis.log(`Order Options: `,orderOptions);
        switch (orderType) {
            case this.orderTypes.buystopmarket:
                orderOptions = utils.removePriceOption(orderOptions);
                //dbthis.log(`Order Options (After Remove Price): `,orderOptions);
                orderOptions['stop_price'] = price;
                orderOptions['trigger'] = "mark_price";
            case this.orderTypes.buylimit:
                // Place buy order
                this.log(chalk.rgb(0, 255, 0)(`Placing ${orderType} | Options: ${JSON.stringify(orderOptions)}`));
                await this._deribitApi.buy(orderOptions)
                    .then((response) => {
                        if (response.error) {
                            throw new Error(JSON.stringify(response.error));
                        }
                        //dbthis.log('Buy Response: ', response);
                        this.log(chalk.rgb(69, 255, 0)(`${orderType} | ${label} | placed.`));
                    })
                    .catch((error) => {
                        this.log(chalk.rgb(255, 69, 0)(`placeOrder(${orderType},...) | Options: ${JSON.stringify(orderOptions)} Error: ${error.message}`));
                        throw new Error(error.message);
                    });
                break;
            case this.orderTypes.sellstopmarket:
                orderOptions = utils.removePriceOption(orderOptions);
                //dbthis.log(`Order Options (After Remove Price): `,orderOptions);
                orderOptions['stop_price'] = price;
                orderOptions['trigger'] = "mark_price";
            case this.orderTypes.selllimit:
                // Place sell order
                this.log(chalk.rgb(255, 0, 0)(`Placing ${orderType} | Options: ${JSON.stringify(orderOptions)}`));
                await this._deribitApi.sell(orderOptions)
                    .then((response) => {
                        if (response.error) {
                            throw new Error(JSON.stringify(response.error));
                        }
                        //dbthis.log('Sell Response: ', response);
                        this.log(chalk.rgb(255, 0, 0)(`${orderType} | ${label} | placed.`));
                    })
                    .catch((error) => {
                        this.log(chalk.rgb(32, 178, 170)(`placeOrder(${orderType},...) | Options: ${JSON.stringify(orderOptions)} Error: ${error.message}`));
                        throw new Error(error.message);
                    });
                break;
        }
    }

    isLoggedIn() {
        return this._deribitApi.authenticated;
    }

    /**
     * Send message to console using utils function
     * @param message
     * @param variable
     */
    log(message, variable = false) {
        if (this._debug) {
            utils.log(`[Deribit.js]`, message, variable, '#008000');
        }
    }
}
module.exports = Deribit;