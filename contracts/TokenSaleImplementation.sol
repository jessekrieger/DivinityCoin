/// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITokenSale} from "./interfaces/ITokenSale.sol";
import {Pricing} from "./libraries/Pricing.sol";

contract TokenSaleImplementation is Ownable, Initializable, ITokenSale {
  IERC20Metadata public DivinityCoin;
  IERC20Metadata public PaymentToken;
  address public Treasury;
  uint256 public buyPricePerUnit;
  uint256 public sellPricePerUnit;
  
  constructor() {}

  function initialize(
    address _divinityCoin,
    address _paymentToken,
    address _treasury,
    uint256 _buyPricePerUnit,
    uint256 _sellPricePerUnit
  ) public {
    DivinityCoin = IERC20Metadata(_divinityCoin);
    PaymentToken = IERC20Metadata(_paymentToken);
    Treasury = _treasury;
    buyPricePerUnit = _buyPricePerUnit;
    sellPricePerUnit = _sellPricePerUnit;
  }

  /// @notice set contract configuration
  /// @dev set contract configuration. Only contract owner can call this function.
  /// @param _divinityCoin address of the DivinityCoin contract. When set to address(0) it will leave the address unchanged
  /// @param _paymentToken address of the PaymentToken contract. When set to address(0) it will leave the address unchanged
  /// @param _treasury address of the Treasury contract. When set to address(0) it will leave the address unchanged
  /// @param _buyPricePerUnit price per unit of DivinityCoin. When set to 0 it will leave the price unchanged
  function setConfigs(
    address _divinityCoin,
    address _paymentToken,
    address _treasury,
    uint256 _buyPricePerUnit,
    uint256 _sellPricePerUnit
  ) external override onlyOwner {
    if (_divinityCoin != address(0)) {
      DivinityCoin = IERC20Metadata(_divinityCoin);
    }
    if (_paymentToken != address(0)) {
      PaymentToken = IERC20Metadata(_paymentToken);
    }
    if (_treasury != address(0)) {
      Treasury = _treasury;
    }
    if (_buyPricePerUnit > 0) {
      buyPricePerUnit = _buyPricePerUnit;
    }
    if (_sellPricePerUnit > 0) {
      sellPricePerUnit = _sellPricePerUnit;
    }
  }

  /// @notice Gets the resulting amount of DivinityCoin using the given amount of PaymentToken
  /// @dev Gets the resulting amount of DivinityCoin using the given amount of PaymentToken
  /// @param _paymentAmount amount of PaymentToken
  /// @return amount of DivinityCoin
  function getBuyAmount(uint256 _paymentAmount) public view override returns (uint256) {
    return Pricing.calculateOrderAmount(_paymentAmount, buyPricePerUnit, DivinityCoin.decimals());
  }

  /// @notice Gets the needed amount of PaymentToken for getting the given amount of DivinityCoin
  /// @dev Gets the needed amount of PaymentToken for getting the given amount of DivinityCoin
  /// @param _divinityAmount amount of DivinityCoin
  /// @return amount of PaymentToken
  function getBuyCost(uint256 _divinityAmount) public view override returns (uint256) {
    return Pricing.calculateOrderCost(_divinityAmount, buyPricePerUnit, DivinityCoin.decimals());
  }


  /// @notice Gets the resulting amount of PaymentToken using the given amount of DivinityCoin
  /// @dev Gets the resulting amount of PaymentToken using the given amount of DivinityCoin
  /// @param _divinityAmount amount of DivinityCoin
  /// @return amount of PaymentToken
  function getSellCost(uint256 _divinityAmount) public view override returns(uint256) {
    return Pricing.calculateOrderCost(_divinityAmount, sellPricePerUnit, DivinityCoin.decimals());
  }

  /// @notice buy DivinityCoin with set amount of PaymentToken
  /// @dev buy DivinityCoin with set amount of PaymentToken.
  /// @param _paymentAmount amount of PaymentToken to buy DivinityCoin with
  function buyWithAmount(uint256 _paymentAmount) external override {
    require(_paymentAmount > 0, "amount must be greater than 0");
    require(PaymentToken.balanceOf(msg.sender) >= _paymentAmount, "not enough tokens");
    require(
      PaymentToken.allowance(msg.sender, address(this)) >= _paymentAmount,
      "not enough allowance"
    );

    uint256 resultingAmount = getBuyAmount(_paymentAmount);

    require(resultingAmount > 0, "resulting amount must be greater than 0");
    require(
      DivinityCoin.balanceOf(Treasury) >= resultingAmount,
      "not enough DivinityCoin in the treasury"
    );
    require(
      DivinityCoin.allowance(Treasury, address(this)) >= resultingAmount,
      "not enough DivinityCoin allowance in the treasury"
    );

    PaymentToken.transferFrom(msg.sender, Treasury, _paymentAmount);

    DivinityCoin.transferFrom(Treasury, msg.sender, resultingAmount);
    emit BuyOrder(
      msg.sender,
      address(DivinityCoin),
      address(PaymentToken),
      resultingAmount,
      _paymentAmount,
      buyPricePerUnit
    );
  }

  /// @notice Buy exact DivinityCoin amount with PaymentToken
  /// @dev Buy exact DivinityCoin amount with PaymentToken
  /// @param _divinityAmount amount of DivinityCoin to buy
  function buyExactAmount(uint256 _divinityAmount) external override {
    require(_divinityAmount > 0, "amount must be greater than 0");
    require(
      DivinityCoin.balanceOf(Treasury) >= _divinityAmount,
      "not enough DivinityCoin in the treasury"
    );
    require(
      DivinityCoin.allowance(Treasury, address(this)) >= _divinityAmount,
      "not enough DivinityCoin allowance in the treasury"
    );

    uint256 resultingCost = getBuyCost(_divinityAmount);

    require(resultingCost > 0, "resulting cost must be greater than 0");

    require(PaymentToken.balanceOf(msg.sender) >= resultingCost, "not enough tokens");
    require(
      PaymentToken.allowance(msg.sender, address(this)) >= resultingCost,
      "not enough allowance"
    );

    PaymentToken.transferFrom(msg.sender, Treasury, resultingCost);

    DivinityCoin.transferFrom(Treasury, msg.sender, _divinityAmount);
    emit BuyOrder(
      msg.sender,
      address(DivinityCoin),
      address(PaymentToken),
      _divinityAmount,
      resultingCost,
      buyPricePerUnit
    );
  }

  /// @notice Sell DivinityCoin for PaymentToken
  /// @dev Sell DivinityCoin for PaymentToken
  /// @param _divinityAmount amount of DivinityCoin to sell
  function sellExactAmount(uint256 _divinityAmount) external override {
    require(_divinityAmount > 0, "amount must be greater than 0");
    require(DivinityCoin.balanceOf(msg.sender) >= _divinityAmount, "not enough tokens");
    require(
      DivinityCoin.allowance(msg.sender, address(this)) >= _divinityAmount,
      "not enough allowance"
    );

    uint256 resultingCost = getSellCost(_divinityAmount);

    require(resultingCost > 0, "resulting cost must be greater than 0");

    require(PaymentToken.balanceOf(Treasury) >= resultingCost, "not enough payment tokens on Treasury");
    require(
      PaymentToken.allowance(Treasury, address(this)) >= resultingCost,
      "not enough payment token allowance on Treasury"
    );

    DivinityCoin.transferFrom(msg.sender, Treasury, _divinityAmount);

    PaymentToken.transferFrom(Treasury, msg.sender, resultingCost);
    emit SellOrder(
      msg.sender,
      address(DivinityCoin),
      address(PaymentToken),
      _divinityAmount,
      resultingCost,
      sellPricePerUnit
    );
  }
}
