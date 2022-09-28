const hre = require('hardhat');

const { ethers } = hre;
const config = require('../config');
const question = require('../utils/question');
const mockERC20ABI = require('../abi/mockERC20.json');

async function main() {
  const [owner] = await ethers.getSigners();
  const tokenAddress = await question('Token address: ');
  if (!ethers.utils.isAddress(tokenAddress)) {
    throw new Error('Invalid address');
  }
  const token = new ethers.Contract(tokenAddress, mockERC20ABI, owner);
  const destinationAddress = await question('Destination address: ');
  if (!ethers.utils.isAddress(destinationAddress)) {
    throw new Error('Invalid address');
  }
  const amountF = await question('Amount: ');
  const tokenDecimals = await token.decimals();

  if (amountF.toLowerCase() != 'all') {
    console.log(`approving ${amountF} tokens`);
    const amount = ethers.utils.parseUnits(amountF, tokenDecimals);
    const tx = await token.approve(destinationAddress, amount);
    console.log(`Approved ${ethers.utils.formatUnits(amount, tokenDecimals)} to ${destinationAddress}`);
  } else {
    console.log('approving all tokens');
    const amount = ethers.constants.MaxUint256;
    console.log(`Approving ${ethers.utils.formatUnits(amount, tokenDecimals)} to ${destinationAddress}`);
    const tx = await token.approve(destinationAddress, amount);
    console.log(`Approved all to ${destinationAddress}`);
  }
}

main().then(() => {
  console.log('DONE');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
