const GitChrisQueen_TDA_JS = require('@gitchrisqueen/tdameritrade-api-js-client');
//const WebSocket = require('ws');
const WebSocket = require('isomorphic-ws')

const EventEmitter = require('events');
const decode = require('urldecode');

// Environment Variables
const {td_ameritrade_auth_code, td_ameritrade_app_key, td_ameritrade_refresh_token} = require('../config');

class TDAmeritrade extends EventEmitter {

    constructor() {
        super();

        this.messages = [];

        this.TDAAppKey = td_ameritrade_app_key;
        this.TDARefreshToken = td_ameritrade_refresh_token;
        this.TDAAuthCode = td_ameritrade_auth_code;

        this.apiClient = GitChrisQueen_TDA_JS.ApiClient.instance;
        this.bearerAuth = this.apiClient.authentications['bearerAuth'];
        //this.bearerAuth.apiKey = '';
        this.bearerAuth.apiKeyPrefix = 'Bearer';

        this.heartBeat = 60 * 3; //3 minutes in seconds
        this.connected = false;
        this.reconnecting = false;
        this.reconnectingCount = 0;
        this.afterReconnect = false;
        this.isReadyHook = false;
        this.isReady = new Promise((r => this.isReadyHook = r));

        this.authenticated = false;
        this.loggedIn = false;
        this.loggingIn = false;
        this.afterLoggingIn = false;
        this.afterLogingInHook = false;

        this.inflightQueue = [];
        this.subscriptions = [];

        this.id = 0;
    }

    handleError(e) {
        console.log(new Date, `Handle ERROR: ${JSON.stringify(e)}`);
        //throw new Error(e);
    }

    handleOnOpen() {
        this.connected = true;
        //this.pingInterval = setInterval(this.ping, (this.heartBeat * 1000) * 5); // 5X the heart beat without a heartbeat notification means connection is dead
        this.isReadyHook();

    }

    async handleWSMessage(e) {
        let message;
        //console.log('Raw Message Data: ', e);
        let data = JSON.parse(e.data);
        try {
            if (data.hasOwnProperty('data')) {
                message = data.data;
            } else if (data.hasOwnProperty('snapshot')) {
                message = data.snapshot;
            } else if (data.hasOwnProperty('notify')) {
                message = data.notify;
            } else if (data.hasOwnProperty('response')) {
                message = data.response;
            } else {
                throw Error('Unknown Response type from TDA: ' + JSON.stringify(data));
            }
        } catch (e) {
            console.error('TDA sent bad json', e);
        }

        //console.log('message:', message);

        if (Array.isArray(message)) {
            for (let index in message) {
                let payload = message[index];
                //console.log('payload:', payload);

                if (payload.hasOwnProperty('command') && payload.command === 'SUBS') {
                    clearInterval(this.pingInterval);
                    if (payload.hasOwnProperty('content')) {
                        let payloadContent = payload.content;
                        if (Array.isArray(payloadContent)) {
                            for (let contentIndex in payloadContent) {
                                let content = payloadContent[contentIndex];
                                let channel = payload.service + ":" + content.key;
                                console.log("Emitting - channel: " + channel + ' | content: ', content)
                                this.emit(channel, content);
                            }
                        }
                    }
                } else if (payload.hasOwnProperty('service') && payload.service === 'CHART_HISTORY_FUTURES') {
                    if (payload.hasOwnProperty('content')) {
                        let payloadContent = payload.content;
                        if (Array.isArray(payloadContent)) {
                            for (let contentIndex in payloadContent) {
                                let content = payloadContent[contentIndex];
                                let requestId = content['0'];
                                //console.log('CHART_HISTORY_FUTURES Response. Request ID: ' + requestId);
                                let chartHistoryRequest = this.findRequest(requestId);
                                if (chartHistoryRequest) {
                                    payload.requestedAt = chartHistoryRequest.requestedAt;
                                    payload.receivedAt = +new Date;
                                    chartHistoryRequest.onDone(payload);
                                }
                            }
                        }
                    }
                } else if (payload.hasOwnProperty('heartbeat')) {
                    // TODO: Determine if we need to send a response/ping when we get a heartbeat
                    console.log("Heartbeat received: " + payload.heartbeat);
                    //clearInterval(this.pingInterval);
                    //await this.ping();
                } else {

                    let request = this.findRequest(payload.requestid);

                    if (payload.hasOwnProperty('command') && payload.command === 'LOGIN') {
                        clearInterval(this.pingInterval);
                        if (payload.content.code === 0) {
                            //console.log('Login Payload:', payload);

                            this.loggedIn = true;
                            this.loggingIn = false;
                            await this.wait(3000);
                            this.afterLogingInHook();
                            console.log(new Date, ' Logged In.');

                        } else {
                            if (request) {
                                request.connectionAborted('Error Attempting Login: ' + payload.content.msg);
                            }
                            console.error('Error Attempting Login: ', payload.content.msg);
                        }
                    }

                    if (!request) {
                        console.error('received response to request not sent:', payload);
                    } else {

                        payload.requestedAt = request.requestedAt;
                        payload.receivedAt = +new Date;
                        request.onDone(payload);
                    }
                }
            }
        } else {
            console.error("Non-Array Message Error:", message);
        }
    }

