pragma solidity 0.4.8;

contract Bets {
    
    address public admin;

    bool public eventStarted = false;
    string public aSide = 'a';
    string public bSide = 'b';
    string public minBet = 'Min bet is 100';
    uint public sideAMoney;
    uint public sideBMoney;
    address[] public addressesA;
    address[] public addressesB;

    
    struct Bet {
        address userAddress;
        uint betValue;
        bool betCreated;
     }

  
    mapping(address => Bet) public _betsA;
    mapping(address => Bet) public _betsB;

    event BetSuccessful(address from, uint value, string side);
    event BenefitSuccessful(address to, uint totalBet, uint benefit);
    event BettingFinished(uint adminProfit, string sideWinner);

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
        if(eventStarted == true) { return false; }

        eventStarted = true;
        return true;
    }

    function isBettingStarted() returns(bool) {
        return eventStarted;
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
        if(!eventStarted || msg.value < 100) { return false; }
        
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
            return false;
        }

        BetSuccessful(msg.sender, msg.value, side);
        return true;
        
        }

    function closeBetting() onlyAdmin() returns(bool){               
        address winnerAddress;
        uint sideWinnerMoney;
        uint sideLoserMoney;
        address [] memory winners;


        if(!eventStarted) { return false; }    
        eventStarted = false;    
       
        uint randomNumber = uint(block.blockhash(block.number - 1)) % 2 + 1;
        
        string winnerSide = bSide;
        if(randomNumber == 1){
            winnerSide = aSide;
        }

                
        if(sha3(winnerSide) == sha3(aSide)){
            sideWinnerMoney = sideAMoney;
            sideLoserMoney = sideBMoney;
            winners = addressesA;        
        }
        else{
            sideWinnerMoney = sideBMoney;
            sideLoserMoney = sideAMoney;
            winners = addressesB;
        }
        

        uint adminFee = sideLoserMoney / 10;

        if(!admin.send(adminFee)){
                  return false;
        } 

        sideLoserMoney = sideLoserMoney - adminFee;

            for(uint i = 0; i < winners.length; i++)
            {
                winnerAddress = winners[i]; 
                     
                Bet memory winner;
                
                if(sha3(winnerSide) == sha3(aSide)){
                    winner = _betsA[winnerAddress];
                }
                else{
                    winner = _betsB[winnerAddress];
                }

                uint profitCash = sideLoserMoney * winner.betValue / sideWinnerMoney;
                uint totalWin = winner.betValue + profitCash;
             
                if(!winnerAddress.send(totalWin)){
                  return false;
                }  
                
                BenefitSuccessful(winner.userAddress, winner.betValue, profitCash);                    
            }                   
            
        return true;

    }
}
