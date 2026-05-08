import React, { useState, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { Skull } from 'lucide-react';
import { sounds } from '../lib/sounds';
import { cn } from '../lib/utils';

interface ChessBoardProps {
  game: Chess;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  disabled?: boolean;
  theme?: 'classic' | 'terminal' | 'glitch' | 'minimal';
  lastMove?: Move;
  isGameOver?: boolean;
  gameResult?: string | null;
}

const PIECES: Record<string, string> = {
  wP: '♙', wR: '♖', wN: '♘', wB: '♗', wQ: '♕', wK: '♔',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚'
};

export const ChessBoard: React.FC<ChessBoardProps> = React.memo(({ game, onMove, disabled, theme = 'terminal', lastMove, isGameOver, gameResult }) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);

  // Clear selection if game changes (e.g. undo)
  useEffect(() => {
    setSelectedSquare(null);
    setValidMoves([]);
  }, [game]);

  const board = game.board();

  const handleSquareClick = (square: string) => {
    if (disabled) return;

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    if (selectedSquare) {
      const piece = game.get(selectedSquare as Square);
      const isPromotion = piece?.type === 'p' && (
        (piece.color === 'w' && square[1] === '8') ||
        (piece.color === 'b' && square[1] === '1')
      );

      const move = {
        from: selectedSquare,
        to: square,
        promotion: isPromotion ? 'q' : undefined
      };

      try {
        onMove(move);
        setSelectedSquare(null);
        setValidMoves([]);
      } catch (e) {
        // If move fails, check if the clicked square contains another of our pieces
        const pieceAtClicked = game.get(square as Square);
        if (pieceAtClicked && pieceAtClicked.color === game.turn()) {
          setSelectedSquare(square as Square);
          setValidMoves(game.moves({ square: square as Square, verbose: true }).map(m => m.to));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      const piece = game.get(square as Square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square as Square);
        setValidMoves(game.moves({ square: square as Square, verbose: true }).map(m => m.to));
      }
    }
  };

  const isBento = theme === 'terminal' || theme === 'classic';
  const isMinimal = theme === 'minimal';

  return (
    <div className={cn(
      "relative aspect-square w-full max-w-[600px] overflow-hidden rounded-3xl transition-all duration-500",
      isMinimal 
        ? "bg-white border-[12px] border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
        : (isBento ? "bg-bento-bg border-8 border-bento-card shadow-2xl" : "bg-black border-2 border-neon-cyan shadow-[0_0_20px_rgba(0,255,255,0.2)]")
    )}>
      <div className="grid grid-cols-8 grid-rows-8 h-full">
        {board.map((row, i) =>
          row.map((piece, j) => {
            const square = String.fromCharCode(97 + j) + (8 - i);
            const isDark = (i + j) % 2 === 1;
            const isSelected = selectedSquare === square;
            const isValidMove = validMoves.includes(square);
            const isLastMove = lastMove?.to === square || lastMove?.from === square;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={cn(
                  "relative flex items-center justify-center text-4xl cursor-pointer transition-all duration-200",
                  isDark 
                    ? (isMinimal ? "bg-slate-100" : (isBento ? "bg-[#64748b]" : "bg-zinc-900/50")) 
                    : (isMinimal ? "bg-white" : (isBento ? "bg-[#e2e8f0]" : "bg-transparent")),
                  isSelected && (isMinimal ? "bg-indigo-100" : (isBento ? "bg-bento-accent/40" : "bg-neon-magenta/20 shadow-inner")),
                  isValidMove && "after:content-[''] after:w-3 after:h-3 after:bg-indigo-400/40 after:rounded-full after:animate-pulse",
                  isLastMove && (isMinimal ? "bg-indigo-50 ring-2 ring-inset ring-indigo-200" : (isBento ? "bg-bento-secondary/20" : "bg-neon-yellow/10 ring-1 ring-inset ring-neon-yellow/30"))
                )}
              >
                {/* Coordinates */}
                {j === 0 && (
                  <span className={cn(
                    "absolute top-1 left-1 text-[9px] font-bold font-mono tracking-tighter opacity-40",
                    isMinimal ? "text-slate-400" : (isBento ? (isDark ? "text-slate-300" : "text-slate-500") : "text-neon-cyan/30")
                  )}>
                    {8 - i}
                  </span>
                )}
                {i === 7 && (
                  <span className={cn(
                    "absolute bottom-1 right-1 text-[9px] font-bold font-mono tracking-tighter opacity-40",
                    isMinimal ? "text-slate-400" : (isBento ? (isDark ? "text-slate-300" : "text-slate-500") : "text-neon-cyan/30")
                  )}>
                    {String.fromCharCode(97 + j)}
                  </span>
                )}

                <AnimatePresence mode="popLayout">
                  {piece && (
                    <motion.span
                      key={`${piece.type}-${piece.color}-${square}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2, filter: 'blur(4px)' }}
                      className={cn(
                        "select-none transition-all duration-300 z-10",
                        isMinimal 
                          ? (piece.color === 'w' ? "text-slate-800 drop-shadow-sm" : "text-indigo-600")
                          : (isBento 
                              ? (piece.color === 'w' ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" : "text-black") 
                              : (piece.color === 'w' ? "text-neon-cyan drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" : "text-neon-magenta drop-shadow-[0_0_8_rgba(255,0,255,0.5)]")),
                        "hover:scale-110 active:scale-95",
                        theme === 'glitch' && "animate-[glitch_0.3s_infinite]"
                      )}
                      style={{ 
                        fontSize: isMinimal ? '3.2rem' : '3rem',
                        lineHeight: 1
                      }}
                    >
                      {PIECES[`${piece.color}${piece.type.toUpperCase()}`]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {(game.isGameOver() || isGameOver) && (
        <div className={cn(
          "absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center z-50 gap-6 animate-in fade-in zoom-in duration-500",
          isMinimal ? "bg-white/90" : "bg-bento-bg/80"
        )}>
           <div className={cn(
             "w-20 h-20 rounded-3xl flex items-center justify-center mb-2",
             isMinimal ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-bento-secondary text-white shadow-2xl"
           )}>
             <Skull size={40} className="animate-pulse" />
           </div>
           <div className="text-center">
             <h2 className={cn(
               "text-3xl font-black tracking-tight uppercase mb-1",
               isMinimal ? "text-slate-900" : "text-bento-text"
             )}>Game Over</h2>
             <p className={cn(
               "font-bold text-sm uppercase tracking-widest px-4 py-1 rounded-full",
               isMinimal ? "bg-indigo-50 text-indigo-600" : "bg-bento-accent/20 text-bento-accent"
             )}>
               {gameResult || (game.isDraw() ? "STALEMATE" : game.turn() === 'w' ? "BLACK WINS" : "WHITE WINS")}
             </p>
           </div>
           <button 
             onClick={() => window.location.reload()}
             className={cn(
               "mt-4 px-8 py-4 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg",
               isMinimal ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-bento-accent text-bento-bg"
             )}
           >
             RESTART ANALYSER
           </button>
        </div>
      )}
    </div>
  );
});
