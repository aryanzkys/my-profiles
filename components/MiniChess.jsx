"use client";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard || m.default),
  { ssr: false }
);

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluateBoard(chess) {
  const board = chess.board();
  let score = 0;
  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const val = PIECE_VALUES[piece.type] || 0;
      score += piece.color === 'w' ? val : -val;
    }
  }
  const w = chess.moves({ verbose: true, legal: true, color: 'w' }).length;
  const b = chess.moves({ verbose: true, legal: true, color: 'b' }).length;
  score += 0.1 * (w - b);
  return score;
}

function bestMove(chess, depth, onProgress) {
  function negamax(d, alpha, beta) {
    if (d === 0 || chess.isGameOver()) {
      return evaluateBoard(chess) * (chess.turn() === 'w' ? 1 : -1);
    }
    let maxEval = -Infinity;
    const moves = chess.moves({ verbose: true });
    moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
    for (const m of moves) {
      chess.move(m);
      const evalScore = -negamax(d - 1, -beta, -alpha);
      chess.undo();
      if (evalScore > maxEval) maxEval = evalScore;
      if (evalScore > alpha) alpha = evalScore;
      if (alpha >= beta) break;
    }
    return maxEval;
  }

  let best = null;
  let bestScore = -Infinity;
  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
  let i = 0;
  for (const m of moves) {
    chess.move(m);
    const score = -negamax(depth - 1, -Infinity, Infinity);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    i++;
    if (onProgress && i % 5 === 0) onProgress(i / moves.length);
  }
  if (onProgress) onProgress(1);
  return best;
}

