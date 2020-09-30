const Client = require('./client').Client;

class ClientManager {
    constructor() {
        this._clients = [];
        this._clientMap = new Map();
    }

    getClients() {
        return this._clients;
    }
    getClientCount() {
        return this._clients.length;
    }

    findClient(address, port) {
        const client = this._clientMap.get(Client.createKeyString(address, port));
        return client ? client : null;
    }
    addClient(address, port, websocket) {
        console.log(`connect client from ${address}:${port}`);
        const existClient = this.findClient(address, port);
        if (existClient) {
            console.log("-- existed client");
            return existClient;
        }
        const client = new Client(this, address, port, websocket);
        this._clients.push(client);
        this._clientMap.set(client.key(), client);
        return client;
    }
    removeClient(client) {
        const clientMap = this._clientMap;
        const clientKey = client.key();
        if (!clientMap.get(clientKey)) return;
        const clients = this._clients;
        const idx = clients.findIndex(v => v.key() === clientKey);
        if (idx >= 0) {
            clients.splice(idx, 1);
        }
        clientMap.delete(clientKey);

        if (idx >= 0) {
            client.removeFromClientManager();
            console.log(`remove client: ${client.address}:${client.port}`);
        }
    }
}

module.exports = {
    ClientManager: ClientManager,
};
