const { ethers } = require('ethers');

const random = ethers.Wallet.createRandom();
const mnemonic = random._mnemonic().phrase;
console.log('mnemonic');
console.log('------------------');
console.log(`${mnemonic}`);
console.log('------------------');
console.log('');
const numberOfAddresses = parseInt(process.argv[2] || 10, 10);
console.log(`numberOfAddresses: ${numberOfAddresses}`);
for (let i = 0; i < numberOfAddresses; i++) {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`);
  console.log(`Address(${i}) ${wallet.address} # ${wallet.privateKey}`);
}
