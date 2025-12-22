const playerCardMinNumber = 1;
const playerCardMaxNumber = 10;
const pointCardMinNumber = -3;
const pointCardMaxNumber = 7;
const maxTurnCount = 10;

class Player {
    constructor(id, name) {
        this._id = id;
        this._name = name;
        this._bidCard = null;
        this._usedCards = [];
        this._pointCards = [];
        this.createPlayerCards();
    }

    get id() {
        return this._id;
    }
    get name() {
        return this._name;
    }
    get cards() {
        return this._cards;
    }
    get bidCard() {
        return this._bidCard;
    }
    get usedCards() {
        return this._usedCards;
    }
    get pointCards() {
        return this._pointCards;
    }

    createPlayerCards() {
        const count = playerCardMaxNumber-playerCardMinNumber+1;
        return this._cards = [...Array(count)].map((_, i) => playerCardMaxNumber - i);
    }

    getCardIndex(num) {
        return this._cards.findIndex((e) => e === num);
    }
    moveToBid( index ) {
        if((index<0) || (this._cards.length <=index) || (this._bidCard!==null)){
            return false;
        }
        const removed = this._cards.splice(index, 1);
        this._bidCard = removed[0];
        return true;
    }
    moveBidToUsed() {
        const bidCard = this._bidCard;
        if(bidCard != null){
            this._usedCards.push(bidCard);
            this._bidCard = null;
            return true;
        }else{
            return false;
        }
    }

    getTotalPoint() {
        return this._pointCards.reduce((accumulator, currentValue) => accumulator + currentValue,0);
    }
}

class GameContext {
    constructor() {
        this.turnNum = 1;
        this.openPointCardCount = 0;
        this._isPlayersBidCardOpen = false;
        this._players = [];
        this._playerMap = new Map();

        this.createPointCards();
    }

    isFinish() {
        return this.turnNum > maxTurnCount;
    }

    createPointCards() {
        this.openPointCardCount = 1;
        const count = pointCardMaxNumber - pointCardMinNumber;
        const cards = [...Array(count)].map((_, i) => {
            const v = i + pointCardMinNumber;
            return (v < 0) ? v : v +1;
        });
        for (let i = cards.length - 1; i >= 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return this.pointCards = cards;
    }

    get players() {
        return this._players;
    }

    findPlayer(id) {
        const player = this._playerMap.get(id);
        return player ? player : null;
    }
    addPlayer(id, name = `player_${id}`) {
        const playerMap = this._playerMap;
        if (playerMap.has(id)) return null;

        const player = new Player(id, name);
        this.players.push(player);
        playerMap.set(id, player);
    }
    removePlayer(id) {
        const playerMap = this._playerMap;
        if (!playerMap.has(id)) return;
        const players = this._players;
        const idx = players.findIndex(v => v.id === id);
        if (idx >= 0) {
            players.splice(idx, 1);
        }
        playerMap.delete(id);
    }

    checkAllPlayersBidFinish() {
        const players = this.players
        const playerLength = players.length;
        const bidCount =  players.reduce((accumulator, currentValue) => accumulator + (currentValue.bidCard !== null ? 1 : 0), 0);
        return playerLength===bidCount;
        return false;
    }

    isPlayersBidCardOpen() {
        return this._isPlayersBidCardOpen;
    }
    openPlayersBidCard() {
        this._isPlayersBidCardOpen = true;
    }
    movePlayersBidCardToUsed() {
        for (const player of this.players) {
            player.moveBidToUsed();
        }
        this._isPlayersBidCardOpen = false;
    }

    getTotalOpenPoint() {
        const cards = this.pointCards.slice(0,Math.min(this.openPointCardCount,this.pointCards.length));
        return cards.reduce((accumulator, currentValue) => accumulator + currentValue,0);
    }

    getWinnerCurrentTurn() {
        if(!this.checkAllPlayersBidFinish()){
            return null;
        }
        const bidMap = new Map();
        for(const player of this.players){
            const bidCard = player.bidCard;
            if(bidCard===null){
                continue;
            }
            const data = bidMap.has(bidCard)?[player, ...bidMap.get(bidCard)]:[player];
            bidMap.set(bidCard, data);
        }
        const delCards = [];
        for(const key of bidMap.keys()){
            if(bidMap.get(key).length>1){
                delCards.push(key);
            }
        }
        for(const key of delCards){
            bidMap.delete(key);
        }
        if(bidMap.size == 0){
            return null;
        }
        const keys = Array.from(bidMap.keys());
        const sortKeys = keys.sort((a, b) => a - b);
        const target = this.getTotalOpenPoint() >= 0 ? sortKeys[sortKeys.length-1] : sortKeys[0];
        return bidMap.get(target)[0];
    }

    changeToNextTurn() {
        if (this.isFinish() || !this.checkAllPlayersBidFinish()) return false;
        const winner = this.getWinnerCurrentTurn();
        this.movePlayersBidCardToUsed();
        if(winner){
            const openPointCardCount = this.openPointCardCount;
            const pointCards = this.pointCards;
            const getCards = pointCards.splice(0, openPointCardCount);
            winner.pointCards.push(...getCards);
            this.openPointCardCount = (pointCards.length == 0) ? 0 : 1;
        }else{ 
            this.openPointCardCount = Math.min(this.openPointCardCount +1, this.pointCards.length); 
        }
        this.turnNum += 1;
        return true;
    }
}

module.exports = {
    Player: Player,
    GameContext: GameContext,
}
