const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(cors());

let connectedUsers = {};
let gameMasterSocket = null;
let currentPlayers = {};

// Helper function to send JSON messages
function sendJson(socket, type, data) {
    const message = JSON.stringify({ type, data });
    socket.send(message);
}

wss.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('message', (message) => {
        const { type, data } = JSON.parse(message);
        console.log('Message received:', type, data);

        switch (type) {
            case 'identify':
                connectedUsers[socket._socket.remotePort] = { socket, data };
                console.log('User identified:', data);
                const id_data = JSON.parse(data);
                if (id_data.type === 'GameMaster') {
                    gameMasterSocket = socket;
                    console.log('Game Master registered with id:', socket._socket.remotePort);
                }
                break;

            case 'new-player':
                const player = JSON.parse(data);
                currentPlayers[player.id] = player;
                console.log('Received new-player event:', JSON.stringify(player, null, 2));
                if (gameMasterSocket) {
                    console.log("Emitting new-player event to Game Master");
                    sendJson(gameMasterSocket, 'new-player', player);
                }
                break;

            case 'player-score':
                const player_score = JSON.parse(data);
                console.log('Received player-score event:', JSON.stringify(player_score, null, 2));
                if (gameMasterSocket) {
                    console.log("Emitting player-score event to Game Master");
                    sendJson(gameMasterSocket, 'player-score', player_score);
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
                if (gameMasterSocket) {
                    console.log("Emitting current-players event to Game Master");
                    sendJson(gameMasterSocket, 'current-players', currentPlayers);
                }
                break;
            case 'init-new-game':
                console.log("Initialising new game. Clearing player list.");
                currentPlayers = {};
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

    socket.on('close', () => {
        const userInfo = JSON.parse(connectedUsers[socket._socket.remotePort].data);
        if (userInfo) {
            console.log(`A user disconnected: Type = ${userInfo.type}, ID = ${userInfo.id}`);
            if (userInfo.type === 'GameMaster') {
                gameMasterSocket = null;
            }
            delete connectedUsers[socket._socket.remotePort];
        } else {
            console.log('A user disconnected, but no user information found.');
        }
    });

});

server.listen(8080, () => {
    console.log('Server running at http://localhost:8080/');
});
