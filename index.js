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

const players = [];

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
    socket.emit('updatePlayers', players);

    socket.on('message', (msg) => {
        console.log('Message received: ' + msg);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

app.post('/api/players', (req, res) => {
    const player = req.body;
    players.push(player);
    console.log("Received a player:", JSON.stringify(player));
    io.emit('new-player', player);
    res.status(201).send(player);
});

server.listen(8080, () => {
    console.log('Server running at http://localhost:8080/');
});
