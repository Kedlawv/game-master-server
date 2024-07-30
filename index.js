const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(bodyParser.json());
app.use(cors());

let connectedUsers = {};
let gameMasterSocketId = null;

// Middleware to log all incoming and outgoing messages
io.use((socket, next) => {
    const emit = socket.emit;
    socket.emit = function (...args) {
        console.log('Emitting event:', args);
        emit.apply(socket, args);
    };
    next();
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('message', (msg) => {
        console.log('Message received: ' + msg);
    });

    socket.on('identify', (data) => {
        connectedUsers[socket.id] = data;
        console.log('User identified:', data);
    });

    socket.on("registerGameMaster", () => {
       gameMasterSocketId = socket.id;
       console.log('Game Master registered with id:', gameMasterSocketId);
    });

    socket.on('new-player', (playerJson) => {
        const player = JSON.parse(playerJson);
        console.log('Received new-player event:' + JSON.stringify(player, null, 2))

        if(gameMasterSocketId) {
            console.log("Emitting new-player event to Game Master");
            socket.to(gameMasterSocketId).emit('new-player', player);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected' + connectedUsers[socket.id]);
    });
});

server.listen(8080, () => {
    console.log('Server running at http://localhost:8080/');
});
