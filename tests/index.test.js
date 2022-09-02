const { ethers, waffle } = require('hardhat');
const chai = require('chai');

chai.use(waffle.solidity);
const { expect } = chai;

describe('DomainNameToken', () => {
  
  it('should pass', () => {
    expect(true).to.equal(true);
  });
});
