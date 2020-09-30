const protocol = require('./protocol');
const Message = protocol.Message;
const GameInfo = protocol.GameInfo;
const sessionManager = require('./session_manager').getInstance();
const SessionPlayerGameObject = require('./session_player').GameObject;

function createGameInfo(client, myPlayer, gameContext) {
    const myPlayerId = myPlayer.id;
    const srcMyPlayerInfo = gameContext.findPlayer(myPlayerId);
    if (!srcMyPlayerInfo) return null;
    const myPlayerInfo = new GameInfo.MyPlayer(srcMyPlayerInfo.id, srcMyPlayerInfo.name, srcMyPlayerInfo.cards, srcMyPlayerInfo.pointCards, srcMyPlayerInfo.usedCards, srcMyPlayerInfo.bidCard);
    const isBidCardOpen = gameContext.isPlayersBidCardOpen();
    const playerInfos = gameContext.players.filter(v => v.id !== myPlayerId).map(v => {
        const filterBidCard = ((v.bidCard === null) || isBidCardOpen) ? v.bidCard : 0;
        return new GameInfo.Player(v.id, v.name, v.pointCards, v.usedCards, filterBidCard);
    });
    let winnerCurrentTurn = null;
    if (gameContext.checkAllPlayersBidFinish()) {
        const winner = gameContext.getWinnerCurrentTurn();
        const [isDraw, playerName] = winner ? [false, winner.name] : [true, ''];
        winnerCurrentTurn = new GameInfo.WinnerCurrentTurn(isDraw, playerName);
    }
    return new GameInfo.GameInfo(myPlayerInfo, playerInfos, gameContext.turnNum, gameContext.pointCards, gameContext.openPointCardCount, isBidCardOpen, winnerCurrentTurn);
}

class Unknown {
    constructor() {
        this._running = false;
    }

    isStart() {
        return this._running;
    }
    _procIsStart(proc, defaultResult = null) {
        return this.isStart() ? proc() : defaultResult;
    }
    _procIsNotStart(proc, defaultResult = null) {
        return !this.isStart() ? proc() : defaultResult;
    }

    start(client) {
        this._procIsNotStart(() => {
            this._running = true;
            this.hookStart(client);
        });
    }
    stop(client) {
        this._procIsStart(() => {
            this.hookStop(client);
            this._running = false;
        });
    }

    hookStart(/* client */) {}
    hookStop(/* client */) {}

    receiveMessage(client, message) {
        this._procIsStart(() => this.hookReceiveMessage(client, message));
    }
    closeSocket(client) {
        this._procIsStart(() => this.hookCloseSocket(client));
    }
    error(client, error) {
        this._procIsStart(() => this.hookError(client, error));
    }

    hookReceiveMessage(/* client, message */) {}
    hookCloseSocket(/* client */) {}
    hookError(/* client, error */) {}


    updateSessionPlayers(client, session, players, removePlayerIds) {
        this._procIsStart(() => this.hookUpdateSessionPlayers(client, session, players, removePlayerIds));
    }
    startGame(client, gameContext) {
        this._procIsStart(() => this.hookStartGame(client, gameContext));
    }

    hookUpdateSessionPlayers(/* client, session, players, removePlayerIds */) {}
    hookStartGame(/* client, gameContext */) {}

    startGameTurn(client, gameContext) {
        this._procIsStart(() => this.hookStartGameTurn(client, gameContext));
    }
    finishGameTurn(client, gameContext) {
        this._procIsStart(() => this.hookFinishGameTurn(client, gameContext));
    }
    finishGame(client, gameContext) {
        this._procIsStart(() => this.hookFinishGame(client, gameContext));
    }
    postFinishGame(client) {
        this._procIsStart(() => this.hookPostFinishGame(client));
    }
    bidCardOtherPlayer(client, playerId, bidCard) {
        this._procIsStart(() => this.hookBidCardOtherPlayer(client, playerId, bidCard));
    }

