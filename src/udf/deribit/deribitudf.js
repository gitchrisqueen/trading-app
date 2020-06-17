/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const Connection = require('deribit-v2-ws-gitchrisqueen');
// Environment Variables
const {deribit_api_url, deribit_api_key, deribit_api_secret} = require('../../../config');

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
        this.supportedResolutions = ['1', '3', '5', '10', '15', '30', '60', '120', '180', '360', '720', '1D'];

        this.deribitAPI = new Connection({
            key: deribit_api_key,
            secret: deribit_api_secret,
            domain: deribit_api_url,
            debug: false
        });

        setInterval(() => {
            this.loadSymbols()
        }, 30000);

        (async ()=>{
            await this.deribitAPI.connect();
        })();

        this.loadSymbols();
    }

    loadSymbols() {
        const promise = this.deribitAPI.request('public/get_instruments',
            {
                'currency': 'BTC'
            }).catch(err => {
            console.error(err);
            setTimeout(() => {
                this.loadSymbols();
            }, 1000);
        })
        this.symbols = promise.then(data => {
            return data.result.map(instrument => {
                return {
                    symbol: instrument.instrument_name,
                    ticker: instrument.instrument_name,
                    name: instrument.instrument_name,
                    full_name: instrument.instrument_name,
                    description: `${instrument.instrument_name}`,
                    exchange: 'DERIBIT',
                    listed_exchange: 'DERIBIT',
                    type: 'crypto',
                    currency_code: instrument.quote_currency,
                    session: '24x7',
                    timezone: 'UTC',
                    minmovement: instrument.tick_size * 100,
                    minmov: instrument.tick_size * 100,
                    minmovement2: 0,
                    minmov2: 0,
                    pricescale: Math.round(1 / parseFloat(instrument.tick_size)),
                    supported_resolutions: this.supportedResolutions,
                    has_intraday: true,
                    has_daily: true,
                    has_weekly_and_monthly: false,
                    data_status: 'streaming'
                }
            })
        })
        this.allSymbols = promise.then(data => {
            //console.log(JSON.stringify(data));
            let set = new Set();
            for (const dr of data.result) {
                set.add(dr.instrument_name);
            }
            return set;
        })
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
        return {
            exchanges: [
                {
                    value: 'DERIBIT',
                    name: 'DERIBIT',
                    desc: 'DERIBIT Exchange'
                }
            ],
            symbols_types: [
                {
                    value: 'crypto',
                    name: 'Cryptocurrency'
                }
            ],
            supported_resolutions: this.supportedResolutions,
            supports_search: true,
            supports_group_request: false,
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true
        }
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
        const symbols = await this.symbols

        const comps = symbol.split(':')
        const s = (comps.length > 1 ? comps[1] : symbol).toUpperCase()

        for (const symbol of symbols) {
            if (symbol.symbol === s) {
                return symbol
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

        from *= 1000;
        to *= 1000;

        const response = await this.deribitAPI.get_tradingview_chart_data(symbol, from, to, resolution);
        const data = response.result;

        let nodata = data.status === 'no_data';
        if (data.status !== 'ok' && !nodata) {
            return {s: 'no_data'};
        } else {
            //console.log();
            let bars = {
                s: data.status,
                t: data.ticks.map(t=>parseInt(t/1000)),
                c: data.close

            };
            let ohlPresent = typeof data.open != 'undefined';
            if (ohlPresent) {
                bars['o'] = data.open;
                bars['h'] = data.high;
                bars['l'] = data.close;
            }
            let volumePresent = typeof data.cost != 'undefined';
            if (volumePresent) {
                bars['v'] = data.cost;

            }
            return bars;
        }
    }
}

UDF.Error = UDFError
UDF.SymbolNotFound = SymbolNotFound
UDF.InvalidResolution = InvalidResolution

module.exports = UDF
