import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, RotateCcw, TerminalSquare, Cpu, ChevronLeft, Bot } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const WORKER_SCRIPT = `
  function checkWinner(b) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return null;
  }

  function minimax(b, depth, isMax, botMark, oppMark) {
    const w = checkWinner(b);
    if (w === botMark) return 10 - depth;
    if (w === oppMark) return depth - 10;
    if (!b.includes(null)) return 0;

    if (isMax) {
      let best = -100;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = botMark;
          best = Math.max(best, minimax(b, depth + 1, false, botMark, oppMark));
          b[i] = null;
        }
      }
      return best;
    } else {
      let best = 100;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          b[i] = oppMark;
          best = Math.min(best, minimax(b, depth + 1, true, botMark, oppMark));
          b[i] = null;
        }
      }
      return best;
    }
  }

  function bestMove(b, mark, oppMark) {
    let bestVal = -100;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        b[i] = mark;
        const val = minimax(b, 0, false, mark, oppMark);
        b[i] = null;
        if (val > bestVal) {
          bestVal = val;
          move = i;
        }
      }
    }
    return move;
  }

  self.onmessage = function(e) {
    const { mode, code, board, botMark } = e.data;
    try {
      const userMakeMove = new Function(
        code + "\n\nif (typeof makeMove !== 'function') throw new Error('makeMove(board, player) is not defined'); return makeMove;"
      )();

      if (mode === 'single_move') {
        const move = userMakeMove([...board], botMark);
        self.postMessage({ mode: 'single_move', move });
        return;
      }

      const t0 = performance.now();
      for (let match = 0; match < 60; match++) {
        const userIsX = match % 2 === 0;
        const userMark = userIsX ? 'X' : 'O';
        const testerMark = userIsX ? 'O' : 'X';
        const useOptimal = match < 20;
        let b = Array(9).fill(null);
        let turn = 'X';

        while (true) {
          let idx;
          if (turn === userMark) {
            idx = userMakeMove([...b], userMark);
          } else if (useOptimal) {
            idx = bestMove([...b], testerMark, userMark);
          } else {
            const avail = b.map((v, i) => v === null ? i : null).filter(v => v !== null);
            idx = avail[Math.floor(Math.random() * avail.length)];
          }

          if (typeof idx !== 'number' || idx < 0 || idx > 8 || b[idx] !== null) {
            self.postMessage({ mode: 'verify', passed: false, message: 'No. Illegal move returned: ' + idx });
            return;
          }

          b[idx] = turn;
          const winner = checkWinner(b);
          if (winner) {
            if (winner !== userMark) {
              self.postMessage({ mode: 'verify', passed: false, message: 'No. Bot was defeated.' });
              return;
            }
            break;
          }
          if (!b.includes(null)) break;
          turn = turn === 'X' ? 'O' : 'X';
        }
      }
      const elapsed = performance.now() - t0;
      self.postMessage({ mode: 'verify', passed: true, elapsed, message: 'Correct! Bot is undefeated across 60 adversarial matches.' });
    } catch (err) {
      self.postMessage({ mode: 'error', message: 'No. Runtime error: ' + err.message });
    }
  };
`;

const STARTER_CODE = `/*
 * TASK: Program a bot that ALWAYS wins or draws Tic-Tac-Toe,
 * whether starting first ('X') or second ('O').
 *
 * AVAILABLE DATA:
 *   board  -> Array of 9 items ('X', 'O', or null)
 *   player -> Your bot's symbol ('X' or 'O')
 *
 * RETURN: An integer index from 0 to 8 for your chosen square.
 */
function makeMove(board, player) {
  // Replace this basic fallback with Minimax or optimal strategy:
  return board.findIndex(cell => cell === null);
}`;

