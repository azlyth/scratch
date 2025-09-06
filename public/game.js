// Game state and networking
let socket;
let gameState = {
    room: null,
    player: null,
    currentTurn: null,
    selectedTerritory: null,
    selectedAction: null,
    targetTerritory: null
};

// Phaser game instance
let game;
let gameScene;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
});

function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('roomUpdate', (room) => {
        gameState.room = room;
        updateWaitingRoom();
    });

    socket.on('playerJoined', (player) => {
        console.log('Player joined:', player.name);
        updateWaitingRoom();
    });

    socket.on('gameStarted', (room) => {
        gameState.room = room;
        startPhaser();
        hideMenu();
        showGame();
    });

    socket.on('gameUpdate', (update) => {
        if (update.map) {
            gameState.room.map = update.map;
            if (gameScene) {
                gameScene.updateMap();
            }
        }
        if (update.currentTurn !== undefined) {
            gameState.currentTurn = update.currentTurn;
            updateGameUI();
        }
        if (update.battleResult) {
            if (gameScene) {
                gameScene.showBattleResult(update.battleResult);
            }
        }
    });

    socket.on('turnChanged', (playerId) => {
        gameState.currentTurn = playerId;
        updateGameUI();
    });

    socket.on('gameEnded', (winner) => {
        showGameEnd(winner);
    });

    socket.on('error', (message) => {
        showError(message);
    });
}

// Menu functions
function createGame() {
    const playerName = document.getElementById('playerNameInput').value.trim();
    if (!playerName) {
        showError('Please enter your name');
        return;
    }

    socket.emit('createRoom', playerName, (roomId) => {
        gameState.player = { name: playerName };
        document.getElementById('roomCode').textContent = roomId;
        showWaitingRoom();
    });
}

function showJoinMenu() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('joinMenu').classList.remove('hidden');
}

function showMainMenu() {
    document.getElementById('joinMenu').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
}

function joinGame() {
    const playerName = document.getElementById('playerNameInput').value.trim();
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    
    if (!playerName) {
        showError('Please enter your name');
        return;
    }
    
    if (!roomCode) {
        showError('Please enter room code');
        return;
    }

    socket.emit('joinRoom', roomCode, playerName, (success, error) => {
        if (success) {
            gameState.player = { name: playerName };
            document.getElementById('roomCode').textContent = roomCode;
            showWaitingRoom();
        } else {
            showError(error || 'Failed to join room');
        }
    });
}

function leaveRoom() {
    socket.disconnect();
    socket.connect();
    showMainMenu();
    hideWaitingRoom();
}

function showWaitingRoom() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('joinMenu').classList.add('hidden');
    document.getElementById('waitingRoom').classList.remove('hidden');
}

function hideWaitingRoom() {
    document.getElementById('waitingRoom').classList.add('hidden');
}

