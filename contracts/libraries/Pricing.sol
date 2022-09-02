/// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

library Pricing {
  function calculateOrderAmount(
    uint256 paymentAmount,
    uint256 price,
    uint256 coinDecimals
  ) internal pure returns (uint256) {
    return (10**coinDecimals * paymentAmount) / price;
  }
  function calculateOrderCost(
    uint256 orderAmount,
    uint256 price,
    uint256 coinDecimals
  ) internal pure returns (uint256) {
      return (orderAmount * price ) / (10**coinDecimals);
  }
}
