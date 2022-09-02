const hre = require('hardhat');

const { ethers } = hre;

const vanityDeploy = async ({
  deployer,
  owner,
  shouldContain = '0x',
  specificSalt = undefined,
  artifact,
  constructorBytes = undefined,
}) => {
  let saltNonce = -1;
  let found = false;
  const deployerAddress = deployer.address;

  const initCode = constructorBytes ? `${artifact.bytecode}${constructorBytes.substr(2)}`
    : artifact.bytecode;

  const initCodeHash = ethers.utils.keccak256(initCode);

  let expectedVanityAddress = null;
  let salt;

  if (specificSalt) {
    salt = specificSalt;
    expectedVanityAddress = ethers.utils.getCreate2Address(deployerAddress, salt, initCodeHash);
  } else {
    const start = Date.now();
    while (!found) {
      saltNonce++;
      salt = ethers.utils.id(`${saltNonce}`);
      expectedVanityAddress = ethers.utils.getCreate2Address(deployerAddress, salt, initCodeHash);
      found = expectedVanityAddress.toLowerCase().replace(shouldContain, '') != expectedVanityAddress.toLowerCase();
    }
  }
  const tx = await deployer.deployOwnable(initCode, salt, owner.address);
  await tx.wait();
  const contract = new ethers.Contract(expectedVanityAddress, artifact.abi, owner);
  return { salt, address: expectedVanityAddress, contract };
};

module.exports = vanityDeploy;
