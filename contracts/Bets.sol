pragma solidity ^0.4.8;

contract Bets {
    
    enum Status { NotStarted, Started, Finished }
    address public admin;   
    string public aSide = 'a';
    string public bSide = 'b';
    string public minBet = 'Min bet is 100';   

    struct Bet {
        uint betId;
        address userAddress;
        uint betValue;
     }

     struct Winner {
         uint award;
         bool awardReceived;
     }

    struct Game {
        Status status;
        uint deadline;
        string winnerResult;
        uint sideAMoney;
        uint sideBMoney;
        uint sideWinnerMoney;
        uint sideLoserMoney;
        uint aCount;
        uint bCount;

        mapping(uint => address) addressesA;
        mapping(uint => address) addressesB;
        mapping(address => Bet) _betsA;
        mapping(address => Bet) _betsB;
        mapping(address => Winner) _winners;
    }

    mapping(uint => Game) public _games;
    uint public gamesCount;
    
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
     
        
    function startBetting(uint duration) onlyAdmin() returns(bool) {
        
        gamesCount++;
        _games[gamesCount] = Game({
            status: Status.Started,
            deadline: add(now, duration),
            sideAMoney: 0,
            sideBMoney: 0,
            sideWinnerMoney: 0,
            sideLoserMoney: 0,
            aCount: 0,
            bCount: 0,
            winnerResult: 'no result'            

        });
        return true;
    }

    function isBettingStarted(uint gameId) returns(bool) {
        if(_games[gameId].status == Status.Started){
            return true;
        }else {return false;}
    }

    function readMinBet() returns(string) {
        return minBet;
    }

    function getBetAmount(uint gameId, string side) returns(uint){
        if(sha3(side) == sha3(aSide)){
            return _games[gameId]._betsA[msg.sender].betValue;
        } else if(sha3(side) == sha3(bSide)){
            return _games[gameId]._betsB[msg.sender].betValue;
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
   
    function bet(uint gameId, string side) payable onlyNotAdmin() returns(bool) {
        if(_games[gameId].status != Status.Started || msg.value < 100 || now > _games[gameId].deadline) { throw; }
        uint betId;

        if(sha3(side) == sha3(aSide)){
            _games[gameId].sideAMoney = add(_games[gameId].sideAMoney, msg.value);

            if(_games[gameId]._betsA[msg.sender].betValue == 0){
                _games[gameId]._betsA[msg.sender].userAddress = msg.sender;
                _games[gameId].aCount++;
                _games[gameId]._betsA[msg.sender].betId = _games[gameId].aCount;
                _games[gameId].addressesA[_games[gameId].aCount] = msg.sender;
             }
            _games[gameId]._betsA[msg.sender].betValue += msg.value;
                 
            betId = _games[gameId]._betsA[msg.sender].betId;

        } else if(sha3(side) == sha3(bSide)){
            _games[gameId].sideBMoney = add(_games[gameId].sideBMoney, msg.value);

             if(_games[gameId]._betsB[msg.sender].betValue == 0){
                _games[gameId]._betsB[msg.sender].userAddress = msg.sender;
                _games[gameId].bCount++;
                _games[gameId]._betsB[msg.sender].betId = _games[gameId].bCount;
                _games[gameId].addressesB[_games[gameId].bCount] = msg.sender;
            }
            _games[gameId]._betsB[msg.sender].betValue += msg.value;

            betId = _games[gameId]._betsB[msg.sender].betId;

        } else  { return false; }

        if(this.balance != _games[gameId].sideAMoney + _games[gameId].sideBMoney){
            throw;
        }

        BetSuccessful(msg.sender, msg.value, side, betId);
        return true;
    }

    function closeBetting(uint gameId, string winnerSide) onlyAdmin() returns(bool){               
        
        if(_games[gameId].status != Status.Started) { return false; }    
        _games[gameId].status = Status.Finished; 
        _games[gameId].winnerResult = winnerSide;        
        
        if(sha3(winnerSide) == sha3(aSide)){
            _games[gameId].sideWinnerMoney = _games[gameId].sideAMoney;
            _games[gameId].sideLoserMoney = _games[gameId].sideBMoney;
        }
        else if(sha3(winnerSide) == sha3(bSide)){
            _games[gameId].sideWinnerMoney = _games[gameId].sideBMoney;
            _games[gameId].sideLoserMoney = _games[gameId].sideAMoney;
        }
        else{ throw; }
        
        uint adminFee = _games[gameId].sideLoserMoney / 10;

        if(!admin.send(adminFee)){
                  throw;
        } 

        BettingClosed(adminFee);
        _games[gameId].sideLoserMoney = _games[gameId].sideLoserMoney - adminFee;                        
        return true;
    }

    function sendSingleReward(uint gameId, uint betId) external returns(bool){
        Bet memory winBet;
        address winnerAddress;

        if(_games[gameId].status != Status.Finished || _games[gameId].sideWinnerMoney == 0) { throw; }                                  
        
        if(sha3(_games[gameId].winnerResult) == sha3(aSide)){
            winBet = _games[gameId]._betsA[_games[gameId].addressesA[betId]];
            winnerAddress = _games[gameId].addressesA[betId];
        }
        else{
            winBet = _games[gameId]._betsB[_games[gameId].addressesB[betId]];
            winnerAddress = _games[gameId].addressesB[betId];
        }

        if(_games[gameId]._winners[winnerAddress].awardReceived == true || winBet.betValue == 0) { throw; }

        uint profitCash = _games[gameId].sideLoserMoney * winBet.betValue / _games[gameId].sideWinnerMoney;
                
        _games[gameId]._winners[winnerAddress].award = winBet.betValue + profitCash;
        _games[gameId]._winners[winnerAddress].awardReceived = true;                           
           
        if(!winBet.userAddress.send(_games[gameId]._winners[winnerAddress].award)) { throw; }  
        
        BenefitSuccessful(winBet.userAddress, _games[gameId]._winners[winnerAddress].award); 
        return true;
    } 

    function sendRemaining() onlyAdmin() returns(bool) {
        suicide(admin);
        return true;
    }  
}