    nextId() {
        return ++this.id;
    }

    findRequest(id) {
        //console.log('Searching for Request ID: ' + id);
        let foundReq = false;
        for (let i = 0; i < this.inflightQueue.length; i++) {
            let req = this.inflightQueue[i];
            //console.log('Request In Queue: ', req);
            if (parseInt(id) === parseInt(req.id)) {
                this.inflightQueue.splice(i, 1);
                foundReq = req;
                break;
            }
        }
        return foundReq;
    }

    async logout() {
        let p = await this.request('ADMIN', 'LOGOUT');
        console.log(new Date, ' Logged Out.');
        this.loggedIn = false;
        return p;

    }

    getLoginRequest() {

        //Converts ISO-8601 response in snapshot to ms since epoch accepted by Streamer
        let tokenTimeStampAsDateObj = new Date(this.userPrincipals.streamerInfo.tokenTimestamp);
        let tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

        //console.log("UserPrincipals: ", this.userPrincipals);

        let credentials = {
            "userid": this.userPrincipals.accounts[0].accountId,
            "token": this.userPrincipals.streamerInfo.token,
            "company": this.userPrincipals.accounts[0].company,
            "segment": this.userPrincipals.accounts[0].segment,
            "cddomain": this.userPrincipals.accounts[0].accountCdDomainId,
            "usergroup": this.userPrincipals.streamerInfo.userGroup,
            "accesslevel": this.userPrincipals.streamerInfo.accessLevel,
            "authorized": "Y",
            "timestamp": tokenTimeStampAsMs,
            "appid": this.userPrincipals.streamerInfo.appId,
            "acl": this.userPrincipals.streamerInfo.acl
        };

        let parameters = {
            "credential": this.jsonToQueryString(credentials),
            "token": this.userPrincipals.streamerInfo.token,
            "version": "1.0"
            //, "qoslevel": "1"
        };

        return parameters;

    }

    async login() {
        if (this.loggedIn) {
            //await this.wait(1000);
            return true;
        }

        this.loggingIn = true;

        this.afterLoggingIn = new Promise(r => this.afterLogingInHook = r);

        let parameters = this.getLoginRequest();

        //console.log('Login Params: ', parameters);

        //await this.wait(1000);
        console.log(new Date, ' Logging In...');
        let p = await this.request('ADMIN', 'LOGIN', parameters);
        //await this.wait(1000);
        return p;
    }

    async proceedAfterLoggingIn() {
        if (!this.loggedIn) {
            if (!this.loggingIn) {
                throw new Error('Not Logged In.')
            }
            await this.afterLoggingIn;
        }
    }

    getChartHistoryFutures(symbol, frequency, period = false, startTime = false, endTime = false) {
        //await this.proceedAfterLoggingIn();
        //console.log('Get Chart History Call');

        let parameters = {
            "symbol": symbol,
            "frequency": frequency
        };

        if (period) {
            parameters["period"] = "" + period;
        }

        if (startTime) {
            parameters["START_TIME"] = "" + startTime;
        }

        if (endTime) {
            parameters["END_TIME"] = "" + endTime;
        }

        //console.log('Get Chart History Params: ', parameters);

        return this.request('CHART_HISTORY_FUTURES', 'GET', parameters, false);
    }


    async request(service, command, parameters = {}, fireAndForget = false) {
        if (!this.connected) {
            if (!this.reconnecting) {
                throw new Error('Not connected.');
            }
            await this.afterReconnect;
        }

        let message =
            {
                "service": service,
                "command": command,
                "requestid": this.nextId(),
                "account": this.userPrincipals.accounts[0].accountId,
                "source": this.userPrincipals.streamerInfo.appId,
                "parameters": parameters
            };

        return this.sendMessage(message, fireAndForget);
        //this.addToMessages(message);
    }

