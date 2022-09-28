# Divinity Coin

## Token Sale

### How To Test

First we need to start ganache test chain

```
npm run ganache
```

Then we can run all tests

```
npm test
```

### How To Deploy

#### Env file example

```
NETWORK=development
PROVIDER_HTTP=http://localhost:8545
ACCOUNTS=privateKeysCommaSepparated or mnemonic
IS_MNEMONIC=false or true
DIVINITY_ADDRESS=0x0000000000000000000000
PAYMENT_ADDRESS=0x0000000000000000000000
TREASURY_ADDRESS=0x0000000000000000000000
BUY_PRICE_PER_UNIT=314150000
SELL_PRICE_PER_UNIT=144000000
ETHERSCAN_API_KEY=_etherscan_api_key_
```

#### deploy

```
npm run deploy
```


### UI example

- start ganache
- copy generated private keys from ganache
    - first key is deployment owner
    - second key can be client
- run deployment script
- replace token sale address, test payment token, test `$DIVINE` address and treasury address in `./integration/public/addresses.json`
- run `npm run mint-dev` to mint payment tokens to client address and `$DIVINE` to treasury address
- run integration server `npm run integration-example` . This will start a http server on `http://localhost:22345` . Load the URL in browser.

