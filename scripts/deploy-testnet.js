const hre = require('hardhat');
const fs = require('fs');
const config = require('../config');
const vanityDeploy = require('../utils/vanity-deploy');
const constructorBytes = require('../utils/constructor-bytes');
const question = require('../utils/question');

const { ethers } = hre;

const ensureDeploysDirectory = () => {
  const deploysDirectory = `./deploys/${config.get('network.name')}`;
  if (!fs.existsSync(deploysDirectory)) {
    fs.mkdirSync(deploysDirectory, { recursive: true });
  }
};

const writeDeploymentAddress = (name, address, version = '') => {
  const deploysDirectory = `./deploys/${config.get('network.name')}`;
  const filename = `${deploysDirectory}/${name}${version ? `-${version}` : ''}`;
  fs.writeFileSync(filename, `${address}`);
};

const existingDeploymentAddress = (name, version = '') => {
  const deploysDirectory = `./deploys/${config.get('network.name')}`;
  const filename = `${deploysDirectory}/${name}${version ? `-${version}` : ''}`;
  if (fs.existsSync(filename)) {
    return fs.readFileSync(filename, 'utf8');
  }
  return null;
};

async function main(version = '1.0.0') {
  await hre.run('compile');
  const [owner] = await ethers.getSigners();
  ensureDeploysDirectory();

  const salt = ethers.utils.id(`version-${version}`);

  let deployer;
  let adminProxy;
  let tokenSaleImplementation;
  let tokenSale;

  if (!existingDeploymentAddress('Deployer', version)) {
    const Deployer = await ethers.getContractFactory('Deployer');
    console.log('Deploying Deployer...');

    deployer = await Deployer.deploy();
    await deployer.deployed();
    console.log(`Deployer deployed to: ${deployer.address}`);
    writeDeploymentAddress('Deployer', deployer.address, version);
  } else {
    console.log(`Deployer already deployed to: ${existingDeploymentAddress('Deployer', version)}`);
    const deployerArtifact = await hre.artifacts.readArtifact('Deployer');
    deployer = new ethers.Contract(existingDeploymentAddress('Deployer', version), deployerArtifact.abi, owner);
  }
  if (!existingDeploymentAddress('AdminProxy', version)) {
    const adminProxyArtifact = await hre.artifacts.readArtifact('AdminProxy');
    console.log('Deploying AdminProxy...');
    const { address: adminProxyAddress } = await vanityDeploy({
      deployer,
      owner,
      specificSalt: salt,
      artifact: adminProxyArtifact,
    });
    adminProxy = new ethers.Contract(adminProxyAddress, adminProxyArtifact.abi, owner);
    console.log(`AdminProxy deployed to: ${adminProxy.address}`);
    writeDeploymentAddress('AdminProxy', adminProxy.address, version);
  } else {
    console.log(`AdminProxy already deployed to: ${existingDeploymentAddress('AdminProxy', version)}`);
    const adminProxyArtifact = await hre.artifacts.readArtifact('AdminProxy');
    adminProxy = new ethers.Contract(existingDeploymentAddress('AdminProxy', version), adminProxyArtifact.abi, owner);
  }
  const tokenSaleImplementationArtifact = await hre.artifacts.readArtifact('TokenSaleImplementation');
  if (!existingDeploymentAddress('TokenSaleImplementation', version)) {
    console.log('Deploying TokenSaleImplementation...');

    const { address: tokenSaleImplementationAddress } = await vanityDeploy({
      deployer,
      owner,
      specificSalt: salt,
      artifact: tokenSaleImplementationArtifact,
    });
    tokenSaleImplementation = new ethers.Contract(
      tokenSaleImplementationAddress,
      tokenSaleImplementationArtifact.abi,
      owner,
    );

    console.log(`TokenSaleImplementation deployed to: ${tokenSaleImplementation.address}`);

    writeDeploymentAddress('TokenSaleImplementation', tokenSaleImplementation.address, version);
  } else {
    console.log(`TokenSaleImplementation already deployed to: ${existingDeploymentAddress('TokenSaleImplementation', version)}`);
    tokenSaleImplementation = new ethers.Contract(existingDeploymentAddress('TokenSaleImplementation', version), tokenSaleImplementationArtifact.abi, owner);
  }

  if (!existingDeploymentAddress('TokenSale', version)) {
    const upgradeableContractArtifact = await hre.artifacts.readArtifact('UpgradeableContract');

    let paymentTokenAddress;
    let divinityCoinAddress;
    let treasuryAddress;
    if (config.get('network.name') == 'testnet') {
      const MockERC20Token = await ethers.getContractFactory('MockERC20Token');
      const paymentToken = await MockERC20Token.deploy('Payment Token', 'PAY', 6);
      await paymentToken.deployed();
      paymentTokenAddress = paymentToken.address;
      const divinityCoin = await MockERC20Token.deploy('Divinity Coin', 'DIV', 18);
      await divinityCoin.deployed();
      divinityCoinAddress = divinityCoin.address;
    } else {
      paymentTokenAddress = config.get('deploy.payment');
      divinityCoinAddress = config.get('deploy.divinity');
    }

    if (paymentTokenAddress == ethers.constants.AddressZero) {
      throw new Error('Payment token address is zero');
    }

    if (divinityCoinAddress == ethers.constants.AddressZero) {
      throw new Error('Divinity coin address is zero');
    }

    if (config.get('deploy.treasury') == ethers.constants.AddressZero) {
      treasuryAddress = owner.address;
    } else {
      treasuryAddress = config.get('deploy.treasury');
    }

    if (ethers.BigNumber.from(config.get('deploy.buyPricePerUnit')).isZero()) {
      throw new Error('Buy price per unit is zero');
    }

    if (ethers.BigNumber.from(config.get('deploy.sellPricePerUnit')).isZero()) {
      throw new Error('Sell price per unit is zero');
    }

    while (true) {
      if (await question(`Is Payment Token Address ${paymentTokenAddress} correct ? (Y/n)`, ['y', 'n'], 'y') == 'y') {
        break;
      } else {
        paymentTokenAddress = await question('Enter Payment Token Address: ');
      }
    }

    while (true) {
      if (await question(`Is Divinity Coin Address ${divinityCoinAddress} correct ? (Y/n)`, ['y', 'n'], 'y') == 'y') {
        break;
      } else {
        divinityCoinAddress = await question('Enter Divinity Coin Address: ');
      }
    }

    while (true) {
      if (await question(`Is Treasury Address ${treasuryAddress} correct ? (Y/n)`, ['y', 'n'], 'y') == 'y') {
        break;
      } else {
        treasuryAddress = await question('Enter Treasury Address: ');
      }
    }

    console.log('Deploying TokenSale upgradeable contract');

    const { address: upgradeableContractAddress } = await vanityDeploy({
      deployer,
      owner,
      specificSalt: salt,
      artifact: upgradeableContractArtifact,
      constructorBytes: constructorBytes({
        implementation: tokenSaleImplementation,
        admin: adminProxy,
        initFunction: 'initialize(address,address,address,uint256,uint256)',
        initArgs: [
          divinityCoinAddress,
          paymentTokenAddress,
          treasuryAddress,
          ethers.BigNumber.from(config.get('deploy.buyPricePerUnit')),
          ethers.BigNumber.from(config.get('deploy.sellPricePerUnit')),
        ],
      }),
    });

    tokenSale = new ethers.Contract(
      upgradeableContractAddress,
      tokenSaleImplementationArtifact.abi,
      owner,
    );

    console.log(`TokenSale upgradeable contract deployed to: ${tokenSale.address}`);
    writeDeploymentAddress('TokenSale', tokenSale.address, version);
  } else {
    console.log(`TokenSale already deployed to: ${existingDeploymentAddress('TokenSale', version)}`);
    tokenSale = new ethers.Contract(existingDeploymentAddress('TokenSale', version), tokenSaleImplementationArtifact.abi, owner);
  }
}

main(process.argv[2]).then(() => {
  console.log('DONE');
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
