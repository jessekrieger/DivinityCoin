const contracts = {};
let addresses = {};
let account;
let tokenSaleOwner;
let signer;
let provider;
const decimals = {};
const symbols = {};
const abis = {};
const select = (selector) => document.querySelector(selector);

const hide = (selector) => {
  select(selector).classList.add('hide');
};

const show = (selector) => {
  select(selector).classList.remove('hide');
};

const get = async (url, responseType = 'json') => {
  const response = await fetch(url);

  return await response[responseType]();
};

const updateBalances = async () => {
  try {
    select('#clientAddress').innerText = account;

    const [paymentTokenBalance, divineTokenBalance] = await Promise.all([
      contracts.paymentToken.balanceOf(account),
      contracts.divineToken.balanceOf(account),
    ]);
    select('#paymentTokenBalance').innerText = `${symbols.paymentToken} ${window.ethers.utils.formatUnits(paymentTokenBalance, decimals.paymentToken)}`;
    select('#divineTokenBalance').innerText = `${symbols.divineToken} ${window.ethers.utils.formatUnits(divineTokenBalance, decimals.divineToken)}`;
    select('#treasuryAddress').innerText = addresses.treasury;

    const [treasuryPaymentTokenBalance, treasuryDivineTokenBalance] = await Promise.all([
      contracts.paymentToken.balanceOf(addresses.treasury),
      contracts.divineToken.balanceOf(addresses.treasury),
    ]);
    select('#treasuryPaymentTokenBalance').innerText = `${symbols.paymentToken} ${window.ethers.utils.formatUnits(treasuryPaymentTokenBalance, decimals.paymentToken)}`;
    select('#treasuryDivineTokenBalance').innerText = `${symbols.divineToken} ${window.ethers.utils.formatUnits(treasuryDivineTokenBalance, decimals.divineToken)}`;

    if (window.ethers.utils.getAddress(tokenSaleOwner) == window.ethers.utils.getAddress(account)) {
      show('#treasuryApprovePaymentToken');
      show('#treasuryApproveDivineToken');
    } else {
      hide('#treasuryApprovePaymentToken');
      hide('#treasuryApproveDivineToken');
    }
  } catch (e) {
    console.log(e);
  }
};
let updateBalancesTimer = 0;
const scheduleUpdateBalances = () => {
  clearTimeout(updateBalancesTimer);
  updateBalancesTimer = setTimeout(updateBalances, 1000);
};

const initContracts = async () => {
  provider = new window.ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner(account);
  contracts.paymentToken = new window.ethers.Contract(addresses.paymentToken, abis.erc20, signer);
  contracts.divineToken = new window.ethers.Contract(addresses.divineToken, abis.erc20, signer);
  contracts.tokenSale = new window.ethers.Contract(addresses.tokenSale, abis.tokenSale, signer);
  decimals.paymentToken = await contracts.paymentToken.decimals();
  decimals.divineToken = await contracts.divineToken.decimals();
  symbols.paymentToken = await contracts.paymentToken.symbol();
  symbols.divineToken = await contracts.divineToken.symbol();
  tokenSaleOwner = await contracts.tokenSale.owner();

  await buyAmountChanged();
  await sellAmountChanged();
  await paymentAmountChanged();
  scheduleUpdateBalances();
};

