require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
const config = require('./config');

const network = config.get('network.name');

const privateKeys = config.get('network.accounts');

const providerUrl = config.get('network.providerHttp');

if (privateKeys.length === 0) {
  console.log('ACCOUNT_MNEMONIC must be provided in ENV');
  process.exit(1);
}

const configuration = {
  defaultNetwork: network,
  networks: {
    ...(config.isHardhat() ? {
      hardhat: {
        forking: {
          url: config.get('network.providerHttpHardhat'),
          blockNumber: config.get('network.hardhatTestBlock'),
        },
        accounts: [{ privateKey: privateKeys[0], balance: '20000000000000000000' }],
      },
    } : {
      [network]: {
        url: providerUrl,
        accounts: privateKeys,

      },
    }
    ),
  },
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './tests',
    cache: './cache',
    artifacts: './artifacts',
    migrated: './migrated',
  },
  mocha: {
    timeout: 20000,
  },
  gasPrice: {
    maxGasPrice: config.get('gasPrice.maxGasPrice'),
    maxPriorityFeePerGas: config.get('gasPrice.maxPriorityFeePerGas'),
  },
  etherscan: {
    apiKey: config.get('etherscan.apiKey'),
  },
  plugins: ['solidity-coverage'],
};

// console.log(configuration);

module.exports = configuration;
