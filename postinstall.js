/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

/* eslint-disable max-len */
var fs = require('fs');
var os = require('os');
var path = require('path');
var env = process.env;
var chalk = require('chalk');

var ADBLOCK = is(env.ADBLOCK);
var COLOR = is(env.npm_config_color);
var DISABLE_OPENCOLLECTIVE = is(env.DISABLE_OPENCOLLECTIVE);
var SILENT = ['silent', 'error', 'warn'].indexOf(env.npm_config_loglevel) !== -1;
var OPEN_SOURCE_CONTRIBUTOR = is(env.OPEN_SOURCE_CONTRIBUTOR);
var MINUTE = 60 * 1000;

const CQCLightGoldHex = '#e9d437';
const CQCDarkGoldHex = '#a89816';

// you could add a PR with an env variable for your CI detection
var CI = [
    'BUILD_NUMBER',
    'CI',
    'CONTINUOUS_INTEGRATION',
    'DRONE',
    'RUN_ID'
].some(function (it) {
    return is(env[it]);
});

var BANNER = chalk.hex(CQCLightGoldHex)('Thank you for using gitchrisqueen/trading-app ( ') +
    chalk.hex(CQCDarkGoldHex)('https://github.com/gitchrisqueen/trading-app') + chalk.hex(CQCLightGoldHex)(' ) for auto trading on TD Ameritrade and Deribit!\n\n' +
        'The project needs your help! Please consider supporting of gitchrisqueen/trading-app on Open Collective or Patreon:\n') +
    chalk.hex(CQCDarkGoldHex)('https://opencollective.com/chris-queen-consulting\n') +
    chalk.hex(CQCDarkGoldHex)('https://www.patreon.com/christopherqueenconsulting\n\n') +
    chalk.hex(CQCLightGoldHex)('Also, Christopher Queen Consulting ( ') +
    chalk.hex(CQCDarkGoldHex)('https://www.christopherqueenconsulting.com') + chalk.hex(CQCLightGoldHex)(' ) is always looking to support new clients :^)\n');

function is(it) {
    return !!it && it !== '0' && it !== 'false';
}

function isBannerRequired() {
    if (ADBLOCK || CI || DISABLE_OPENCOLLECTIVE || SILENT || OPEN_SOURCE_CONTRIBUTOR) return false;
    var file = path.join(os.tmpdir(), 'core-js-banners');
    var banners = [];
    try {
        var DELTA = Date.now() - fs.statSync(file).mtime;
        if (DELTA >= 0 && DELTA < MINUTE * 3) {
            banners = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (banners.indexOf(BANNER) !== -1) return false;
        }
    } catch (error) {
        banners = [];
    }
    try {
        banners.push(BANNER);
        fs.writeFileSync(file, JSON.stringify(banners), 'utf8');
    } catch (error) { /* empty */
    }
    return true;
}

function showBanner() {
    // eslint-disable-next-line no-console,no-control-regex
    //console.log(COLOR ? BANNER : BANNER.replace(/\u001B\[\d+m/g, ''));
    console.log(BANNER);
}

if (isBannerRequired()) showBanner();

