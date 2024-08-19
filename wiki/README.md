# Trading Bot Wiki

### Trading Strategy Documentation

For detailed information on the trading strategy, please refer to the [Trading Strategy Documentation](TradingStrategyDoc.md).

## Project Setup

The project is structured to facilitate easy configuration and extension. Below is an overview of the main components and their functions.

## Source Files

### `src/app.js`
This file is responsible for initializing and managing the trading application. It sets up the server, handles API connections, and manages trading logic. Key functionalities include:
Server Setup: Uses Express to set up the server, including middleware for CORS and logging with Morgan.

**Main Functionality:**
- API Connections: Connects to the Deribit and TD Ameritrade APIs using provided credentials and initializes trading logic.
- Trading Logic: Manages trading logic for different platforms (Deribit and TD Ameritrade), including determining trades, placing orders, and handling open orders.
- Endpoints: Defines various endpoints for the application, including a root endpoint and static file serving for TradingView and source directories.
- Error Handling: Implements error handling middleware to manage and log errors.
- Server Listening: Configures the server to listen on a specified host and port, with logging for various UDF (Universal Data Feed) endpoints.

### `src/TradingLogic.js`

This file contains the core trading logic. It includes functions for determining trades, placing orders, and managing open orders.

**Main Functions:**
- `determineTrades()`: Determines which trades to place based on the current market conditions.
- `getTradeOrder(zone, timeframe)`: Generates a trade order based on the specified zone and timeframe.
- `placeQueuedBracketOrders()`: Places all queued bracket orders.
- `handleOpenOrders()`: Manages open orders, including updating trail stops and handling missed entries.

### `src/utils.js`

This file contains utility functions used throughout the project.

**Main Functions:**
- `daysInMonth(month, year)`: Returns the number of days in the given month and year.
- `btw(search, end1, end2, inclusive)`: Checks if a value is between two other values.
- `myXOR(a, b)`: Returns the result of an exclusive or operation.
- `log(fileName, message, variable, logColor, padLength)`: Logs messages to the console with optional coloring and padding.

###  `charthelper.js`

This file provides various helper functions for analyzing and processing trading chart data. Key functionalities include:

- **getMinBaseLow(base)**: Returns the minimum low value found in the given array of bars.
- **getMinBaseBody(base)**: Returns the minimum open or close value found in the given array of bars.
- **getMaxBaseHigh(base)**: Returns the maximum high value found in the given array of bars.
- **getMaxBaseBody(base)**: Returns the maximum open or close value found in the given array of bars.
- **getBaseBodyMid(base)**: Returns the midpoint of the sum of the maximum and minimum base body values.
- **getBarBody(bar)**: Returns the absolute value of the difference between the open and close of a bar.
- **getBarRange(bar)**: Returns the absolute value of the difference between the high and low of a bar.
- **isBoringBar(bar)**: Returns true if the bar body is less than or equal to 50% of the bar range.
- **isExcitingBar(bar)**: Returns true if the bar body is greater than 50% of the bar range.
- **getZoneProperties(zone, currentPrice)**: Returns properties (distal, proximal, isSupply, isDemand) for the given zone based on the current price.
- **isSupply(base, currentPrice)**: Returns true if the proximal line of the base is above the current price.
- **isDemand(base, currentPrice)**: Returns true if the proximal line of the base is below the current price.
- **getZoneTimeStampMilli(zone)**: Returns the timestamp in milliseconds of the first bar within the zone.
- **getZoneTimeStampSeconds(zone)**: Returns the timestamp in seconds of the first bar within the zone.
- **getZoneTimeStampMinutes(zone)**: Returns the timestamp in minutes of the first bar within the zone.
- **discoverBasesFromBars(bars, baseMinSize)**: Returns a map of bases with length greater than or equal to the specified minimum size, mapped by their base time.

### `deribit.js`

This file manages the connection to the Deribit API and provides various functionalities for trading operations. Key functionalities include:

- **Initialization**: Sets up the connection to the Deribit API and initializes local variables.
- **Order Management**: Places, edits, and cancels orders, including stop orders and market orders.
- **Position Management**: Retrieves and manages the current trading position, including subscribing to position updates.
- **Price Retrieval**: Fetches current and historical price data for specified instruments.
- **Subscription Management**: Subscribes to various data channels for real-time updates on positions, portfolio, and market data.
- **Error Handling**: Implements error handling for API calls and promise rejections.

**Main Functions:**
- `init()`: Initializes the connection and sets up subscriptions.
- `placeOrder(instrument, orderType, orderSizeUSD, price, label)`: Places an order with the specified parameters.
- `getBars(instrument, start, stop, resolution)`: Retrieves historical price data for the specified instrument.
- `getOpenOrders(instrument, type)`: Returns an array of open orders for the specified instrument.
- `getPosition()`: Returns the current trading position.
- `retrieveAccountSummary()`: Retrieves and stores the account summary data.
- `subscribePositionChanges(instrument)`: Subscribes to position updates for the specified instrument.
- `subscribeTicker(instrument)`: Subscribes to ticker updates for the specified instrument.

### `query.js`

This file is responsible for validating and sanitizing query parameters in the application. It defines a custom `QueryError` class for handling query-related errors and provides several middleware functions for mandatory and optional query parameters.

**Main Functionalities:**
- **QueryError Class**: Custom error class for handling query parameter errors.
  - `missing(param)`: Returns an error for missing mandatory parameters.
  - `empty(param)`: Returns an error for empty parameters.
  - `mailformed(param)`: Returns an error for malformed parameters.
  
- **Middleware Functions**:
  - `mandatory(req, param, regexp)`: Validates mandatory query parameters against a regular expression.
  - `optional(req, param, regexp)`: Validates optional query parameters against a regular expression.
  - `optionalInt(req, param)`: Validates optional integer query parameters.

**Exported Middleware**:
- `symbol(req, res, next)`: Validates the `symbol` query parameter.
- `query(req, res, next)`: Validates the `query` query parameter.
- `limit(req, res, next)`: Validates the `limit` query parameter as an optional integer.
- `from(req, res, next)`: Validates the `from` query parameter as an optional integer.
- `to(req, res, next)`: Validates the `to` query parameter as an optional integer.
- `resolution(req, res, next)`: Validates the `resolution` query parameter.

### `tdameritrade.js`

This file manages the connection to the TD Ameritrade API and provides various functionalities for trading operations. Key functionalities include:

- **Initialization**: Sets up the connection to the TD Ameritrade API and initializes local variables.
- **Authentication**: Handles authentication using OAuth, including refreshing tokens.
- **WebSocket Management**: Manages WebSocket connections for real-time data and handles messages, errors, and reconnections.
- **Order Management**: Places, edits, and cancels orders.
- **Position Management**: Retrieves and manages the current trading position.
- **Price Retrieval**: Fetches current and historical price data for specified instruments.
- **Subscription Management**: Subscribes to various data channels for real-time updates on positions, portfolio, and market data.
- **Error Handling**: Implements error handling for API calls and WebSocket events.

**Main Functions:**
- `init()`: Initializes the connection and sets up subscriptions.
- `login()`: Logs in to the TD Ameritrade API.
- `logout()`: Logs out from the TD Ameritrade API.
- `getChartHistoryFutures(symbol, frequency, period, startTime, endTime)`: Retrieves historical price data for futures.
- `marketdataSymbolPricehistoryGET(symbol, from, to, resolution)`: Retrieves historical price data for the specified symbol.
- `subscribe(service, parameters)`: Subscribes to a data channel.
- `unsubscribe(service, parameters)`: Unsubscribes from a data channel.
- `authenticate()`: Authenticates the API instance using OAuth.
- `refreshTDAToken()`: Refreshes the OAuth token.
- `connect()`: Establishes a WebSocket connection.
- `reconnect()`: Reconnects the WebSocket connection in case of disconnection.
- `sendMessage(payload, fireAndForget)`: Sends a message through the WebSocket connection.
- `request(service, command, parameters, fireAndForget)`: Sends a request to the TD Ameritrade API.