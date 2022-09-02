// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AdminProxy is Ownable, ProxyAdmin {}
