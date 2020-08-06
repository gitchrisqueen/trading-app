const TDAmeritrade = require('../../tdameritrade');
const tda = new TDAmeritrade();

class UDFError extends Error {
}

class SymbolNotFound extends UDFError {
}

class InvalidResolution extends UDFError {
}

class UDF {
    /**
     *
     */
    constructor() {

        this.futuresSymbolsArray = ['/ES', '/GC', '/NG', '/YM', '/ZB', '/ZF', '/NQ'];

        this.supportedResolutions = ['1', '5', '10', '15', '30','60', '240', '1D'];

        setTimeout(async () => {
            await tda.connect()
                .then(async () => {
                    console.error('tda.connect() Connected');
                })
                .then(async () => {
                    this.loadSymbols();
                    //console.log("Mapped Symbols: " + JSON.stringify(this.symbols));
                })
                .catch(e => {
                    console.error('tda.connect() Error:', e);
                });
        }, 1000);
    }

    async setupSubscriptions() {
        let service = 'CHART_FUTURES';
        let keys = this.futuresSymbolsArray.join();
        let channel = service + ':' + keys;
        await tda.subscribe(service, {'keys': keys, 'fields': '0,1,2,3,4,4,5,6'}).then(() => {
            console.log(`Subscribed To Channel: ${channel}`);
            let keyArray = keys.split(',');
            for (let index in keyArray) {
                let key = keyArray[index];
                let channel = service + ':' + key;
                console.log("Listening on channel: " + channel);
                tda.on(channel, async (data) => {
                    console.log(`Data from channel: ${channel}:`, data);
                });
            }
        });
    }

    loadSymbols() {

        let projection = "symbol-search";
        let opts = {};

        this.symbols = [];
        this.allSymbols = new Set();

        for (let index in this.futuresSymbolsArray) {
            let symbol = this.futuresSymbolsArray[index];
            this.allSymbols.add(symbol);

            const promise = tda.instrumentsGET(symbol, projection, opts).catch(error => {
                console.error(error);
                setTimeout(() => {
                    this.loadSymbols();
                }, 1000);
            });

            promise.then((data) => {
                console.log('apiInstance.instrumentsGET called successfully. Returned data: ' + JSON.stringify(data));
                //data = JSON.parse(data);

                for (let index in data) {
                    if (data.hasOwnProperty(index)) {
                        let instrument = data[index];
                        this.allSymbols.add(instrument);
                        let comps = instrument.symbol.split(':')
                        let s = (comps.length > 1 ? comps[0] : instrument.symbol).toUpperCase()
                        this.allSymbols.add(s);
                        let opts = {
                            symbol: symbol,
                            ticker: s,
                            name: s,
                            full_name: instrument.symbol,
                            description: instrument.description,
                            exchange: instrument.exchange,
                            listed_exchange: instrument.exchange,
                            type: instrument.assetType,
                            currency_code: "USD",
                            session: '24x7',
                            timezone: 'Etc/UTC',
                            minmovement: 1 * 100,
                            minmov: 1 * 100,
                            minmovement2: 0,
                            minmov2: 0,
                            pricescale: Math.round(1 / parseFloat(1)),
                            supported_resolutions: this.supportedResolutions,
                            has_intraday: true,
                            has_daily: true,
                            has_weekly_and_monthly: false,
                            data_status: 'streaming'
                        };
                        this.symbols.push(opts);
                    }
                }
            });
        }
    }

    async checkSymbol(symbol) {
        const symbols = await this.allSymbols
        return symbols.has(symbol)
    }

    /**
     * Convert items to response-as-a-table format.
     * @param {array} items - Items to convert.
     * @returns {object} Response-as-a-table formatted items.
     */
    asTable(items) {
        let result = {}
        for (const item of items) {
            for (const key in item) {
                if (!result[key]) {
                    result[key] = []
                }
                result[key].push(item[key])
            }
        }
        for (const key in result) {
            const values = [...new Set(result[key])]
            if (values.length === 1) {
                result[key] = values[0]
            }
        }
        return result
    }

    /**
     * Data feed configuration data.
     */
    async config() {
        let symbols = await this.symbols;
        console.log('Symbols: ' + JSON.stringify(symbols));
        let distinctExchanges = [...new Set(symbols.map(instrument => instrument.exchange))];
        console.log('Distinct Exchanges: ' + JSON.stringify(distinctExchanges));
        let distinctSymbolTypes = [...new Set(symbols.map(instrument => instrument.type))];
        console.log('Distinct Types: ' + JSON.stringify(distinctSymbolTypes));
        //return process.exit(22);
        return {
            exchanges: distinctExchanges.map(exchange => {
                return {
                    value: exchange,
                    name: this.toTitleCase(exchange),
                    desc: this.toTitleCase(exchange)
                }
            }),
            symbols_types: distinctSymbolTypes.map(type => {
                return {
                    value: type,
                    name: this.toTitleCase(type)
                }
            }),
            futures_regex: '/^(.+)([12]!|[FGHJKMNQUVXZ]\\d{1,2})$/',
            supported_resolutions: this.supportedResolutions,
            supports_search: true,
            supports_group_request: false,
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true
        }
    }

    toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    }

    /**
     * Symbols.
     * @returns {object} Response-as-a-table formatted symbols.
     */
    async symbolInfo() {
        const symbols = await this.symbols
        return this.asTable(symbols)
    }

    /**
     * Symbol resolve.
     * @param {string} symbol Symbol name or ticker.
     * @returns {object} Symbol.
     */
    async symbol(symbol) {
        const symbols = await this.symbols;
        // console.log("Symbols: ", symbols);

        const comps = symbol.split(':')
        const s = (comps.length > 1 ? comps[0] : symbol).toUpperCase()
        //console.log("S: ", s);

        for (const asymbol of symbols) {
            //console.log('symbol.symbol:', symbol.symbol);
            if (asymbol.symbol === s || asymbol.full_name === symbol || asymbol.name === s) {
                return asymbol
            }
        }

        throw new SymbolNotFound()
    }

    /**
     * Symbol search.
     * @param {string} query Text typed by the user in the Symbol Search edit box.
     * @param {string} type One of the symbol types supported by back-end.
     * @param {string} exchange One of the exchanges supported by back-end.
     * @param {number} limit The maximum number of symbols in a response.
     * @returns {array} Array of symbols.
     */
    async search(query, type, exchange, limit) {
        let symbols = await this.symbols
        if (type) {
            symbols = symbols.filter(s => s.type === type)
        }
        if (exchange) {
            symbols = symbols.filter(s => s.exchange === exchange)
        }

        query = query.toUpperCase()
        symbols = symbols.filter(s => s.symbol.indexOf(query) >= 0)

        if (limit) {
            symbols = symbols.slice(0, limit)
        }
        return symbols.map(s => ({
            symbol: s.symbol,
            full_name: s.full_name,
            description: s.description,
            exchange: s.exchange,
            ticker: s.ticker,
            type: s.type
        }))
    }


    /**
     * Bars.
     * @param {string} symbol - Symbol name or ticker.
     * @param {number} from - Unix timestamp (UTC) of leftmost required bar.
     * @param {number} to - Unix timestamp (UTC) of rightmost required bar.
     * @param {string} resolution
     */
    async history(symbol, from, to, resolution) {
        const hasSymbol = await this.checkSymbol(symbol);
        if (!hasSymbol) {
            throw new SymbolNotFound()
        }

        if (!this.supportedResolutions.includes(resolution)) {
            throw new InvalidResolution()
        }

        // Get Symbol Type
        let getSymbol = await this.symbol(symbol);
        let mySymbol = getSymbol['symbol'];
        let symbolType = getSymbol['type'];
        //console.log('Symbol(' + symbol + '): ', getSymbol);
        //console.log('Symbol Type: ', symbolType);
        let history;

        if (symbolType === "FUTURE") {
            // Get futures chart data here

            let f = resolution.charAt(resolution.length - 1);
            let frequencyType = 'm';
            if (isNaN(f)) {
                switch (f) {
                    default:
                        frequencyType = f.toLowerCase(); // All others are equal except month (m=minute, h=hour, d=day, w=week, n=month)
                        break;
                    case 'M':
                        frequencyType = 'n'; // For Month
                        break;
                }
            }

            let freq = parseInt(resolution);

            // From and To should be Unix timestamp (UTC) in milliseconds
            // This is correct (Multiply by 1000)
            from *= 1000;
            to *= 1000;
            from = Math.min(Math.max(from, 0), Date.now());
            to = Math.min(Math.max(0, to), Date.now());

            let date = new Date();
            date.setTime(from);
            let fromUTC = date.toUTCString();
            date.setTime(to);
            let toUTC = date.toUTCString();

            //console.log("getChartHistoryFutures from: " + fromUTC + " | to: " + toUTC);

            // TODO: Manual Override
            //frequencyType = 'm';
            //freq = 1;
            // TODO: Manual Override

            let promise = tda.getChartHistoryFutures(mySymbol, frequencyType + freq, false, from, to);
            history = await promise
                .then(async (data) => {
                    //console.log('getChartHistory Data: ', data);
                    let candles = data.content.pop()['3'];
                    //console.log('Candle Data:', candles);
                    if (candles.length === 0) {
                        return {s: 'no_data'};
                    } else {
                        //console.log();
                        return {
                            s: "ok", // status
                            t: candles.map(c => parseInt(c[0] / 1000)),
                            o: candles.map(c => parseFloat(c[1])),
                            h: candles.map(c => parseFloat(c[2])),
                            l: candles.map(c => parseFloat(c[3])),
                            c: candles.map(c => parseFloat(c[4])),
                            v: candles.map(c => parseFloat(c[5]))
                        };
                    }
                }, (error) => {
                    console.error('getChartHistoryFutures Error:', error);
                    return {s: 'no_data'};
                });

        } else {
            let promise = tda.marketdataSymbolPricehistoryGET(mySymbol, from, to, resolution);
            history = await promise.then((data) => {
                //console.log('API called successfully. Returned data: ' + JSON.stringify(data));
                //data = JSON.parse(data);
                let candles = data.candles;
                let empty = data.empty;

                if (empty === true || candles.length === 0) {
                    return {s: 'no_data'};
                } else {
                    //console.log();
                    return {
                        s: "ok", // status
                        t: candles.map(c => parseInt(c.datetime / 1000)),
                        c: candles.map(c => parseFloat(c.close)),
                        o: candles.map(c => parseFloat(c.open)),
                        h: candles.map(c => parseFloat(c.high)),
                        l: candles.map(c => parseFloat(c.low)),
                        v: candles.map(c => parseFloat(c.volume))
                    };
                }
            }, (error) => {
                console.error('marketdataSymbolPricehistoryGET Error:', error);
                return {s: 'no_data'};
            });

        }
        return history;
    }
}

UDF
    .Error = UDFError
UDF
    .SymbolNotFound = SymbolNotFound
UDF
    .InvalidResolution = InvalidResolution

module
    .exports = UDF

