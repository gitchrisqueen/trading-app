/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

let bluebird = require('bluebird');
const chalk = require("chalk");

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

//Deribit API
const DBV2WS = require('./deribit-v2-ws.js');

class Deribit {

    constructor() {
        this.scriptName = '';
        this.DEBUG = true;
        this.mySymbol = 'BTC-PERPETUAL';

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
        const key = 'TrWeoMOY';// test key
        const secret = '746WeBUuU00AvGI3l6OHu9Gh7DKUVAJyIXjhl7WpeKw';// test secret
        const domain = 'test.deribit.com';
        const debug = true;

        this.log('Connecting to API');
        this.deribitApi = new DBV2WS({key, secret, domain, debug});


    }


    getOrderTypes() {
        return this.orderTypes;
    }

    async init() {
        this.setScriptName(this.getScriptName());
        await this.deribitApi.connect()
            .then(() => {
                return this.log(`${new Date} | connected`);
            })
            .catch(error => {
                return this.log(`${new Date} | could not connected`, error);
            });

        /*
        // TODO: Determine if this is necessary if you are able to keep the connection open indefinitely
        await this.deribitApi.enable_cancel_on_disconnect()
            .then(() => {
                return this.log(`${new Date} | Enable cancel on disconnect`);
            })
            .catch(error => {
                return this.log(`${new Date} | Could not enable cancel on disconnect.`, error);
            });
         */

        await this.deribitApi.disable_cancel_on_disconnect()
            .then(() => {
                return this.log(`${new Date} | Disable cancel on disconnect`);
            })
            .catch(error => {
                return this.log(`${new Date} | cCould not disable cancel on disconnect.`, error);
            });

        // Get the account summary so you know amounts to trade
        await this.getAccountSummary();

        this.log(`My Position: ${JSON.stringify(await this.getPosition())}`);

        // Subscribe to portfolio updates so we have current amounts
        await this.subscribePortfolioUpdates();

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
        let fileName = `[${this.getScriptName()}] `;
        let minLength = 37;
        let maskedFileName = fileName.padEnd(minLength, '-') + '> ';

        message = chalk.green.bold(maskedFileName) + chalk.bgGreen.hex('#000000').bold(` ${message} `);
        if (this.DEBUG) {
            if (variable !== false) {
                console.log(message + JSON.stringify(variable));
            } else {
                console.log(message);
            }
        }
    }

    getInstrument() {
        return this.mySymbol;

    }

    isLoggedIn() {
        return this.deribitApi.authenticated;
    }


    getPortfolioEquityBTC() {
        return this.portfolio.equity;
    }


    getPortfolioTotalPLBTC() {
        return this.portfolio.total_pl;
    }


    getAccountTotalBTC() {
        return this.getPortfolioEquityBTC() + this.getPortfolioTotalPLBTC();
    }


    async getOpenOrders(type = "all") {
        return await this.deribitApi.get_open_orders_by_instrument(this.getInstrument(), type)
            .catch(error => {
                this.log(`getOpenOrders Error:`, error);
                return {'result': []};
            });
    }


    async getOpenStopOrders() {
        return await this.getOpenOrders('stop_all')
            .catch(error => {
                this.log(`getStopOrders Error:`, error);
                return {'result': []};
            });
    }

    async editStopOrder(orderId, orderSizeUSD, stopPrice) {
        await this.deribitApi.edit(orderId, orderSizeUSD, false, stopPrice)
            .catch(error => {
                return this.log(`getStopOrders Error:`, error);
            });
    }

    async getPosition() {
        return await this.deribitApi.getPosition(this.getInstrument())
            .then((data) => {
                let result = {};
                if (data['result']) {
                    result = data['result'];
                }
                return result;
            })
            .catch(error => {
                this.log(`getPosition Error:`, error);
                return {
                    'leverage': 2,
                    'size': 0
                };
            });
    }

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


