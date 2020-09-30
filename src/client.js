const clientState = require('./client_state');

class Client {
    constructor(clientManager, address, port, websocket) {
        this._clientManager = clientManager;
        this._removed = false;
        this._address = address;
        this._port = port;
        this._ws = websocket;
        this._playerName = null;

        const messageEventListener = (msg) => { this.receiveMessage(msg); }
        websocket.addEventListener('message', messageEventListener);
        this._messageEventListener = messageEventListener;
        const closeEventListener = () => { this.closeSocket(); }
        websocket.addEventListener('close', closeEventListener);
        this._closeEventListener = closeEventListener;
        const errorEventListener = (e) => { this.error(e); }
        websocket.addEventListener('error', errorEventListener);
        this._errorEventListener = errorEventListener;

        const state = new clientState.WaitSignIn();
        this._state = state;
    }

    removeAllEventListener() {
        const ws = this._ws;
        const messageEventListener = this._messageEventListener;
        if (messageEventListener) {
            ws.removeEventListener('message', messageEventListener);
            this._messageEventListener = null;
        }
        const closeEventListener = this._closeEventListener;
        if (closeEventListener) {
            ws.removeEventListener('close', closeEventListener);
            this._closeEventListener = null;
        }
        const errorEventListener = this._errorEventListener;
        if (errorEventListener) {
            ws.removeEventListener('error', errorEventListener);
            this._errorEventListener = null;
        }
    }

    isRunning() {
        return this.getState().isStart();
    }
    run() {
        if (!this.isRunning()) {
            this.getState().start(this);
        }
    }

    isRemoved() {
        return this._removed;
    }
    remove() {
        if (!this.isRemoved()) {
            this._clientManager.removeClient(this);
        }
    }
    removeFromClientManager() {
        if (!this.isRemoved()) {
            this._remove();
        }
    }
    _remove() {
        this._removed = true;
        this.removeAllEventListener();
        this.changeState(new clientState.Sleep());
    }

    get address() {
        return this._address;
    }
    get port() {
        return this._port;
    }
    get websocket() {
        return this._ws;
    }

    getPlayerName() {
        return this._playerName;
    }
    setPlayerName(name) {
        this._playerName = name;
    }

    static createKeyString(address, port) {
        return `${address}_${port}`;
    }
    key() {
        return Client.createKeyString(this._address, this._port);
    }

    getIdTextForLog() {
        const baseText = `${this.address}:${this.port}`;
        const playerName = this.getPlayerName();
        return playerName ? `${baseText} [${playerName}]` : baseText;
    }

    getState() {
        return this._state;
    }
    changeState(newState) {
        const curState = this.getState();
        curState.stop(this);
        this._state = newState;
        newState.start(this);
    }

    sendMessage(message) {
        this.websocket.send(JSON.stringify(message.sendProps()));
    }

    receiveMessage(message) {
        this.getState().receiveMessage(this, message);
    }
    closeSocket() {
        this.getState().closeSocket(this);
    }
    error(error) {
        this.getState().error(this, error);
    }

    updateSessionPlayers(session, players, removePlayerIds) {
        this.getState().updateSessionPlayers(this, session, players, removePlayerIds);
    }
    startGame(gameContext) {
        this.getState().startGame(this, gameContext);
    }

    startGameTurn(gameContext) {
        this.getState().startGameTurn(this, gameContext);
    }
    finishGameTurn(gameContext) {
        this.getState().finishGameTurn(this, gameContext);
    }
    finishGame(gameContext) {
        this.getState().finishGame(this, gameContext);
    }
    postFinishGame() {
        this.getState().postFinishGame(this);
    }
    bidCardOtherPlayer(playerId, bidCard) {
        this.getState().bidCardOtherPlayer(this, playerId, bidCard);
    }
}

module.exports = {
    Client: Client,
};
