/* eslint n/no-process-exit: 0 */

import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { ClientManager } from './client_manager.js';
import './session_manager.js'; // セッションマネージャーを明示的に作成するためにimportします

dotenv.config();

async function main() {
    const env = process.env;
    const wsHost = env.WS_HOST || undefined;
    const wsPort = env.WS_PORT || 4000;
    const clientManager = new ClientManager();

    const wss = new WebSocketServer({ host: wsHost, port: wsPort });
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