    async placeOrder(orderType, orderSizeUSD, price, label = "tradingapp") {

        let orderLabelArray = label.split('|');
        let orderSETType = orderLabelArray.pop(); // Is this a stop, entry, or target
        let dOrderType = orderType.replace(/buy_|sell_/g, '');
        //this.log(`Deribit Order Type: ${dOrderType}`);
        let orderOptions = {
            "instrument_name": this.getInstrument(),
            "amount": orderSizeUSD,
            "type": dOrderType,
            "label": label,
            "price": price
        };

        if (orderSETType === 'stop') {
            orderOptions['reduce_only'] = true; // This will cause stop orders to only reduce the position size. That way we wont stop higher than our current position
        }

        switch (orderType) {
            case this.orderTypes.buystopmarket:
                orderOptions = this.removePriceOption(orderOptions);
                orderOptions['stop_price'] = price;
                orderOptions['trigger'] = "mark_price";
            case this.orderTypes.buylimit:
                // Place buy order
                this.log(`placeOrder | Placing ${orderType} | Options: ${JSON.stringify(orderOptions)}`);
                await this.deribitApi.buy(orderOptions)
                    .then(() => {
                        return this.log(`${orderType} | ${label} | placed.`);
                    })
                    .catch(error => {
                        return this.log(`placeOrder ${orderType} | Options: ${JSON.stringify(orderOptions)} Error: ${error}`);
                    });

                break;
            case this.orderTypes.sellstopmarket:
                orderOptions = this.removePriceOption(orderOptions);
                orderOptions['stop_price'] = price;
                orderOptions['trigger'] = "mark_price";
            case this.orderTypes.selllimit:
                // Place sell order
                this.log(`placeOrder | Placing ${orderType} | Options: ${JSON.stringify(orderOptions)}`);
                await this.deribitApi.sell(orderOptions)
                    .then(() => {
                        return this.log(`${orderType} | ${label} | placed.`);
                    })
                    .catch(error => {
                        return this.log(`placeOrder ${orderType} | Options: ${JSON.stringify(orderOptions)} Error: ${error}`);
                    });

                break;
        }

    }

    async getAccountSummary() {
        await this.deribitApi.get_account_summary('BTC', true)
            .then((data) => {
                if (data['result']) {
                    this.portfolio = data['result'];
                }
                return this.log(`Account Summary Retrieved: ${JSON.stringify(this.portfolio)}`);
            })
            .catch(error => {
                return this.log(`Could Not Close Open Position`, error);
            });

    }

    async subscribePortfolioUpdates() {
        let channel = 'user.portfolio.btc';

        await this.deribitApi.subscribe('private', channel)
            .then(() => {
                    return this.log(`Subscribed To Channel: ${channel}`);
                }
            )
            .then(() => {
                return this.deribitApi.on(channel, (data) => {
                    this.portfolio = data;
                    //this.log(`Portfolio Update: `, this.portfolio);
                });
            })
            .catch(error => {
                return this.log(`Could Not Subscribe Channel: ${channel}`, error);

            });

    }

    async getBars(start, stop, resolution) {
        return await this.deribitApi.get_tradingview_chart_data(this.getInstrument(), start, stop, resolution)
            .then(response => {

                if (!response.result) {
                    this.log(`Error Getting Bars from API.`);
                    return [];
                }
                const data = response.result;

                //this.log(`Get Bars Response`);
                //this.log(response);

                let nodata = data.status === 'no_data';

                if (data.status !== 'ok' && !nodata) {
                    return;
                }

                let bars = [];

                let barsCount = nodata ? 0 : data.ticks.length;
                //this.log(`Get Bars Count: ${barsCount}`);

                let volumePresent = typeof data.cost != 'undefined';
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

                    if (volumePresent) {
                        barValue.volume = data.cost[i];
                    }

                    bars.push(barValue);

                }

                return bars;
            })
            .catch(error => {
                this.log(`Error Getting Bars from API.`, error);
                return [];
            });
    }

    async subscribeBars(timeframe, onCallback) {
        let channel = "chart.trades." + this.getInstrument() + "." + timeframe;
        await this.deribitApi.subscribe('private', channel)
            .then(() => {
                    return this.log(`Subscribed To Channel: ${channel}`);
                }
            ).then(() => {
                return this.deribitApi.on(channel, onCallback);
            })
            .catch(error => {
                return this.log(`Could Not Subscribe to Channel: ${channel}`, error);
            });

    }

    async subscribeOrderUpdates(onCallback) {
        let channel = 'user.orders.' + this.getInstrument() + '.100ms';
        await this.deribitApi.subscribe('private', channel)
            .then(() => {
                    return this.log(`Subscribed To Channel: ${channel}`);
                }
            ).then(() => {
                return this.deribitApi.on(channel, onCallback);
            })
            .catch(error => {
                return this.log(`Could Not Subscribe to Channel: ${channel}`, error);
            });

    }

    async cancelByLabel(label) {
        await this.deribitApi.cancel_order_by_label(label)
            .catch(error => {
                return this.log(`Could Not Cancel By Label: ${label}`, error);
            });
    }

    async closeOpenPosition() {
        await this.deribitApi.close_position(this.getInstrument(), 'market')
            .then((data) => {
                return this.log(`Position(s) Closed`);
                //return this.log(`Close Position(s) Result: ${JSON.stringify(data)}`);
            })
            .catch(error => {
                return this.log(`Could Not Close Open Position`, error);
            });
    }

}

module.exports = Deribit;