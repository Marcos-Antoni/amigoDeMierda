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

export interface GameState {
  code: string;
  hostId: string;
  players: Player[];
  phase: "lobby" | "question" | "results" | "leaderboard" | "gameover";
  currentQuestion: Question | null;
  votes: Record<string, string>; // voterId -> targetId
  questionIndex: number;   // position into questionOrder; -1 in lobby
  questionOrder: Question[]; // shuffled questions, set at game:start; [] in lobby
}
