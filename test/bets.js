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
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => user1StartBalance = web3.eth.getBalance(user1))    
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1, gasPrice: gasPrice}))
        .then((result) => assert.equal(web3.eth.getBalance(user1).valueOf(),
        user1StartBalance.sub(gasPrice.mul(result.receipt.gasUsed)).sub(amount1).valueOf()))
    .then(() => user2StartBalance = web3.eth.getBalance(user2))    
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2, gasPrice: gasPrice}))
        .then((result) => assert.equal(web3.eth.getBalance(user2).valueOf(),
        user2StartBalance.sub(gasPrice.mul(result.receipt.gasUsed)).sub(amount2).valueOf()))
    });

    it('should check winners wallets after close betting and sending reward', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    const totalBet = amount1 + amount2;
    const adminFee = amount2 / 10;
    let user1StartBalance;
    let betId;

    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
      .then(result => {
         assert.equal(result.logs.length, 1);
         assert.equal(result.logs[0].event, 'BetSuccessful');
         assert.equal(result.logs[0].args.from, user1);
         assert.equal(result.logs[0].args.value.valueOf(), amount1);
         assert.equal(result.logs[0].args.side, 'a');
         betId = result.logs[0].args.betId;
     })
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(totalBet))
    .then(() => user1StartBalance = web3.eth.getBalance(user1)) 
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
    .then(() => bets.sendSingleReward(1, betId, {from: admin}))
      .then(() => assert.equal(web3.eth.getBalance(user1).valueOf(),
        user1StartBalance.add(totalBet).sub(adminFee).valueOf()));
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
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount1}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount2}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(totalBet))
    .then(() => adminBalance = web3.eth.getBalance(admin)) 
    .then(() => bets.closeBetting(1, 'a', {from: admin, gasPrice: gasPrice}))
      .then((result) => assert.equal(web3.eth.getBalance(admin).valueOf(),
        adminBalance.add(adminFee).sub(gasPrice.mul(result.receipt.gasUsed)).valueOf()))
    });   

  it('should allow to start Betting', () => {
     return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.isBettingStarted.call(1, {from: admin}))
      .then(asserts.equal(true));
  });

  it('should not allow to start Betting if it is not admin', () => {
    const user = accounts[2];
    
    return Promise.resolve()
    .then(() => bets.startBetting.call(5, {from: user}))
      .then(asserts.equal(false));
  });

  it('event should not be started by default', () => {
    
    return Promise.resolve()
    .then(() => bets.isBettingStarted.call(1, {from: admin}))
      .then(asserts.equal(false));
  });

  it('should not allow to bet for admin', () => {
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet.call(1, 'a', {from: admin, value: amount}))
      .then(asserts.equal(false))
  });

  it('should not allow to bet if betting not started', () => {
    const amount = 100;
    const user = accounts[2];
    return Promise.resolve()
    .then(() => asserts.throws(bets.bet(1, 'a', {from: user, value: amount})));
  });


  it('should emit BetSuccessful event on 1st bet', () => {
    const user = accounts[2];
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user, value: amount}))
      .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].event, 'BetSuccessful');
          assert.equal(result.logs[0].args.from, user);
          assert.equal(result.logs[0].args.value.valueOf(), amount);
          assert.equal(result.logs[0].args.side, 'a');
          assert.equal(result.logs[0].args.betId, 1);
      });
  });

  it('should emit BetSuccessful event on 2nd bet', () => {
    const user = accounts[2];
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'b', {from: user, value: amount}))
      .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].event, 'BetSuccessful');
          assert.equal(result.logs[0].args.from, user);
          assert.equal(result.logs[0].args.value.valueOf(), amount);
          assert.equal(result.logs[0].args.side, 'b');
          assert.equal(result.logs[0].args.betId, 1);
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
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'a', {from: user3, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.bet(1, 'a', {from: user4, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user5, value: amount2}))
    .then(() => bets.closeBetting.call(1, 'a', {from: admin}))
       .then(asserts.equal(true));
  });

  it('should emit BenefitSuccessful event on sending single reward', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const user3 = accounts[5];
    const user4 = accounts[6];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.bet(1, 'a', {from: user3, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user4, value: amount2}))
    .then(() => bets.bet(1, 'a', {from: user3, value: amount2}))
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
    .then(() => bets.sendSingleReward(1, 1, {from: admin}))
       .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].event, 'BenefitSuccessful');
          assert.equal(result.logs[0].args.to, user1);
          assert.equal(result.logs[0].args.award.valueOf(), 190);
      })
    .then(() => bets.sendSingleReward(1, 2, {from: admin}))
      .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].event, 'BenefitSuccessful'); 
          assert.equal(result.logs[0].args.to, user3);
          assert.equal(result.logs[0].args.award.valueOf(), 570);  
      });
  });

  it('should throw an exception if we do not have users for reward any more', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const user3 = accounts[5];
    const user4 = accounts[6];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.bet(1, 'a', {from: user3, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user4, value: amount2}))
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
    .then(() => bets.sendSingleReward(1, 1, {from: admin}))       
    .then(() => bets.sendSingleReward(1, 2, {from: admin}))      
    .then(() => asserts.throws(bets.sendSingleReward(1, 3, {from: admin})));
  });

  it('should throw an exception when user is trying to get reward on not Finished Betting', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => asserts.throws(bets.sendSingleReward(1, 1, {from: admin})));
  });

  it('should emit BettingClosed event on close betting', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    const totalBet = (amount1 + amount2)* 2;
    const adminFee = totalBet / 20;

    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount1}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount2}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
      .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].event, 'BettingClosed');
          assert.equal(result.logs[0].args.adminFee.valueOf(), adminFee);
      })
  });

  it('should throw an exception when user is trying to get reward on started Betting', () => {
    return Promise.resolve()
    .then(() => asserts.throws(bets.sendSingleReward(1, 1, {from: admin})));
  });

  it('should return false if user is making bet not A or B', () => {
    const user = accounts[2];
    const amount = 100;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet.call(1, 'c', {from: user, value: amount}))
      .then(asserts.equal(false));    
  });

  it('should throw an exception if user is placing a bet less than 100', () => {
    const user = accounts[2];
    const amount = 50;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => asserts.throws(bets.bet(1, 'b', {from: user, value: amount})));
  });

  it('should not allow to set not valid winner side from admin', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount1}))
    .then(() => asserts.throws(bets.closeBetting(1, 'c', {from: admin})));
  });

   it('should send all remaining contract balance to the admin when betting is closed', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    const totalBet = amount1 + amount2;
    const adminFee = amount2 / 10;
    const gasPrice = web3.eth.gasPrice;
    let adminBalance;

    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(totalBet))
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
    .then(() => adminBalance = web3.eth.getBalance(admin)) 
    .then(() => bets.sendRemaining(1, {from: admin, gasPrice: gasPrice}))
      .then((result) => assert.equal(web3.eth.getBalance(admin).valueOf(),
        adminBalance.sub(gasPrice.mul(result.receipt.gasUsed)).add(totalBet).sub(adminFee).valueOf()))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(0));
    });


     it('should send adminFee and remaining money should be stored in contract if there is no winners', () => {
    const user1 = accounts[2];
    const amount1 = 100;
    const totalBet = amount1;
    const adminFee = amount1 / 10;
    const gasPrice = web3.eth.gasPrice;
    let adminBalance;

    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => adminBalance = web3.eth.getBalance(admin)) 
    .then(() => bets.closeBetting(1, 'b', {from: admin, gasPrice: gasPrice}))
      .then((result) => assert.equal(web3.eth.getBalance(admin).valueOf(),
        adminBalance.sub(gasPrice.mul(result.receipt.gasUsed)).add(adminFee).valueOf()))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(totalBet - adminFee));
    });

    it('should allow to get money back if betting does not have loosers', () => {
      const user1 = accounts[2];
    const amount1 = 100;
    const totalBet = amount1;
    const gasPrice = web3.eth.gasPrice;
    let userStartBalance;

    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(totalBet))
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
    .then(() => userStartBalance = web3.eth.getBalance(user1)) 
    .then(() => bets.sendSingleReward(1, 1, {from: user1, gasPrice: gasPrice}))
      .then((result) => assert.equal(web3.eth.getBalance(user1).valueOf(),
        userStartBalance.sub(gasPrice.mul(result.receipt.gasUsed)).add(totalBet).valueOf()))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(0));
    });

    it('should not allow to get the same reward more than one time', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const amount1 = 100;
    const amount2 = 200;
    const totalBet = amount1 + amount2;
    const adminFee = amount2 / 10;
    let user1StartBalance;
    let betId;

    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
      .then(result => {
         assert.equal(result.logs.length, 1);
         assert.equal(result.logs[0].event, 'BetSuccessful');
         assert.equal(result.logs[0].args.from, user1);
         assert.equal(result.logs[0].args.value.valueOf(), amount1);
         assert.equal(result.logs[0].args.side, 'a');
         betId = result.logs[0].args.betId;
     })
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(totalBet))
    .then(() => user1StartBalance = web3.eth.getBalance(user1)) 
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
    .then(() => bets.sendSingleReward(1, betId, {from: admin}))
     .then(() => assert.equal(web3.eth.getBalance(user1).valueOf(),
        user1StartBalance.add(totalBet).sub(adminFee).valueOf()))
    .then(() => asserts.throws(bets.sendSingleReward(1, betId, {from: admin})));
    });

   it('should not allow to place bet after deadline async', () => {
    const user1 = accounts[2];
    const user2 = accounts[3];
    const user3 = accounts[4];
    const user4 = accounts[5];
    const user5 = accounts[6];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'a', {from: user3, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.bet(1, 'a', {from: user4, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user5, value: amount2}))
    .then(() => {return new Promise((resolve, reject) => {
          web3.currentProvider.sendAsync({
                  jsonrpc: "2.0",
                  method: "evm_increaseTime",
                  params: [6],
                  id: new Date().getTime()
              }, (error, result) => error ? reject(error) : resolve(result.result))
            })
    })
    .then(() => asserts.throws(bets.bet(1, 'b', {from: user5, value: amount2})))
  });

   it('should allow to start and finish one game after another', () =>{
    const user1 = accounts[2];
    const user2 = accounts[3];
    const user3 = accounts[4];
    const amount1 = 100;
    const amount2 = 200;
    return Promise.resolve()
    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(1, 'a', {from: user1, value: amount1}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.bet(1, 'b', {from: user2, value: amount2}))
    .then(() => bets.closeBetting(1, 'a', {from: admin}))
    .then(() => bets.sendSingleReward(1, 1, {from: admin}))
    .then(() => bets.sendRemaining({from: admin}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(0))

    .then(() => bets.startBetting(5, {from: admin}))
    .then(() => bets.bet(2, 'a', {from: user1, value: amount2}))
    .then(() => bets.bet(2, 'b', {from: user2, value: amount1}))
    .then(() => bets.bet(2, 'b', {from: user3, value: amount1}))
    .then(() => bets.closeBetting(2, 'a', {from: admin}))
    .then(() => bets.sendSingleReward(2, 1, {from: admin}))
    .then(() => bets.getContractBalance.call())
      .then(asserts.equal(0))


    });
  
 });
