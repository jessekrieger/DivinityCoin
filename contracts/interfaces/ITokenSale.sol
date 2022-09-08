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

  event SellOrder(
    address seller,
    address divinityCoinAddress,
    address paymentToken,
    uint256 coinAmount,
    uint256 paymentAmount,
    uint256 pricePerUnit
  );

  /// @dev divinityCoin, paymentToken, treasury, buyPricePerUnit, sellPricePerUnit
  function setConfigs(
    address,
    address,
    address,
    uint256,
    uint256
  ) external;

  function getBuyAmount(uint256) external view returns (uint256);

  function getBuyCost(uint256) external view returns (uint256);

  function getSellCost(uint256) external view returns (uint256);

  function buyWithAmount(uint256) external;

  function buyExactAmount(uint256) external;

  function sellExactAmount(uint256) external;
}
