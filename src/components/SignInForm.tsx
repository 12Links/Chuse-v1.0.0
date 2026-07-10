import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, signInWithEmailAndPassword } from '../lib/firebase';
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
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userCred = credential.user;
      const idToken = await userCred.getIdToken();

      const fallbackProfile: UserProfile = {
        displayName: userCred.displayName || userCred.email?.split('@')[0] || 'Member',
        email: userCred.email || '',
        avatarUrl: userCred.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userCred.email || '')}`,
        loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
        preferredStoreLocation: 'Gauteng'
      };

      localStorage.setItem('sa_user_profile', JSON.stringify(fallbackProfile));
      localStorage.setItem('firebase_token', idToken);
      navigate('/');

    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError('An error occurred during sign-in.');
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
      const result = await signInWithPopup(auth, googleProvider);
      const userCred = result.user;
      const idToken = await userCred.getIdToken();
      
      const fallbackProfile: UserProfile = {
        displayName: userCred.displayName || userCred.email?.split('@')[0] || 'Member',
        email: userCred.email || '',
        avatarUrl: userCred.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userCred.email || '')}`,
        loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
        preferredStoreLocation: 'Gauteng'
      };

      localStorage.setItem('sa_user_profile', JSON.stringify(fallbackProfile));
      localStorage.setItem('firebase_token', idToken);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/unauthorized-domain') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          console.error(redirectError);
          setError(redirectError.message || 'Google Authentication failed.');
          return;
        }
      }
      setError(err.message || 'Google Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-8">
        <h2
          className="text-3xl font-bold text-foreground mb-1 uppercase leading-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Sign In
        </h2>
        <p className="text-sm text-muted-foreground">
          Welcome back! Access your account.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-5">
        <div className="space-y-2.5">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm font-medium border-black/10 bg-white text-black hover:bg-[#FFE600] hover:text-black"
            onClick={handleGoogleSignIn}
          >
            <span className="w-4 h-4 mr-2.5 shrink-0 rounded-full bg-black text-[#FFE600] flex items-center justify-center text-[10px] font-black leading-none">
              G
            </span>
            Continue with Google
          </Button>
        </div>
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-background text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              or with email
            </span>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-11 bg-input-background border-transparent focus:border-primary focus:ring-primary/20 text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 h-11 bg-input-background border-transparent focus:border-primary focus:ring-primary/20 text-sm"
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold"
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
      <div className="mt-5 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button onClick={onToggleForm} className="text-primary hover:underline font-medium">
            Sign up
          </button>
        </p>

        <div className="pt-4 border-t border-slate-100 flex flex-col items-center">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-xs font-black tracking-wider uppercase border border-dashed border-[#FFE600] hover:border-solid bg-[#FFE600]/5 hover:bg-[#FFE600] text-slate-800 hover:text-black transition-all shadow-2xs"
            onClick={() => {
              const guestProfile: UserProfile = {
                displayName: 'Guest Explorer',
                email: 'guest@chuse.co.za',
                avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=guest`,
                loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
                preferredStoreLocation: 'Gauteng',
                isGuest: true
              };
              localStorage.setItem('sa_user_profile', JSON.stringify(guestProfile));
              if (setUser) {
                setUser(guestProfile);
              }
              navigate('/');
            }}
          >
            Explore as Guest (No Sign Up Required)
          </Button>
        </div>
      </div>
    </div>
  );
}
