[![TradingApp Workflow CI](https://github.com/gitchrisqueen/btc-trading-app/workflows/TradingApp%20Workflow%20CI/badge.svg)](https://github.com/gitchrisqueen/btc-trading-app/actions?query=workflow%3A%22TradingApp+Workflow+CI%22)
 [![codecov](https://codecov.io/gh/gitchrisqueen/btc-trading-app/branch/master/graph/badge.svg?token=LWZJEUV38A)](https://codecov.io/gh/gitchrisqueen/btc-trading-app)

# Trading Bot Project

## Project Description

This project is a trading bot designed to automate trading strategies. It uses various indicators and market data to make informed trading decisions. The bot is highly configurable and can be adapted to different trading strategies.

## Documentation

For detailed documentation on the trading strategy and how to configure the bot, please refer to the [Wiki](wiki/README.md).

## Setup

### Prerequisites

- Docker
- Node.js

### Local Setup Using Docker

1. **Clone the repository**:
    ```sh
    git clone https://github.com/yourusername/trading-bot.git
    cd trading-bot
    ```

2. **Build the Docker image**:
    ```sh
    docker build -t trading-bot .
    ```

3. **Run the Docker container**:
    ```sh
    docker run -d --name trading-bot-container trading-bot
    ```

### Running Shell Scripts

The project includes several shell scripts located in the `shell_scripts` directory. These scripts are used for various tasks such as data fetching, backtesting, and more.

To run a script, use the following command:
```sh
node shell_scripts/<script_name>.js
```

### Installation

To install the project dependencies, run the following command:
```sh
npm install
``` 

### Usage

To start the trading bot, run:
```sh
npm start
```

### Contributing

Contributions are welcome! Please refer to the [Contribution Guidelines](CONTRIBUTING.md) for more information.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

### Funding

This project is looking for funding:
- [Open Collective](https://opencollective.com/chris-queen-consulting)
- [Patreon](https://www.patreon.com/christopherqueenconsulting)