const Session = require('./session').Session;

class SessionManager {
    constructor() {
        this._session = null; // 現在はセッションは1つだけを取り扱います
    }

    createSession(initClient) {
        if (this._session) return null;
        const session = new Session(this, initClient);
        this._session = session;
        console.log(`create session : ${session.id}`);
        return session;
    }
    joinSession(sessionId, client) {
        const session = this._session;
        if (!session || (session.id !== sessionId)) return null;
        const player = session.addPlayer(client);
        return player ? session : null;
    }
    createOrJoinSession(client) {
        const curSession = this._session;
        return curSession ? this.joinSession(curSession.id, client) : this.createSession(client);
    }
    removeSession(sessionId) {
        const curSession = this._session;
        if (curSession && (curSession.id === sessionId)) {
            this._session = null;
            curSession.removeFromSessionManager();
            console.log(`remove session : ${sessionId}`);
        }
    }
}

const sessionManager = new SessionManager();

module.exports = {
    getInstance: function () { return sessionManager; },
}
