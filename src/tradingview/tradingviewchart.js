/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */

/*
import TradingView as tv from "https://s3.tradingview.com/tv.js";
import TradingView as customTradingView from "./charting_library/charting_library.min";

const tvTemp = new TradingView.widget({
    symbol: 'BTCPERP',
    interval: '1D', // default interval
    fullscreen: false, // displays the chart in the fullscreen mode
    container_id: 'tv_chart_HTF',
    timezone: "America/New_York",
    //library_path: '../charting_library/',
    width: '100%',

});


 */

const tvWidget1 = new TradingView.widget({
//const tvWidget1 = new customTradingView.widget({
    symbol: '/NQ',
    interval: '240', // default interval
    fullscreen: false, // displays the chart in the fullscreen mode
    container_id: 'tv_chart_HTF',
    //timezone: "Etc/UTC",
    timezone: "America/New_York",
    //datafeed: Datafeed,
    //datafeed: new Datafeeds.DeribitFtuDataFeed(),
    datafeed: new Datafeeds.UDFCompatibleDatafeed(window.location+'../udf'),
    library_path: './charting_library/',
    width: '100%',
    //enabled_features: ["hide_left_toolbar_by_default"],
}).onChartReady(function () {

        this.subscribe("onTick",
            async () => {
                console.log(`New Tick`);

            });

    }
);