export default function TicTacToeArena() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [code, setCode] = useState(() => localStorage.getItem('algo_ttt_code') || STARTER_CODE);
  const [botStarts, setBotStarts] = useState(false);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [gameOver, setGameOver] = useState(false);
  const [statusText, setStatusText] = useState('Click RUN ALGORITHM to start & verify.');
  const [logs, setLogs] = useState([{ type: 'info', text: 'Telepath ready. Write your bot and press RUN.' }]);
  const workerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('algo_ttt_code', code);
  }, [code]);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const checkWinner = (b) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return null;
  };

  const spawnWorker = () => {
    workerRef.current?.terminate();
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    const w = new Worker(URL.createObjectURL(blob));
    workerRef.current = w;
    return w;
  };

  const triggerBotMove = (currentBoard, botMark) => {
    const w = spawnWorker();
    const timer = setTimeout(() => {
      w.terminate();
      setLogs((prev) => [...prev, { type: 'error', text: 'No. Infinite loop timeout (>2000ms).' }]);
    }, 2000);

    w.onmessage = (e) => {
      clearTimeout(timer);
      if (e.data.mode === 'single_move') {
        const idx = e.data.move;
        if (typeof idx !== 'number' || idx < 0 || idx > 8 || currentBoard[idx] !== null) {
          setStatusText('Bot made an invalid move!');
          setGameOver(true);
          return;
        }
        const next = [...currentBoard];
        next[idx] = botMark;
        setBoard(next);
        const win = checkWinner(next);
        if (win) {
          setStatusText(`Bot (${win}) wins!`);
          setGameOver(true);
        } else if (!next.includes(null)) {
          setStatusText('Match Draw!');
          setGameOver(true);
        } else {
          setStatusText('Your turn');
        }
      }
    };
    w.postMessage({ mode: 'single_move', code, board: currentBoard, botMark });
  };

  const startFreshMatch = (botFirstFlag) => {
    const fresh = Array(9).fill(null);
    setBoard(fresh);
    setGameOver(false);
    if (botFirstFlag) {
      setStatusText('Bot thinking...');
      triggerBotMove(fresh, 'X');
    } else {
      setStatusText('Your turn (X)');
    }
  };

  const handleRun = () => {
    setLogs([{ type: 'info', text: 'Testing algorithm against optimal & random opponents...' }]);
    const w = spawnWorker();

    const timer = setTimeout(() => {
      w.terminate();
      setLogs((prev) => [...prev, { type: 'error', text: 'No. Infinite loop detected (Timed out).' }]);
    }, 2000);

    w.onmessage = async (e) => {
      clearTimeout(timer);
      const { passed, message, elapsed } = e.data;
      setLogs((prev) => [...prev, { type: passed ? 'success' : 'error', text: message }]);

      startFreshMatch(botStarts);

      if (passed && isSupabaseConfigured && user && user.id !== 'demo-id') {
        await supabase.from('user_progress').upsert({
          user_id: user.id,
          game_id: 'tic-tac-toe',
          is_solved: true,
          best_execution_ms: elapsed,
          last_submitted_code: code
        }, { onConflict: 'user_id,game_id' });
      }
    };

    w.postMessage({ mode: 'verify', code });
  };

  const handleCellClick = (idx) => {
    if (gameOver || board[idx] !== null) return;
    const humanMark = botStarts ? 'O' : 'X';
    const botMark = botStarts ? 'X' : 'O';

    const next = [...board];
    next[idx] = humanMark;
    setBoard(next);

    const win = checkWinner(next);
    if (win) {
      setStatusText(`You (${win}) win!`);
      setGameOver(true);
      return;
    }
    if (!next.includes(null)) {
      setStatusText('Match Draw!');
      setGameOver(true);
      return;
    }

    setStatusText('Bot thinking...');
    triggerBotMove(next, botMark);
  };

  if (gameId && gameId !== 'tic-tac-toe') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <h1 className="font-display text-4xl font-bold text-orange-500 uppercase">{gameId}</h1>
        <p className="text-stone-400 max-w-md">
          This module is marked In Progress. Return to the dashboard to launch Tic-Tac-Toe.
        </p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-orange-600 rounded-xl font-bold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-stone-950 text-stone-100 flex flex-col">
      <header className="h-16 bg-gradient-to-r from-orange-600 to-amber-600 flex items-center justify-between px-6 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-black/20 hover:bg-black/30 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            Tic-Tac-Toe Engine
          </h1>
        </div>
        <button
          onClick={handleRun}
          className="flex items-center gap-2 bg-stone-950 hover:bg-stone-900 text-orange-400 px-6 py-2.5 rounded-xl font-bold transition shadow-xl"
        >
          <Play className="w-4 h-4 fill-current" />
          RUN ALGORITHM
        </button>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <section className="lg:col-span-7 flex flex-col border-r border-stone-800 bg-[#1e1e1e]">
          <div className="h-11 bg-stone-900 border-b border-stone-800 flex items-center px-4 gap-2 text-stone-400 font-mono text-sm shrink-0">
            <Cpu className="w-4 h-4 text-orange-500" />
            <span>bot_logic.js</span>
          </div>

          <div className="flex-1 w-full min-h-[400px] relative pt-4">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                fontFamily: "'Fira Code', monospace",
              }}
            />
          </div>

          <div className="h-48 md:h-64 shrink-0 bg-black border-t-2 border-orange-500/40 flex flex-col">
            <div className="h-10 bg-stone-900 border-b border-stone-800 flex items-center px-4 gap-2 shrink-0">
              <TerminalSquare className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-mono uppercase tracking-wider text-stone-300 font-bold">
                Telepath Output
              </span>
            </div>
            <div className="p-4 md:p-6 font-mono space-y-3 overflow-y-auto flex-1">
              {logs.map((log, i) => (
                <p
                  key={i}
                  className={
                    log.type === 'success'
                      ? 'text-emerald-400 text-lg md:text-xl font-extrabold'
                      : log.type === 'error'
                      ? 'text-rose-500 text-lg md:text-xl font-extrabold'
                      : 'text-stone-400 text-sm'
                  }
                >
                  {log.text}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 bg-stone-950 flex flex-col items-center justify-center p-8 space-y-8 overflow-y-auto">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-extrabold uppercase">Live Match Arena</h2>
            <p className="text-orange-400 font-semibold text-lg h-6">{statusText}</p>
          </div>

          <div className="bg-stone-900 border border-stone-700 p-1.5 rounded-xl flex gap-2 w-full max-w-[320px]">
            <button
              onClick={() => {
                setBotStarts(false);
                startFreshMatch(false);
              }}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition ${
                !botStarts ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              You Start (X)
            </button>
            <button
              onClick={() => {
                setBotStarts(true);
                startFreshMatch(true);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition ${
                botStarts ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4" /> Bot (X)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-br from-orange-600 to-amber-700 rounded-3xl shadow-2xl">
            {board.map((cell, idx) => (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className="w-24 h-24 sm:w-28 sm:h-28 bg-stone-950 hover:bg-stone-900 rounded-2xl flex items-center justify-center text-6xl font-extrabold text-orange-500 transition"
              >
                {cell}
              </button>
            ))}
          </div>

          <button
            onClick={() => startFreshMatch(botStarts)}
            className="flex items-center gap-2 text-stone-400 hover:text-white font-semibold"
          >
            <RotateCcw className="w-4 h-4" /> Reset Board
          </button>
        </section>
      </main>
    </div>
  );
}
