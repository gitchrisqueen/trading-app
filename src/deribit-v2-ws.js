/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

const chalk = require("chalk");
const WebSocket = require('ws');
const EventEmitter = require('events');

const wait = n => new Promise(r => setTimeout(r, n));

class Connection extends EventEmitter {
    constructor({key, secret, domain = 'www.deribit.com', debug = false}) {
        super();

        this.scriptName = '';
        this.DEBUG = debug;
        this.heartBeat = 60 * 1; //1 minutes in seconds
        //this.heartBeat = 10; //1 minutes in seconds

        this.key = key;
        this.secret = secret;
        this.WSdomain = domain;

        //this.log(`Key: ${key} | Secret: ${secret} | Domain: ${domain} | Debug: ${debug}`);

        this.connected = false;
        this.isReadyHook = false;
        this.isReady = new Promise((r => this.isReadyHook = r));
        this.authenticated = false;
        this.reconnecting = false;
        this.afterReconnect = false;

        this.inflightQueue = [];
        this.subscriptions = [];

        this.id = +new Date;
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
        let minLength = 41;
        let maskedFileName = fileName.padEnd(minLength, '-') + '> ';

        message = chalk.magenta.bold(maskedFileName) + chalk.bgMagenta.hex('#000000').bold(` ${message} `);
        if (this.DEBUG) {
            if (variable !== false) {
                console.log(message + JSON.stringify(variable));
            } else {
                console.log(message);
            }
        }
    }

    nextId() {
        return ++this.id;
    }

    handleError = (e) => {
        if (this.DEBUG)
            this.log(new Date, ' Handle ERROR', e);
        throw new Error(e);
    };

    _connect() {
        if (this.connected) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`wss://${this.WSdomain}/ws/api/v2`);
            this.ws.onmessage = this.handleWSMessage;

            this.ws.onopen = () => {
                this.connected = true;

                this.pingInterval = setInterval(this.ping, (this.heartBeat * 1000) * 5); // 5X the heart beat without a ping means connection is dead

                this.isReadyHook();
                resolve();
            }
            this.ws.onerror = this.handleError;
            this.ws.on('error', this.handleError);

