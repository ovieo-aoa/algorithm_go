import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Code2, ArrowRight } from 'lucide-react';

const CODE_SNIPPETS = ["function minimax(board, depth) { ... }", "while (low <= high) { ... }", "dp[i] = Math.min(...)"];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 overflow-x-hidden">
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-display font-bold text-xl"><Terminal className="w-6 h-6 text-orange-500" /> ALGORITHM GO</div>
        <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-orange-600 text-white font-semibold rounded-xl">Login</button>
      </nav>
      <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-display text-6xl md:text-8xl font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-br from-white to-orange-400">Algorithm Go</h1>
        <p className="mt-6 text-stone-400 text-lg md:text-xl max-w-2xl">Write deterministic code, battle automated test suites, and prove your mastery.</p>
        <button onClick={() => navigate('/login')} className="mt-8 flex items-center gap-3 px-8 py-4 bg-orange-600 text-white font-bold text-lg rounded-2xl hover:-translate-y-1 transition"><ArrowRight /> Enter Arena</button>
      </section>
    </div>
  );
}