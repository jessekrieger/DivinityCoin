// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract UpgradeableContract is Ownable, TransparentUpgradeableProxy {
  constructor(
    address _logic,
    address _admin,
    bytes memory _data
  ) TransparentUpgradeableProxy(_logic, _admin, _data) {}
}