    hookStartGameTurn(/* client, gameContext */) {}
    hookFinishGameTurn(/* client, gameContext */) {}
    hookFinishGame(/* client, gameContext */) {}
    hookPostFinishGame(/* client */) {}
    hookBidCardOtherPlayer(/* client, playerId, bidCard */) {}
}

class Sleep extends Unknown {
    hookStart(/* client */) {}
    hookStop(/* client */) {}

    hookReceiveMessage(/* client, message */) {}
    hookCloseSocket(/* client */) {}
    hookError(/* client, error */) {}

    hookUpdateSessionPlayers(/* client, session, players, removePlayerIds */) {}
    hookStartGame(/* client, gameContext */) {}

    hookStartGameTurn(/* client, gameContext */) {}
    hookFinishGameTurn(/* client, gameContext */) {}
    hookFinishGame(/* client, gameContext */) {}
    hookPostFinishGame(/* client */) {}
    hookBidCardOtherPlayer(/* client, playerId, bidCard */) {}
}

class ConnectedBase extends Sleep {
    hookCloseSocket(client) {
        console.log(`socket closed : ${client.getIdTextForLog()}`);
        client.removeAllEventListener();
        client.remove();
    }
    hookReceiveMessage(client, message) {
        console.log(`error : ${client.getIdTextForLog()} : unknown message received`, message);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.invalidMessage));
        client.websocket.close();
        client.remove();
    }
    hookError(client, error) {
        console.log(`error : ${client.getIdTextForLog()}`, error);
        client.removeAllEventListener();
        client.websocket.close();
        client.remove();
    }

    hookStartGame(client /*, gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid start game`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        client.websocket.close();
        client.remove();
    }

    hookStartGameTurn(client /*, gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid start game turn`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        client.websocket.close();
        client.remove();
    }
    hookFinishGameTurn(client /*, gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid finish game turn`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        client.websocket.close();
        client.remove();
    }
    hookFinishGame(client /*, gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid finish game`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        client.websocket.close();
        client.remove();
    }
    hookPostFinishGame(/* client */) {}
    hookBidCardOtherPlayer(/* client, playerId, bidCard */) {}
}

class WaitSignIn extends ConnectedBase {
    hookStart(client) {
        client.sendMessage(new Message.Hello());
    }
    hookReceiveMessage(client, message) {
        const msg = Message.parseMessage(message);
        if (!msg || !(msg instanceof Message.RequestSignIn)) {
            super.hookReceiveMessage(client, message);
            return;
        }
        client.setPlayerName(msg.playerName);
        client.sendMessage(new Message.ResponseSignIn(msg.requestId));
        console.log(`client signin : ${client.getIdTextForLog()}`);
        client.changeState(new SignInedIdle());
    }
}

class SignInedIdle extends ConnectedBase {
    hookReceiveMessage(client, message) {
        const msg = Message.parseMessage(message);
        if (!msg || !(msg instanceof Message.Matching.RequestJoin)) {
            super.hookReceiveMessage(client, message);
            return;
        }
        console.log(`client request join session : ${client.getIdTextForLog()}`);
        client.changeState(new Matching.CreateOrJoinSession(msg.requestId));
    }
}

class InSessionBase extends ConnectedBase {
    constructor(sessionPlayer) {
        super();
        this._sessionPlayer = sessionPlayer;
    }

    get sessionPlayer() {
        return this._sessionPlayer;
    }

