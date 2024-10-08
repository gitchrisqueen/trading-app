/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

/*
// TODO: Remove this in production (below)
const dotenv = require('dotenv');
try {
    const result = dotenv.config();
    if (result.error) {
        console.error(result.error)
        // TODO: fix this
        //throw result.error;
    }
    const {parsed: envs} = result;
    console.log("Environment Variables:", envs);
}catch (e) {
     console.error(e)
}
// TODO: Remove this in production (above)
*/

module.exports = {
    deribit_api_url: process.env.DERIBIT_API_URL,
    deribit_api_key: process.env.DERIBIT_API_KEY,
    deribit_api_secret: process.env.DERIBIT_API_SECRET,
    td_ameritrade_app_key : process.env.TD_AMERITRADE_APP_KEY,
    td_ameritrade_auth_code : process.env.TD_AMERITRADE_AUTH_CODE,
    td_ameritrade_refresh_token:  process.env.TD_AMERITRADE_REFRESH_TOKEN,
    port: process.env.PORT,
    host: process.env.HOST
};
