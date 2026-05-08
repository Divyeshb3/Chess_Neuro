import React, { useState, useEffect, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './components/ChessBoard';
import { useChessAI } from './hooks/useChessAI';
import { useChessEngine } from './hooks/useChessEngine';
import { useMultiplayer } from './hooks/useMultiplayer';
import { sounds } from './lib/sounds';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Menu } from './components/Menu';
import { 
  Skull, 
  Cpu, 
  RotateCcw, 
  Lightbulb, 
  Trash2, 
  Save, 
  FolderOpen, 
  Users, 
  ChevronRight,
  Terminal,
  Zap
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'menu' | 'game'>('menu');
  const [game, setGame] = useState(new Chess());
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'terminal' | 'glitch' | 'classic' | 'minimal'>('minimal');
  const [whiteTime, setWhiteTime] = useState(15 * 60);
  const [blackTime, setBlackTime] = useState(15 * 60);
  const [timeHistory, setTimeHistory] = useState<{w: number, b: number}[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const { getHint } = useChessAI();
  const { getBestMove, isThinking: isEngineThinking, stopThinking } = useChessEngine();
  const { status, opponentMove, sendMove, playerCount } = useMultiplayer(view === 'game' ? roomId : null);

  const isAiThinking = isEngineThinking;

  // Timer logic
  useEffect(() => {
    if (view !== 'game' || isGameOver || mode === 'single') return;

    const interval = setInterval(() => {
      const turn = game.turn();
      if (turn === 'w') {
        setWhiteTime(t => {
          if (t <= 1) {
            setIsGameOver(true);
            setGameResult("BLACK WINS BY TIMEOUT");
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime(t => {
          if (t <= 1) {
            setIsGameOver(true);
            setGameResult("WHITE WINS BY TIMEOUT");
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game, view, isGameOver]);

  const history = React.useMemo(() => game.history({ verbose: true }), [game]);
  const lastMove = React.useMemo(() => history[history.length - 1], [history]);

  const handleStart = (selectedMode: 'single' | 'multi') => {
    setMode(selectedMode);
    if (selectedMode === 'multi') {
      const id = prompt("ENTER ROOM ID (or leave blank for random):") || Math.random().toString(36).substring(7);
      setRoomId(id);
    }
    setView('game');
  };

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    try {
      if (isGameOver) return false;
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      
      if (result) {
        setTimeHistory(prev => [...prev, { w: whiteTime, b: blackTime }]);
        setGame(gameCopy);
        sounds.playMove();
        if (result.captured) sounds.playCapture();
        if (gameCopy.isCheck()) sounds.playCheck();
        
        if (gameCopy.isGameOver()) {
          setIsGameOver(true);
          const winner = gameCopy.isCheckmate() ? (gameCopy.turn() === 'w' ? 'BLACK WINS' : 'WHITE WINS') : 'STALEMATE';
          setGameResult(winner);
        }

        if (mode === 'multi' && roomId) {
          sendMove(gameCopy.fen(), move);
        }

        return true;
      }
    } catch (e) {
      throw e;
    }
    return false;
  }, [game, mode, roomId, sendMove, isGameOver]);

  // AI Management
  const aiProcessingRef = React.useRef<string | null>(null);

  // Handle AI Turn
  useEffect(() => {
    // Basic bails
    if (mode !== 'single' || game.turn() === 'w' || game.isGameOver() || isGameOver) {
      return;
    }

    const currentFen = game.fen();
    if (aiProcessingRef.current === currentFen) return;

    let aborted = false;

    const executeAiTurn = async () => {
      // Prevent duplicate triggers for the same FEN
      aiProcessingRef.current = currentFen;
      
      // Minimum delay for human-like response
      await new Promise(r => setTimeout(r, 600));
      if (aborted) return;

      try {
        const move = await getBestMove(currentFen);
        if (aborted) return;

        if (move) {
          const gameCopy = new Chess(currentFen);
          try {
            const result = gameCopy.move({ from: move.from, to: move.to, promotion: 'q' });
            
            // Critical: Only update if not aborted and game state hasn't been changed by Undo/Move
            if (result && !aborted && game.fen() === currentFen) {
              setTimeHistory(prev => [...prev, { w: whiteTime, b: blackTime }]);
              setGame(gameCopy);
              sounds.playMove();
              if (result.captured) sounds.playCapture();
              if (gameCopy.isCheck()) sounds.playCheck();
              
              if (gameCopy.isGameOver()) {
                setIsGameOver(true);
                const winner = gameCopy.isCheckmate() ? (gameCopy.turn() === 'w' ? 'BLACK WINS' : 'WHITE WINS') : 'STALEMATE';
                setGameResult(winner);
              }
            }
          } catch (moveError) {
            console.error("AI MOVE EXECUTION ERROR", moveError, move);
          }
        }
      } catch (e) {
        console.error("AI TURN ERROR", e);
      } finally {
        // Only clear if this was the processing cycle for the current FEN
        if (aiProcessingRef.current === currentFen) {
          aiProcessingRef.current = null;
        }
      }
    };

    executeAiTurn();

    return () => {
      aborted = true;
    };
  }, [game, mode, isGameOver, getBestMove]);

  // Handle Multiplayer Opponent Move
  useEffect(() => {
    if (mode === 'multi' && opponentMove) {
       // Apply move if it's not our turn and FEN is different
       if (opponentMove.fen !== game.fen()) {
         try {
           const gameCopy = new Chess(opponentMove.fen);
           setGame(gameCopy);
           sounds.playMove();
         } catch (e) {
           console.error("SYNC ERROR:", e);
         }
       }
    }
  }, [opponentMove, mode, game]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUndo = () => {
    if (isGameOver || mode !== 'single') return;
    
    // Stop AI instantly
    stopThinking();
    aiProcessingRef.current = null;
    
    try {
      // Reconstruct game from PGN to ensure all state metadata is correctly handled
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const historyTime = [...timeHistory];
      
      // If turn is White, it means AI just completed its turn cycle -> undo 2 moves
      // If turn is Black, it means Player just moved and AI is thinking -> undo 1 move
      const stepsToUndo = game.turn() === 'w' ? 2 : 1;
      
      let actualUndone = 0;
      for (let i = 0; i < stepsToUndo; i++) {
        if (gameCopy.undo()) {
          actualUndone++;
          const lastStoredTime = historyTime.pop();
          if (lastStoredTime) {
            setWhiteTime(lastStoredTime.w);
            setBlackTime(lastStoredTime.b);
          }
        }
      }
      
      if (actualUndone > 0) {
        setGame(gameCopy);
        setTimeHistory(historyTime);
        setHint(null);
        setIsGameOver(false);
        setGameResult(null);
      }
    } catch (e) {
      console.error("UNDO EXECUTION FAILED:", e);
    }
  };

  const handleHint = async () => {
    if (isAiThinking || isGameOver) return;
    const advisory = await getHint(game.fen());
    setHint(advisory);
  };

  const handleNewGame = () => {
    try {
      const newGame = new Chess();
      setGame(newGame);
      setWhiteTime(15 * 60);
      setBlackTime(15 * 60);
      setTimeHistory([]);
      setIsGameOver(false);
      setGameResult(null);
      aiProcessingRef.current = null;
      setHint(null);
    } catch (e) {
      console.error("NEW GAME ERROR:", e);
    }
  };

  const handleSave = () => {
    localStorage.setItem('neuro_chess_save', game.fen());
  };

  const handleLoad = () => {
    const savedFen = localStorage.getItem('neuro_chess_save');
    if (savedFen) {
      game.load(savedFen);
      setGame(new Chess(game.fen()));
    }
  };

  if (view === 'menu') {
    return <Menu onStart={handleStart} />;
  }

  const isMinimal = theme === 'minimal';

  return (
    <div className={cn(
      "min-h-screen p-4 lg:p-8 flex items-center justify-center font-sans transition-colors duration-500",
      isMinimal ? "bg-slate-50 text-slate-900" : "bg-bento-bg text-bento-text"
    )}>
      {!isMinimal && (
        <>
          <div className="scanline" />
          <div className="crt-overlay" />
        </>
      )}

      <main className="flex flex-col gap-6 md:gap-8 w-full max-w-2xl h-full z-10 py-4 md:py-8">
        
        {/* TOP: OPPONENT */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-2xl",
          isMinimal ? "bg-white border border-slate-100 shadow-sm" : "bg-bento-card border border-bento-border shadow-xl"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isMinimal ? "bg-indigo-50 text-indigo-600" : "bg-bento-muted/20 text-bento-accent"
            )}>
              {mode === 'single' ? <Cpu size={20} /> : <Users size={20} />}
            </div>
            <div>
              <div className="label !mb-0">Opponent</div>
              <div className="font-bold text-sm tracking-tight leading-tight">
                {mode === 'single' ? "NEURO-GM V3" : status === 'ready' ? "PLAYER_SYNCED" : "WAITING..."}
              </div>
            </div>
          </div>
          <div className={cn(
            "text-xl md:text-2xl font-mono font-bold tracking-tighter",
            isMinimal ? "text-indigo-600" : "text-bento-accent"
          )}>
            {isAiThinking ? "ANALYZING..." : mode === 'multi' ? formatTime(blackTime) : null}
          </div>
        </div>

        {/* CENTER: BOARD AREA */}
        <div className="flex flex-col gap-4">
          <div className={cn(
            "p-2 rounded-xl flex items-center justify-between px-6",
            isMinimal ? "bg-white/50 backdrop-blur-sm border border-slate-100" : "bg-bento-card/50 border border-bento-border"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", game.turn() === 'w' ? "bg-indigo-500" : "bg-slate-300")} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{game.turn() === 'w' ? "WHITE'S TURN" : "BLACK'S TURN"}</span>
            </div>
            <button onClick={() => setView('menu')} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest px-2 py-1">EXIT_SYSTEM</button>
          </div>
          
          <div className="w-full aspect-square max-w-[600px] mx-auto relative group">
            <ChessBoard 
              game={game} 
              onMove={makeMove} 
              disabled={mode === 'single' && game.turn() === 'b'} 
              theme={theme}
              lastMove={lastMove}
              isGameOver={isGameOver}
              gameResult={gameResult}
            />
          </div>
        </div>

        {/* BOTTOM: CONTROLS & PLAYER */}
        <div className="flex flex-col gap-6">
          <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl",
            isMinimal ? "bg-white border border-slate-100 shadow-sm shadow-indigo-100/50" : "bg-bento-card border border-bento-border shadow-xl"
          )}>
             <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                isMinimal ? "bg-indigo-600 text-white" : "bg-bento-accent text-bento-bg"
              )}>
                ME
              </div>
              <div>
                <div className="label !mb-0">Integrator</div>
                <div className="font-bold text-sm tracking-tight leading-tight">USER_PROTOCOL</div>
              </div>
            </div>
            <div className={cn(
              "text-xl md:text-2xl font-mono font-bold tracking-tighter",
              isMinimal ? "text-slate-900" : "text-white"
            )}>
              {mode === 'multi' ? formatTime(whiteTime) : null}
            </div>
          </div>

          {/* MINIMAL CONTROL STRIP */}
          <div className="flex flex-col items-center gap-6">
             <div className="flex flex-wrap items-center justify-center gap-2">
                <ControlBtn isMinimal={isMinimal} icon={<Lightbulb size={18} />} label="HINT" onClick={handleHint} />
                {mode === 'single' && (
                  <ControlBtn isMinimal={isMinimal} icon={<RotateCcw size={18} />} label="UNDO" onClick={handleUndo} />
                )}
                <ControlBtn isMinimal={isMinimal} icon={<RotateCcw size={18} className="rotate-180" />} label="NEW" onClick={handleNewGame} />
                <ControlBtn isMinimal={isMinimal} icon={<Users size={18} />} label={mode === 'single' ? "PVP" : "SOLO"} onClick={() => setMode(m => m === 'single' ? 'multi' : 'single')} />
                <ControlBtn isMinimal={isMinimal} icon={<Save size={18} />} label="SAVE" onClick={handleSave} />
                <ControlBtn isMinimal={isMinimal} icon={<FolderOpen size={18} />} label="LOAD" onClick={handleLoad} />
             </div>

             {/* HINT / ADVISORY FLOATING */}
             <AnimatePresence>
              {hint && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => setHint(null)}
                  className={cn(
                    "p-4 rounded-xl border-l-4 w-full shadow-lg cursor-pointer",
                    isMinimal ? "bg-indigo-600 text-white border-indigo-900" : "bg-bento-secondary/20 border-bento-secondary text-bento-text"
                  )}
                >
                  <div className={cn("label", isMinimal ? "text-white/60" : "!text-bento-secondary")}>Tactical Advisory</div>
                  <div className="text-xs leading-relaxed italic">
                    "{hint}"
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

             {/* THEME SWATCH (COMPACT) */}
             <div className="flex items-center gap-3">
                <ThemeSwatch active={theme === 'minimal'} onClick={() => setTheme('minimal')} color="#6366f1" />
                <ThemeSwatch active={theme === 'terminal'} onClick={() => setTheme('terminal')} color="#38bdf8" />
                <ThemeSwatch active={theme === 'glitch'} onClick={() => setTheme('glitch')} color="#ff00ff" />
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}

function ControlBtn({ icon, label, onClick, isMinimal }: { icon: React.ReactNode, label: string, onClick: () => void, isMinimal: boolean }) {
  return (
    <button 
      onClick={() => {
        sounds.playGlitch();
        onClick();
      }}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 group active:scale-95 border",
        isMinimal 
          ? "bg-slate-50 border-slate-100 hover:bg-indigo-50 hover:border-indigo-100" 
          : "bg-bento-muted/10 border-bento-border hover:bg-bento-muted/20 hover:border-bento-muted"
      )}
    >
      <div className={cn(
        "mb-1 group-hover:scale-110 transition-transform",
        isMinimal ? "text-slate-400 group-hover:text-indigo-600" : "text-bento-accent"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[9px] font-bold uppercase tracking-tighter transition-colors",
        isMinimal ? "text-slate-400 group-hover:text-indigo-900" : "text-bento-muted group-hover:text-bento-text"
      )}>{label}</span>
    </button>
  );
}

function ThemeSwatch({ active, onClick, color }: { active: boolean, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      style={{ backgroundColor: color }}
      className={cn(
        "w-8 h-8 rounded-lg border-2 transition-all",
        active ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
      )}
    />
  );
}

const PIECES: Record<string, string> = {
  wP: '♙', wR: '♖', wN: '♘', wB: '♗', wQ: '♕', wK: '♔',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚'
};
