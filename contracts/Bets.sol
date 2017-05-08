pragma solidity 0.4.11;

contract Bets {
    
    enum Status { NotStarted, Started, Finished }
    Status public status = Status.NotStarted;
    address public admin;

    string public aSide = 'a';
    string public bSide = 'b';
    string public minBet = 'Min bet is 100';
    string public winnerResult;
    uint public sideAMoney;
    uint public sideBMoney;
    uint public sideWinnerMoney;
    uint public sideLoserMoney;
    address[] public addressesA;
    address[] public addressesB;
    address[] public winnersAddresses;   
    
    struct Bet {
        uint betId;
        address userAddress;
        uint betValue;
        bool betCreated;
     }

     struct Winner {
         uint award;
         bool awardReceived;
     }
  
    mapping(address => Bet) public _betsA;
    mapping(address => Bet) public _betsB;
    mapping(address => Winner) public _winners;

    event BetSuccessful(address from, uint value, string side, uint betId);
    event BenefitSuccessful(address to, uint award);
    event BettingClosed(uint adminFee);

    function Bets() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        if(msg.sender != admin){
            return;
        }
        _;
    }

    modifier onlyNotAdmin() {
        if(msg.sender == admin){
            return;
        }
    _;
    }
        
        
    function startBetting() onlyAdmin() returns(bool) {
        if(winnersAddresses.length == 0 && status == Status.Finished){
           status = Status.NotStarted;
        }
        
        if(status != Status.NotStarted) { throw; }

        status = Status.Started;
        return true;
    }

    function isBettingStarted() returns(bool) {
        if(status == Status.Started){
            return true;
        }else {return false;}
    }

    function readMinBet() returns(string) {
        return minBet;
    }

    function getBetAmount(string side) returns(uint){
        if(sha3(side) == sha3(aSide)){
            return _betsA[msg.sender].betValue;
        } else if(sha3(side) == sha3(bSide)){
            return _betsB[msg.sender].betValue;
        } else { throw; }
    }

    function getContractBalance() returns(uint){
        return this.balance;
    }
   
    function assert(bool condition) internal {
        if(!condition) { throw; }
    }

    function add(uint a, uint b) internal returns (uint) {
        uint c = a + b;
        assert(c >= a);
        return c;
    }
   
    function bet(string side) payable onlyNotAdmin() returns(bool) {
        if(status != Status.Started || msg.value < 100) { throw; }
        uint betId;

        if(sha3(side) == sha3(aSide)){
            sideAMoney = add(sideAMoney, msg.value);

            if(_betsA[msg.sender].betCreated == false){
                addressesA.push(msg.sender);
                _betsA[msg.sender].userAddress = msg.sender;
                _betsA[msg.sender].betValue = msg.value;
                _betsA[msg.sender].betCreated = true;
                _betsA[msg.sender].betId = addressesA.length;
             } else {
                _betsA[msg.sender].betValue = add(_betsA[msg.sender].betValue, msg.value);                
            }
            betId = _betsA[msg.sender].betId;

        } else if(sha3(side) == sha3(bSide)){
            sideBMoney = add(sideBMoney, msg.value);

             if(_betsB[msg.sender].betCreated == false){
                addressesB.push(msg.sender);
                _betsB[msg.sender].userAddress = msg.sender;
                _betsB[msg.sender].betValue = msg.value;
                _betsB[msg.sender].betCreated = true;
                _betsB[msg.sender].betId = addressesB.length;
            } else {
                _betsB[msg.sender].betValue = add(_betsB[msg.sender].betValue, msg.value);
                
            }
            betId = _betsB[msg.sender].betId;

        } else  { return false; }

        if(this.balance != sideAMoney + sideBMoney){
            throw;
        }

        BetSuccessful(msg.sender, msg.value, side, betId);
        return true;
    }

    function closeBetting(string winnerSide) onlyAdmin() returns(bool){               
        
        if(status != Status.Started) { return false; }    
        status = Status.Finished; 
        winnerResult = winnerSide;        
        
        if(sha3(winnerSide) == sha3(aSide)){
            sideWinnerMoney = sideAMoney;
            sideLoserMoney = sideBMoney;
            winnersAddresses = addressesA;        
        }
        else if(sha3(winnerSide) == sha3(bSide)){
            sideWinnerMoney = sideBMoney;
            sideLoserMoney = sideAMoney;
            winnersAddresses = addressesB;
        }
        else{ throw; }
        
        uint adminFee = sideLoserMoney / 10;

        if(!admin.send(adminFee)){
                  throw;
        } 

        BettingClosed(adminFee);
        sideLoserMoney = sideLoserMoney - adminFee;                        
        return true;
    }

    function sendSingleReward(uint betId) external returns(bool){
        Bet memory winBet;
        uint winnerIndex = betId - 1;
        Winner memory winner = _winners[winnersAddresses[winnerIndex]];
        if(status != Status.Finished || winnersAddresses.length == 0 || winner.awardReceived == true) { throw; }                                  
        
        if(sha3(winnerResult) == sha3(aSide)){
            winBet = _betsA[winnersAddresses[winnerIndex]];
        }
        else{
            winBet = _betsB[winnersAddresses[winnerIndex]];
        }

        uint profitCash = sideLoserMoney * winBet.betValue / sideWinnerMoney;
                
        winner.award = winBet.betValue + profitCash;
        winner.awardReceived = true;                           
           
        if(!winnersAddresses[winnerIndex].send(winner.award)) { throw; }  
        
        BenefitSuccessful(winnersAddresses[winnerIndex], winner.award); 
        return true;
    } 

    function sendRemaining() onlyAdmin() returns(bool) {
        suicide(admin);
        return true;
    }  
}