const connectMetamask = async () => {
  try {
    [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    hide('#metamask_connect');
    show('#app');
    await initContracts();
    window.ethereum.on('accountsChanged', async () => {
      location.reload();
    });
  } catch (e) {
    alert(e.message);
  }
};

const buy = async () => {
  try {
    const divineAmount = select('#buyAmount').value;
    const divineAmountFormated = window.ethers.utils.parseUnits(divineAmount, decimals.divineToken);
    const paymentAmountDue = await contracts.tokenSale.getBuyCost(divineAmountFormated);
    let tx;
    const accountBalance = await contracts.paymentToken.balanceOf(account);
    if (accountBalance.lt(paymentAmountDue)) {
      alert('Insufficient funds');
      return;
    }
    const currentApprovedAmount = await contracts.paymentToken.allowance(account, addresses.tokenSale);
    if (currentApprovedAmount.lt(paymentAmountDue)) {
      tx = await contracts.paymentToken.approve(addresses.tokenSale, paymentAmountDue);
      await tx.wait();
    }

    tx = await contracts.tokenSale.buyExactAmount(divineAmountFormated);
    await tx.wait();
  } catch (e) {
    alert(e.message);
  }
  scheduleUpdateBalances();
};

const buySome = async () => {
  try {
    const paymentAmount = select('#paymentAmount').value;
    const paymentAmountFormated = window.ethers.utils.parseUnits(paymentAmount, decimals.paymentToken);
    let tx;
    const accountBalance = await contracts.paymentToken.balanceOf(account);
    if (accountBalance.lt(paymentAmountFormated)) {
      alert('Insufficient funds');
      return;
    }
    const currentApprovedAmount = await contracts.paymentToken.allowance(account, addresses.tokenSale);
    if (currentApprovedAmount.lt(paymentAmountFormated)) {
      tx = await contracts.paymentToken.approve(addresses.tokenSale, paymentAmountFormated);
      await tx.wait();
    }
    tx = await contracts.tokenSale.buyWithAmount(paymentAmountFormated);
    await tx.wait();
  } catch (e) {
    alert(e.message);
  }
  scheduleUpdateBalances();
};

const sell = async () => {
  try {
    const divineAmount = select('#sellAmount').value;
    const divineAmountFormated = window.ethers.utils.parseUnits(divineAmount, decimals.divineToken);
    const paymentAmountDue = await contracts.tokenSale.getSellCost(divineAmountFormated);
    let tx;
    const accountBalance = await contracts.divineToken.balanceOf(account);
    if (accountBalance.lt(divineAmountFormated)) {
      alert('Insufficient funds');
      return;
    }
    const currentApprovedAmount = await contracts.divineToken.allowance(account, addresses.tokenSale);
    if (currentApprovedAmount.lt(divineAmountFormated)) {
      tx = await contracts.divineToken.approve(addresses.tokenSale, divineAmountFormated);
      await tx.wait();
    }

    tx = await contracts.tokenSale.sellExactAmount(divineAmountFormated);
    await tx.wait();
  } catch (e) {
    alert(e.message);
  }
  scheduleUpdateBalances();
};

let timerBuyPrice = 0;
let timerSellPrice = 0;

const displayBuyPrice = async () => {
  const buyDivineAmount = select('#buyAmount').value;
  const divineAmount = window.ethers.utils.parseUnits(buyDivineAmount, decimals.divineToken);
  const paymentDue = await contracts.tokenSale.getBuyCost(divineAmount);
  const paymentDueFormatted = window.ethers.utils.formatUnits(paymentDue, decimals.paymentToken);
  select('#buyPrice').innerText = `${symbols.paymentToken} ${paymentDueFormatted}`;
};

const buyAmountChanged = () => {
  clearTimeout(timerBuyPrice);
  timerBuyPrice = setTimeout(displayBuyPrice, 500);
};

const displaySellPrice = async () => {
  const sellDivineAmount = select('#sellAmount').value;
  const divineAmount = window.ethers.utils.parseUnits(sellDivineAmount, decimals.divineToken);
  const paymentDue = await contracts.tokenSale.getSellCost(divineAmount);
  const paymentDueFormatted = window.ethers.utils.formatUnits(paymentDue, decimals.paymentToken);
  select('#sellPrice').innerText = `${symbols.paymentToken} ${paymentDueFormatted}`;
};

const sellAmountChanged = () => {
  clearTimeout(timerSellPrice);
  timerSellPrice = setTimeout(displaySellPrice, 500);
};

const displayPayPrice = async () => {
  const paymentAmount = select('#paymentAmount').value;
  const paymentAmountFormated = window.ethers.utils.parseUnits(paymentAmount, decimals.paymentToken);

  const divineAmountDue = await contracts.tokenSale.getBuyAmount(paymentAmountFormated);
  const divineAmountDueFormatted = window.ethers.utils.formatUnits(divineAmountDue, decimals.divineToken);
  select('#buyEstimate').innerText = `${symbols.divineToken} ${divineAmountDueFormatted}`;
};
let timerPayPrice = 0;
const paymentAmountChanged = () => {
  clearTimeout(timerPayPrice);
  timerPayPrice = setTimeout(displayPayPrice, 500);
};

const treasuryApprovePaymentToken = async () => {
  const tx = await contracts.paymentToken.approve(addresses.tokenSale, window.ethers.constants.MaxUint256);
  scheduleUpdateBalances();
};

const treasuryApproveDivineToken = async () => {
  const tx = await contracts.divineToken.approve(addresses.tokenSale, window.ethers.constants.MaxUint256);
  scheduleUpdateBalances();
};

const initUI = () => {
  select('#connectButton').addEventListener('click', connectMetamask);
  select('#buyButton').addEventListener('click', buy);
  select('#sellButton').addEventListener('click', sell);
  select('#buySomeButton').addEventListener('click', buySome);
  select('#buyAmount').addEventListener('keyup', buyAmountChanged);
  select('#sellAmount').addEventListener('keyup', sellAmountChanged);
  select('#paymentAmount').addEventListener('keyup', paymentAmountChanged);
  select('#treasuryApprovePaymentToken').addEventListener('click', treasuryApprovePaymentToken);
  select('#treasuryApproveDivineToken').addEventListener('click', treasuryApproveDivineToken);
};

const run = async () => {
  abis.erc20 = await get('/erc20.json');
  abis.tokenSale = await get('/token-sale.json');
  addresses = await get('/addresses.json');
  select('#paymentTokenAddress').innerHTML = addresses.paymentToken;
  select('#divineTokenAddress').innerHTML = addresses.divineToken;
  initUI();
  if (!window.ethereum) {
    show('#metamask_install');
  } else {
    const connectedAccounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    if (connectedAccounts.length == 0) {
      show('#metamask_connect');
    } else {
      show('#app');
      await connectMetamask();
      await initContracts();
    }
  }
};

window.addEventListener('load', run);
