/* eslint no-process-exit: 0 */

const dotenv = require('dotenv');
dotenv.config();

async function main() {
    const env = process.env;
    const wsHost = env.WS_HOST || undefined;
    const wsPort = env.WS_PORT || 4000;
    const webSocket = require('ws');
    const ClientManager = require('./client_manager').ClientManager;
    const clientManager = new ClientManager();
    require('./session_manager'); // セッションマネージャーを明示的に作成するためにrequireします

    const wss = new webSocket.Server({ host: wsHost, port: wsPort });
    wss.addListener('connection', (ws, req) => {
        const socket = req.socket;
        const remoteAddress = socket.remoteAddress;
        const remotePort = socket.remotePort;
        const client = clientManager.addClient(remoteAddress, remotePort, ws);
        client.run();
    });
}

main().catch((e) => {
    console.error((e && e.stack) || e);
    process.exit(1);
});
