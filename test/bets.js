const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Bets = artifacts.require('./Bets.sol');

contract('Bets', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  const admin = accounts[0];
  let bets;

  before('setup', () => {
    return Bets.deployed()
    .then(instance => bets = instance)
    .then(reverter.snapshot);
  });


    it('should check user balances after betting', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200
    const gasPrice = web3.eth.gasPrice;
    let user1StartBalance;
    let user2StartBalance;

    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => user1StartBalance = web3.eth.getBalance(user1))    
    .then(() => bets.bet('a', {from: user1, value: amount1, gasPrice: gasPrice}))
        .then((result) => assert.equal(web3.eth.getBalance(user1).valueOf(),
        user1StartBalance.sub(gasPrice.mul(result.receipt.gasUsed)).sub(amount1).valueOf()))
    .then(() => user2StartBalance = web3.eth.getBalance(user2))    
    .then(() => bets.bet('b', {from: user2, value: amount2, gasPrice: gasPrice}))
        .then((result) => assert.equal(web3.eth.getBalance(user2).valueOf(),
        user2StartBalance.sub(gasPrice.mul(result.receipt.gasUsed)).sub(amount2).valueOf()))
    });

    it('should check contract balance after betting and admin fee after finish of betting', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    const totalBet = (amount1 + amount2)* 2;
    const adminFee = totalBet / 20;
    const gasPrice = web3.eth.gasPrice;
    let adminBalance;

    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet('a', {from: user1, value: amount1}))
    .then(() => bets.bet('b', {from: user2, value: amount1}))
    .then(() => bets.bet('a', {from: user1, value: amount2}))
    .then(() => bets.bet('b', {from: user2, value: amount2}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(totalBet))
    .then(() => adminBalance = web3.eth.getBalance(admin)) 
    .then(() => bets.closeBetting({from: admin, gasPrice: gasPrice}))
      .then((result) => assert.equal(web3.eth.getBalance(admin).valueOf(),
        adminBalance.add(adminFee).sub(gasPrice.mul(result.receipt.gasUsed)).valueOf()));
    });

    it('should allow to start 2nd Betting consistently', () =>{
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet('a', {from: user1, value: amount1}))
    .then(() => bets.bet('b', {from: user2, value: amount2}))
    .then(() => bets.closeBetting({from: admin}))
    .then(() => bets.isBettingStarted.call({from: admin}))
      .then(asserts.equal(false))
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet('a', {from: user1, value: amount2}))
    .then(() => bets.bet('b', {from: user2, value: amount1}))
    .then(() => bets.closeBetting.call({from: admin}))
      .then(asserts.equal(false));

    });


  it('should allow to start Betting', () => {
     return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.isBettingStarted.call({from: admin}))
      .then(asserts.equal(true));
  });

  it('should not allow to start Betting if it is not admin', () => {
    const user = accounts[2];
    
    return Promise.resolve()
    .then(() => bets.startBetting.call({from: user}))
      .then(asserts.equal(false));
  });

  it('event should not be started by default', () => {
    
    return Promise.resolve()
    .then(() => bets.isBettingStarted.call({from: admin}))
      .then(asserts.equal(false));
  });

  it('should not allow to bet for admin', () => {
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet.call('a', {from: admin, value: amount}))
      .then(asserts.equal(false))
  });

  it('should not allow to bet if betting not started', () => {
    const amount = 100;
    const user = accounts[2];
    return Promise.resolve()
    .then(() => bets.bet.call('a', {from: user, value: amount}))
      .then(asserts.equal(false))
  });


  it('should emit BetSuccessful event on 1st bet', () => {
    const user = accounts[2];
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet('a', {from: user, value: amount}))
      .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].event, 'BetSuccessful');
          assert.equal(result.logs[0].args.from, user);
          assert.equal(result.logs[0].args.value.valueOf(), amount);
      });
  });

  it('should emit BetSuccessful event on 2nd bet', () => {
    const user = accounts[2];
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet('b', {from: user, value: amount}))
      .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].event, 'BetSuccessful');
          assert.equal(result.logs[0].args.from, user);
          assert.equal(result.logs[0].args.value.valueOf(), amount);
      });
  });
 

  it('should return true on close betting', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const user3 = accounts[4];
    const user4 = accounts[5];
    const user5 = accounts[6];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet('a', {from: user1, value: amount1}))
    .then(() => bets.bet('a', {from: user3, value: amount1}))
    .then(() => bets.bet('b', {from: user2, value: amount2}))
    .then(() => bets.bet('a', {from: user4, value: amount1}))
    .then(() => bets.bet('b', {from: user5, value: amount2}))
    .then(() => bets.closeBetting.call({from: admin}))
      .then(asserts.equal(true));
  });

  it('should emit BenefitSuccessful event on close betting', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const user3 = accounts[5];
    const user4 = accounts[6];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet('a', {from: user1, value: amount1}))
    .then(() => bets.bet('b', {from: user2, value: amount2}))
    .then(() => bets.bet('a', {from: user3, value: amount1}))
    .then(() => bets.bet('b', {from: user4, value: amount2}))
    .then(() => bets.closeBetting({from: admin}))
       .then(result => {
          assert.equal(result.logs.length, 2);
          assert.equal(result.logs[0].event, 'BenefitSuccessful');
          assert.equal(result.logs[1].event, 'BenefitSuccessful');          
      });
  });

  it('should return false if user is placing a bet less than 100', () => {
    const user = accounts[2];
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet.call('c', {from: user, value: amount}))
      .then(asserts.equal(false));    
  });

  it('should return false if user is making bet not A or B', () => {
    const user = accounts[2];
    const amount = 50;
    return Promise.resolve()
    .then(() => bets.startBetting({from: admin}))
    .then(() => bets.bet.call('b', {from: user, value: amount}))
      .then(asserts.equal(false));    
  });


  
 });