    hookCloseSocket(client) {
        console.log(`socket closed : ${client.getIdTextForLog()}`);
        client.removeAllEventListener();
        this.sessionPlayer.remove();
        client.remove();
    }
    hookReceiveMessage(client, message) {
        console.log(`error : ${client.getIdTextForLog()} : unknown message received`, message);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.invalidMessage));
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }
    hookError(client, error) {
        console.log(`error : ${client.getIdTextForLog()}`, error);
        client.removeAllEventListener();
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }
    hookStartGame(client, /* gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid start game`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }

    hookUpdateSessionPlayers(client, session, players /*, removePlayerIds*/) {
        client.sendMessage(new Message.Matching.UpdatePlayers(Matching.getMessagePlayerInfos(client, session, players)));
    }

    hookStartGameTurn(client, /* gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid start game turn`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }
    hookFinishGameTurn(client, /* gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid finish game turn`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }
    hookFinishGame(client, /* gameContext */) {
        console.log(`error : ${client.getIdTextForLog()} : invalid finish game`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }
    hookPostFinishGame(/* client */) {}
    hookBidCardOtherPlayer(/* client, playerId, bidCard */) {}
}

const Matching = {};

Matching.getMessagePlayerInfos = function (client, session, sessionPlayers) {
    const selfPlayer = session.findPlayerByClient(client);
    const selfPlayerId = selfPlayer ? selfPlayer.id : null;
    return sessionPlayers.map(p => new Message.Matching.PlayerInfo(p.id, p.playerName, p.id === selfPlayerId));
}

Matching.CreateOrJoinSession = class extends ConnectedBase {
    constructor(joinRequestId) {
        super();
        this._joinReqId = joinRequestId;
    }

    get joinRequestId() {
        return this._joinReqId;
    }

    hookStart(client) {
        const session = sessionManager.createOrJoinSession(client); // 問題がなければこの中からhookUpdateSessionPlayersが呼ばれるので、必要な処理はそちらで行います
        if (!session) {
            // 現状ここに来るのは既にセッションが開始されてしまっている時
            client.sendMessage(new Message.Matching.ResponseJoin(this.joinRequestId, false, []));
            console.log(`client session already closed : ${client.getIdTextForLog()}`);
            client.changeState(new SignInedIdle());
            return;
        }
    }
    hookUpdateSessionPlayers(client, session, players /*, removePlayerIds */) {
        const selfPlayer = session.findPlayerByClient(client); // 必ず取得できるはず
        console.log(`client session joined : ${client.getIdTextForLog()}`);
        client.changeState(new Matching.WaitPlayerReady(selfPlayer));
        // プレイヤーを所持した状態での各種ハンドリングを次のステートに移譲したいので、あえてchangeStateした後にこの処理を行います
        client.sendMessage(new Message.Matching.ResponseJoin(this.joinRequestId, true, Matching.getMessagePlayerInfos(client, session, players)));
    }
}

Matching.WaitPlayerReady = class extends InSessionBase {
    hookReceiveMessage(client, message) {
        const msg = Message.parseMessage(message);
        if (!msg || !(msg instanceof Message.Matching.RequestReadyGame)) {
            super.hookReceiveMessage(client, message);
            return;
        }
        client.sendMessage(new Message.Matching.ResponseReadyGame(msg.requestId));
        console.log(`client game ready : ${client.getIdTextForLog()}`);
        const player = this.sessionPlayer;
        client.changeState(new Matching.WaitGameStart(player));
        // ゲーム開始のハンドリングを次のステートに移譲したいので、あえてchangeStateした後にこの処理を行います
        player.readyGame();
    }
}

Matching.WaitGameStart = class extends InSessionBase {
    hookStartGame(client, gameContext) {
        client.changeState(new Game.StartGame(this.sessionPlayer, gameContext));
    }
}

const Game = {};

