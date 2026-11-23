import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Terminal } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { demoLogin, isSupabaseConfigured } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured) {
      demoLogin(nickname || email.split('@')[0] || 'Player1', adminCode === 'SUDO' ? 'admin' : 'student');
      navigate('/dashboard');
      return;
    }

    try {
      if (isSignUp) {
        const role = adminCode === 'SUDO' ? 'admin' : 'student';
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname: nickname || email.split('@')[0], role } }
        });
        if (signUpErr) throw signUpErr;
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-orange-600 to-amber-700 text-white border-b lg:border-b-0 lg:border-r border-stone-800">
        <Terminal className="w-20 h-20 mb-6" />
        <h1 className="text-5xl md:text-6xl text-center font-display font-extrabold uppercase">ALGORITHM GO</h1>
        <p className="mt-6 text-sm text-orange-100 font-mono text-center max-w-sm">
          Initialize Secure Session
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-8 md:p-16">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          <h2 className="text-2xl font-display font-bold text-orange-500 mb-6 uppercase">
            {isSignUp ? 'New Player Registration' : 'Player Login'}
          </h2>

          {!isSupabaseConfigured && (
            <div className="p-3 bg-amber-950/60 border border-amber-600 text-amber-300 text-xs rounded-md">
              DEMO MODE ACTIVE: Database offline. Use admin code "SUDO" to test admin mode.
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950 border border-rose-600 text-rose-300 text-xs rounded-md">
              {error}
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-xs font-mono text-stone-400 mb-2">NICKNAME</label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-stone-900 border-2 border-stone-700 focus:border-orange-500 p-3 text-sm text-white outline-none rounded-lg"
                placeholder="ByteNinja"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-stone-400 mb-2">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-900 border-2 border-stone-700 focus:border-orange-500 p-3 text-sm text-white outline-none rounded-lg"
              placeholder="player@domain.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-stone-400 mb-2">PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-900 border-2 border-stone-700 focus:border-orange-500 p-3 text-sm text-white outline-none rounded-lg"
              placeholder="********"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-mono text-stone-400 mb-2">SECRET ADMIN CODE (Optional)</label>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                className="w-full bg-stone-900 border-2 border-stone-700 focus:border-orange-500 p-3 text-sm text-white outline-none rounded-lg"
                placeholder="Leave blank if student"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition mt-4"
          >
            {loading ? 'LOADING...' : isSignUp ? 'CREATE ACCOUNT' : 'LOGIN ->'}
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-xs font-mono text-stone-400 hover:text-orange-400 pt-4"
          >
            {isSignUp ? 'Already registered? Login' : 'Need an account? Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
