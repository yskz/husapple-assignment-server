const crypto = require('crypto');

class GameObject {
    constructor(gameContext, sessionPlayer) {
        this._gameContext = gameContext;
        this._player = gameContext.findPlayer(sessionPlayer.id);
    }

    get gameContext() {
        return this._gameContext;
    }
    get player() {
        return this._player;
    }
}

class SessionPlayer {
    constructor(session, client) {
        this._session = session;
        this._client = client;
        this._id = crypto.createHash('sha256').update(client.key()).digest('hex');
        this._readyGame = false;
        this._gameObject = null;
    }

    remove() {
        this._session.removePlayer(this);
    }
    removeFromSession() {
    }

    get id() {
        return this._id;
    }
    get session() {
        return this._session;
    }
    get client() {
        return this._client;
    }
    get playerName() {
        return this.client.getPlayerName();
    }

    updateSessionPlayers(players, removePlayerIds) {
        this.client.updateSessionPlayers(this.session, players, removePlayerIds);
    }

    isReadyGame() {
        return this._readyGame;
    }
    readyGame() {
        if (this.isReadyGame()) return;
        this._readyGame = true;
        this._session.updateReadyGameStatus();
    }

    getGameObject() {
        return this._gameObject;
    }
    setGameObject(gameObject = null) {
        this._gameObject = gameObject;
    }

    startGame(gameContext) {
        this.client.startGame(gameContext);
    }
    startGameTurn(gameContext) {
        this.client.startGameTurn(gameContext);
    }
    finishGameTurn(gameContext) {
        this.client.finishGameTurn(gameContext);
    }
    finishGame(gameContext) {
        this.client.finishGame(gameContext);
    }
    postFinishGame() {
        this.client.postFinishGame();
    }
    bidCardOtherPlayer(playerId, bidCard) {
        if (playerId !== this.id) {
            this.client.bidCardOtherPlayer(playerId, bidCard);
        }
    }
}


module.exports = {
    GameObject: GameObject,
    SessionPlayer: SessionPlayer,
}