            this.ws.onclose = async e => {
                if (this.DEBUG)
                    this.log(new Date + '-> CLOSED CON');

                this.inflightQueue.forEach((queueElement) => {
                    //queueElement.connectionAborted();
                    try {
                        //queueElement.connectionAborted(new Error('Deribit Connection Closed'));
                        queueElement.connectionAborted('Deribit Connection Closed');
                    } catch (e) {
                        this.log(`Inflight Error: `, e);
                    }
                });

                this.inflightQueue = [];
                this.authenticated = false;
                this.connected = false;
                clearInterval(this.pingInterval);
                this.reconnect();
            }
        });
    }

    ping = async () => {
        let start = new Date;

        const timeout = setTimeout(() => {
            if (this.DEBUG)
                this.log(new Date, ' NO PING RESPONSE');
            this.terminate();
        }, (this.heartBeat * 1000) * 5); // If 5X the Heartbeat goes by then we will terminate the connection because it is dead

        await this.request('public/test');
        clearInterval(timeout);
    };

    // terminate a connection and immediatly try to reconnect
    terminate = async () => {
        if (this.DEBUG)
            this.log(new Date, ' TERMINATED WS CON');
        this.ws.terminate();
        this.authenticated = false;
        this.connected = false;
    };

    // end a connection
    end = async () => {
        if (this.DEBUG)
            this.log(new Date, ' ENDED WS CON');
        clearInterval(this.pingInterval);
        this.ws.onclose = undefined
        this.request('private/logout', {access_token: this.token});
        this.authenticated = false;
        this.connected = false;
        this.ws.terminate();
    };

    reconnect = async () => {
        this.reconnecting = true;

        let hook;
        this.afterReconnect = new Promise(r => hook = r);
        this.isReady = new Promise((r => this.isReadyHook = r));
        await wait(500);
        if (this.DEBUG)
            this.log(new Date, ' RECONNECTING...');
        await this.connect();
        hook();
        this.isReadyHook();

        this.subscriptions.forEach(sub => {
            this.subscribe(sub.type, sub.channel);
        });
    };

    connect = async () => {
        this.setScriptName(this.getScriptName());
        await this._connect();
        if (this.key) {
            await this.authenticate();
        }
        // Set the heartbeat - 20 (in seconds)
        await this.request("public/set_heartbeat", {interval: this.heartBeat});
        //.then(async () => {
        //this.on('test_request', this.handleWSMessage);
        //});

    };

    authenticate = async () => {
        if (!this.connected) {
            await this.connect();
        }

        const resp = await this.sendMessage({
            'jsonrpc': '2.0',
            'method': 'public/auth',
            'id': this.nextId(),
            'params': {
                'grant_type': 'client_credentials',
                'client_id': this.key,
                'client_secret': this.secret
            }
        });

        if (resp.error) {
            throw new Error(resp.error.message);
        }

        this.token = resp.result.access_token;
        this.refreshToken = resp.result.refresh_token;
        this.authenticated = true;

        if (!resp.result.expires_in) {
            throw new Error('Deribit did not provide expiry details');
        }

        /*
        wait(resp.result.expires_in - 10 * 60 * 1000).then(() => this.refreshTokenFn()).catch(error => {
            this.log(`Error while refreshing token: ${error.message}`)
        })

         */

        let refreshTime = (resp.result.expires_in - (10 * 60)) * 1000; // (ExpireTime (seconds) - 10 Minutes (in seconds)) converted back to Milliseconds
        let today = Date.now();
        let expireDateMilli = today + refreshTime;
        let expireDate = new Date(expireDateMilli);
        this.log(`Refresh Token Expires On: ${expireDate.toString()}`);
        let safeRefresh = Math.min(refreshTime, (Math.pow(2, 31) - 1));
        setTimeout(this.refreshTokenFn, safeRefresh);
        //setTimeout(this.refreshTokenFn, resp.result.expires_in - 10 * 60 * 1000);
    };

    refreshTokenFn = async () => {
        this.log(`Refreshing Token Now.`);
        const resp = await this.sendMessage({
            'jsonrpc': '2.0',
            'method': 'public/auth',
            'id': this.nextId(),
            'params': {
                'grant_type': 'refresh_token',
                'refresh_token': this.refreshToken
            }
        });

        this.token = resp.result.access_token;
        this.refreshToken = resp.result.refresh_token;

        if (!resp.result.expires_in) {
            throw new Error('Deribit did not provide expiry details');
        }

        /*
        wait(resp.result.expires_in - 10 * 60 * 1000).then(() => this.refreshTokenFn()).catch(error => {
            this.log(`Error while refreshing token: ${error.message}`)
        })
         */

        let refreshTime = (resp.result.expires_in - (10 * 60)) * 1000; // (ExpireTime (seconds) - 10 Minutes (in seconds)) converted back to Milliseconds
        let today = Date.now();
        let expireDateMilli = today + refreshTime;
        let expireDate = new Date(expireDateMilli);
        this.log(`Refresh Token Expires On: ${expireDate.toString()}`);
        let safeRefresh = Math.min(refreshTime, (Math.pow(2, 31) - 1));
        setTimeout(this.refreshTokenFn, safeRefresh);
    };

    findRequest(id) {
        for (let i = 0; i < this.inflightQueue.length; i++) {
            const req = this.inflightQueue[i];
            if (id === req.id) {
                this.inflightQueue.splice(i, 1);
                return req;
            }
        }
    }

    handleWSMessage = async (e) => {
        let payload;

        try {
            payload = JSON.parse(e.data);
        } catch (e) {
            console.error('deribit send bad json', e);
        }

        if (payload.method === 'subscription') {
            return this.emit(payload.params.channel, payload.params.data);
        }

        if (payload.method === 'heartbeat' || payload.method === 'test_request' || payload.method === 'ping') {
            if (this.DEBUG) {
                this.log(new Date + ' -> Responding to Heartbeat Request')
            }
            clearInterval(this.pingInterval);
            return this.sendMessage({
                'jsonrpc': '2.0',
                'method': 'public/test',
                'id': this.nextId(),
                'param': {}
            })
        }

        const request = this.findRequest(payload.id);

        if (!request) {
            return console.error('received response to request not send:', payload);
        }

        payload.requestedAt = request.requestedAt;
        payload.receivedAt = +new Date;
        request.onDone(payload);
    };

    sendMessage = async (payload, fireAndForget) => {
        if (!this.connected) {
            if (!this.reconnecting) {
                throw new Error('Not connected.')
            }

            await this.afterReconnect;
        }

        let p;
        if (!fireAndForget) {
            let onDone;
            let connectionAborted;
            p = new Promise((r, rj) => {
                onDone = r;
                connectionAborted = rj;

                this.inflightQueue.push({
                    requestedAt: +new Date,
                    id: payload.id,
                    onDone,
                    connectionAborted
                });

            });


        }

        this.ws.send(JSON.stringify(payload));

        /*
       // CDQ - added retry for message that may fail
      try {
           this.ws.send(JSON.stringify(payload));

   } catch (error) {
           this.log(error);
           await this.reconnect();
           setTimeout(() => {
               this.sendMessage(payload, fireAndForget)
           }, 5 * 1000);
       }
    */
        return p;
    };


    request = async (path, params) => {

        if (!this.connected) {
            if (!this.reconnecting) {
                throw new Error('Not connected.');
            }

            await this.afterReconnect;
        }

        if (path.startsWith('private')) {
            if (!this.authenticated) {
                throw new Error('Not authenticated.');
            }
        }

        const message = {
            'jsonrpc': '2.0',
            'method': path,
            'params': params,
            'id': this.nextId()
        };

        return this.sendMessage(message);
    };

    subscribe = (type, channel) => {

        this.subscriptions.push({type, channel});

        if (!this.connected) {
            throw new Error('Not connected.');
        } else if (type === 'private' && !this.authenticated) {
            throw new Error('Not authenticated.');
        }

        const message = {
            'jsonrpc': '2.0',
            'method': `${type}/subscribe`,
            'params': {
                'channels': [channel]
            },
            'id': this.nextId()
        };

        return this.sendMessage(message);
    };

    async cancel_order_by_label(label) {
        return await this.request(`private/cancel_by_label`,
            {
                'label': label
            });
    }

    async close_position(instrument, type) {
        return await this.request(`private/close_position`,
            {
                'instrument_name': instrument,
                'type': type
            });
    }

    async getPosition(instrument) {
        return await this.request(`private/get_position`,
            {
                'instrument_name': instrument
            }).catch(error => {
            throw new Error('[Deribit-v2-ws.js] issue getting positioning: ' + error);
        });
    }

    async editOrder(orderId, orderSizeUSD, price = false, stopPrice = false) {
        let orderEditOptions = {
            "order_id": orderId,
            "amount": orderSizeUSD,
        };
        if (price) {
            orderEditOptions['price'] = price;
        }
        if (stopPrice) {
            orderEditOptions['price'] = stopPrice;
        }
        return await this.request(`private/edit`, orderEditOptions);
    }

    async get_tradingview_chart_data(instrument, start, end, resolution) {
        return await this.request('public/get_tradingview_chart_data', {
            'instrument_name': instrument,
            'start_timestamp': start,
            'end_timestamp': end,
            'resolution': resolution
        });
    }

    async buy(options) {
        return await this.request('private/buy', options).catch(e => {
            throw new Error(e)
        });
    }

    async sell(options) {
        return await this.request('private/sell', options).catch(e => {
            throw new Error(e)
        });
        ;
    }

    async get_open_orders_by_instrument(instrument, type = "all") {
        return await this.request('private/get_open_orders_by_instrument', {
            'instrument_name': instrument,
            'type': type
        })
            .catch(error => {
                return {'result': []};
                //throw new Error('[Deribit-v2-ws.js] get_open_orders_by_instrument errors: ' + error);
            });
    }

    async get_stop_order_history(instrument, currency = "BTC", count = 30) {
        return await this.request('private/get_stop_order_history', {
            'instrument_name': instrument,
            'currency': currency,
            'count': count
        });
    }

    async edit(orderId, orderSizeUSD, price = false, stopPrice = false) {
        let options = {
            'order_id': orderId,
            'amount': orderSizeUSD
        };

        if (price) {
            options['price'] = price;
        }

        if (stopPrice) {
            options['stop_price'] = stopPrice;
        }

        return await this.request('private/edit', options);
    }

    async enable_cancel_on_disconnect() {
        return await this.request('private/enable_cancel_on_disconnect');
    }

    async disable_cancel_on_disconnect() {
        return await this.request('private/disable_cancel_on_disconnect');
    }

    async get_account_summary(currency, extended) {
        return await this.request('private/get_account_summary',
            {
                'currency': currency,
                'extended': extended
            })
    }

}


module.exports = Connection;