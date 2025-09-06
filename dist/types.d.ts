export interface Player {
    id: string;
    name: string;
    color: 'red' | 'blue';
    units: number;
}
export interface Territory {
    id: string;
    x: number;
    y: number;
    radius: number;
    owner: string | null;
    units: number;
    neighbors: string[];
}
export interface GameMap {
    territories: Territory[];
    width: number;
    height: number;
}
export interface GameRoom {
    id: string;
    players: Player[];
    map: GameMap | null;
    currentTurn: string | null;
    gameState: 'waiting' | 'setup' | 'playing' | 'finished';
    winner: string | null;
    createdAt: Date;
}
export interface GameAction {
    type: 'attack' | 'move';
    fromTerritory: string;
    toTerritory: string;
    units: number;
}
export interface ClientToServerEvents {
    createRoom: (playerName: string, callback: (roomId: string) => void) => void;
    joinRoom: (roomId: string, playerName: string, callback: (success: boolean, error?: string) => void) => void;
    startGame: () => void;
    makeMove: (action: GameAction, callback: (success: boolean, error?: string) => void) => void;
    endTurn: () => void;
    resign: () => void;
}
export interface ServerToClientEvents {
    roomUpdate: (room: Partial<GameRoom>) => void;
    gameUpdate: (gameState: any) => void;
    playerJoined: (player: Player) => void;
    gameStarted: (room: GameRoom) => void;
    turnChanged: (playerId: string) => void;
    gameEnded: (winner: Player) => void;
    error: (message: string) => void;
}
//# sourceMappingURL=types.d.ts.map