Game.InGameBase = class extends InSessionBase {
    finishByServerBug(client) {
        console.error(`error : server bug : ${client.getIdTextForLog()}`);
        client.removeAllEventListener();
        client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }

    hookUpdateSessionPlayers(client, session, players, removePlayerIds) {
        // ゲーム中はプレイヤーが追加されることはなく、削除のみが行われる前提
        for (const playerId of removePlayerIds) {
            client.sendMessage(new Message.Game.LeavePlayer(playerId));
        }
    }
    hookFinishGame(client, /* gameContext */) {
        // 他プレイヤー離脱により、ゲームはいつでも終了する可能性があります
        client.changeState(new Game.FinishGame(this.sessionPlayer));
    }

    getGameObject(client) {
        const gameObject = this.sessionPlayer.getGameObject();
        if (!gameObject) { // ここに来ることはないはずですが、念のためのチェック
            console.error(`error : not found game object : ${client.getIdTextForLog()}`);
            this.finishByServerBug(client);
            return null;
        }
        return gameObject;
    }

    createGameInfo(client, gameContext = null) {
        if (!gameContext) {
            const gameObject = this.getGameObject(client);
            if (!gameObject) return null;
            gameContext = gameObject.gameContext;
        }
        const player = this.sessionPlayer;
        const gameInfo = createGameInfo(client, player, gameContext);
        if (!gameInfo) { // ここに来ることはないはずですが、念のためのチェック
            console.error(`error : create game info failed : ${client.getIdTextForLog()}`);
            player.setGameObject(null);
            this.finishByServerBug();
            return null;
        }
        return gameInfo;
    }

    supportHookBidCardOtherPlayer(client, playerId /*, bidCard*/) {
        const gameObject = this.sessionPlayer.getGameObject();
        if (!gameObject) return;
        const gameContext = gameObject.gameContext;
        client.sendMessage(new Message.Game.UpdatePlayerBidStatus(gameContext.turnNum, playerId));
    }
}

Game.StartGame = class extends Game.InGameBase {
    constructor(sessionPlayer, gameContext) {
        super(sessionPlayer);
        this._gameContext = gameContext;
    }

    get gameContext() {
        return this._gameContext;
    }

    hookStart(client) {
        const player = this.sessionPlayer;
        const gameContext = this.gameContext;
        const gameObject = new SessionPlayerGameObject(gameContext, player);
        if (!gameObject.player) { // ここに来ることはないはずですが、念のためのチェック
            console.error(`error : start game : not found player in game object : ${client.getIdTextForLog()}`);
            player.setGameObject(null);
            this.finishByServerBug(client);
            return;
        }
        player.setGameObject(gameObject);

        const gameInfo = this.createGameInfo(client, gameContext);
        if (!gameInfo) return;
        console.log(`game start : ${client.getIdTextForLog()}`);
        client.changeState(new Game.Bidding(player)); // ゲーム開始時はターン開始を兼ねるため、ゲーム開始ステートには移行しません
    }
}

Game.StartTurn = class extends Game.InGameBase {
    hookStart(client) {
        const gameInfo = this.createGameInfo(client);
        if (!gameInfo) return;
        client.sendMessage(new Message.Game.StartTurn(gameInfo));
        console.log(`start game turn : ${gameInfo.turnNum} : ${client.getIdTextForLog()}`);
        client.changeState(new Game.Bidding(this.sessionPlayer));
    }
}

Game.Bidding = class extends Game.InGameBase {
    hookReceiveMessage(client, message) {
        const msg = Message.parseMessage(message);
        if (!msg || !(msg instanceof Message.Game.RequestBid)) {
            super.hookReceiveMessage(client, message);
            return;
        }
        const gameObject = this.getGameObject();
        if (!gameObject) return;
        const gameContext = gameObject.gameContext;
        if (msg.getTurnNum() !== gameContext.turnNum) {
            super.hookReceiveMessage(client, message);
            return;
        }
        const gamePlayer = gameObject.player;
        let resResult;
        if (msg.getTurnNum() !== gameObject.gameContext.turnNum) {
            resResult = Message.Game.ResponseBid.ResultCode.invalidTurnNum;
        } else if (gamePlayer.bidCard === null) {
            resResult = gamePlayer.getCardIndex(msg.getBidCard()) >= 0 ? Message.Game.ResponseBid.ResultCode.success : Message.Game.ResponseBid.ResultCode.invalidBidCard;
        } else {
            resResult = Message.Game.ResponseBid.ResultCode.alreadyBid;
        }
        client.sendMessage(new Message.Game.ResponseBid(msg.requestId, resResult));
        if (resResult < 0) return;
        client.changeState(new Game.WaitBiddingFinish(this.sessionPlayer, msg.getBidCard()));
    }

    hookBidCardOtherPlayer(client, playerId, bidCard) {
        this.supportHookBidCardOtherPlayer(client, playerId, bidCard);
    }
}

