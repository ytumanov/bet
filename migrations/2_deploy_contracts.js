const Bets = artifacts.require('./Bets.sol');

module.exports = deployer => {
  deployer.deploy(Bets);
  };
