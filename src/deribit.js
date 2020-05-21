/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

let bluebird = require('bluebird');
const chalk = require("chalk");
const utils = require('./utils');
utils.setScriptName('Deribit.js');

//Deribit API
const DBV2WS = require('deribit-v2-ws-gitchrisqueen');

class Deribit {

    constructor() {
        this.DEBUG = false;

        if(this.DEBUG){
            process.on("unhandledRejection", function (reason, promise) {
                /* You might start here by adding code to examine the
                   promise specified by event.promise and the reason in
                   event.reason */

                utils.log(chalk.red.bold("[PROCESS] Unhandled Promise Rejection"));
                utils.log(chalk.red.bold("- ".padEnd(30, '- ')));
                utils.log(`Reason`);
                utils.log(reason);
                utils.log(`Promise`);
                utils.log(promise);
                utils.log(chalk.red.bold("- ".padEnd(30, '- ')));

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

        // Deribit Credentials
        const key = process.env.KEY;
        const secret = process.env.SECRET;
        const domain = process.env.DOMAIN;
        const debug = this.DEBUG;

        if (key && secret && domain) {
            utils.log('Connecting to API');
            this.deribitApi = new DBV2WS({key, secret, domain, debug});
        } else {
            utils.log(`Cannot connect to Deribit. Missing Credentials: key=${key} | secret=${secret} | domain=${domain}`);
            process.exit(1);
        }


    }

    async disconnect(){
        this.deribitApi.end();
    }

    async init() {
        await this.deribitApi.connect()
            .then(() => {
                utils.log(`${new Date} | connected`);
            })
            .catch((error) => {
                utils.log(`${new Date} | could not connect`, error);
                throw new Error('Could not connect: Error: '+error.message);
            });

        /*
        // TODO: Determine if this is necessary if you are able to keep the connection open indefinitely
        await this.deribitApi.enable_cancel_on_disconnect()
            .then(() => {
                 utils.log(`${new Date} | Enable cancel on disconnect`);
            })
            .catch((error) => {
                 utils.log(`${new Date} | Could not enable cancel on disconnect.`, error);
            });
         */

        await this.deribitApi.disable_cancel_on_disconnect()
            .then(() => {
                utils.log(`${new Date} | Disable cancel on disconnect`);
            })
            .catch((error) => {
                utils.log(`${new Date} | Could not disable cancel on disconnect.`, error);
            });

        // Get available instruments from the APO
        this.retrieveAPIInstruments();

        // Get the account summary so you know amounts to trade
        this.retrieveAccountSummary();

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
        utils.log(`Getting Bars From: ${startUTC} - To: ${stopUTC}`);
        return await this.deribitApi.get_tradingview_chart_data(instrument, start, stop, resolution)
            .then(response => {

                let bars = [];

                if (!response.result) {
                    utils.log(`Error Getting Bars from API No Results. Error: `, response.error);
                    return bars;
                }
                const data = response.result;

                //utils.log(`Get Bars Response`);
                //utils.log(response);

                let nodata = data.status === 'no_data';

                if (data.status !== 'ok' && !nodata) {
                    return bars;
                }


                let barsCount = nodata ? 0 : data.ticks.length;
                //utils.log(`Get Bars Count: ${barsCount}`);

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
                utils.log(`Error Getting Bars from API.`, error);
                return [];
            });
    }

    async getOpenOrders(instrument, type = "all") {
        return await this.deribitApi.get_open_orders_by_instrument(instrument, type)
            .catch((error) => {
                utils.log(`getOpenOrders Error:`, error);
                return {'result': []};
            });
    }

    async getOpenStopOrders() {
        return await this.getOpenOrders('stop_all')
            .catch((error) => {
                utils.log(`getStopOrders Error:`, error);
                return {'result': []};
            });
    }

    getPosition() {
        return this.position;
    }

    async getInitialPosition(instrument) {
        await this.deribitApi.getPosition(instrument)
            .then((data) => {
                if (data['result']) {
                    this.position = data['result'];
                } else {
                    utils.log(`Using Default Position`);
                    this.position = this.defaultPosition;
                }
            })
            .catch((error) => {
                utils.log(`Could not Get Initial Position Error:`, error);
            });
    }

    getInstruments() {
        return this.instruments;
    }

    getCurrentPriceStored(instrument) {
        return (this.currentPriceMap.has(instrument)) ? this.currentPriceMap.get(instrument) : 0;
    }

    async getCurrentPriceLive(instrument) {
        return await this.deribitApi.get_ticker(instrument)
            .then((data) => {
                if (data['result']) {
                    return data['result']['mark_price'];
                } else {
                    return 0;
                }

                // utils.log(`Close Position(s) Result: ${JSON.stringify(data)}`);
            })
            .catch((error) => {
                utils.log(`Could Not Get Current Price for ${instrument}`, error);
            });
    }

    async setupPositionSubscriptions(instrument) {

        await this.getInitialPosition(instrument);

        utils.log(`My Position: ${JSON.stringify(await this.getPosition())}`);

        // Subscribe to Users Changes (updates related to orders, trades, etc)
        await this.subscribePositionChanges(instrument);

        // Subscribe to ticker for current price updates
        await this.subscribeTicker(instrument);
    }

    async subscribePositionChanges(instrument) {
        let channel = 'user.changes.' + instrument + '.100ms';

        await this.deribitApi.subscribe('private', channel)
            .then(() => {
                    utils.log(`Subscribed To Channel: ${channel}`);
                }
            )
            .then(() => {
                this.deribitApi.on(channel, async (data) => {
                    utils.log(`Data from channel: ${channel}: ${JSON.stringify(data)}`);
                    if (data['positions']) {
                        if (data['positions'][0]) {
                            let position = data['positions'][0];
                            this.position['leverage'] = (position['leverage']) ? position['leverage'] : this.position['leverage'];
                            this.position['size'] = (position['size']) ? position['size'] : this.position['size'];
                            this.position['floating_profit_loss'] = (position['floating_profit_loss']) ? position['floating_profit_loss'] : this.position['floating_profit_loss'];
                            utils.log(`Position Update: ${JSON.stringify(this.position)}`);
                        } else {
                            utils.log(`No Positions Returned. Getting Directly.`);
                            await this.getInitialPosition(instrument);
                        }
                    } else {
                        utils.log(`No Position Change`);
                    }
                });
            })
            .catch((error) => {
                utils.log(`Could Not Subscribe to Channel: ${channel}`, error);

            });
    }

    async subscribePortfolioUpdates() {
        let channel = 'user.portfolio.btc';

        await this.deribitApi.subscribe('private', channel)
            .then(() => {
                    utils.log(`Subscribed To Channel: ${channel}`);
                }
            )
            .then(() => {
                this.deribitApi.on(channel, (data) => {
                    this.portfolio = data;
                    //utils.log(`Portfolio Update: `, this.portfolio);
                });
            })
            .catch((error) => {
                utils.log(`Could Not Subscribe Channel: ${channel}`, error);

            });

    }

    async subscribeBars(instrument, timeframe, onCallback) {
        let channel = "chart.trades." + instrument + "." + timeframe;
        await this.deribitApi.subscribe('private', channel)
            .then(() => {
                    utils.log(`Subscribed To Channel: ${channel}`);
                }
            ).then(() => {
                this.deribitApi.on(channel, onCallback);
            })
            .catch((error) => {
                utils.log(`Could Not Subscribe to Channel: ${channel}`, error);
            });

    }

    async subscribeOrderUpdates(instrument, onCallback) {
        let channel = 'user.orders.' + instrument + '.100ms';
        await this.deribitApi.subscribe('private', channel)
            .then(() => {
                    utils.log(`Subscribed To Channel: ${channel}`);
                }
            ).then(() => {
                this.deribitApi.on(channel, onCallback);
            })
            .catch((error) => {
                utils.log(`Could Not Subscribe to Channel: ${channel}`, error);
            });

    }

    /**
     * Retrieves the account summary data and stores to portfolio property.
     */
    retrieveAccountSummary() {
        (async () => {
            await this.deribitApi.get_account_summary('BTC', true)
                .then((data) => {
                    if (data['result']) {
                        this.portfolio = data['result'];
                    }
                    utils.log(`Account Summary Retrieved: ${JSON.stringify(this.portfolio)}`);
                })
                .catch((error) => {
                    utils.log(`Could not get Account Summary Error:`, error);
                });
        })();
    }

    /**
     * Retrieve the instruments available from the deribit api and store them to the instruments (map) property
     */
    retrieveAPIInstruments() {
        this.instruments = new Map();
        (async () => {
            await this.deribitApi.get_instruments('BTC', 'future', false)
                .then(async (data) => {
                    //utils.log(`Data from deribitApi.get_instruments(): ${JSON.stringify(data)}`);
                    if (data['result']) {
                        for (let i = 0; i < data['result'].length; ++i) {
                            let instrumentName = data['result'][i]['instrument_name'];
                            //utils.log(`Instrument Name : ${instrumentName}`);
                            let bookSummaryArray = await this.deribitApi.get_book_summary_by_instrument(instrumentName)
                                .then((bookSummaryData) => {
                                    if (bookSummaryData['result']) {
                                        return bookSummaryData['result'][0];
                                    }
                                })
                                .catch((error) => {
                                    utils.log(`Could not get Book Summary Error:`, error.message);
                                    return {'volume': 0, 'open_interest': 0};
                                });
                            //utils.log(`Instrument (${instrumentName}) Book Summary: ${JSON.stringify(bookSummaryArray)}`);
                            this.instruments.set(instrumentName, bookSummaryArray);
                        }
                        //utils.log(`Instruments Retrieved: ${JSON.stringify([...this.instruments.entries()])}`);
                    }
                })
                .catch((error) => {
                    utils.log(`Could not get Instruments Error:`, error.message);
                });
        })();
    }

    async subscribeTicker(instrument) {
        let channel = 'ticker.' + instrument + '.100ms';
        if (!this.currentPriceMap.has(instrument)) {
            await this.deribitApi.subscribe('private', channel)
                .then(() => {
                        utils.log(`Subscribed To Channel: ${channel}`);
                    }
                ).then(() => {
                    this.deribitApi.on(channel, (data) => {
                        if (data['mark_price']) {
                            this.currentPriceMap.set(instrument, data['mark_price'])
                        }
                        //utils.log(`Portfolio Update: `, this.portfolio);
                    });
                })
                .catch((error) => {
                    utils.log(`Could Not Subscribe to Channel: ${channel}`, error);
                });
        } else {
            utils.log(`Already Subscribed to ${channel}`);
        }

    }

    async editStopOrder(orderId, orderSizeUSD, stopPrice) {
        await this.deribitApi.editOrder(orderId, orderSizeUSD, false, stopPrice)
            .catch((error) => {
                utils.log(`getStopOrders Error:`, error);
            });
    }

    async closeOpenPosition(instrument) {
        await this.deribitApi.close_position(instrument, 'market')
            .then((data) => {
                //utils.log(`Position(s) Closed`);
                utils.log(`Close Position(s) Result: ${JSON.stringify(data)}`);
            })
            .catch((error) => {
                utils.log(`Could Not Close Open Position`, error);
            });
    }

    async cancelByLabel(label) {
        await this.deribitApi.cancel_order_by_label(label)
            .catch((error) => {
                utils.log(`Could Not Cancel By Label: ${label}`, error);
            });
    }

    async placeOrder(instrument, orderType, orderSizeUSD, price, label = "tradingapp") {

        let orderLabelArray = label.split('|');
        let orderSETType = orderLabelArray.pop(); // Is this a stop, entry, or target
        let dOrderType = orderType.replace(/buy_|sell_/g, '');
        orderSizeUSD = parseFloat(orderSizeUSD);
        price = parseFloat(price);
        //utils.log(`Deribit Order Type: ${dOrderType}`);
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

        //utils.log(`Order Options: `,orderOptions);
        switch (orderType) {
            case this.orderTypes.buystopmarket:
                orderOptions = this.removePriceOption(orderOptions);
                //utils.log(`Order Options (After Remove Price): `,orderOptions);
                orderOptions['stop_price'] = price;
                orderOptions['trigger'] = "mark_price";
            case this.orderTypes.buylimit:
                // Place buy order
                utils.log(chalk.rgb(0, 255, 0)(`Placing ${orderType} | Options: ${JSON.stringify(orderOptions)}`));
                await this.deribitApi.buy(orderOptions)
                    .then((response) => {
                        if (response.error) {
                            throw new Error(JSON.stringify(response.error));
                        }
                        //utils.log('Buy Response: ', response);
                        utils.log(chalk.rgb(69, 255, 0)(`${orderType} | ${label} | placed.`));
                    })
                    .catch((error) => {
                        utils.log(chalk.rgb(255, 69, 0)(`placeOrder(${orderType},...) | Options: ${JSON.stringify(orderOptions)} Error: ${error.message}`));
                        throw new Error(error.message);
                    });
                break;
            case this.orderTypes.sellstopmarket:
                orderOptions = this.removePriceOption(orderOptions);
                //utils.log(`Order Options (After Remove Price): `,orderOptions);
                orderOptions['stop_price'] = price;
                orderOptions['trigger'] = "mark_price";
            case this.orderTypes.selllimit:
                // Place sell order
                utils.log(chalk.rgb(255, 0, 0)(`Placing ${orderType} | Options: ${JSON.stringify(orderOptions)}`));
                await this.deribitApi.sell(orderOptions)
                    .then((response) => {
                        if (response.error) {
                            throw new Error(JSON.stringify(response.error));
                        }
                        //utils.log('Sell Response: ', response);
                        utils.log(chalk.rgb(255, 0, 0)(`${orderType} | ${label} | placed.`));
                    })
                    .catch((error) => {
                        utils.log(chalk.rgb(32, 178, 170)(`placeOrder(${orderType},...) | Options: ${JSON.stringify(orderOptions)} Error: ${error.message}`));
                        throw new Error(error.message);
                    });
                break;
        }
    }

    isLoggedIn() {
        return this.deribitApi.authenticated;
    }
}

module.exports = Deribit;