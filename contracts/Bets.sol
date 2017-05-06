pragma solidity 0.4.8;

contract Bets {
    
    enum Status { NotStarted, Started, Finished }
    Status public status = Status.NotStarted;
    address public admin;

    string public aSide = 'a';
    string public bSide = 'b';
    string public minBet = 'Min bet is 100';
    uint public sideAMoney;
    uint public sideBMoney;
    address[] public addressesA;
    address[] public addressesB;
    address[] public winners;
    

    
    struct Bet {
        address userAddress;
        uint betValue;
        bool betCreated;
     }

     struct Winner {
         uint award;
     }

  
    mapping(address => Bet) public _betsA;
    mapping(address => Bet) public _betsB;
    mapping(address => Winner) public _winners;

    event BetSuccessful(address from, uint value, string side);
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
        if(winners.length == 0 && status == Status.Finished){
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
        
        if(sha3(side) == sha3(aSide)){
            sideAMoney = add(sideAMoney, msg.value);

            if(_betsA[msg.sender].betCreated == false){
                _betsA[msg.sender].userAddress = msg.sender;
                _betsA[msg.sender].betValue = msg.value;
                _betsA[msg.sender].betCreated = true;
                
                addressesA.push(msg.sender);
            } else {
                _betsA[msg.sender].betValue = add(_betsA[msg.sender].betValue, msg.value);
                
            }
        } else if(sha3(side) == sha3(bSide)){
            sideBMoney = add(sideBMoney, msg.value);

             if(_betsB[msg.sender].betCreated == false){
                _betsB[msg.sender].userAddress = msg.sender;
                _betsB[msg.sender].betValue = msg.value;
                _betsB[msg.sender].betCreated = true;
                
                addressesB.push(msg.sender);
            } else {
                _betsB[msg.sender].betValue = add(_betsB[msg.sender].betValue, msg.value);
                
            }
        } else  { return false; }

        if(this.balance != sideAMoney + sideBMoney){
            throw;
        }

        BetSuccessful(msg.sender, msg.value, side);
        return true;
        
        }

    function closeBetting(string winnerSide) onlyAdmin() returns(bool){               
        uint sideWinnerMoney;
        uint sideLoserMoney;

        if(status != Status.Started) { return false; }    
        status = Status.Finished;         
        
        if(sha3(winnerSide) == sha3(aSide)){
            sideWinnerMoney = sideAMoney;
            sideLoserMoney = sideBMoney;
            winners = addressesA;        
        }
        else if(sha3(winnerSide) == sha3(bSide)){
            sideWinnerMoney = sideBMoney;
            sideLoserMoney = sideAMoney;
            winners = addressesB;
        }
        else{ throw; }
        

        uint adminFee = sideLoserMoney / 10;

        if(!admin.send(adminFee)){
                  throw;
        } 

        BettingClosed(adminFee);

        sideLoserMoney = sideLoserMoney - adminFee;

            for(uint i = 0; i < winners.length; i++)
            {           
                
                Bet memory winner;
                
                if(sha3(winnerSide) == sha3(aSide)){
                    winner = _betsA[winners[i]];
                }
                else{
                    winner = _betsB[winners[i]];
                }

                uint profitCash = sideLoserMoney * winner.betValue / sideWinnerMoney;
                
                _winners[winners[i]].award = winner.betValue + profitCash;
                                   
            }                   
            
        return true;

    }

    function sendSingleReward() external returns(bool){
        if(status != Status.Finished || winners.length == 0) { throw; }     
        
        if(!winners[0].send(_winners[winners[0]].award)){
                 throw;
        }  
        
        BenefitSuccessful(winners[0], _winners[winners[0]].award); 
        removeFromWinners(0);
        
        return true;

    }

    function removeFromWinners(uint index)  returns(address[]) {
        if (index >= winners.length) return;

        for (uint i = index; i < winners.length - 1; i++){
            winners[i] = winners[i+1];
        }
        delete winners[winners.length-1];
        winners.length--;

        return winners;
    }

}
