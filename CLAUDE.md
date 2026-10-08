# CLAUDE.md

Guidance for Claude Code (and other coding agents) working in this repo.

## Purpose

A Node.js trading bot. It reads market data from Deribit (BTC futures, via
`deribit-v2-ws-gitchrisqueen`) or TD Ameritrade (USD futures, via
`@gitchrisqueen/tdameritrade-api-js-client`), applies the strategy in `src/tradinglogic.js`, and
serves a TradingView chart through UDF-compatible datafeeds. The strategy itself is documented
in `wiki/TradingStrategyDoc.md`.

## Stack

- Node.js, CommonJS, Express. Source in `src/` is compiled by Babel (`@babel/preset-env`,
  `@babel/preset-flow`) into `lib/` (`npm run build`); `npm start` runs `lib/app.js`.
- Flow type annotations (`npm run flow`).
- Jest + babel-jest for tests (`__tests__/`, mocks in `__mocks__/`).
- Docker image built from `Dockerfile`.
- `src/tradingview/charting_library/` and `src/tradingview/datafeeds/` are vendored TradingView
  code. Do not edit them; they are excluded from coverage.
- `src/cloudquant/` holds a separate Python strategy script (`ats.py`) and its test.

## Running

```bash
npm install
npm run startlocal        # node --watch with dotenv; logic type from package.json config.logicType
npm run build && npm start
```

The logic type (`tda`, `deribit` or `none`) comes from `process.argv[2]`, then `LOGIC_TYPE`, and
defaults to `none`. Credentials and host settings are read from environment variables in
`config.js` (`DERIBIT_API_URL`, `DERIBIT_API_KEY`, `DERIBIT_API_SECRET`,
`TD_AMERITRADE_APP_KEY`, `TD_AMERITRADE_AUTH_CODE`, `TD_AMERITRADE_REFRESH_TOKEN`, `PORT`,
`HOST`). Keep them in a local `.env`; never commit real values.

## Running tests

```bash
npm test                  # Jest, run in band, with coverage
npm run testunitdebug     # unit tests only (*.unit.test.js)
npm run testintdebug      # integration tests only (*.int.test.js)
```

`*.int.test.js` files talk to the Deribit test network. Coverage thresholds are 80% global
(50% branches for `src/utils.js`), set in `jest.config.js`.

## Conventions

- Unit tests are `__tests__/<module>.unit.test.js`; integration tests are `*.int.test.js`.
- Exchange-specific code lives in its own module (`src/deribit.js`, `src/tdameritrade.js`) behind
  the data-connector interface in `src/interfaces/`; UDF adapters live under `src/udf/<exchange>/`.
- The CI workflow (`.github/workflows/tradingapp_workflow.yml`) targets Node 14 and v1/v2
  GitHub Actions; treat it as legacy and check it before relying on CI results.
