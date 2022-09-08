const hre = require('hardhat');

const { ethers, waffle } = hre;
const chai = require('chai');

const vanityDeploy = require('../utils/vanity-deploy');
const constructorBytes = require('../utils/constructor-bytes');

chai.use(waffle.solidity);

const { expect } = chai;

describe('TokenSaleUpgradeable', () => {
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

  let Deployer;
  let AdminProxy;
  let UpgradeableContract;
  let deployer;
  let adminProxy;
  let tokenSale;

  before(async () => {
    allAccounts = await ethers.getSigners();
    [owner, ...otherAccounts] = allAccounts;
    Treasury = otherAccounts[2];
    TokenSaleImplementation = await ethers.getContractFactory('TokenSaleImplementation');
    MockERC20Token = await ethers.getContractFactory('MockERC20Token');
    Deployer = await ethers.getContractFactory('Deployer');
    AdminProxy = await ethers.getContractFactory('AdminProxy');
  });
  beforeEach(async () => {
    const salt = ethers.utils.id(`${Date.now()}`);
    deployer = await Deployer.deploy();
    const adminProxyArtifact = await hre.artifacts.readArtifact('AdminProxy');
    const { address: adminProxyAddress } = await vanityDeploy({
      owner,
      deployer,
      specificSalt: salt,
      artifact: adminProxyArtifact,
    });
    adminProxy = new ethers.Contract(adminProxyAddress, adminProxyArtifact.abi, owner);
    const tokenSaleImplementationArtifact = await hre.artifacts.readArtifact('TokenSaleImplementation');
    const { address: tokenSaleImplementationAddress } = await vanityDeploy({
      owner,
      deployer,
      specificSalt: salt,
      artifact: tokenSaleImplementationArtifact,
    });
    tokenSaleImplementation = new ethers.Contract(tokenSaleImplementationAddress, tokenSaleImplementationArtifact.abi, owner);
    const upgradeableContractArtifact = await hre.artifacts.readArtifact('UpgradeableContract');

    paymentToken = await MockERC20Token.deploy('Payment Token', 'PAY', 6);
    divinityCoin = await MockERC20Token.deploy('Divinity Coin', 'DIVINE', 18);
    buyPricePerUnit = ethers.utils.parseUnits('314.15', 6);
    sellPricePerUnit = ethers.utils.parseUnits('144', 18);

    const { address: upgradeableContractAddress } = await vanityDeploy({
      owner,
      deployer,
      specificSalt: salt,
      artifact: upgradeableContractArtifact,
      constructorBytes: constructorBytes({
        implementation: tokenSaleImplementation,
        admin: adminProxy,
        initFunction: 'initialize(address,address,address,uint256,uint256)',
        initArgs: [
          divinityCoin.address,
          paymentToken.address,
          Treasury.address,
          buyPricePerUnit,
          sellPricePerUnit,
        ],
      }),
    });

    tokenSale = new ethers.Contract(upgradeableContractAddress, tokenSaleImplementationArtifact.abi, owner);

    const [
      contractDivinityCoin,
      contractPaymentToken,
      contractTreasury,
      contractBuyPricePerUnit,
      contractSellPricePerUnit,
    ] = await Promise.all(
      [
        tokenSale.DivinityCoin(),
        tokenSale.PaymentToken(),
        tokenSale.Treasury(),
        tokenSale.buyPricePerUnit(),
        tokenSale.sellPricePerUnit(),
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
      await expect(tokenSale
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
      await tokenSale
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
          tokenSale.DivinityCoin(),
          tokenSale.PaymentToken(),
          tokenSale.Treasury(),
          tokenSale.buyPricePerUnit(),
          tokenSale.sellPricePerUnit(),
        ],
      );
      expect(contractDivinityCoin).to.equal(divinityCoin.address);
      expect(contractPaymentToken).to.equal(paymentToken.address);
      expect(contractTreasury).to.equal(Treasury.address);
      expect(contractBuyPricePerUnit).to.equal(newPricePerUnit);
      expect(contractSellPricePerUnit).to.equal(sellPricePerUnit);
    });
    it('should change Treasury address', async () => {
      await tokenSale
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
          tokenSale.DivinityCoin(),
          tokenSale.PaymentToken(),
          tokenSale.Treasury(),
          tokenSale.buyPricePerUnit(),
          tokenSale.sellPricePerUnit(),
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
      const amount = await tokenSale.getBuyAmount(paymentAmount);
      expect(amount).to.equal(expectedAmount);
    });
  });
  describe('getBuyCost', () => {
    it('should return the correct amount of PaymentToken for exact amount of DivinityCoin', async () => {
      const paymentAmount = ethers.utils.parseUnits('314.15', 6);
      const expectedAmount = ethers.utils.parseUnits('1', 18);
      const amount = await tokenSale.getBuyCost(expectedAmount);
      expect(amount).to.equal(paymentAmount);
    });
  });
  describe('buyWithAmount', () => {
    it('should revert when trying to buy with 0 amount', async () => {
      await expect(tokenSale
        .connect(otherAccounts[0])
        .buyWithAmount(ethers.BigNumber.from('0')))
        .to.be.revertedWith('amount must be greater than 0');
    });
    it('should revert when buyer does not have enough balance', async () => {
      await expect(tokenSale
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
      await expect(tokenSale
        .connect(otherAccounts[0])
        .buyWithAmount(ethers.utils.parseUnits('100', 6)))
        .to.be.revertedWith('not enough allowance');
    });
    it('should revert when resulting amount is 0', async () => {
      await tokenSale.connect(owner)
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
        .approve(tokenSale.address, paymentAmount);
      await expect(tokenSale
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
        .approve(tokenSale.address, paymentAmount);
      await expect(tokenSale
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
        .approve(tokenSale.address, paymentAmount);
      await expect(tokenSale
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
        .approve(tokenSale.address, paymentAmount);

      await divinityCoin.connect(Treasury)
        .approve(tokenSale.address, divinityAmount);

      const expectedDivinityAmount = ethers.BigNumber.from('10')
        .pow(18)
        .mul(paymentAmount)
        .div(buyPricePerUnit);

      await expect(tokenSale
        .connect(otherAccounts[0])
        .buyWithAmount(paymentAmount))
        .to
        .emit(tokenSale, 'BuyOrder')
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
      await expect(tokenSale
        .connect(otherAccounts[0])
        .buyExactAmount(ethers.BigNumber.from('0')))
        .to.be.revertedWith('amount must be greater than 0');
    });

    it('should throw when not enough DivinityCoin in Treasury', async () => {
      const amount = ethers.utils.parseUnits('1', 18);
      await expect(tokenSale
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
      await expect(tokenSale
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to.be.revertedWith('not enough DivinityCoin allowance in the treasury');
    });

    it('should revert when resulting amount is 0', async () => {
      await tokenSale.connect(owner)
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
        .approve(tokenSale.address, divinityAmount);
      await expect(tokenSale
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
        .approve(tokenSale.address, divinityAmount);

      await expect(tokenSale
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
        .approve(tokenSale.address, divinityAmount);

      await expect(tokenSale
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
        .approve(tokenSale.address, divinityAmount);

      await paymentToken.connect(otherAccounts[0]).approve(tokenSale.address, ethers.utils.parseUnits('314.15', 6));

      await expect(tokenSale
        .connect(otherAccounts[0])
        .buyExactAmount(amount))
        .to
        .emit(tokenSale, 'BuyOrder')
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
      const resultingCost = await tokenSale.getSellCost(amountToSell);
      expect(resultingCost).to.equal(expectedCost);
    });
    it('should return correct resulting PaymentToken amount for selling 2 DivinityCoin', async () => {
      const amountToSell = ethers.utils.parseUnits('2', 18);
      const expectedCost = sellPricePerUnit.mul(2);
      const resultingCost = await tokenSale.getSellCost(amountToSell);
      expect(resultingCost).to.equal(expectedCost);
    });
  });
  describe('sellExactAmount', () => {
    it('should revert when trying to sell 0 amount', async () => {
      await expect(tokenSale
        .connect(otherAccounts[0])
        .sellExactAmount(ethers.BigNumber.from('0')))
        .to.be.revertedWith('amount must be greater than 0');
    });
    it('should revert when trying to sell more than user balance', async () => {
      await expect(tokenSale
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
      await expect(tokenSale
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
        .approve(tokenSale.address, amountToSell);
      await tokenSale.connect(owner)
        .setConfigs(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.BigNumber.from('0'),
          ethers.utils.parseUnits('0.000001', 6),
        );
      await expect(tokenSale
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
        .approve(tokenSale.address, amountToSell);
      await expect(tokenSale
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
        .approve(tokenSale.address, amountToSell);
      await paymentToken.connect(owner)
        .mint(
          Treasury.address,
          sellPricePerUnit,
        );
      await expect(tokenSale
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
        .approve(tokenSale.address, amountToSell);
      await paymentToken.connect(owner)
        .mint(
          Treasury.address,
          sellPricePerUnit,
        );
      await paymentToken.connect(Treasury)
        .approve(tokenSale.address, sellPricePerUnit);
      await expect(tokenSale
        .connect(otherAccounts[0])
        .sellExactAmount(amountToSell))
        .to
        .emit(tokenSale, 'SellOrder')
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
        .approve(tokenSale.address, amountToSell);
      await paymentToken.connect(owner)
        .mint(
          Treasury.address,
          sellPricePerUnit.mul(2),
        );
      await paymentToken.connect(Treasury)
        .approve(tokenSale.address, sellPricePerUnit.mul(2));
      await expect(tokenSale
        .connect(otherAccounts[0])
        .sellExactAmount(amountToSell))
        .to
        .emit(tokenSale, 'SellOrder')
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
