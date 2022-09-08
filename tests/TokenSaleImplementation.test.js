const { ethers, waffle } = require('hardhat');
const chai = require('chai');

chai.use(waffle.solidity);

const { expect } = chai;

describe('TokenSaleImplementation', () => {
  let owner;
  let allAccounts;
  let otherAccounts;
  let TokenSaleImplementation;
  let tokenSaleImplementation;
  let MockERC20Token;
  let paymentToken;
  let divinityCoin;
  let buyPricePerUnit;
  let sellPricePerUnit;
  let Treasury;
  before(async () => {
    allAccounts = await ethers.getSigners();
    [owner, ...otherAccounts] = allAccounts;
    Treasury = otherAccounts[2];
    TokenSaleImplementation = await ethers.getContractFactory('TokenSaleImplementation');
    MockERC20Token = await ethers.getContractFactory('MockERC20Token');
  });
  beforeEach(async () => {
    tokenSaleImplementation = await TokenSaleImplementation.deploy();
    paymentToken = await MockERC20Token.deploy('Payment Token', 'PAY', 6);
    divinityCoin = await MockERC20Token.deploy('Divinity Coin', 'DIVINE', 18);
    buyPricePerUnit = ethers.utils.parseUnits('314.15', 6);
    sellPricePerUnit = ethers.utils.parseUnits('144', 6);
    await tokenSaleImplementation
      .initialize(
        divinityCoin.address,
        paymentToken.address,
        Treasury.address,
        buyPricePerUnit,
        sellPricePerUnit,
      );
    const [
      contractDivinityCoin,
      contractPaymentToken,
      contractTreasury,
      contractBuyPricePerUnit,
      contractSellPricePerUnit,
    ] = await Promise.all(
      [
        tokenSaleImplementation.DivinityCoin(),
        tokenSaleImplementation.PaymentToken(),
        tokenSaleImplementation.Treasury(),
        tokenSaleImplementation.buyPricePerUnit(),
        tokenSaleImplementation.sellPricePerUnit(),
      ],
    );
    expect(contractDivinityCoin).to.equal(divinityCoin.address);
    expect(contractPaymentToken).to.equal(paymentToken.address);
    expect(contractTreasury).to.equal(Treasury.address);
    expect(contractBuyPricePerUnit).to.equal(buyPricePerUnit);
    expect(contractSellPricePerUnit).to.equal(sellPricePerUnit);
  });
  describe('setConfigs', () => {
    it('should throw when trying to call from non-owner address', async () => {
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .setConfigs(
          divinityCoin.address,
          paymentToken.address,
          Treasury.address,
          buyPricePerUnit,
          sellPricePerUnit,
        )).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should only change buyPricePerUnit', async () => {
      const newPricePerUnit = ethers.utils.parseUnits('314.16', 6);
      await tokenSaleImplementation
        .setConfigs(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          newPricePerUnit,
          ethers.BigNumber.from('0'),
        );
      const [
        contractDivinityCoin,
        contractPaymentToken,
        contractTreasury,
        contractBuyPricePerUnit,
        contractSellPricePerUnit,
      ] = await Promise.all(
        [
          tokenSaleImplementation.DivinityCoin(),
          tokenSaleImplementation.PaymentToken(),
          tokenSaleImplementation.Treasury(),
          tokenSaleImplementation.buyPricePerUnit(),
          tokenSaleImplementation.sellPricePerUnit(),
        ],
      );
      expect(contractDivinityCoin).to.equal(divinityCoin.address);
      expect(contractPaymentToken).to.equal(paymentToken.address);
      expect(contractTreasury).to.equal(Treasury.address);
      expect(contractBuyPricePerUnit).to.equal(newPricePerUnit);
      expect(contractSellPricePerUnit).to.equal(sellPricePerUnit);
    });
    it('should change Treasury address', async () => {
      await tokenSaleImplementation
        .setConfigs(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          otherAccounts[1].address,
          ethers.BigNumber.from('0'),
          ethers.BigNumber.from('0'),
        );
      const [
        contractDivinityCoin,
        contractPaymentToken,
        contractTreasury,
        contractBuyPricePerUnit,
        contractSellPricePerUnit,
      ] = await Promise.all(
        [
          tokenSaleImplementation.DivinityCoin(),
          tokenSaleImplementation.PaymentToken(),
          tokenSaleImplementation.Treasury(),
          tokenSaleImplementation.buyPricePerUnit(),
          tokenSaleImplementation.sellPricePerUnit(),
        ],
      );
      expect(contractDivinityCoin).to.equal(divinityCoin.address);
      expect(contractPaymentToken).to.equal(paymentToken.address);
      expect(contractTreasury).to.equal(otherAccounts[1].address);
      expect(contractBuyPricePerUnit).to.equal(buyPricePerUnit);
      expect(contractSellPricePerUnit).to.equal(sellPricePerUnit);
    });
  });
  describe('getBuyAmount', () => {
    it('should return the correct amount of DivinityCoin for given payment amount', async () => {
      const paymentAmount = ethers.utils.parseUnits('1', 6);
      const expectedAmount = ethers.utils.parseUnits('0.003183192742320547', 18);
      const amount = await tokenSaleImplementation.getBuyAmount(paymentAmount);
      expect(amount).to.equal(expectedAmount);
    });
  });
  describe('getBuyCost', () => {
    it('should return the correct amount of PaymentToken for exact amount of DivinityCoin', async () => {
      const paymentAmount = ethers.utils.parseUnits('314.15', 6);
      const expectedAmount = ethers.utils.parseUnits('1', 18);
      const amount = await tokenSaleImplementation.getBuyCost(expectedAmount);
      expect(amount).to.equal(paymentAmount);
    });
  });
  describe('buyWithAmount', () => {
    it('should revert when trying to buy with 0 amount', async () => {
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyWithAmount(ethers.BigNumber.from('0')))
        .to.be.revertedWith('amount must be greater than 0');
    });
    it('should revert when buyer does not have enough balance', async () => {
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyWithAmount(ethers.utils.parseUnits('100', 6)))
        .to.be.revertedWith('not enough tokens');
    });
    it('should revert when TokenSale contract does not have enough allowance on user PaymentToken wallet', async () => {
      await paymentToken.connect(owner)
        .mint(
          otherAccounts[0].address,
          ethers.utils.parseUnits('100', 6),
        );
      expect(await paymentToken.balanceOf(otherAccounts[0].address))
        .to.equal(ethers.utils.parseUnits('100', 6));
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyWithAmount(ethers.utils.parseUnits('100', 6)))
        .to.be.revertedWith('not enough allowance');
    });
    it('should revert when resulting amount is 0', async () => {
      await tokenSaleImplementation.connect(owner)
        .setConfigs(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.utils.parseUnits('10000000000000', 6),
          ethers.BigNumber.from('0'),
        );
      const paymentAmount = ethers.utils.parseUnits('0.000001', 6);
      await paymentToken.connect(owner)
        .mint(
          otherAccounts[0].address,
          paymentAmount,
        );
      expect(await paymentToken.balanceOf(otherAccounts[0].address))
        .to.equal(paymentAmount);
      await paymentToken.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, paymentAmount);
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyWithAmount(paymentAmount))
        .to.be.revertedWith('resulting amount must be greater than 0');
    });
    it('should throw when not enough DivinityCoin in Treasury', async () => {
      const paymentAmount = ethers.utils.parseUnits('1', 6);
      await paymentToken.connect(owner)
        .mint(
          otherAccounts[0].address,
          paymentAmount,
        );
      expect(await paymentToken.balanceOf(otherAccounts[0].address))
        .to.equal(paymentAmount);
      await paymentToken.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, paymentAmount);
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyWithAmount(paymentAmount))
        .to.be.revertedWith('not enough DivinityCoin in the treasury');
    });
    it('should throw when not enough DivinityCoin allowance to be spend from Treasury by TokenSale', async () => {
      const paymentAmount = ethers.utils.parseUnits('1', 6);
      await paymentToken.connect(owner)
        .mint(
          otherAccounts[0].address,
          paymentAmount,
        );
      const divinityAmount = ethers.utils.parseUnits('100', 18);
      await divinityCoin.connect(owner)
        .mint(
          Treasury.address,
          divinityAmount,
        );
      expect(await paymentToken.balanceOf(otherAccounts[0].address))
        .to.equal(paymentAmount);
      expect(await divinityCoin.balanceOf(Treasury.address))
        .to.equal(divinityAmount);
      await paymentToken.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, paymentAmount);
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyWithAmount(paymentAmount))
        .to.be.revertedWith('not enough DivinityCoin allowance in the treasury');
    });
    it('should successfully buy DivinityCoins', async () => {
      const paymentAmount = ethers.utils.parseUnits('1', 6);
      await paymentToken.connect(owner)
        .mint(
          otherAccounts[0].address,
          paymentAmount,
        );
      const divinityAmount = ethers.utils.parseUnits('100', 18);
      await divinityCoin.connect(owner)
        .mint(
          Treasury.address,
          divinityAmount,
        );
      expect(await paymentToken.balanceOf(otherAccounts[0].address))
        .to.equal(paymentAmount);
      expect(await divinityCoin.balanceOf(Treasury.address))
        .to.equal(divinityAmount);
      await paymentToken.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, paymentAmount);

      await divinityCoin.connect(Treasury)
        .approve(tokenSaleImplementation.address, divinityAmount);

      const expectedDivinityAmount = ethers.BigNumber.from('10')
        .pow(18)
        .mul(paymentAmount)
        .div(buyPricePerUnit);

      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyWithAmount(paymentAmount))
        .to
        .emit(tokenSaleImplementation, 'BuyOrder')
        .withArgs(
          otherAccounts[0].address,
          divinityCoin.address,
          paymentToken.address,
          expectedDivinityAmount,
          paymentAmount,
          ethers.utils.parseUnits('314.15', 6),
        );

      expect(await divinityCoin.balanceOf(otherAccounts[0].address))
        .to.equal(expectedDivinityAmount);
      expect(await divinityCoin.balanceOf(Treasury.address))
        .to.equal(divinityAmount.sub(expectedDivinityAmount));

      expect(await paymentToken.balanceOf(Treasury.address))
        .to.equal(paymentAmount);
    });
  });

  describe('buyExactAmount', () => {
    it('should revert when trying to buy 0 amount', async () => {
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyExactAmount(ethers.BigNumber.from('0')))
        .to.be.revertedWith('amount must be greater than 0');
    });

    it('should throw when not enough DivinityCoin in Treasury', async () => {
      const amount = ethers.utils.parseUnits('1', 18);
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to.be.revertedWith('not enough DivinityCoin in the treasury');
    });
    it('should throw when not enough DivinityCoin allowance to be spend from Treasury by TokenSale', async () => {
      const amount = ethers.utils.parseUnits('1', 18);
      const divinityAmount = ethers.utils.parseUnits('100', 18);
      await divinityCoin.connect(owner)
        .mint(
          Treasury.address,
          divinityAmount,
        );
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to.be.revertedWith('not enough DivinityCoin allowance in the treasury');
    });

    it('should revert when resulting amount is 0', async () => {
      await tokenSaleImplementation.connect(owner)
        .setConfigs(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.utils.parseUnits('0.00001', 6),
          ethers.BigNumber.from('0'),
        );
      const amount = ethers.utils.parseUnits('0.0000000000000001', 18);
      const divinityAmount = ethers.utils.parseUnits('100', 18);
      await divinityCoin.connect(owner)
        .mint(
          Treasury.address,
          divinityAmount,
        );
      await divinityCoin.connect(Treasury)
        .approve(tokenSaleImplementation.address, divinityAmount);
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to.be.revertedWith('resulting cost must be greater than 0');
    });

    it('should revert when buyer does not have enough balance', async () => {
      const amount = ethers.utils.parseUnits('1', 18);
      const divinityAmount = ethers.utils.parseUnits('100', 18);
      await divinityCoin.connect(owner)
        .mint(
          Treasury.address,
          divinityAmount,
        );
      await divinityCoin.connect(Treasury)
        .approve(tokenSaleImplementation.address, divinityAmount);

      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to.be.revertedWith('not enough tokens');
    });
    it('should revert when TokenSale contract does not have enough allowance on user PaymentToken wallet', async () => {
      await paymentToken.connect(owner)
        .mint(
          otherAccounts[0].address,
          ethers.utils.parseUnits('314.15', 6),
        );

      expect(await paymentToken.balanceOf(otherAccounts[0].address))
        .to.equal(ethers.utils.parseUnits('314.15', 6));

      const amount = ethers.utils.parseUnits('1', 18);
      const divinityAmount = ethers.utils.parseUnits('100', 18);
      await divinityCoin.connect(owner)
        .mint(
          Treasury.address,
          divinityAmount,
        );
      await divinityCoin.connect(Treasury)
        .approve(tokenSaleImplementation.address, divinityAmount);

      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to.be.revertedWith('not enough allowance');
    });

    it('should successfully buy DivinityCoins', async () => {
      await paymentToken.connect(owner)
        .mint(
          otherAccounts[0].address,
          ethers.utils.parseUnits('314.15', 6),
        );

      expect(await paymentToken.balanceOf(otherAccounts[0].address))
        .to.equal(ethers.utils.parseUnits('314.15', 6));

      const amount = ethers.utils.parseUnits('1', 18);
      const divinityAmount = ethers.utils.parseUnits('100', 18);
      await divinityCoin.connect(owner)
        .mint(
          Treasury.address,
          divinityAmount,
        );
      await divinityCoin.connect(Treasury)
        .approve(tokenSaleImplementation.address, divinityAmount);

      await paymentToken.connect(otherAccounts[0]).approve(tokenSaleImplementation.address, ethers.utils.parseUnits('314.15', 6));
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to
        .emit(tokenSaleImplementation, 'BuyOrder')
        .withArgs(
          otherAccounts[0].address,
          divinityCoin.address,
          paymentToken.address,
          amount,
          ethers.utils.parseUnits('314.15', 6),
          ethers.utils.parseUnits('314.15', 6),
        );

      expect(await divinityCoin.balanceOf(otherAccounts[0].address)).to.equal(amount);
      expect(await divinityCoin.balanceOf(Treasury.address)).to.equal(divinityAmount.sub(amount));
      expect(await paymentToken.balanceOf(Treasury.address)).to.equal(ethers.utils.parseUnits('314.15', 6));
      expect(await paymentToken.balanceOf(otherAccounts[0].address)).to.equal(ethers.utils.parseUnits('0', 6));
    });
  });
  describe('getSellCost', () => {
    it('should return correct resulting PaymentToken amount for selling 1 DivinityCoin', async () => {
      const amountToSell = ethers.utils.parseUnits('1', 18);
      const expectedCost = sellPricePerUnit;
      const resultingCost = await tokenSaleImplementation.getSellCost(amountToSell);
      expect(resultingCost).to.equal(expectedCost);
    });
    it('should return correct resulting PaymentToken amount for selling 2 DivinityCoin', async () => {
      const amountToSell = ethers.utils.parseUnits('2', 18);
      const expectedCost = sellPricePerUnit.mul(2);
      const resultingCost = await tokenSaleImplementation.getSellCost(amountToSell);
      expect(resultingCost).to.equal(expectedCost);
    });
  });
  describe('sellExactAmount', () => {
    it('should revert when trying to sell 0 amount', async () => {
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(ethers.BigNumber.from('0')))
        .to.be.revertedWith('amount must be greater than 0');
    });
    it('should revert when trying to sell more than user balance', async () => {
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(ethers.utils.parseUnits('1', 18)))
        .to.be.revertedWith('not enough tokens');
    });
    it('should revert when trying to sell more than TokenSale contract allowance', async () => {
      await divinityCoin.connect(owner)
        .mint(
          otherAccounts[0].address,
          ethers.utils.parseUnits('1', 18),
        );
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(ethers.utils.parseUnits('1', 18)))
        .to.be.revertedWith('not enough allowance');
    });
    it('should revert when resulting cost is zero', async () => {
      const amountToSell = ethers.utils.parseUnits('0.00000000001', 18);
      await divinityCoin.connect(owner)
        .mint(
          otherAccounts[0].address,
          amountToSell,
        );
      await divinityCoin.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, amountToSell);
      await tokenSaleImplementation.connect(owner)
        .setConfigs(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.BigNumber.from('0'),
          ethers.utils.parseUnits('0.00001', 6),
        );
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(amountToSell))
        .to.be.revertedWith('resulting cost must be greater than 0');
    });
    it('should revert when Treasury does not have enough PaymentToken balance', async () => {
      const amountToSell = ethers.utils.parseUnits('1', 18);
      await divinityCoin.connect(owner)
        .mint(
          otherAccounts[0].address,
          amountToSell,
        );
      await divinityCoin.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, amountToSell);
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(amountToSell))
        .to.be.revertedWith('not enough payment tokens on Treasury');
    });
    it('should revert when TokenSale does not have enough PaymentToken allowance from Treasury', async () => {
      const amountToSell = ethers.utils.parseUnits('1', 18);
      await divinityCoin.connect(owner)
        .mint(
          otherAccounts[0].address,
          amountToSell,
        );
      await divinityCoin.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, amountToSell);
      await paymentToken.connect(owner)
        .mint(
          Treasury.address,
          sellPricePerUnit,
        );
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(amountToSell))
        .to.be.revertedWith('not enough payment token allowance on Treasury');
    });
    it('should successfully sell 1 DivinityCoin', async () => {
      const amountToSell = ethers.utils.parseUnits('1', 18);
      await divinityCoin.connect(owner)
        .mint(
          otherAccounts[0].address,
          amountToSell,
        );
      await divinityCoin.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, amountToSell);
      await paymentToken.connect(owner)
        .mint(
          Treasury.address,
          sellPricePerUnit,
        );
      await paymentToken.connect(Treasury)
        .approve(tokenSaleImplementation.address, sellPricePerUnit);
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(amountToSell))
        .to
        .emit(tokenSaleImplementation, 'SellOrder')
        .withArgs(
          otherAccounts[0].address,
          divinityCoin.address,
          paymentToken.address,
          amountToSell,
          sellPricePerUnit,
          sellPricePerUnit,
        );

      expect(await divinityCoin.balanceOf(otherAccounts[0].address)).to.equal(ethers.utils.parseUnits('0', 18));
      expect(await divinityCoin.balanceOf(Treasury.address)).to.equal(ethers.utils.parseUnits('1', 18));
      expect(await paymentToken.balanceOf(otherAccounts[0].address)).to.equal(sellPricePerUnit);
      expect(await paymentToken.balanceOf(Treasury.address)).to.equal(ethers.utils.parseUnits('0', 6));
    });
    it('should successfully sell 2 DivinityCoin', async () => {
      const amountToSell = ethers.utils.parseUnits('2', 18);
      await divinityCoin.connect(owner)
        .mint(
          otherAccounts[0].address,
          amountToSell,
        );
      await divinityCoin.connect(otherAccounts[0])
        .approve(tokenSaleImplementation.address, amountToSell);
      await paymentToken.connect(owner)
        .mint(
          Treasury.address,
          sellPricePerUnit.mul(2),
        );
      await paymentToken.connect(Treasury)
        .approve(tokenSaleImplementation.address, sellPricePerUnit.mul(2));
      await expect(tokenSaleImplementation
        .connect(otherAccounts[0])
        .sellExactAmount(amountToSell))
        .to
        .emit(tokenSaleImplementation, 'SellOrder')
        .withArgs(
          otherAccounts[0].address,
          divinityCoin.address,
          paymentToken.address,
          amountToSell,
          sellPricePerUnit.mul(2),
          sellPricePerUnit,
        );
      expect(await divinityCoin.balanceOf(otherAccounts[0].address)).to.equal(ethers.utils.parseUnits('0', 18));
      expect(await divinityCoin.balanceOf(Treasury.address)).to.equal(ethers.utils.parseUnits('2', 18));
      expect(await paymentToken.balanceOf(otherAccounts[0].address)).to.equal(sellPricePerUnit.mul(2));
      expect(await paymentToken.balanceOf(Treasury.address)).to.equal(ethers.utils.parseUnits('0', 6));
    });
  });
});
