const crypto = require('crypto');
const Player = require('./session_player').SessionPlayer;
const GameContext = require('./game_context').GameContext;

const issueIndex = (function () {
    let idx = 0;
    return function () {
        let v = idx + 1
        if (v >= 0x100000) {
            v = 0;
        }
        idx = v;
        return v;
    };
})();

class Session {
    constructor(sessionManager, initClient) {
        const hash = crypto.createHash('sha256');
        this._id = hash.update(`${Date.now()}_${issueIndex()}`).digest('hex');
        this._sessionManager = sessionManager;
        const initPlayer = new Player(this, initClient);
        const players = this._players = [initPlayer];
        this._playerMap = new Map([[initPlayer.id, initPlayer]]);
        this._clientMap = new Map([[initClient.key(), initPlayer]]);
        this._allowJoin = true;
        this._gameContext = null;
        initPlayer.updateSessionPlayers(players, []);
    }

    remove() {
        this._sessionManager.removeSession(this.id);
    }
    removeFromSessionManager() {
        this._playerMap.clear();
        this._clientMap.clear();
        for (const player of this.getPlayers()) {
            player.removeFromSession();
        }
    }

    get id() {
        return this._id;
    }

    getPlayers() {
        return this._players;
    }

    isAllowJoin() {
        return this._allowJoin;
    }

    findPlayerByClient(client) {
        return this._clientMap.get(client.key());
    }
    isExistsPlayerByClient(client) {
        return this._clientMap.has(client.key());
    }
    findPlayer(id) {
        return this._playerMap.get(id);
    }
    isExistsPlayer(id) {
        return this._playerMap.has(id);
    }

    static getPlayerNameFromClient(client) {
        let playerName = client.getPlayerName();
        if (!playerName || (playerName.length <= 0)) {
            console.warn(`session : get player name from client : no player name : ${client.getIdTextForLog()}`);
            playerName = `player_${Math.floor(Math.random() * 1000)}`;
        }
        return playerName;
    }

    addPlayer(client) {
        if (!this.isAllowJoin()) return null;
        const existsPlayer = this.findPlayerByClient(client);
        if (existsPlayer) return existsPlayer;
        const player = new Player(this, client);
        const players = this.getPlayers();
        players.push(player);
        this._playerMap.set(player.id, player);
        this._clientMap.set(client.key(), player);
        const gameContext = this.gameContext;
        if (gameContext) {
            gameContext.addPlayer(player.id, Session.getPlayerNameFromClient(client));
        }
        for (const p of players) {
            p.updateSessionPlayers(players, []);
        }
        return player;
    }
    removePlayer(player) {
        const exists = this.isExistsPlayer(player.id);
        if (!exists) return;
        const players = this.getPlayers();
        const removePlayerId = player.id;
        const idx = players.findIndex(v => v.id === removePlayerId);
        if (idx >= 0) {
            const gameContext = this.gameContext;
            let finishGame = false;
            if (gameContext) {
                gameContext.removePlayer(player.id);
                if (gameContext.players.length === 1) { // ゲーム途中でプレイヤーが1人になった場合、残ったプレイヤーを勝者としてゲーム終了します
                    finishGame = true;
                }
            }
            players.splice(idx, 1);
            this._playerMap.delete(player.id);
            this._clientMap.delete(player.client.key());
            player.removeFromSession();
            const pinPlayers = [...players]; // プレイヤーのメソッド内から再帰的にremovePlayerが呼ばれる可能性があるため
            for (const p of pinPlayers) {
                p.updateSessionPlayers(pinPlayers, [removePlayerId]);
                if (finishGame) {
                    p.finishGame(gameContext);
                }
            }
            if (finishGame) {
                for (const p of pinPlayers) {
                    p.postFinishGame();
                }
            }
            if (!this.isAllowJoin() && (pinPlayers.length <= 0)) { // 参加できないセッションにプレイヤーが居なくなったらセッションを削除します
                this.remove();
            }
        }
    }

    updateReadyGameStatus() {
        const players = this.getPlayers();
        const playerCount = players.length;
        if (playerCount < 2) return;
        const readyPlayerCount = players.reduce((acc, cur) => acc + (cur.isReadyGame() ? 1 : 0), 0);
        if (readyPlayerCount < playerCount) return;
        this._allowJoin = false;
        let gameContext = this.gameContext;
        if (!gameContext) {
            gameContext = this.createGameContext();
            for (const player of players) {
                gameContext.addPlayer(player.id, Session.getPlayerNameFromClient(player.client));
            }
        }
        for (const player of players) {
            player.startGame(gameContext);
        }
    }

    get gameContext() {
        return this._gameContext;
    }
    createGameContext() {
        if (this.gameContext) return null;
        const context = new GameContext();
        this._gameContext = context;
        return context;
    }
    removeGameContext() {
        this._gameContext = null;
    }

    updateGameProgress() {
        const gameContext = this.gameContext;
        if ((!gameContext) || gameContext.isFinish() || !gameContext.checkAllPlayersBidFinish()) return;
        gameContext.openPlayersBidCard();
        const players = this.getPlayers();
        for (const p of players) {
            p.finishGameTurn(gameContext);
        }
        if (!gameContext.changeToNextTurn()) {
            // ここには来ないはず
            console.error("error : session : can't change game turn");
            this.removeGameContext();
            const error = new Error("can't change game turn")
            for (const p of players) {
                p.client.error(error);
            }
            this.remove();
            return;
        }
        if (!gameContext.isFinish()) {
            for (const p of players) {
                p.startGameTurn(gameContext);
            }
            return;
        }
        this.removeGameContext(); // 前もって削除しておかないとプレイヤー削除処理内でゲーム進行関連の処理が走ってしまう
        const pinPlayers = [...players]; // プレイヤーリストが書き換わる可能性があるため
        for (const p of pinPlayers) {
            p.finishGame(gameContext);
        }
        for (const p of pinPlayers) {
            p.postFinishGame();
        }
        this.remove();
    }
}

module.exports = {
    Session: Session,
}
