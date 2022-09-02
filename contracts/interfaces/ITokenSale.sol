/// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.0;

interface ITokenSale {
  event BuyOrder(
    address buyer,
    address divinityCoinAddress,
    address paymentToken,
    uint256 coinAmount,
    uint256 paymentAmount,
    uint256 pricePerUnit
  );

  /// @dev divinityCoin, paymentToken, treasury, pricePerUnit
  function setConfigs(
    address,
    address,
    address,
    uint256
  ) external;

  function getAmount(uint256) external view returns (uint256);

  function getCost(uint256) external view returns (uint256);

  function buyWithAmount(uint256) external;

  function buyExactAmount(uint256) external;
}
