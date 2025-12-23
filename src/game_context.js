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
        return this._cards = [];
    }

    getCardIndex(/* num */) {
        return -1;
    }
    moveToBid(/* index */) {
        return false;
    }
    moveBidToUsed() {
        return false;
    }

    getTotalPoint() {
        return 0;
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
        this.openPointCardCount = 0;
        return this.pointCards = [];
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
        return 0;
    }

    getWinnerCurrentTurn() {
        return null;
    }

    changeToNextTurn() {
        if (this.isFinish() || !this.checkAllPlayersBidFinish()) return false;
        return false;
    }
}

module.exports = {
    Player: Player,
    GameContext: GameContext,
}
