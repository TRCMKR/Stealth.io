const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const { version } = require('../package.json');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let playerCounter = 0;

const players = {};

io.on("connection", (socket) => {
    console.log("User connected: " + socket.id);

    socket.emit('version', version);

    socket.on("startGame", (playerName) => {
        players[socket.id] = { x: 400, y: 300, rotation: 0, name: playerName, team: playerCounter % 2 };
        console.log(`Player ${playerName} team ${playerCounter % 2} started `, players[socket.id].x, players[socket.id].y);
        socket.emit('join', players[socket.id]);
        socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

        playerCounter++;
    });

    // Send all current players to the newly connected client
    socket.on("requestCurrentPlayers", () => {
        socket.emit("currentPlayers", players);
    });

    socket.on("playerMovement", (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit("playerMoved", { id: socket.id, ...players[socket.id] });
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: " + socket.id);
        delete players[socket.id];
        io.emit("playerDisconnected", socket.id);
    });
});

app.use(express.static("client"));

server.listen(3000, '0.0.0.0', () => {
    console.log("Listening on *:3000");
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});