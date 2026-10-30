import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SignInFormProps {
  onToggleForm: () => void;
  setUser?: (user: UserProfile | null) => void;
}

export function SignInForm({ onToggleForm, setUser }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const user = data.user;
      const session = data.session;
      const token = session?.access_token || '';
      const meta = user?.user_metadata || {};

      const fallbackProfile: UserProfile = {
        displayName: meta.displayName || meta.full_name || user?.email?.split('@')[0] || 'Member',
        email: user?.email || '',
        avatarUrl: meta.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user?.email || '')}`,
        loyaltyCards: meta.loyaltyCards || { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
        preferredStoreLocation: meta.province || 'Gauteng'
      };

      localStorage.setItem('sa_user_profile', JSON.stringify(fallbackProfile));
      if (token) localStorage.setItem('supabase_token', token);
      if (setUser) setUser(fallbackProfile);
      navigate('/');

    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') || err.status === 400) {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'An error occurred during sign-in.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-6 py-8 font-sans">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
          Sign In
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Sign in to sync your saved baskets and price alerts across devices.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 text-xs font-bold border-[#E2E0D8] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-[#FFE600] hover:text-black rounded-[4px]"
          onClick={handleGoogleSignIn}
        >
          <span className="w-4 h-4 mr-2 shrink-0 rounded-full bg-black text-[#FFE600] flex items-center justify-center text-[9px] font-black leading-none">
            G
          </span>
          Continue with Google
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2E0D8] dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="px-2 bg-white dark:bg-slate-900 text-slate-400 font-mono uppercase tracking-wider">
              or with email
            </span>
          </div>
        </div>

        {error && <p className="text-rose-600 text-xs font-mono">{error}</p>}

        <div className="space-y-1">
          <Label htmlFor="email" className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="thabo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-10 bg-[#F7F6F0] dark:bg-slate-800 border-transparent text-xs rounded-[4px]"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 h-10 bg-[#F7F6F0] dark:bg-slate-800 border-transparent text-xs rounded-[4px]"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-10 bg-slate-950 dark:bg-white text-white dark:text-black hover:bg-[#FFE600] hover:text-black text-xs font-black uppercase font-mono rounded-[4px]"
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </form>

      <div className="mt-6 text-center space-y-4 pt-4 border-t border-[#E2E0D8] dark:border-slate-800">
        <p className="text-xs text-slate-500">
          Don't have an account?{' '}
          <button onClick={onToggleForm} className="text-slate-900 dark:text-white font-bold underline cursor-pointer">
            Sign up
          </button>
        </p>

        {/* Clean text link for guest exploration */}
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white underline decoration-[#FFE600] decoration-2 underline-offset-4 cursor-pointer font-mono"
          >
            Just browsing? Continue to catalog →
          </button>
        </div>
      </div>
    </div>
  );
}