function updateWaitingRoom() {
    if (!gameState.room) return;

    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    gameState.room.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-info player-${player.color}`;
        playerDiv.innerHTML = `
            <strong>${player.name}</strong>
            <span style="float: right; color: ${player.color === 'red' ? '#ff6b6b' : '#4ecdc4'}">
                ${player.color.toUpperCase()}
            </span>
        `;
        playersList.appendChild(playerDiv);
    });
}

function hideMenu() {
    document.getElementById('menuScreen').classList.add('hidden');
}

function showGame() {
    document.getElementById('gameContainer').classList.remove('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// Phaser game setup
function startPhaser() {
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'gameCanvas',
        backgroundColor: '#2c3e50',
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    game = new Phaser.Game(config);
}

function preload() {
    // Create simple colored rectangles for territories
    this.add.graphics()
        .fillStyle(0xff6b6b, 0.8)
        .fillCircle(25, 25, 25)
        .generateTexture('territory-red', 50, 50);
    
    this.add.graphics()
        .fillStyle(0x4ecdc4, 0.8)
        .fillCircle(25, 25, 25)
        .generateTexture('territory-blue', 50, 50);
    
    this.add.graphics()
        .fillStyle(0x95a5a6, 0.8)
        .fillCircle(25, 25, 25)
        .generateTexture('territory-neutral', 50, 50);

    this.add.graphics()
        .fillStyle(0xf39c12, 1.0)
        .fillCircle(25, 25, 27)
        .generateTexture('territory-selected', 54, 54);
}

function create() {
    gameScene = this;
    
    // Store references
    this.territories = new Map();
    this.connections = [];
    
    // Create the map
    this.updateMap();
    
    // Add click handler
    this.input.on('gameobjectdown', (pointer, gameObject) => {
        if (gameObject.territoryData) {
            selectTerritory(gameObject.territoryData);
        }
    });

    this.updateMap = function() {
        // Clear existing territories
        this.territories.forEach(territory => territory.destroy());
        this.territories.clear();
        this.connections.forEach(connection => connection.destroy());
        this.connections = [];

        if (!gameState.room || !gameState.room.map) return;

        const map = gameState.room.map;
        
        // Draw connections first (so they appear behind territories)
        map.territories.forEach(territory => {
            territory.neighbors.forEach(neighborId => {
                const neighbor = map.territories.find(t => t.id === neighborId);
                if (neighbor) {
                    const line = this.add.line(
                        0, 0,
                        territory.x, territory.y,
                        neighbor.x, neighbor.y,
                        0x34495e, 0.3
                    ).setOrigin(0, 0).setLineWidth(2);
                    this.connections.push(line);
                }
            });
        });

        // Draw territories
        map.territories.forEach(territory => {
            let texture = 'territory-neutral';
            if (territory.owner) {
                const owner = gameState.room.players.find(p => p.id === territory.owner);
                if (owner) {
                    texture = `territory-${owner.color}`;
                }
            }

            const territorySprite = this.add.image(territory.x, territory.y, texture)
                .setInteractive()
                .setScale(territory.radius / 25); // Scale based on territory size

            territorySprite.territoryData = territory;

            // Add unit count text
            const unitsText = this.add.text(territory.x, territory.y, territory.units.toString(), {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);

            territorySprite.unitsText = unitsText;
            this.territories.set(territory.id, territorySprite);
        });
    };

    this.showBattleResult = function(result) {
        // Simple battle result display
        const text = `Battle: Attacker lost ${result.attackerLosses}, Defender lost ${result.defenderLosses}`;
        const battleText = this.add.text(400, 50, text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        // Fade out after 3 seconds
        this.tweens.add({
            targets: battleText,
            alpha: 0,
            duration: 3000,
            onComplete: () => battleText.destroy()
        });
    };

    // Initial UI update
    updateGameUI();
}

function update() {
    // Game loop - can add animations here later
}

// Game UI functions
function selectTerritory(territory) {
    if (gameState.currentTurn !== socket.id) {
        showError("It's not your turn!");
        return;
    }

    // Clear previous selection
    clearSelection();

    gameState.selectedTerritory = territory;
    
    // Highlight selected territory
    if (gameScene && gameScene.territories.has(territory.id)) {
        const territorySprite = gameScene.territories.get(territory.id);
        const highlight = gameScene.add.image(territory.x, territory.y, 'territory-selected');
        highlight.setDepth(-1); // Behind the territory
        territorySprite.highlight = highlight;
    }

    updateTerritoryInfo();
}

function clearSelection() {
    if (gameState.selectedTerritory && gameScene) {
        const territorySprite = gameScene.territories.get(gameState.selectedTerritory.id);
        if (territorySprite && territorySprite.highlight) {
            territorySprite.highlight.destroy();
            territorySprite.highlight = null;
        }
    }
    gameState.selectedTerritory = null;
    gameState.selectedAction = null;
    gameState.targetTerritory = null;
    
    document.getElementById('selectedTerritoryInfo').classList.add('hidden');
    document.getElementById('actionControls').classList.add('hidden');
}

function updateTerritoryInfo() {
    const territory = gameState.selectedTerritory;
    if (!territory) return;

    const owner = gameState.room.players.find(p => p.id === territory.owner);
    const isOwned = territory.owner === socket.id;

    document.getElementById('territoryDetails').innerHTML = `
        <strong>Owner:</strong> ${owner ? owner.name : 'None'}<br>
        <strong>Units:</strong> ${territory.units}<br>
        <strong>Neighbors:</strong> ${territory.neighbors.length}
    `;

    document.getElementById('selectedTerritoryInfo').classList.remove('hidden');
    
    // Show/hide action buttons based on ownership
    document.getElementById('attackBtn').style.display = isOwned ? 'block' : 'none';
    document.getElementById('moveBtn').style.display = isOwned ? 'block' : 'none';
}

function setAction(action) {
    if (!gameState.selectedTerritory) return;

    gameState.selectedAction = action;
    
    const maxUnits = gameState.selectedTerritory.units - 1; // Must leave at least 1
    if (maxUnits < 1) {
        showError('Not enough units to perform action');
        return;
    }

    document.getElementById('actionDescription').textContent = 
        `Select a neighboring territory to ${action}`;
    
    const slider = document.getElementById('unitsSlider');
    slider.max = maxUnits;
    slider.value = Math.min(1, maxUnits);
    
    updateUnitsCount();
    document.getElementById('actionControls').classList.remove('hidden');
    
    // Update slider listener
    slider.oninput = updateUnitsCount;
}

function updateUnitsCount() {
    const count = document.getElementById('unitsSlider').value;
    document.getElementById('unitsCount').textContent = count;
}

function executeAction() {
    if (!gameState.selectedTerritory || !gameState.selectedAction) return;

    // For now, let's implement a simple click-to-target system
    showError(`Click on a neighboring territory to ${gameState.selectedAction}`);
    
    // Add temporary click handler for target selection
    const originalHandler = gameScene.input.off('gameobjectdown');
    
    gameScene.input.once('gameobjectdown', (pointer, gameObject) => {
        if (gameObject.territoryData) {
            const target = gameObject.territoryData;
            
            // Validate target
            if (!gameState.selectedTerritory.neighbors.includes(target.id)) {
                showError('Territories are not adjacent');
                return;
            }

            if (gameState.selectedAction === 'move' && target.owner !== socket.id) {
                showError('Can only move to territories you own');
                return;
            }

            if (gameState.selectedAction === 'attack' && target.owner === socket.id) {
                showError('Cannot attack your own territory');
                return;
            }

            // Execute the action
            const units = parseInt(document.getElementById('unitsSlider').value);
            const action = {
                type: gameState.selectedAction,
                fromTerritory: gameState.selectedTerritory.id,
                toTerritory: target.id,
                units: units
            };

            socket.emit('makeMove', action, (success, error) => {
                if (!success) {
                    showError(error || 'Move failed');
                }
                cancelAction();
            });
        }
        
        // Restore original handler
        gameScene.input.on('gameobjectdown', (pointer, gameObject) => {
            if (gameObject.territoryData) {
                selectTerritory(gameObject.territoryData);
            }
        });
    });
}

function cancelAction() {
    gameState.selectedAction = null;
    gameState.targetTerritory = null;
    document.getElementById('actionControls').classList.add('hidden');
}

function endTurn() {
    socket.emit('endTurn');
    clearSelection();
}

function resign() {
    if (confirm('Are you sure you want to resign?')) {
        socket.emit('resign');
    }
}

function updateGameUI() {
    if (!gameState.room) return;

    // Update game status
    const statusDiv = document.getElementById('gameStatus');
    const isMyTurn = gameState.currentTurn === socket.id;
    
    if (gameState.room.gameState === 'playing') {
        const currentPlayer = gameState.room.players.find(p => p.id === gameState.currentTurn);
        statusDiv.textContent = isMyTurn ? 'Your Turn' : `${currentPlayer?.name || 'Opponent'}'s Turn`;
        statusDiv.className = 'status-playing';
        if (isMyTurn) {
            statusDiv.classList.add('current-turn');
        }
    } else {
        statusDiv.textContent = 'Game Not Active';
        statusDiv.className = 'status-waiting';
    }

    // Update players info
    const playersDiv = document.getElementById('playersInfo');
    playersDiv.innerHTML = '';
    
    gameState.room.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-info player-${player.color}`;
        if (player.id === gameState.currentTurn) {
            playerDiv.classList.add('current-turn');
        }
        
        const territories = gameState.room.map ? 
            gameState.room.map.territories.filter(t => t.owner === player.id).length : 0;
        const totalUnits = gameState.room.map ? 
            gameState.room.map.territories
                .filter(t => t.owner === player.id)
                .reduce((sum, t) => sum + t.units, 0) : 0;

        playerDiv.innerHTML = `
            <strong>${player.name}</strong>
            <div style="font-size: 12px; margin-top: 5px;">
                Territories: ${territories} | Units: ${totalUnits}
            </div>
        `;
        playersDiv.appendChild(playerDiv);
    });

    // Enable/disable end turn button
    document.getElementById('endTurnBtn').disabled = !isMyTurn;
}

function showGameEnd(winner) {
    const message = winner.id === socket.id ? 'You Won!' : `${winner.name} Won!`;
    alert(message);
    
    // Could add a proper game end screen here
    setTimeout(() => {
        location.reload(); // Simple restart for now
    }, 2000);
}