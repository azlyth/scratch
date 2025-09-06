import { GameMap, Territory } from './types';

export class MapGenerator {
  private width: number;
  private height: number;

  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
  }

  generateMap(): GameMap {
    const territories: Territory[] = [];
    const numTerritories = Math.floor(Math.random() * 6) + 15; // 15-20 territories
    
    // Generate random points for territories using Poisson disk sampling for better distribution
    const points = this.generatePoissonPoints(numTerritories);
    
    // Create territories from points
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const territory: Territory = {
        id: `territory_${i}`,
        x: point.x,
        y: point.y,
        radius: Math.random() * 30 + 25, // 25-55 radius
        owner: null,
        units: 0,
        neighbors: []
      };
      territories.push(territory);
    }

    // Calculate neighbors based on distance
    this.calculateNeighbors(territories);

    return {
      territories,
      width: this.width,
      height: this.height
    };
  }

  private generatePoissonPoints(count: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const minDistance = 80; // Minimum distance between territories
    const maxAttempts = 30;

    // Add first point
    points.push({
      x: Math.random() * (this.width - 100) + 50,
      y: Math.random() * (this.height - 100) + 50
    });

    while (points.length < count) {
      let attempts = 0;
      let validPoint = false;

      while (attempts < maxAttempts && !validPoint) {
        const candidate = {
          x: Math.random() * (this.width - 100) + 50,
          y: Math.random() * (this.height - 100) + 50
        };

        validPoint = true;
        for (const existing of points) {
          const distance = Math.sqrt(
            Math.pow(candidate.x - existing.x, 2) + 
            Math.pow(candidate.y - existing.y, 2)
          );
          if (distance < minDistance) {
            validPoint = false;
            break;
          }
        }

        if (validPoint) {
          points.push(candidate);
        }
        attempts++;
      }

      if (!validPoint) break; // Couldn't find more valid points
    }

    return points;
  }

  private calculateNeighbors(territories: Territory[]): void {
    const maxNeighborDistance = 120; // Max distance to be considered a neighbor

    for (let i = 0; i < territories.length; i++) {
      const territory = territories[i];
      territory.neighbors = [];

      for (let j = 0; j < territories.length; j++) {
        if (i === j) continue;

        const other = territories[j];
        const distance = Math.sqrt(
          Math.pow(territory.x - other.x, 2) + 
          Math.pow(territory.y - other.y, 2)
        );

        if (distance <= maxNeighborDistance) {
          territory.neighbors.push(other.id);
        }
      }
    }

    // Ensure connectivity - if any territory has no neighbors, connect it to closest one
    for (const territory of territories) {
      if (territory.neighbors.length === 0) {
        let closestDistance = Infinity;
        let closestId = '';

        for (const other of territories) {
          if (other.id === territory.id) continue;
          
          const distance = Math.sqrt(
            Math.pow(territory.x - other.x, 2) + 
            Math.pow(territory.y - other.y, 2)
          );

          if (distance < closestDistance) {
            closestDistance = distance;
            closestId = other.id;
          }
        }

        if (closestId) {
          territory.neighbors.push(closestId);
          // Make it bidirectional
          const closest = territories.find(t => t.id === closestId);
          if (closest && !closest.neighbors.includes(territory.id)) {
            closest.neighbors.push(territory.id);
          }
        }
      }
    }
  }

  distributeUnits(territories: Territory[], players: { id: string }[]): void {
    const totalUnits = 30; // Each player starts with 30 units
    const maxUnitsPerTerritory = 5;

    for (const player of players) {
      // Get territories owned by this player
      const playerTerritories = territories.filter(t => t.owner === player.id);
      let remainingUnits = totalUnits;

      // First, give each territory 1 unit (minimum)
      for (const territory of playerTerritories) {
        territory.units = 1;
        remainingUnits--;
      }

      // Distribute remaining units randomly, respecting the maximum
      while (remainingUnits > 0) {
        const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
        if (randomTerritory.units < maxUnitsPerTerritory) {
          randomTerritory.units++;
          remainingUnits--;
        }
      }
    }
  }

  assignTerritories(territories: Territory[], players: { id: string; color: 'red' | 'blue' }[]): void {
    // Randomly shuffle territories
    const shuffled = [...territories].sort(() => Math.random() - 0.5);
    
    // Assign territories alternating between players
    for (let i = 0; i < shuffled.length; i++) {
      const playerIndex = i % players.length;
      shuffled[i].owner = players[playerIndex].id;
    }
  }
}