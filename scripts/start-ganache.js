const ganache = require('ganache-cli');
const fs = require('fs');
const { ethers } = require('ethers');

const GANACHE_PORT = parseInt(process.env.PORT || 8545);
const INITIAL_BALANCE = ethers.utils.parseUnits('10000000.0', 'ether').toHexString();

const generateAccounts = (count = 1) => {
  if (fs.existsSync('./ganache-accounts')) {
    const accountsPrivateKeys = fs.readFileSync('./ganache-accounts', { encoding: 'utf8' }).split(',').map((pk) => pk.trim());

    console.log(`
----------------------------- accounts ---------------------------
${accountsPrivateKeys.join('\n')}
------------------------------------------------------------------
`);
    return accountsPrivateKeys.map((pk) => ({
      secretKey: pk,
      balance: INITIAL_BALANCE,
    }));
  }
  const accounts = Array(count).fill(0).map(() => {
    const wallet = ethers.Wallet.createRandom();
    return {
      secretKey: wallet.privateKey,
      balance: INITIAL_BALANCE,
    };
  });
  const accountsPrivateKeys = accounts.map(({ secretKey }) => secretKey);
  fs.writeFileSync('./ganache-accounts', accountsPrivateKeys.join(','), { encoding: 'utf8' });
  console.log(`
----------------------------- accounts ---------------------------
${accountsPrivateKeys.join('\n')}
------------------------------------------------------------------
`);
  return accounts;
};

const GANACHE_ACCOUNTS = generateAccounts(10);

const startGanache = () => {
  const server = ganache.server({
    accounts: GANACHE_ACCOUNTS,
    logger: console,
    port: GANACHE_PORT,
    db_path: './ganache-db',
    default_balance_ether: 10000000,
    chain: {
      chainId: 1337,
      networkId: 1337,
    },
    _chainId: 1337,
    network_id: 1337,
  });

  server.listen(GANACHE_PORT, (err, blockchain) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log('Ganache blockchain started');
  });
};
startGanache();
