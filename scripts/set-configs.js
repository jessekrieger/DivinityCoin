const hre = require('hardhat');
const question = require('../utils/question');

const { ethers } = hre;

const run = async () => {
  const [owner] = await ethers.getSigners();
  const artifact = await hre.artifacts.readArtifact('TokenSaleImplementation');
  const tokenSaleAddress = await question('TokenSale address: ');
  const tokenSale = new ethers.Contract(tokenSaleAddress, artifact.abi, owner);

  const treasuryAddress = await question('Treasury address: ');

  const tx = await tokenSale
    .setConfigs(
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      treasuryAddress,
      ethers.BigNumber.from('0'),
      ethers.BigNumber.from('0'),
      { gasLimit: 1000000 },
    );

  console.log(`changing treasury address to: ${treasuryAddress} ${tx.hash}`);

  await tx.wait();
};

run().then(() => {
  console.log('DONE');
}).catch((e) => {
  console.log(e);
  process.exit(1);
});
