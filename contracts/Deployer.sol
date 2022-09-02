// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";

import {Destroyable} from "./Destroyable.sol";

contract Deployer is Destroyable {
  mapping(bytes32 => address[]) public deploys;
  mapping(bytes32 => uint256[]) public deploysSalts;

  event Deployed(address addr, uint256 salt);

  function deploysByCode(bytes memory code) external view returns (address[] memory) {
    bytes32 hash = keccak256(code);
    return deploys[hash];
  }

  function deploysCountByHash(bytes32 hash) external view returns (uint256) {
    return deploys[hash].length;
  }

  function deploysCountByCode(bytes memory code) external view returns (uint256) {
    bytes32 hash = keccak256(code);
    return deploys[hash].length;
  }

  function deploysByHash(bytes32 hash) external view returns (address[] memory) {
    return deploys[hash];
  }

  function deploysByHashAt(bytes32 hash, uint256 deployIndex) external view returns (address) {
    return deploys[hash][deployIndex];
  }

  function deploysByCodeAt(bytes memory code, uint256 deployIndex) external view returns (address) {
    bytes32 hash = keccak256(code);
    return deploys[hash][deployIndex];
  }

  function saltsByCode(bytes memory code) external view returns (uint256[] memory) {
    bytes32 hash = keccak256(code);
    return deploysSalts[hash];
  }

  function saltsByHash(bytes32 hash) external view returns (uint256[] memory) {
    return deploysSalts[hash];
  }

  function saltsByCodeAt(bytes memory code, uint256 saltIndex) external view returns (uint256) {
    bytes32 hash = keccak256(code);
    return deploysSalts[hash][saltIndex];
  }

  function saltsByHashAt(bytes32 hash, uint256 saltIndex) external view returns (uint256) {
    return deploysSalts[hash][saltIndex];
  }

  function deployOwnable(
    bytes memory code,
    uint256 salt,
    address contractOwner
  ) external onlyOwner returns (address) {
    Ownable contractAddress = Ownable(deploy(code, salt));
    contractAddress.transferOwnership(contractOwner);
    return address(contractAddress);
  }

  function deploy(bytes memory code, uint256 salt) public onlyOwner returns (address) {
    address addr;
    assembly {
      addr := create2(0, add(code, 0x20), mload(code), salt)
      if iszero(extcodesize(addr)) {
        revert(0, 0)
      }
    }
    bytes32 hash = keccak256(code);
    deploysSalts[hash].push(salt);
    deploys[hash].push(addr);
    emit Deployed(addr, salt);
    return addr;
  }
}
