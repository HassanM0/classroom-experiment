const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Game State Management
const rooms = new Map();

function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Network Generation Helpers
function generateNetwork(players, type) {
    const n = players.length;
    players.forEach(p => p.neighbors = []);

    if (n <= 1) return;

    if (type === 'fully_connected') {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) players[i].neighbors.push(players[j].id);
            }
        }
    } else if (type === 'circle') {
        for (let i = 0; i < n; i++) {
            players[i].neighbors.push(players[(i + 1) % n].id);
            players[i].neighbors.push(players[(i - 1 + n) % n].id);
        }
    } else if (type === 'line') {
        for (let i = 0; i < n; i++) {
            if (i > 0) players[i].neighbors.push(players[i - 1].id);
            if (i < n - 1) players[i].neighbors.push(players[i + 1].id);
        }
    } else {
        // Random graph / fallback Sparse
        // Simplified Erdos-Renyi style with prob 0.4
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.random() > 0.6) {
                    players[i].neighbors.push(players[j].id);
                    players[j].neighbors.push(players[i].id);
                }
            }
        }
        // Ensure connectivity (naive path)
        for (let i = 0; i < n - 1; i++) {
            if (!players[i].neighbors.includes(players[i + 1].id)) {
                players[i].neighbors.push(players[i + 1].id);
                players[i + 1].neighbors.push(players[i].id);
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // ======== HOST ACTIONS ========
    socket.on('create_room', (params, callback) => {
        const roomCode = generateRoomCode();
        // default missing params securely
        let r_params = {
            theta: Number(params.theta) || 50,
            bias: Number(params.bias) || 8,
            alpha: Number(params.alpha) || 0.4,
            totalRounds: Number(params.totalRounds) || 6,
            timerDuration: Number(params.timerDuration) || 60,
            networkType: params.networkType || 'circle',
            advocateRatio: Number(params.advocateRatio) || 0.3
        };

        const room = {
            code: roomCode,
            hostId: socket.id,
            params: r_params,
            players: new Map(), // socketId -> playerObj
            gameState: 'LOBBY', // LOBBY, PLAYING, ROUND_END, GAME_END
            currentRound: 0,
            messagesThisRound: new Map(), // socketId -> message
            history: [] // [{ round, states: [...] }]
        };

        rooms.set(roomCode, room);
        socket.join(roomCode);

        console.log(`Room created: ${roomCode} by host ${socket.id}`);
        callback({ success: true, roomCode: roomCode, params: r_params });
        io.to(socket.id).emit('host_update', getHostState(room));
    });

    socket.on('start_game', (roomCode, callback) => {
        const room = rooms.get(roomCode);
        if (!room || room.hostId !== socket.id) {
            return callback?.({ success: false, message: 'Not authorized or room not found' });
        }

        if (room.players.size < 2) {
            return callback?.({ success: false, message: 'Need at least 2 players to start' });
        }

        room.gameState = 'PLAYING';
        room.currentRound = 1;
        room.history = [];

        // Assign roles and setup opinions
        let playerArray = Array.from(room.players.values());

        // Target number of advocates
        let numAdvocates = Math.round(playerArray.length * room.params.advocateRatio);
        // Shuffle to randomize advocates
        playerArray.sort(() => Math.random() - 0.5);

        for (let i = 0; i < playerArray.length; i++) {
            let p = playerArray[i];
            p.role = i < numAdvocates ? 'Advocate' : 'Truth-Seeker';
            p.currentOpinion = p.role === 'Truth-Seeker' ? 50 : room.params.theta;
            p.history = [{ round: 0, opinion: p.currentOpinion }];
        }

        // Generate network
        generateNetwork(playerArray, room.params.networkType);

        // Notify all players in room about start
        io.to(roomCode).emit('game_started', {
            currentRound: 1,
            totalRounds: room.params.totalRounds
        });

        // Send private state to each player
        playerArray.forEach(p => {
            // advocates need lists of other advocates? (spec: "Advocates can see each other's messages")
            // Here we send role and neighbors
            io.to(p.id).emit('player_state', {
                role: p.role,
                neighbors: p.neighbors,
                currentOpinion: p.currentOpinion,
                theta: room.params.theta, // Only matters for advocate, but client can ignore
                bias: room.params.bias
            });
        });

        // Notify Host
        io.to(room.hostId).emit('host_update', getHostState(room));
        if (callback) callback({ success: true });
    });

    socket.on('next_round', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room || room.hostId !== socket.id) return;

        if (room.gameState === 'ROUND_END') {
            room.currentRound++;

            if (room.currentRound > room.params.totalRounds) {
                room.gameState = 'GAME_END';
                io.to(roomCode).emit('game_ended', { theta: room.params.theta });
            } else {
                room.gameState = 'PLAYING';
                room.messagesThisRound.clear();
                io.to(roomCode).emit('round_started', { currentRound: room.currentRound });
            }
            io.to(room.hostId).emit('host_update', getHostState(room));
        }
    });


    // ======== STUDENT ACTIONS ========
    socket.on('join_room', ({ playerName, roomCode }, callback) => {
        const room = rooms.get(roomCode.toUpperCase());
        if (!room) {
            return callback({ success: false, message: 'Room not found' });
        }
        if (room.gameState !== 'LOBBY') {
            return callback({ success: false, message: 'Game already in progress' });
        }

        const player = {
            id: socket.id,
            name: playerName,
            role: null,
            currentOpinion: null,
            neighbors: [],
            history: [],
            score: null
        };

        room.players.set(socket.id, player);
        socket.join(roomCode.toUpperCase());
        console.log(`${playerName} joined room ${roomCode}`);

        callback({ success: true, roomCode: roomCode.toUpperCase(), player: { id: socket.id, name: playerName } });

        // Update host
        io.to(room.hostId).emit('host_update', getHostState(room));
    });

    socket.on('submit_message', ({ roomCode, message }) => {
        const room = rooms.get(roomCode);
        if (!room || room.gameState !== 'PLAYING') return;

        let val = Number(message);
        if (isNaN(val) || val < 1 || val > 100) return; // Invalid message

        room.messagesThisRound.set(socket.id, val);

        // Tell host someone submitted
        io.to(room.hostId).emit('host_update', getHostState(room));

        // Let player know we got it
        socket.emit('message_received', true);

        // Check if all players have submitted
        if (room.messagesThisRound.size === room.players.size) {
            processRoundEnd(room);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Handle player leaving (could mark as disconnected but keep data if they rejoin)
        rooms.forEach((room, code) => {
            if (room.hostId === socket.id) {
                // Host left, probably want to warn or close room
            } else if (room.players.has(socket.id)) {
                room.players.delete(socket.id); // For now, delete. For robustness, keep in state as inactive.
                io.to(room.hostId).emit('host_update', getHostState(room));
            }
        });
    });
});

