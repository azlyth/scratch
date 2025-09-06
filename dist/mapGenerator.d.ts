import { GameMap, Territory } from './types';
export declare class MapGenerator {
    private width;
    private height;
    constructor(width?: number, height?: number);
    generateMap(): GameMap;
    private generatePoissonPoints;
    private calculateNeighbors;
    distributeUnits(territories: Territory[], players: {
        id: string;
    }[]): void;
    assignTerritories(territories: Territory[], players: {
        id: string;
        color: 'red' | 'blue';
    }[]): void;
}
//# sourceMappingURL=mapGenerator.d.ts.map