Game.WaitBiddingFinish = class extends Game.InGameBase {
    constructor(sessionPlayer, bidCard) {
        super(sessionPlayer);
        this._bidCard = bidCard;
    }

    get bidCard() {
        return this._bidCard;
    }

    hookStart(client) {
        const gameObject = this.getGameObject();
        if (!gameObject) return;
        const gamePlayer = gameObject.player;
        const bidCard = this.bidCard;
        if (!gamePlayer.moveToBid(gamePlayer.getCardIndex(bidCard))) {
            // ここに来ることはないはず
            console.error(`error : wait bidding finish : can't move to bid : ${client.getIdTextForLog()}`);
            this.sessionPlayer.setGameObject(null);
            this.finishByServerBug(client);
            return;
        }
        const sessionPlayer = this.sessionPlayer;
        const session = sessionPlayer.session;
        const selfId = sessionPlayer.id;
        for (const player of session.getPlayers().filter(p => p.id !== selfId)) {
            player.bidCardOtherPlayer(selfId, bidCard);
        }
        session.updateGameProgress();
    }
    hookFinishGameTurn(client, /* gameContext */) {
        client.changeState(new Game.FinishTurn(this.sessionPlayer));
    }

    hookBidCardOtherPlayer(client, playerId, bidCard) {
        this.supportHookBidCardOtherPlayer(client, playerId, bidCard);
    }
}

Game.FinishTurn = class extends Game.InGameBase {
    hookStart(client) {
        const gameInfo = this.createGameInfo(client);
        if (!gameInfo) return;
        console.log(`finish game turn : ${gameInfo.turnNum} : ${client.getIdTextForLog()}`);
        client.sendMessage(new Message.Game.FinishTurn(gameInfo));
    }
    hookStartGameTurn(client /*, gameContext*/) {
        client.changeState(new Game.StartTurn(this.sessionPlayer));
    }
}

Game.FinishGame = class extends Sleep {
    constructor(sessionPlayer) {
        super();
        this._sessionPlayer = sessionPlayer;
    }

    get sessionPlayer() {
        return this._sessionPlayer;
    }

    hookStart(client) {
        const player = this.sessionPlayer;
        const gameObject = this.sessionPlayer.getGameObject();
        if (!gameObject) {
            console.error(`error : server bug : not found game object : ${client.getIdTextForLog()}`);
            client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
            // 後処理はhostPostFinishGameに任せます
            return;
        }
        const gameContext = gameObject.gameContext;
        if (!gameContext) {
            console.error(`error : server bug : not found game context : ${client.getIdTextForLog()}`);
            client.sendMessage(new Message.Error(Message.ErrorId.serverBug));
            // 後処理はhostPostFinishGameに任せます
            return;
        }
        const gameInfo = createGameInfo(client, player, gameContext);
        if (!gameInfo) return;
        console.log(`finish game : ${gameInfo.turnNum} : ${client.getIdTextForLog()}`);
        client.sendMessage(new Message.Game.FinishGame(gameInfo));
    }
    hookPostFinishGame(client) {
        client.removeAllEventListener();
        this.sessionPlayer.remove();
        client.websocket.close();
        client.remove();
    }
}


module.exports = {
    Unknown: Unknown,
    Sleep: Sleep,
    ConnectedBase: ConnectedBase,
    WaitSignIn: WaitSignIn,
    SignInedIdle: SignInedIdle,
    InSessionBase: InSessionBase,
    Matching: Matching,
    Game: Game,
};