function processRoundEnd(room) {
    room.gameState = 'ROUND_END';

    const { alpha, theta, bias } = room.params;
    let avgTruthSeekerOpinionSum = 0;
    let tsCount = 0;

    // Calculate updates for Truth-Seekers
    for (const [id, player] of room.players) {
        if (player.role === 'Truth-Seeker') {
            // Get messages from neighbors
            let neighborMessages = [];
            player.neighbors.forEach(nId => {
                if (room.messagesThisRound.has(nId)) {
                    neighborMessages.push(room.messagesThisRound.get(nId));
                }
            });

            if (neighborMessages.length > 0) {
                const avgMessage = neighborMessages.reduce((a, b) => a + b, 0) / neighborMessages.length;
                player.currentOpinion = (1 - alpha) * player.currentOpinion + alpha * avgMessage;
            }
            avgTruthSeekerOpinionSum += player.currentOpinion;
            tsCount++;
        }
        player.history.push({
            round: room.currentRound,
            opinion: player.currentOpinion,
            sentMessage: room.messagesThisRound.get(id)
        });
    }

    const avgTSOpinion = tsCount > 0 ? avgTruthSeekerOpinionSum / tsCount : 0;

    // Calculate scores if it's the final round
    if (room.currentRound >= room.params.totalRounds) {
        for (const [id, player] of room.players) {
            if (player.role === 'Truth-Seeker') {
                player.score = Math.max(0, 100 - Math.pow(player.currentOpinion - theta, 2));
            } else if (player.role === 'Advocate') {
                player.score = Math.max(0, 100 - Math.pow(avgTSOpinion - (theta + bias), 2));
            }
        }
    }

    // Send round results to players
    for (const [id, player] of room.players) {
        let neighborMessages = [];
        let advocateMessages = [];

        player.neighbors.forEach(nId => {
            if (room.messagesThisRound.has(nId)) neighborMessages.push(room.messagesThisRound.get(nId));
        });

        if (player.role === 'Advocate') {
            for (const [pId, p] of room.players) {
                if (p.role === 'Advocate' && pId !== id) {
                    advocateMessages.push({ from: p.name, msg: room.messagesThisRound.get(pId) });
                }
            }
        }

        io.to(id).emit('round_ended', {
            neighborMessages,
            newOpinion: player.currentOpinion,
            avgTruthSeekerOpinion: avgTSOpinion, // Spec: advocates see avg truth seeker opinion
            advocateMessages,
            score: player.score
        });
    }

    io.to(room.hostId).emit('host_update', getHostState(room));
}

function getHostState(room) {
    const playersObj = {};
    for (const [id, p] of room.players) {
        playersObj[id] = {
            id: p.id,
            name: p.name,
            role: p.role,
            currentOpinion: p.currentOpinion,
            hasSubmitted: room.messagesThisRound.has(id),
            neighbors: p.neighbors,
            score: p.score,
            history: p.history
        };
    }
    return {
        code: room.code,
        gameState: room.gameState,
        currentRound: room.currentRound,
        params: room.params,
        players: playersObj,
    };
}

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