export default function MiniChess() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => new Chess().fen());
  const [orientation, setOrientation] = useState('white');
  const [thinking, setThinking] = useState(false);
  const [difficulty, setDifficulty] = useState(2);
  const [playSide, setPlaySide] = useState('white');
  const [status, setStatus] = useState('');
  const [sanList, setSanList] = useState([]);
  const aiTimeout = useRef(null);
  const STORAGE_KEY = 'miniChess:v1';
  const [showSaved, setShowSaved] = useState(false);
  const toastTimeout = useRef(null);
  const boardBoxRef = useRef(null);
  const [boardSize, setBoardSize] = useState(320);
  const [showSettings, setShowSettings] = useState(false);

  // Storage helpers with fallbacks
  const safeWrite = (key, value) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
        // Mirror to sessionStorage as a fallback for some mobile contexts
        try { sessionStorage.setItem(key, value); } catch {}
        return true;
      }
    } catch {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(key, value);
          return true;
        }
      } catch {}
    }
    return false;
  };

  const safeRead = (key) => {
    try {
      if (typeof window !== 'undefined') {
        const v = localStorage.getItem(key);
        if (v != null) return v;
      }
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        const v = sessionStorage.getItem(key);
        if (v != null) return v;
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    try {
      const raw = safeRead(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw || '{}');
        if (Array.isArray(saved?.sanList) && saved.sanList.length > 0) {
          const g = new Chess();
          for (const san of saved.sanList) {
            try { g.move(san); } catch {}
          }
          setGame(g);
        } else if (saved?.fen) {
          const g = new Chess(saved.fen);
          setGame(g);
        }
        if (saved?.playSide === 'white' || saved?.playSide === 'black') setPlaySide(saved.playSide);
        if (saved?.orientation === 'white' || saved?.orientation === 'black') setOrientation(saved.orientation);
        if (typeof saved?.difficulty === 'number') setDifficulty(saved.difficulty);
      }
    } catch {}
  }, []);

  // Keep derived values in sync with the game instance
  useEffect(() => {
    setFen(game.fen());
    setSanList(game.history());
  }, [game]);

  useEffect(() => {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    let s = game.isGameOver()
      ? game.isCheckmate()
        ? `Checkmate! ${turn === 'White' ? 'Black' : 'White'} wins.`
        : game.isDraw()
        ? 'Draw'
        : 'Game Over'
      : `${turn} to move`;
    const aiTurn = (playSide === 'white' && game.turn() === 'b') || (playSide === 'black' && game.turn() === 'w');
    if (!game.isGameOver() && aiTurn) s += ' — AI thinking...';
    setStatus(s);
  }, [game, fen, playSide]);

  useEffect(() => {
    if (game.isGameOver()) return;
    const aiTurn = (playSide === 'white' && game.turn() === 'b') || (playSide === 'black' && game.turn() === 'w');
    if (!aiTurn) return;
    setThinking(true);
    aiTimeout.current && clearTimeout(aiTimeout.current);
    aiTimeout.current = setTimeout(() => {
      // Build a search copy with full history
      const searchGame = new Chess();
      for (const san of game.history()) searchGame.move(san);
      const depth = Math.min(Math.max(difficulty, 1), 3);
      const move = bestMove(searchGame, depth);
      if (move) {
        // Apply to a fresh next game preserving full history
        const next = new Chess();
        for (const san of game.history()) next.move(san);
        next.move(move);
        setGame(next);
      }
      setThinking(false);
    }, 200);
    return () => clearTimeout(aiTimeout.current);
  }, [game, difficulty, playSide]);

  useEffect(() => {
    try {
      const payload = { fen: game.fen(), playSide, orientation, difficulty, sanList: game.history(), v: 1 };
      safeWrite(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [game, playSide, orientation, difficulty]);

  // Resize observer to fit board within available area (no scrolling)
  useEffect(() => {
    const el = boardBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        // Fit square board within available box
        const maxW = Math.max(0, Math.floor(cr.width));
        const maxH = Math.max(0, Math.floor(cr.height));
        const size = Math.max(140, Math.min(maxW, maxH));
        setBoardSize(size);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const newGame = (side = playSide) => {
    const g = new Chess();
    setGame(g);
    setPlaySide(side);
    setOrientation(side);
  };

  const resetProgress = () => {
  try { if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY); } catch {}
  try { if (typeof window !== 'undefined') sessionStorage.removeItem(STORAGE_KEY); } catch {}
    const g = new Chess();
    setGame(g);
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (thinking || game.isGameOver()) return false;
    const playerColor = playSide === 'white' ? 'w' : 'b';
    if (game.turn() !== playerColor) return false;
    const move = { from: sourceSquare, to: targetSquare, promotion: 'q' };
    // Rebuild next from full history, then apply the player's move
    const next = new Chess();
    for (const san of game.history()) next.move(san);
    const result = next.move(move);
    if (result) {
      setGame(next);
      // opportunistic save to improve reliability
      try { safeWrite(STORAGE_KEY, JSON.stringify({ fen: next.fen(), playSide, orientation, difficulty, sanList: next.history(), v: 1 })); } catch {}
      return true;
    }
    return false;
  };

  const saveProgressNow = () => {
    try {
      const payload = { fen: game.fen(), playSide, orientation, difficulty, sanList: game.history(), v: 1 };
      const ok = safeWrite(STORAGE_KEY, JSON.stringify(payload));
      // Show toast only for manual saves
      if (ok) {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        setShowSaved(true);
        toastTimeout.current = setTimeout(() => setShowSaved(false), 1600);
      }
    } catch {}
  };

  // Cleanup toast timer on unmount
  useEffect(() => () => { try { clearTimeout(toastTimeout.current); } catch {} }, []);

  // compact settings UI inside moves panel
  const settingsPanel = (
    <div className="rounded-lg border border-white/10 bg-black/10 p-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-xs hover:bg-white/15" onClick={() => newGame(playSide)}>New Game</button>
          <button className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-xs hover:bg-white/15" onClick={saveProgressNow} title="Manually save your progress">Save</button>
          <button className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-xs hover:bg-white/15" onClick={resetProgress} title="Clear saved progress">Reset</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button className={`px-2.5 py-1 rounded-md text-xs border ${orientation === 'white' ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/30' : 'bg-white/10 border-white/20 text-gray-200'}`} onClick={() => setOrientation('white')}>White</button>
          <button className={`px-2.5 py-1 rounded-md text-xs border ${orientation === 'black' ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/30' : 'bg-white/10 border-white/20 text-gray-200'}`} onClick={() => setOrientation('black')}>Black</button>
          <label className="text-[11px] text-gray-300">Side</label>
          <select value={playSide} onChange={(e) => newGame(e.target.value)} className="bg-white/5 border border-white/10 rounded-md text-xs text-gray-200 px-2 py-1 outline-none">
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
          <label className="text-[11px] text-gray-300">Level</label>
          <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-md text-xs text-gray-200 px-2 py-1 outline-none">
            <option value={1}>Easy</option>
            <option value={2}>Medium</option>
            <option value={3}>Hard</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
  <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_360px] gap-3">
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 p-2">
          <div className="w-full h-full grid place-items-center" style={{ aspectRatio: '1 / 1' }}>
            <div ref={boardBoxRef} className="w-full h-full flex items-center justify-center">
            <Chessboard
              id="mini-chessboard"
              position={fen}
              boardOrientation={orientation}
              onPieceDrop={onDrop}
              customBoardStyle={{ borderRadius: 12 }}
              customLightSquareStyle={{ backgroundColor: '#b9cbd3' }}
              customDarkSquareStyle={{ backgroundColor: '#3b4e57' }}
              animationDuration={200}
              arePiecesDraggable={!thinking && !game.isGameOver()}
              boardWidth={boardSize}
            />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-200 flex-1">{status}</div>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-xs text-gray-200 hover:bg-white/15"
              title="Settings"
              aria-expanded={showSettings}
            >
              Settings
            </button>
          </div>
          <div className="text-xs text-gray-400">• Drag pieces to move. Promotions auto-queen.</div>
          {showSettings && settingsPanel}
          <div className="rounded-lg border border-white/10 bg-black/20 p-2 min-h-0 overflow-y-auto break-words pr-1">
            {sanList.length === 0 ? (
              <div className="text-xs text-gray-500">No moves yet.</div>
            ) : (
              <ol className="text-xs text-gray-200 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {Array.from({ length: Math.ceil(sanList.length / 2) }).map((_, idx) => {
                  const w = sanList[idx * 2];
                  const b = sanList[idx * 2 + 1];
                  return (
                    <li key={idx} className="contents">
                      <span className="text-gray-400">{idx + 1}.</span>
                      <span>
                        <span className="mr-3">{w}</span>
                        {b && <span>{b}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          {game.isGameOver() && (
            <button className="self-start px-3 py-1.5 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-sm text-cyan-100 hover:bg-cyan-500/25" onClick={() => newGame(playSide)}>Play Again</button>
          )}
        </div>
      </div>
      {showSaved && (
        <div
          className="fixed bottom-6 right-6 z-[1000]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 backdrop-blur px-4 py-3 shadow-lg text-emerald-100 transition-all duration-300 animate-[fadeInUp_0.25s_ease-out]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Z" stroke="#34d399" strokeWidth="1.5" fill="rgba(52,211,153,0.08)"/>
              <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="text-sm">
              <div className="font-medium">Progress saved</div>
              <div className="text-emerald-200/80 text-xs">Your chess game is stored locally.</div>
            </div>
            <button
              onClick={() => setShowSaved(false)}
              className="ml-2 rounded-md p-1 text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-500/10 transition"
              aria-label="Close saved notification"
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
 
