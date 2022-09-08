const hre = require('hardhat');
const fs = require('fs');

const { ethers } = hre;
const config = require('../config');

const existingDeploymentAddress = (name, version = '') => {
  const deploysDirectory = `./deploys/${config.get('network.name')}`;
  const filename = `${deploysDirectory}/${name}${version ? `-${version}` : ''}`;
  if (fs.existsSync(filename)) {
    return fs.readFileSync(filename, 'utf8');
  }
  return null;
};
async function main(version = '1.0.0') {
  const [owner] = await ethers.getSigners();

  const deployerAddress = existingDeploymentAddress('Deployer', version);
  await hre.run('verify:verify', {
    address: deployerAddress,
    constructorArguments: [],
    contract: 'contracts/Deployer.sol:Deployer',
  });

  const adminProxyAddress = existingDeploymentAddress('AdminProxy', version);
  await hre.run('verify:verify', {
    address: adminProxyAddress,
    constructorArguments: [],
    contract: 'contracts/AdminProxy.sol:AdminProxy',
  });

  const tokenSaleImplementationAddress = existingDeploymentAddress('TokenSaleImplementation', version);
  await hre.run('verify:verify', {
    address: tokenSaleImplementationAddress,
    constructorArguments: [],
    contract: 'contracts/TokenSaleImplementation.sol:TokenSaleImplementation',
  });

  const tokenSaleAddress = existingDeploymentAddress('TokenSale', version);
  const tokenSaleImplementationArtifact = await hre.artifacts.readArtifact('TokenSaleImplementation');
  const tokenSaleImplementation = new ethers.Contract(tokenSaleImplementationAddress, tokenSaleImplementationArtifact.abi, owner);
  const initBytes = tokenSaleImplementation.interface.encodeFunctionData(
    'initialize(address,address,address,uint256,uint256)',
    [
      config.get('deploy.divinity'),
      config.get('deploy.payment'),
      config.get('deploy.treasury'),
      ethers.BigNumber.from(`${config.get('deploy.buyPricePerUnit')}`),
      ethers.BigNumber.from(`${config.get('deploy.sellPricePerUnit')}`),
    ],
  );
  await hre.run('verify:verify', {
    address: tokenSaleAddress,
    constructorArguments: [
      tokenSaleImplementationAddress,
      adminProxyAddress,
      initBytes,
    ],
    contract: 'contracts/UpgradeableContract.sol:UpgradeableContract',

  });
}

main().then(() => {
  console.log('DONE');
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
