const { ethers } = require('hardhat');

module.exports = ({
  implementation, admin, initFunction = 'initialize()', initArgs = [],
}) => {
  const initData = implementation.interface.encodeFunctionData(initFunction, initArgs);
  const constructorBytes = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'bytes'],
    [implementation.address, admin.address, initData],
  );
  return constructorBytes;
};
