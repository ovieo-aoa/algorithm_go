import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    async function load() {
      const { data: profiles } = await supabase.from('profiles').select('*');
      if (profiles) setStudents(profiles);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between">
           <h1 className="font-display text-4xl text-amber-500 flex items-center gap-3"><ShieldAlert/> Admin Panel</h1>
           <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2"><ArrowLeft/> Back</button>
        </header>
        <div className="bg-stone-900 rounded-3xl p-8 border border-stone-800">
           <h2 className="text-xl mb-4 font-bold">Registered Users</h2>
           {students.map(s => <div key={s.id} className="py-2 border-b border-stone-800">{s.nickname} ({s.role})</div>)}
        </div>
      </div>
    </div>
  );
}