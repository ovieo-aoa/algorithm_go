import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GAMES_CONFIG } from '../lib/gamesConfig';
import { Trophy, LogOut, ShieldAlert, CheckCircle2, Code2, Lock, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user || user.id === 'demo-id') return;
    supabase.from('user_progress').select('*').eq('user_id', user.id).then(({ data }) => { if (data) setProgress(data); });
  }, [user]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex justify-between items-center bg-stone-900 p-6 rounded-3xl border border-stone-800">
           <h1 className="font-display text-3xl md:text-5xl font-extrabold uppercase">Welcome {profile?.nickname}</h1>
           <div className="flex gap-4">
             {profile?.role === 'admin' && <button onClick={() => navigate('/admin')} className="text-amber-500 font-bold flex items-center gap-2"><ShieldAlert/> Admin</button>}
             <button onClick={async () => { await signOut(); navigate('/'); }} className="text-stone-400 hover:text-white"><LogOut/></button>
           </div>
        </header>
        
        <div className="grid gap-6">
          {GAMES_CONFIG.map(g => (
             <div key={g.id} onClick={() => (g.isActive || profile?.role === 'admin') && navigate(`/arena/${g.id}`)} className={`p-8 rounded-3xl border-2 ${g.border} bg-gradient-to-br ${g.gradient} cursor-pointer`}>
               <h2 className="font-display text-3xl font-bold flex items-center gap-2">{g.title} {progress.some(p => p.game_id === g.id && p.is_solved) && <CheckCircle2 className="text-emerald-300"/>}</h2>
               <p className="mt-2 text-white/90">{g.description}</p>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}