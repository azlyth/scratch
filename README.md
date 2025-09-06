# Conquest - Browser Strategy Game

A real-time multiplayer browser-based strategy game inspired by Risk, built with TypeScript, Node.js, Socket.IO, and Phaser.

## Features

- **Real-time Multiplayer**: Two players can play simultaneously using WebSockets
- **Random Map Generation**: Each game generates a unique map with territories and connections
- **Turn-based Strategy**: Players take turns attacking and moving units
- **Territory Control**: Win by conquering all territories or forcing opponent resignation
- **Modern UI**: Clean, responsive interface with visual feedback

## How to Play

### Starting a Game

1. **Create Game**: Enter your name and click "Create New Game"
   - You'll get a room code to share with your opponent
   - Wait for another player to join

2. **Join Game**: Enter your name, click "Join Game", and input the room code

### Game Rules

- Each player starts with territories randomly distributed across the map
- Each territory has 1-5 units (30 total per player)
- Players take turns (Red player starts first)

### Actions Per Turn

**Attack**: 
- Select one of your territories
- Click "Attack" button
- Choose adjacent enemy territory
- Select number of units to attack with (must leave at least 1 unit behind)

**Move**:
- Select one of your territories  
- Click "Move" button
- Choose adjacent friendly territory
- Select number of units to move

**End Turn**: Pass turn to opponent

### Combat System

- Simplified battle resolution with probability-based outcomes
- Attackers have 60% chance to destroy defending units
- Defenders have 40% chance to destroy attacking units
- If all defending units are destroyed, territory is conquered

### Victory Conditions

- Control all territories on the map
- Opponent resigns
- Opponent disconnects

## Technical Stack

- **Backend**: Node.js + TypeScript + Socket.IO + Express
- **Frontend**: HTML5 + JavaScript + Phaser 3 + Socket.IO Client
- **Real-time Communication**: WebSockets via Socket.IO

## Installation & Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# For development with auto-reload
npm run dev
```

The game will be available at `http://localhost:3000`

## Game Architecture

### Backend (`src/`)
- `server.ts`: Main server with Socket.IO event handling
- `gameEngine.ts`: Core game logic and rule validation  
- `mapGenerator.ts`: Random map generation and territory assignment
- `types.ts`: TypeScript interfaces and type definitions

### Frontend (`public/`)
- `index.html`: Game UI and styling
- `game.js`: Client-side game logic and Phaser integration

### Key Components

**Map Generation**:
- Poisson disk sampling for territory placement
- Neighbor calculation based on distance
- Ensures map connectivity

**Game State Management**:
- Server authoritative game state
- Real-time synchronization via Socket.IO
- Room-based multiplayer sessions

**UI Features**:
- Interactive territory selection
- Visual turn indicators
- Real-time battle results
- Responsive design

## Development Notes

This is an MVP implementation focusing on core gameplay mechanics. Future enhancements could include:

- More sophisticated combat system
- Territory reinforcement phases
- Multiple game modes
- Spectator mode
- Game replay system
- Enhanced graphics and animations
- Mobile optimization

## License

MIT License - Feel free to modify and distribute as needed.