    async sendMessage(payload, fireAndForget) {
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
                    id: payload.requestid,
                    onDone,
                    connectionAborted
                });

            });
        }

        let message = {
            "requests": [payload]
        };

        //console.log('WS Request: ', message);
        //console.log('WS Request Parameters: ', payload.parameters);
        let response = this.ws.send(JSON.stringify(message));

        //console.log('WS Response: ',response);
        return p;
    }

    subscribe(service, parameters) {

        this.subscriptions.push({service, parameters});

        if (!this.connected) {
            throw new Error('Not connected.');
        } else if (!this.authenticated) {
            throw new Error('Not authenticated.');
        }

        return this.request(service, 'SUBS', parameters, true);
    }

    unsubscribe(service, parameters) {

        if (!this.connected) {
            throw new Error('Not connected.');
        } else if (!this.authenticated) {
            throw new Error('Not authenticated.');
        }

        // TODO: Need to remove from this.subscriptions ???

        return this.request(service, 'UNSUBS', parameters);
    }


    async _connect() {
        if (this.connected) {
            return true;
        }

        let promise = new Promise(async (resolve, reject) => {

            let apiInstance = new GitChrisQueen_TDA_JS.UserInfoPreferencesApi();

            let opts = {
                'fields': "streamerSubscriptionKeys,streamerConnectionInfo" // String | A comma separated String which allows one to specify additional fields to return. None of these fields are returned by default. Possible values in this String can be: streamerSubscriptionKeys,streamerConnectionInfo,preferences, surrogateIds. Example: fields=streamerSubscriptionKeys,streamerConnectionInfo
            };
            this.userPrincipals = await apiInstance.userprincipalsGET(opts);

            //console.log('UserInfoPreferencesApi called successfully. Returned data: ' + JSON.stringify(this.userPrincipals));

            this.ws = new WebSocket("wss://" + this.userPrincipals.streamerInfo.streamerSocketUrl + "/ws");

            this.ws.onmessage = (message) => {
                this.handleWSMessage(message);
            }

            this.ws.onopen = () => {
                this.handleOnOpen();
                resolve();
            }

            this.ws.setMaxIdleTime = this.heartBeat * 1000;

            this.ws.onerror = (error) => {
                this.handleError(error);
            }

            this.ws.onclose = async (event) => {
                if (event.wasClean) {
                    console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`, JSON.stringify(event));
                    console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
                } else {
                    // e.g. server process killed or network down
                    // event.code is usually 1006 in this case
                    //console.log(`[close] Connection Died | code=${event.code} reason=${event.reason}`, JSON.stringify(event));
                    console.log(`[close] Connection Died | code=${event.code} reason=${event.reason}`);
                }

                //console.log(new Date + ' -> CLOSED CON:',event);

                this.inflightQueue.forEach((queueElement) => {
                    //queueElement.connectionAborted();
                    //queueElement.connectionAborted(new Error('TDA Connection Closed'));
                    queueElement.connectionAborted('TDA Connection Closed');
                });

                this.inflightQueue = [];
                this.loggedIn = false;
                this.authenticated = false;
                this.connected = false;
                clearInterval(this.pingInterval);
                if (this.reconnectingCount < 3) {
                    await this.reconnect();
                } else {
                    console.log(`Cannot properly reconnect to TDA. Exiting Node and restarting Docker container.`);
                    await this.end();
                    reject();
                    process.exit(1);
                }
            }
        });


        promise.catch((error) => {

            console.log("Error:");
            console.log(error.message);
            console.log(error.stack);

            this.inflightQueue = [];
            this.loggedIn = false;
            this.authenticated = false;
            this.connected = false;
            clearInterval(this.pingInterval);
            if (this.reconnectingCount < 3) {
                this.reconnect();
            } else {
                console.log(`Cannot properly reconnect to TDA. Exiting Node and restarting Docker container.`);
                process.exit(1);
            }
        });

        return promise;

    }

    async ping() {
        const timeout = setTimeout(() => {
            console.log(new Date, 'NO PING RESPONSE');
            //this.ws.terminate();
        }, (this.heartBeat * 1000)); // If 5X the Heartbeat goes by then we will terminate the connection because it is dead

        //TODO: Do we need to ping the WS connection (Dont think so. Maybe just track to see if connection open. If heartbeat not recieved after certain amount of time relogin)
        //this.ws.send('ping');

        clearInterval(timeout);
    }

    // end a connection
    async end() {
        await this.logout();
        // Subscriptions are ended when logout is called
        this.ws.onclose = undefined;
        this.authenticated = false;
        this.connected = false;
        this.loggedIn = false;
        this.ws.terminate();
        console.log(new Date, ' ENDED WS CON');
    }

    wait(n) {
        return new Promise(r => setTimeout(r, n));
    }

    async reconnect() {
        this.reconnecting = true;
        this.reconnectingCount++;

        let hook;
        this.afterReconnect = new Promise(r => hook = r);
        this.isReady = new Promise((r => this.isReadyHook = r));
        await this.wait(1000);
        console.log(new Date, ' RECONNECTING...');
        let p = await this.connect();
        hook();
        this.isReadyHook();

        this.subscriptions.forEach(sub => {
            this.subscribe(sub.service, sub.parameters);
        });

        return p;
    }

    async connect() {
        if (!this.authenticated) {
            await this.authenticate();
        }

        if (!this.connected) {
            await this._connect();
        }

        if (!this.loggedIn) {
            await this.login(); //TODO: Uncomment
            //await this.proceedAfterLoggingIn();
        }

    }


    authenticateTDA() {
        let apiInstance = new GitChrisQueen_TDA_JS.AuthenticationApi();

        let grant_type = "authorization_code"; // String | The grant type of the oAuth scheme. Possible values are authorization_code, refresh_token
        let client_id = this.TDAAppKey + '@AMER.OAUTHAP'; // Number | OAuth User ID of your application

        let opts = {
            'access_type': "offline", // String | Set to offline to receive a refresh token on an authorization_code grant type request. Do not set to offline on a refresh_token grant type request.
            'code': decode(this.TDAAuthCode), // String | Required if trying to use authorization code grant
            //'code': this.TDAAuthCode, // String | Required if trying to use authorization code grant
            'redirect_uri': 'http://localhost' // String | Required if trying to use authorization code grant
        };

        return apiInstance.oauth2TokenPOST(grant_type, client_id, opts).then((data) => {
            //console.log('oauth2TokenPOST(grant_type=' + grant_type + ') called successfully. Returned data: ' + JSON.stringify(data));

            // Configure API key authorization: bearerAuth
            this.bearerAuth.apiKey = data['access_token']; // TODO: Need a way to automate this
            //console.log('Access Token:\r\n' + this.bearerAuth.apiKey + '\r\n');

            let refreshTimeOut = data['refresh_token_expires_in'];
            let refreshTimeOutDate = new Date(Date.now() + (refreshTimeOut * 1000));
            //console.log('Refresh Token Expires on ' + refreshTimeOutDate.toString());

            let tokenTimeOut = data['expires_in'];
            let tokenTimeOutDate = new Date(Date.now() + (tokenTimeOut * 1000));
            console.log('Access Token Expires on ' + tokenTimeOutDate.toString());

            this.TDARefreshToken = data['refresh_token'];
            //console.log('Refresh Token:\r\n' + this.TDARefreshToken + '\r\n');

            setTimeout(() => {
                this.refreshTDAToken();
            }, tokenTimeOut * 1000);

            return this.TDARefreshToken;


        }, (error) => {
            console.error(error);
        }).catch(error => {
            console.error(error);
        });

    }

    refreshTDAToken() {
        let apiInstance = new GitChrisQueen_TDA_JS.AuthenticationApi();

        let grant_type = "refresh_token"; // String | The grant type of the oAuth scheme. Possible values are authorization_code, refresh_token
        let client_id = this.TDAAppKey + '@AMER.OAUTHAP'; // Number | OAuth User ID of your application

        let opts = {
            'refresh_token': this.TDARefreshToken, // String | Required if using refresh token grant
        };
        return apiInstance.oauth2TokenPOST(grant_type, client_id, opts).then((data) => {
            //console.log('oauth2TokenPOST(grant_type=' + grant_type + ') called successfully. Returned data: ' + JSON.stringify(data));
            // Configure API key authorization: bearerAuth
            this.bearerAuth.apiKey = data["access_token"]; // TODO: Need a way to automate this
            //console.log('Access Token:\r\n' + this.bearerAuth.apiKey + '\r\n');

            //console.log('Refresh Token:\r\n' + this.TDARefreshToken + '\r\n');

            let tokenTimeOut = data["expires_in"];
            let tokenTimeOutDate = new Date(Date.now() + (tokenTimeOut * 1000));
            console.log('Access Token Expires on ' + tokenTimeOutDate.toString());

            setTimeout(this.refreshTDAToken, tokenTimeOut * 1000);

            return this.TDARefreshToken;

        }, (error) => {
            console.error(error);
        }).catch(error => {
            console.error(error);
        });
    }

    jsonToQueryString(json) {
        return Object.keys(json).map(function (key) {
            return encodeURIComponent(key) + '=' +
                encodeURIComponent(json[key]);
        }).join('&');
    }

    async authenticate() {
        let promise;
        // Authenticate the API instance
        if (this.TDARefreshToken !== null && this.TDARefreshToken.length > 0) {
            // Use the refresh token to authenticate access
            promise = this.refreshTDAToken();
        } else {
            let authURL = 'https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=http%3A%2F%2Flocalhost&client_id=' + this.TDAAppKey + '%40AMER.OAUTHAP'
            console.log('No TD_AMERITRADE_REFRESH_TOKEN available.\r\nUsing TD_AMERITRADE_AUTH_CODE instead. \r\nGet a fresh Auth code from the URL after visiting:\r\n' + authURL);
            promise = this.authenticateTDA();
        }

        promise.then(() => {
            this.authenticated = true;
        });

        return promise;
    }

    instrumentsGET(symbol, projection, opts) {
        let apiInstance = new GitChrisQueen_TDA_JS.InstrumentsApi();
        return apiInstance.instrumentsGET(symbol, projection, opts);
    }

    getFrequencyTypeFromResolution(resolution) {
        let f = resolution.charAt(resolution.length - 1).toLowerCase();
        //console.log('Resolution: ' + resolution + '| f: ' + f);
        let frequencyType;
        switch (f) {
            default:
                frequencyType = GitChrisQueen_TDA_JS.FrequencyType.minute;
                break;
            case 'd':
                frequencyType = GitChrisQueen_TDA_JS.FrequencyType.daily;
                break;
            case 'w':
                frequencyType = GitChrisQueen_TDA_JS.FrequencyType.weekly;
                break;
            case 'm':
                frequencyType = GitChrisQueen_TDA_JS.FrequencyType.monthly;
                break;
        }
        //console.log('Returning frequencyType: ' + frequencyType);
        return frequencyType;
    }

    getFrequencyFromResolution(resolution) {
        let ft = this.getFrequencyTypeFromResolution(resolution);
        let frequency;
        switch (ft) {
            default:
            case GitChrisQueen_TDA_JS.FrequencyType.minute:
                frequency = parseInt(resolution);
                break;
            case GitChrisQueen_TDA_JS.FrequencyType.daily:
            case GitChrisQueen_TDA_JS.FrequencyType.weekly:
            case GitChrisQueen_TDA_JS.FrequencyType.monthly:
                frequency = 1;
                break;
        }
        return frequency;
    }

    getGetPeriodFromResolution(resolution) {
        let f = this.getFrequencyTypeFromResolution(resolution);
        let period;
        switch (f) {
            default:
            case GitChrisQueen_TDA_JS.FrequencyType.minute:
                period = GitChrisQueen_TDA_JS.PeriodType.day;
                break;
            case GitChrisQueen_TDA_JS.FrequencyType.daily:
                period = GitChrisQueen_TDA_JS.PeriodType.month
                break;
        }
        return period;
    }

    marketdataSymbolPricehistoryGET(symbol, from, to, resolution) {
        let priceHistoryInstance = new GitChrisQueen_TDA_JS.PriceHistoryApi();
        // choose the period type from resolution

        // From and To should be Unix timestamp (UTC)
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

        console.log("from: " + fromUTC + " | to: " + toUTC);

        let opts = {
            //'apikey': this.TDAAppKey, // String | // TODO: Might not need to passed this once authenticated for real time data
            'periodType': this.getGetPeriodFromResolution(resolution), // PeriodType |
            //'period': 10, // Number |
            'frequencyType': this.getFrequencyTypeFromResolution(resolution), // FrequencyType |
            'frequency': this.getFrequencyFromResolution(resolution), // Number |
            'startDate': from, // Number |
            'endDate': to, // Number |
            'needExtendedHoursData': true // Boolean |
        };
        console.log('marketdataSymbolPricehistoryGET options: ' + JSON.stringify(opts));

        return priceHistoryInstance.marketdataSymbolPricehistoryGET(symbol, opts);

    }

}

module
    .exports = TDAmeritrade