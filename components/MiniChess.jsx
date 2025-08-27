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

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
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
      const searchGame = new Chess(game.fen());
      const depth = Math.min(Math.max(difficulty, 1), 3);
      const move = bestMove(searchGame, depth);
      if (move) {
        const next = new Chess(game.fen());
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
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [game, playSide, orientation, difficulty]);

  const newGame = (side = playSide) => {
    const g = new Chess();
    setGame(g);
    setPlaySide(side);
    setOrientation(side);
  };

  const resetProgress = () => {
    try { if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY); } catch {}
    const g = new Chess();
    setGame(g);
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (thinking || game.isGameOver()) return false;
    const playerColor = playSide === 'white' ? 'w' : 'b';
    if (game.turn() !== playerColor) return false;
    const move = { from: sourceSquare, to: targetSquare, promotion: 'q' };
    const next = new Chess(game.fen());
    const result = next.move(move);
    if (result) {
      setGame(next);
      return true;
    }
    return false;
  };

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={() => newGame(playSide)}>New Game</button>
      <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm hover:bg-white/15" onClick={resetProgress} title="Clear saved progress">Reset Progress</button>
      <button className={`px-3 py-1.5 rounded-md text-sm border ${orientation === 'white' ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/30' : 'bg-white/10 border-white/20 text-gray-200'}`} onClick={() => setOrientation('white')}>White view</button>
      <button className={`px-3 py-1.5 rounded-md text-sm border ${orientation === 'black' ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/30' : 'bg-white/10 border-white/20 text-gray-200'}`} onClick={() => setOrientation('black')}>Black view</button>
      <div className="ml-auto flex items-center gap-2">
        <label className="text-xs text-gray-300">Side</label>
        <select value={playSide} onChange={(e) => newGame(e.target.value)} className="bg-white/5 border border-white/10 rounded-md text-sm text-gray-200 px-2 py-1 outline-none">
          <option value="white">White</option>
          <option value="black">Black</option>
        </select>
        <label className="text-xs text-gray-300">Difficulty</label>
        <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-md text-sm text-gray-200 px-2 py-1 outline-none">
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {controls}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 p-2">
          <div className="w-full" style={{ aspectRatio: '1/1' }}>
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
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-col gap-2">
          <div className="text-sm text-gray-200">{status}</div>
          <div className="text-xs text-gray-400">• Drag pieces to move. Promotions auto-queen.</div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-2 max-h-56 overflow-y-auto">
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
    </div>
  );
}
 
