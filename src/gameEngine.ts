import { GameRoom, Player, GameAction, Territory } from './types';
import { MapGenerator } from './mapGenerator';

export class GameEngine {
  private mapGenerator: MapGenerator;

  constructor() {
    this.mapGenerator = new MapGenerator();
  }

  initializeGame(room: GameRoom): void {
    if (room.players.length !== 2) {
      throw new Error('Game requires exactly 2 players');
    }

    // Generate map
    room.map = this.mapGenerator.generateMap();

    // Assign colors
    room.players[0].color = 'red';
    room.players[1].color = 'blue';

    // Assign territories to players
    this.mapGenerator.assignTerritories(room.map.territories, room.players);

    // Distribute units
    this.mapGenerator.distributeUnits(room.map.territories, room.players);

    // Set game state
    room.gameState = 'playing';
    room.currentTurn = room.players[0].id; // Red player starts
  }

  validateMove(room: GameRoom, playerId: string, action: GameAction): { valid: boolean; error?: string } {
    if (!room.map) {
      return { valid: false, error: 'Game not initialized' };
    }

    if (room.currentTurn !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }

    const fromTerritory = room.map.territories.find(t => t.id === action.fromTerritory);
    const toTerritory = room.map.territories.find(t => t.id === action.toTerritory);

    if (!fromTerritory || !toTerritory) {
      return { valid: false, error: 'Invalid territory' };
    }

    if (fromTerritory.owner !== playerId) {
      return { valid: false, error: 'You do not own the source territory' };
    }

    if (!fromTerritory.neighbors.includes(toTerritory.id)) {
      return { valid: false, error: 'Territories are not adjacent' };
    }

    if (action.type === 'move') {
      if (toTerritory.owner !== playerId) {
        return { valid: false, error: 'Cannot move to territory you do not own' };
      }
      if (action.units >= fromTerritory.units) {
        return { valid: false, error: 'Must leave at least 1 unit in source territory' };
      }
    } else if (action.type === 'attack') {
      if (toTerritory.owner === playerId) {
        return { valid: false, error: 'Cannot attack your own territory' };
      }
      if (action.units >= fromTerritory.units) {
        return { valid: false, error: 'Must leave at least 1 unit in source territory' };
      }
    }

    if (action.units < 1) {
      return { valid: false, error: 'Must move/attack with at least 1 unit' };
    }

    return { valid: true };
  }

  executeMove(room: GameRoom, playerId: string, action: GameAction): { success: boolean; battleResult?: any } {
    const validation = this.validateMove(room, playerId, action);
    if (!validation.valid) {
      return { success: false };
    }

    const fromTerritory = room.map!.territories.find(t => t.id === action.fromTerritory)!;
    const toTerritory = room.map!.territories.find(t => t.id === action.toTerritory)!;

    if (action.type === 'move') {
      // Simple move between owned territories
      fromTerritory.units -= action.units;
      toTerritory.units += action.units;
      return { success: true };
    } else if (action.type === 'attack') {
      // Combat resolution - simplified dice-like system
      const attackerUnits = action.units;
      const defenderUnits = toTerritory.units;

      // Simple combat: each attacking unit has 60% chance to destroy a defending unit
      // Each defending unit has 40% chance to destroy an attacking unit
      let attackerLosses = 0;
      let defenderLosses = 0;

      for (let i = 0; i < attackerUnits; i++) {
        if (Math.random() < 0.6) { // Attacker success
          defenderLosses++;
        }
      }

      for (let i = 0; i < defenderUnits; i++) {
        if (Math.random() < 0.4) { // Defender success
          attackerLosses++;
        }
      }

      // Ensure we don't lose more units than we have
      attackerLosses = Math.min(attackerLosses, attackerUnits);
      defenderLosses = Math.min(defenderLosses, defenderUnits);

      // Apply losses
      fromTerritory.units -= attackerLosses;
      toTerritory.units -= defenderLosses;

      const battleResult = {
        attackerLosses,
        defenderLosses,
        conquered: toTerritory.units === 0
      };

      // If territory is conquered
      if (toTerritory.units === 0) {
        toTerritory.owner = playerId;
        toTerritory.units = attackerUnits - attackerLosses; // Surviving attackers occupy
        fromTerritory.units -= (attackerUnits - attackerLosses); // Remove the occupying units from source
      }

      return { success: true, battleResult };
    }

    return { success: false };
  }

  checkGameEnd(room: GameRoom): { ended: boolean; winner?: Player } {
    if (!room.map) return { ended: false };

    // Count territories owned by each player
    const territoryCounts: { [playerId: string]: number } = {};
    
    for (const territory of room.map.territories) {
      if (territory.owner) {
        territoryCounts[territory.owner] = (territoryCounts[territory.owner] || 0) + 1;
      }
    }

    // Check if any player owns all territories
    for (const player of room.players) {
      if (territoryCounts[player.id] === room.map.territories.length) {
        return { ended: true, winner: player };
      }
    }

    // Check if any player has no territories (eliminated)
    for (const player of room.players) {
      if (!territoryCounts[player.id] || territoryCounts[player.id] === 0) {
        const winner = room.players.find(p => p.id !== player.id);
        return { ended: true, winner };
      }
    }

    return { ended: false };
  }

  getNextPlayer(room: GameRoom): string {
    const currentIndex = room.players.findIndex(p => p.id === room.currentTurn);
    const nextIndex = (currentIndex + 1) % room.players.length;
    return room.players[nextIndex].id;
  }

  getTerritoryCount(room: GameRoom, playerId: string): number {
    if (!room.map) return 0;
    return room.map.territories.filter(t => t.owner === playerId).length;
  }

  getTotalUnits(room: GameRoom, playerId: string): number {
    if (!room.map) return 0;
    return room.map.territories
      .filter(t => t.owner === playerId)
      .reduce((sum, t) => sum + t.units, 0);
  }
}