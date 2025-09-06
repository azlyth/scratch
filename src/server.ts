import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { GameRoom, Player, ClientToServerEvents, ServerToClientEvents } from './types';
import { GameEngine } from './gameEngine';

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Game state
const rooms = new Map<string, GameRoom>();
const playerRooms = new Map<string, string>(); // socketId -> roomId
const gameEngine = new GameEngine();

// Clean up old rooms (older than 2 hours)
setInterval(() => {
  const now = new Date();
  for (const [roomId, room] of rooms.entries()) {
    const hoursSinceCreation = (now.getTime() - room.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 2) {
      rooms.delete(roomId);
      console.log(`Cleaned up old room: ${roomId}`);
    }
  }
}, 30 * 60 * 1000); // Check every 30 minutes

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('createRoom', (playerName, callback) => {
    try {
      const roomId = uuidv4().substring(0, 8).toUpperCase();
      const player: Player = {
        id: socket.id,
        name: playerName,
        color: 'red',
        units: 30
      };

      const room: GameRoom = {
        id: roomId,
        players: [player],
        map: null,
        currentTurn: null,
        gameState: 'waiting',
        winner: null,
        createdAt: new Date()
      };

      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`Room created: ${roomId} by ${playerName}`);
      callback(roomId);

      // Send room update to all players in room
      io.to(roomId).emit('roomUpdate', {
        id: room.id,
        players: room.players,
        gameState: room.gameState
      });
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', 'Failed to create room');
    }
  });

  socket.on('joinRoom', (roomId, playerName, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        callback(false, 'Room not found');
        return;
      }

      if (room.players.length >= 2) {
        callback(false, 'Room is full');
        return;
      }

      if (room.gameState !== 'waiting') {
        callback(false, 'Game already started');
        return;
      }

      const player: Player = {
        id: socket.id,
        name: playerName,
        color: 'blue',
        units: 30
      };

      room.players.push(player);
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`${playerName} joined room: ${roomId}`);
      callback(true);

      // Notify all players in room
      io.to(roomId).emit('playerJoined', player);
      io.to(roomId).emit('roomUpdate', {
        id: room.id,
        players: room.players,
        gameState: room.gameState
      });

      // Auto-start game when 2 players join
      if (room.players.length === 2) {
        setTimeout(() => {
          startGame(roomId);
        }, 1000); // Small delay for better UX
      }
    } catch (error) {
      console.error('Error joining room:', error);
      callback(false, 'Failed to join room');
    }
  });

  socket.on('startGame', () => {
    try {
      const roomId = playerRooms.get(socket.id);
      if (roomId) {
        startGame(roomId);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', 'Failed to start game');
    }
  });

  socket.on('makeMove', (action, callback) => {
    try {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) {
        callback(false, 'Not in a room');
        return;
      }

      const room = rooms.get(roomId);
      if (!room || room.gameState !== 'playing') {
        callback(false, 'Game not in progress');
        return;
      }

      const result = gameEngine.executeMove(room, socket.id, action);
      if (!result.success) {
        callback(false, 'Invalid move');
        return;
      }

      callback(true);

      // Check for game end
      const gameEnd = gameEngine.checkGameEnd(room);
      if (gameEnd.ended) {
        room.gameState = 'finished';
        room.winner = gameEnd.winner?.id || null;
        io.to(roomId).emit('gameEnded', gameEnd.winner!);
      }

      // Send game update to all players
      io.to(roomId).emit('gameUpdate', {
        map: room.map,
        currentTurn: room.currentTurn,
        gameState: room.gameState,
        battleResult: result.battleResult
      });

    } catch (error) {
      console.error('Error making move:', error);
      callback(false, 'Move failed');
    }
  });

  socket.on('endTurn', () => {
    try {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || room.gameState !== 'playing' || room.currentTurn !== socket.id) {
        return;
      }

      // Switch to next player
      room.currentTurn = gameEngine.getNextPlayer(room);
      
      io.to(roomId).emit('turnChanged', room.currentTurn);
      io.to(roomId).emit('gameUpdate', {
        currentTurn: room.currentTurn
      });
    } catch (error) {
      console.error('Error ending turn:', error);
    }
  });

  socket.on('resign', () => {
    try {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || room.gameState !== 'playing') return;

      // Find the other player as winner
      const winner = room.players.find(p => p.id !== socket.id);
      if (winner) {
        room.gameState = 'finished';
        room.winner = winner.id;
        io.to(roomId).emit('gameEnded', winner);
      }
    } catch (error) {
      console.error('Error resigning:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        // Remove player from room
        room.players = room.players.filter(p => p.id !== socket.id);
        
        if (room.players.length === 0) {
          // Delete empty room
          rooms.delete(roomId);
          console.log(`Deleted empty room: ${roomId}`);
        } else {
          // Notify remaining players
          io.to(roomId).emit('roomUpdate', {
            players: room.players,
            gameState: 'finished' // End game if player leaves
          });
        }
      }
      playerRooms.delete(socket.id);
    }
  });
});

function startGame(roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.players.length !== 2) return;

  try {
    gameEngine.initializeGame(room);
    console.log(`Game started in room: ${roomId}`);
    
    io.to(roomId).emit('gameStarted', room);
    io.to(roomId).emit('gameUpdate', {
      map: room.map,
      currentTurn: room.currentTurn,
      gameState: room.gameState
    });
  } catch (error) {
    console.error('Error starting game:', error);
    io.to(roomId).emit('error', 'Failed to start game');
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Conquest game server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to play the game`);
});