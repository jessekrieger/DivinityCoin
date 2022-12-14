require('dotenv').config({ override: true });

const convict = require('convict');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const lowerCaseString = {
  name: 'lowercase-string',
  validate: (val) => true,
  coerce: (val) => val.toLowerCase(),
};

const accountsFormat = {
  name: 'accounts',
  validate: (val) => true,
  coerce: (val) => {
    const addressesKeys = val.split(',');
    return addressesKeys.filter((x) => !!x);
  },
};

const accountsFromMnemonic = {
  name: 'accounts-from-mnemonic-or-keys',
  validate: (val) => true,
  coerce: (val) => {
    if (process.env.IS_MNEMONIC == 'true') {
      const mnemonic = !val ? ethers.Wallet.createRandom().mnemonic.phrase : val;

      const addressesKeys = [];
      const ACCOUNTS_COUNT = parseInt(process.env.ACCOUNTS_COUNT || 100, 10);
      for (let i = 0; i < ACCOUNTS_COUNT; i++) {
        const wallet = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`);

        addressesKeys.push(`${wallet.privateKey}`);
      }

      return addressesKeys.filter((x) => !!x);
    }
    return val.split(',').filter((x) => !!x)
      .map((k) => new ethers.Wallet(k).privateKey);
  },
};

convict.addFormat(accountsFormat);
convict.addFormat(lowerCaseString);
convict.addFormat(accountsFromMnemonic);

const config = convict({
  network: {
    name: {
      format: 'lowercase-string',
      default: 'development',
      env: 'NETWORK',
    },
    providerHttp: {
      format: String,
      default: 'http://localhost:8545',
      env: 'PROVIDER_HTTP',
    },
    accounts: {
      format: 'accounts-from-mnemonic-or-keys',
      default: null,
      env: 'ACCOUNTS',
    },
    isMnemonic: {
      format: String,
      default: 'true',
      env: 'IS_MNEMONIC',
    },
    providerHttpHardhat: {
      format: String,
      default: 'http://localhost:8545',
      env: 'PROVIDER_HTTP_TEST',
    },
    hardhatTestBlock: {
      format: String,
      default: '0',
      env: 'TEST_BLOCK',
    },
  },
  deploy: {
    divinity: {
      format: String,
      default: '0x0000000000000000000000000000000000000000',
      env: 'DIVINITY_ADDRESS',
    },
    payment: {
      format: String,
      default: '0x0000000000000000000000000000000000000000',
      env: 'PAYMENT_ADDRESS',
    },
    treasury: {
      format: String,
      default: '0x0000000000000000000000000000000000000000',
      env: 'TREASURY_ADDRESS',
    },
    buyPricePerUnit: {
      format: String,
      default: '0',
      env: 'BUY_PRICE_PER_UNIT',
    },
    sellPricePerUnit: {
      format: String,
      default: '0',
      env: 'SELL_PRICE_PER_UNIT',
    },
  },
  etherscan: {
    apiKey: {
      format: String,
      default: 'none',
      env: 'ETHERSCAN_API_KEY',
    },
  },
  gasPrice: {
    maxGasPrice: {
      format: String,
      default: '300000000000000',
      env: 'MAX_GAS_PRICE',

    },
    maxPriorityFeePerGas: {
      format: String,
      default: '300000000000000',
      env: 'MAX_PRIORITY_FEE_PER_GAS',
    },
  },
});

config.validate({ allowed: 'strict' });

convict.initDev = () => {
  if (config.get('network.name') == 'development') {
    if (fs.existsSync('./ganache-accounts')) {
      const privateKeys = fs.readFileSync('./ganache-accounts', { encoding: 'utf8' }).split(',').map((k) => k.trim());
      config.set('network.accounts', privateKeys);
    }
  }
  return config.get('network.accounts');
};

config.isHardhat = () => config.get('network.name') == 'hardhat';

convict.initDev();

module.exports = config;
