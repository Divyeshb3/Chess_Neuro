import { useState, useCallback, useEffect, useRef } from 'react';

export function useChessEngine() {
  const [isThinking, setIsThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../engine/chessWorker.ts', import.meta.url), {
      type: 'module'
    });
    return () => workerRef.current?.terminate();
  }, []);

  const getBestMove = useCallback((fen: string): Promise<any | null> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return resolve(null);

      setIsThinking(true);
      const HARD_LIMIT = 300;

      const timeoutId = setTimeout(() => {
        setIsThinking(false);
        console.log("AI TIMEOUT: Falling back to random legal move.");
        resolve(null);
      }, HARD_LIMIT);

      workerRef.current.onmessage = (e) => {
        clearTimeout(timeoutId);
        setIsThinking(false);
        resolve(e.data?.move || null);
      };
      
      workerRef.current.onerror = (err) => {
        console.error("CHESS ENGINE WORKER ERROR:", err);
        clearTimeout(timeoutId);
        setIsThinking(false);
        resolve(null);
      };

      workerRef.current.postMessage({ fen });
    });
  }, []);

  const stopThinking = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = new Worker(new URL('../engine/chessWorker.ts', import.meta.url), {
        type: 'module'
      });
      setIsThinking(false);
    }
  }, []);

  return { getBestMove, isThinking, stopThinking };
}
