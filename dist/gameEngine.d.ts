import { GameRoom, Player, GameAction } from './types';
export declare class GameEngine {
    private mapGenerator;
    constructor();
    initializeGame(room: GameRoom): void;
    validateMove(room: GameRoom, playerId: string, action: GameAction): {
        valid: boolean;
        error?: string;
    };
    executeMove(room: GameRoom, playerId: string, action: GameAction): {
        success: boolean;
        battleResult?: any;
    };
    checkGameEnd(room: GameRoom): {
        ended: boolean;
        winner?: Player;
    };
    getNextPlayer(room: GameRoom): string;
    getTerritoryCount(room: GameRoom, playerId: string): number;
    getTotalUnits(room: GameRoom, playerId: string): number;
}
//# sourceMappingURL=gameEngine.d.ts.map