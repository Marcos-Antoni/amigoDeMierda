export interface Player {
  id: string;
  name: string;
  score: number;
  isBot?: boolean;
}

export interface Question {
  question: string;
  hot: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  phase: "lobby" | "question" | "results" | "leaderboard" | "gameover";
  currentQuestion: Question | null;
  votes: Record<string, string>;
}
