const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');
const url = require('url');
const firestore = require('./firestore');
const allowedOrigin = 'https://storage.googleapis.com';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(cors());

let connectedUsers = {};
let gameMasterSocket = null;
let firestoreEnabled = false;

// Helper function to send JSON messages
function sendJson(ws, type, data) {
    const message = JSON.stringify({ type, data });
    ws.send(message);
}

wss.on('connection', (ws, request) => {

    const origin = request.headers.origin;

    if (origin !== allowedOrigin) {
        console.log('Connection from disallowed origin:', origin);
        ws.close(1008, "Policy Violation: Disallowed Origin");
        return;
    }

    console.log('A user connected', request.headers);
    console.log('From origin: ', request.headers.origin);

    ws.on('message', async (message) => {
        const { type, data } = JSON.parse(message);
        console.log('Message received:', type, data);

        switch (type) {
            case 'identify':
                connectedUsers[ws._socket.remotePort] = { socket: ws, data };
                console.log('User identified:', data);
                const id_data = JSON.parse(data);
                if (id_data.type === 'GameMaster') {
                    gameMasterSocket = ws;
                    console.log('Game Master registered with id:', ws._socket.remotePort);

                    if(gameMasterSocket) {
                        sendJson(gameMasterSocket, "persistence-status", firestoreEnabled);
                        console.log('Sent persistence status to gm');
                    }
                }
                break;

            case 'new-player':
                const player = JSON.parse(data);
                console.log('Received new-player event:', JSON.stringify(player, null, 2));
                if (gameMasterSocket) {
                    console.log("Emitting new-player event to Game Master");
                    sendJson(gameMasterSocket, 'new-player', player);
                }
                if (firestoreEnabled) {
                    await firestore.addPlayerToFirestore(player);
                }
                break;

            case 'player-score':
                const player_score = JSON.parse(data);
                console.log('Received player-score event:', JSON.stringify(player_score, null, 2));
                if (gameMasterSocket) {
                    console.log("Emitting player-score event to Game Master");
                    sendJson(gameMasterSocket, 'player-score', player_score);
                }
                if (firestoreEnabled) {
                    await firestore.addPlayerToFirestore(player_score);
                }
                break;

            case 'start-game-gm':
                console.log("Emitting start-game event to all clients");
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        sendJson(client, 'start-game', {});
                    }
                });
                break;

            case 'get-current-players':
                console.log('Received get-current-players event');
                let current_players;
                if (firestoreEnabled) {
                    current_players = await firestore.getAllPlayersFromFirestore();
                } else {
                    current_players = {}
                }
                if (gameMasterSocket) {
                    console.log("Emitting current-players event to Game Master");
                    sendJson(gameMasterSocket, 'current-players', current_players);
                }
                break;
            case 'init-new-game':
                console.log("Initialising new game. Clearing player list.");
                const currentPlayers = {};
                if (firestoreEnabled) {
                    await firestore.clearPlayersCollection();
                }
                if (gameMasterSocket) {
                    console.log("Emitting current-players event to Game Master");
                    sendJson(gameMasterSocket, 'current-players', currentPlayers);
                }
                break;

            default:
                console.log('Unknown message type:', type);
                break;
        }
    });

    ws.on('close', () => { // Check if the user was identified and exists in connectedUsers

        if (connectedUsers[ws._socket.remotePort]) {
        const userInfo = JSON.parse(connectedUsers[ws._socket.remotePort].data);
        console.log(`A user disconnected: Type = ${userInfo.type}, ID = ${userInfo.id}`);

        // If the disconnected user is the Game Master, clear the gameMasterSocket
        if (userInfo.type === 'GameMaster') {
            gameMasterSocket = null;
        }
        // Remove the user from connectedUsers
        delete connectedUsers[ws._socket.remotePort];
    } else {
        console.log('A user disconnected, but no user information found.');
    }
    });

});

app.get('/', (req, res) => {
    res.send('WebSocket server is running.');
});

app.get('/firestore!!', (req, res) => {
    firestoreEnabled = !firestoreEnabled;
    res.send(firestoreEnabled);

    if(gameMasterSocket) {
        sendJson(gameMasterSocket, "persistence-status", firestoreEnabled);
    }
});

const PORT = process.env.PORT || 8080;  // Use the PORT environment variable if provided, otherwise default to 8080
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`version: 0.0.3`);
});
