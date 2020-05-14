![Docker](https://github.com/gitchrisqueen/btc-trading-app/workflows/Docker/badge.svg)
        ![Node.js CI](https://github.com/gitchrisqueen/btc-trading-app/workflows/Node.js%20CI/badge.svg)
        [![codecov](https://codecov.io/gh/gitchrisqueen/btc-trading-app/branch/master/graph/badge.svg?token=LWZJEUV38A)](https://codecov.io/gh/gitchrisqueen/btc-trading-app)

# btc-trading-app
BTC Trading App on Deribit Market


<!--
  ~ Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
  -->


<!----- Conversion time: 7.222 seconds.


Using this Markdown file:

1. Cut and paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β22
* Thu Apr 30 2020 05:32:29 GMT-0700 (PDT)
* Source doc: Trading Documentation
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server.

WARNING:
You have 12 H1 headings. You may want to use the "H1 -> H2" option to demote all headings by one level.

----->


<p style="color: red; font-weight: bold">>>>>>  gd2md-html alert:  ERRORs: 0; WARNINGs: 1; ALERTS: 35.</p>
<ul style="color: red; font-weight: bold"><li>See top comment block for details on ERRORs and WARNINGs. <li>In the converted Markdown or HTML, search for inline alerts that start with >>>>>  gd2md-html alert:  for specific instances that need correction.</ul>

<p style="color: red; font-weight: bold">Links to alert messages:</p><a href="#gdcalert1">alert1</a>
<a href="#gdcalert2">alert2</a>
<a href="#gdcalert3">alert3</a>
<a href="#gdcalert4">alert4</a>
<a href="#gdcalert5">alert5</a>
<a href="#gdcalert6">alert6</a>
<a href="#gdcalert7">alert7</a>
<a href="#gdcalert8">alert8</a>
<a href="#gdcalert9">alert9</a>
<a href="#gdcalert10">alert10</a>
<a href="#gdcalert11">alert11</a>
<a href="#gdcalert12">alert12</a>
<a href="#gdcalert13">alert13</a>
<a href="#gdcalert14">alert14</a>
<a href="#gdcalert15">alert15</a>
<a href="#gdcalert16">alert16</a>
<a href="#gdcalert17">alert17</a>
<a href="#gdcalert18">alert18</a>
<a href="#gdcalert19">alert19</a>
<a href="#gdcalert20">alert20</a>
<a href="#gdcalert21">alert21</a>
<a href="#gdcalert22">alert22</a>
<a href="#gdcalert23">alert23</a>
<a href="#gdcalert24">alert24</a>
<a href="#gdcalert25">alert25</a>
<a href="#gdcalert26">alert26</a>
<a href="#gdcalert27">alert27</a>
<a href="#gdcalert28">alert28</a>
<a href="#gdcalert29">alert29</a>
<a href="#gdcalert30">alert30</a>
<a href="#gdcalert31">alert31</a>
<a href="#gdcalert32">alert32</a>
<a href="#gdcalert33">alert33</a>
<a href="#gdcalert34">alert34</a>
<a href="#gdcalert35">alert35</a>

<p style="color: red; font-weight: bold">>>>>> PLEASE check and correct alert issues and delete this message and the inline alerts.<hr></p>



#                Trading Documentation


# Terms



1. Supply = S
2. Demand = D
3. Bullish  - Market is going up (like a bull’s horns). Biased to higher prices. Uptrend
4. Bearish - Market is going down (bear down). Biased to lower prices. Downtrend
5. SET = Stop, Entry, Target. Every trade needs to be SET.
6. Entry = The act of opening a position in a market.
7. Exit = The act of closing a position in a market. Can be for a profit or a loss.
8. Stop = Stop Loss is an order to exit a position for a predefined loss; also known as a Protective Stop Loss
9. Target = Profit target is an order to exit a position for a predefined gain
10. Risk = difference between entry and stop loss.
11. Reward = difference between entry and target.
    1. Minimum amount of reward to risk ratio (i.e 3-1)
12. Long Position = want the price to go up. a position bought now with the intent to sell later at a higher price.
13. Short Position =  a position that is sold now with the intent to buy later at a lower price. Futures & Forex do not have “shorting” restrictions.
14. Reward-to-Risk Ratio = 2.00/.50 = 4. This is a 4:1 PR or a “4R” trade.
    2. Don’t want to take anything less than a 3:1 ratio (as a beginner)
15.

<p id="gdcalert1" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation0.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert2">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation0.png "image_tooltip")

16.

<p id="gdcalert2" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation1.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert3">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation1.png "image_tooltip")

17.

<p id="gdcalert3" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation2.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert4">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation2.png "image_tooltip")



# Charting



1. Ticker Symbol - The item that we are charting
2. Time Frame - the amount of time each candle represents in a chart
3. Open/high/low/close volume
    1. Open - The first trade in the trading day
    2. High - The highest traded price for that day
    3. Low - Lowest traded price for that day
    4. Volume - how many shares were traded for that day
4. Date/Time = Scale at the bottom of a chart
5. Current Price = Right hand side of chart - always the most recent trade
6. Hourly Income Trader: 60 min, 15 min, & 5 min charts
7. Daily Income Trader: Daily, 60 min & 15 min charts
8. Weekly Income Trader: Weekly, Daily & 240 /60 min charts
9. Monthly Income Trader: Monthly, Weekly, & Daily charts
10.

<p id="gdcalert4" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation3.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert5">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation3.png "image_tooltip")

    5. Body = Open - Close
    6. Range = High - Low
    7. Boring Candles: Imply that supply and demand is in balance and that orders are potentially by accumulated by the institutions
        1. Body <= 50% of the range
    8. Exciting Candles: The greatest imbalance between supply and Demand is found at the origin of a series of Exciting Candles. Institutions are not chasing price, therefore there is less institutional activity within the Exciting Candle bodies.
        2. Body > 50% of the range
    9. Our Core Strategy will use Supply and Demand Levels made of Boring Candles followed by a series of Exciting Candles





# Supply & Demand



1.

<p id="gdcalert5" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation4.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert6">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation4.png "image_tooltip")

2. Two Core Setups
    1. Drop Base Rally = DBR
        1. Action = Buy Retracement
    2. Rally Base Drop = RBD
        2. Action = Sell Retracement
    3.

<p id="gdcalert6" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation5.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert7">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation5.png "image_tooltip")

    4.

<p id="gdcalert7" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation6.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert8">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation6.png "image_tooltip")



# Supply & Demand Zones



1. Zone =  a region on a chart, marked by two horizontal lines around the price level where Supply and Demand are out of balance
    1. 2 types of zones
        1. Supply Zone
        2. Demand Zone
2.

<p id="gdcalert8" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation7.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert9">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation7.png "image_tooltip")

3.

<p id="gdcalert9" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation8.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert10">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation8.png "image_tooltip")

4.

<p id="gdcalert10" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation9.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert11">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation9.png "image_tooltip")

5. Proximal Line can be drawn in 3 areas
    2. Top of the candle stick
    3. to of candle body
    4. Bottom of Candle body
6. Distal Line must be drawn at the bottom of the candle stick
7.

<p id="gdcalert11" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation10.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert12">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation10.png "image_tooltip")

8. Steps to Draw Supply & Demand Zones
    5.

<p id="gdcalert12" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation11.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert13">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation11.png "image_tooltip")

    6.

<p id="gdcalert13" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation12.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert14">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation12.png "image_tooltip")

    7.

<p id="gdcalert14" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation13.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert15">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation13.png "image_tooltip")



# Multiple Time Frames



1. A minimum of 3 time frames when planning trades
    1. Higher Time Frame (HTF) - used to assess the Curve
    2. Intermediate time Frame (ITF) - used to assess the trend
    3. Lower Time Frame (LTF) - Used to identify Supply and Demand to SET our trade
    4. Optional - Refining Time Frame (RTF) - used to refine Proximal and Distal
2. Curve Analysis
    5. helps us to know when to be in  Bullish or Bearish mode.
    6. Combined with the Odds Enhancers  Scoring Methodology dictates smarter action to be taken (Buying or Selling) and only then we focus on Supply and Demand Zones to time the Entries and Exits of our trades.
    7. Want to be looking for “Fresh” levels (see terminology)
    8. Basic Curve Analysis - understanding how High or Low our entries are. Or are we in a state of Equilibrium.
    9.

<p id="gdcalert15" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation14.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert16">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation14.png "image_tooltip")

3. Trend Analysis
    10. Helps us know which is the main direction in which a market is moving
    11. Trend is simply Price movement traveling from Larger time Frame Supply to Larger Time Frame Demand or vice versa
    12. Trend is how we get paid as a trader since this Price movement happens after a good Entry into a Market
    13. Trends are assessed by using an Intermediate Time Frame and can be Up, Down or Sideways
    14. Joining the Trend and following it is another valid possibility as long as our Entries are located favorably in the Curve
    15.

<p id="gdcalert16" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation15.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert17">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation15.png "image_tooltip")

    16.

<p id="gdcalert17" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation16.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert18">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation16.png "image_tooltip")

    17.

<p id="gdcalert18" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation17.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert19">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation17.png "image_tooltip")

    18. The really key question is what is the Trend going to be next?
    19. We call this Anticipatory Trend Analysis
    20. Two Ways of Assessing the Trend of Price:
        1. Conventional Trend Analysis
            1. Observing Price Action and identifying Pivots High and Low
            2. Anticipatory Trend Analysis -Covered in XLT- Extended Learning Track
4. Multiple Time Frame Analysis
    21.

<p id="gdcalert19" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation18.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert20">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation18.png "image_tooltip")

    22.

<p id="gdcalert20" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation19.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert21">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation19.png "image_tooltip")

    23.

<p id="gdcalert21" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation20.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert22">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation20.png "image_tooltip")

    24.

<p id="gdcalert22" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation21.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert23">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation21.png "image_tooltip")



#  Entry Types



1. There are 3 Basic Entry Types
    1. Limit Entry
        1. A Sell limit order is placed before price reaches the proximal line, with a Buy stop order just above the Distal line
        2. A Buy limit order is placed before price reaches the proximal line, with a Sell stop order just below the Distal line
    2. Zone Entry
        3. A Sell limit or market order is placed when price is anywhere inside the supply zone
        4. A Buy limit or market order is placed when price is anywhere inside the demand zone
        5. Many platforms won’t be able to set this up automatically
            1. You can set up contingent orders to get around this
    3. Confirmation Entry
        6. When price rallies into the Supply Zone, reverses, and crosses below the proximal line, Sell Short
        7. When price drops into the Demand Zone, reverses, and crosses above the proximal line, Buy
    4.

<p id="gdcalert23" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation22.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert24">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation22.png "image_tooltip")



# The Exit



1. Make sure you have a clear and planned Target and Stop Loss Exit
2. Make sure your Target represents at least a 3:1 Reward to Risk ratio
3. Exit Before the competitive buying and selling begins (just before opposing Supply and Demand Levels)
4. We will manage the Trade by moving our Stop Loss Exit Order (only toward the direction of profitability)
5. The Trail Stop
    1.

<p id="gdcalert24" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation23.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert25">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation23.png "image_tooltip")

    2.

<p id="gdcalert25" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation24.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert26">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation24.png "image_tooltip")

6. Preset Rules
    3. Preset Plan #1
        1. Once price reaches 2:1, move stop to breakeven. This reduces risk but also may reduce the probability of meeting profit target. Once price reaches 3:1 take profits. This trade management strategy can lead to higher profits.
    4. Preset Plan #2
        2. Once a price reaches 1:1, move stop to breakeven. This reduces risk quickly but also may reduce probability of meeting profit target. Once price reaches 2:1, take profit. This trade management strategy can lead to higher winning percentages.
    5. You can experiment with the numbers and create any trade management strategy you like. One will lead to higher winning percentage (less important) and another will lead to higher profits (more important). The key to making it work is a proper entry and sticking to the strategy.


# Odds Enhancers



1. Definition:
    1.  A scoring system that objectively measures the quality of a trade setup based on Supply and Demand: Level Structure, Curve Location and Key Conditions
    2. The more “Odds Enhancers” used the better the understanding of that trade setup
    3. You will decide which is the minimum score to be accepted to enter a trade based on your level of risk aversion and your purpose of trading
    4. The higher the score the better the opportunity, the lower the score the weaker the opportunity.
2. There are 5 types of Odds Enhancers:
    5. Level Structure
        1. How the level “looks”
    6. Curver Location
        2. Where the level is..
    7. Key Conditions
        3. Environmental circumstances
    8. Asset-Class Specific
        4. Affecting different Asset Classes differently
    9. All Asset Classes
        5. Affecting Asset Classes the same way
3. Level Structure (LTF)
    10.

<p id="gdcalert26" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation25.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert27">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation25.png "image_tooltip")

    11.

<p id="gdcalert27" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation26.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert28">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation26.png "image_tooltip")

        6. Best = 2: 60 degree or higher move
        7. Good = 1: 45-60 degree move
        8. Poor = 0: less than 45 degree move
    12.

<p id="gdcalert28" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation27.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert29">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation27.png "image_tooltip")

        9. Best = 2: 3 or less candles in the base of the level
        10. Good = 1: 4-6 candles in the base of the level
        11. Poor = 0: more than 6 candles in the base of the level
4. Curve Location (HTF)
    13. Profit Zone
        12.

<p id="gdcalert29" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation28.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert30">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation28.png "image_tooltip")

5. Proper Curve Location (HTF) and proper Structure (LTF) of a Supply and Demand Zone is Key


# Order Types



1. 4 Main Order Types
    1. Market (more important)
    2. Limit (more important)
    3. Stop Market
    4. Stop Limit
2. Market Order - used as our stop loss
    5.

<p id="gdcalert30" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation29.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert31">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation29.png "image_tooltip")

3. Limit Order
    6.

<p id="gdcalert31" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation30.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert32">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation30.png "image_tooltip")

4. Stop Market
    7.

<p id="gdcalert32" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation31.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert33">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation31.png "image_tooltip")

5. Stop Limit
    8.

<p id="gdcalert33" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation32.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert34">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation32.png "image_tooltip")

6.

<p id="gdcalert34" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation33.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert35">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation33.png "image_tooltip")

7. Primarily we will use Limit orders for Entry, Limit orders for Target, Stop Market Orders for Losses


# Bracket Orders



1. Bracket order is an order that has an entry, stop  & exit set all at once
2.

<p id="gdcalert35" ><span style="color: red; font-weight: bold">>>>>>  gd2md-html alert: inline image link here (to images/Trading-Documentation34.png). Store image on your image server and adjust path/filename if necessary. </span><br>(<a href="#">Back to top</a>)(<a href="#gdcalert36">Next alert</a>)<br><span style="color: red; font-weight: bold">>>>>> </span></p>


![alt_text](images/Trading-Documentation34.png "image_tooltip")



# Risk Management


# Position Sizing



1. Properly determining position size is KEY in managing risk
2. Every asset will have a specific way on how to calculate the proper Position Size, but theres is a rule that applies to all of them
3. The 2% RULE
4. Our position size has to be dependent on the account size in a way where we are willing to risk more once the account is growing and we are willing to risk less if the account is diminishing….
5. We use a percentage of the Account Size to achieve that goal
6. Risking less than 2% per trade is definitely OK, but make sure you never exceed the 2% mark.
7. How many shares to take in a position = Risk amount / amount of risk per trade = Shares

<!-- Docs to Markdown version 1.0β22 -->
