import { Chess, Move } from 'chess.js';

// Simple heuristic values
const PIECE_VALUES: Record<string, number> = {
  p: 10, n: 30, b: 30, r: 50, q: 90, k: 900
};

self.onmessage = (e) => {
  const { fen } = e.data;
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  
  if (moves.length === 0) return;

  const scoredMoves = moves.map(move => {
    let score = 0;

    // 1. Checkmate is top priority
    if (move.san.includes('#')) {
      score += 10000;
    }

    // 2. Capture priority (MVV-LVA logic)
    if (move.captured) {
      score += (PIECE_VALUES[move.captured] * 10) - (PIECE_VALUES[move.piece]);
    }

    // 3. Check is good
    if (move.san.includes('+')) {
      score += 50;
    }

    // 4. Center control (d4, e4, d5, e5)
    const centralSquares = ['d4', 'e4', 'd5', 'e5', 'd3', 'e3', 'd6', 'e6'];
    if (centralSquares.includes(move.to)) {
       score += 5;
    }

    // 5. Development of minor pieces early on
    if ((move.piece === 'n' || move.piece === 'b') && (move.from.includes('1') || move.from.includes('8'))) {
      score += 10;
    }

    // 6. Blunder prevention (simple: check if piece is hanging after move)
    game.move(move);
    const opponentMoves = game.moves({ verbose: true });
    let maxCaptureByOpponent = 0;
    for (const oppMove of opponentMoves) {
      if (oppMove.captured) {
        maxCaptureByOpponent = Math.max(maxCaptureByOpponent, PIECE_VALUES[oppMove.captured]);
      }
      // If opponent can checkmate us, massive penalty
      if (oppMove.san.includes('#')) {
        maxCaptureByOpponent = 1000;
      }
    }
    game.undo();
    
    score -= maxCaptureByOpponent * 5;

    // Add small randomness to avoid repeating the same game every time
    return { move, score: score + (Math.random() * 5) };
  });

  // Sort by score descending
  scoredMoves.sort((a, b) => b.score - a.score);
  
  self.postMessage({ move: scoredMoves[0].move });
};
