// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Destroyable is Ownable {
  constructor() {}

  function _beforeDestroy() internal virtual {}

  function destroy() external onlyOwner {
    _beforeDestroy();
    selfdestruct(payable(msg.sender));
  }
}
