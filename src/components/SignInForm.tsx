import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, doc, getDoc, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface SignInFormProps {
  onToggleForm: () => void;
}

export function SignInForm({ onToggleForm }: SignInFormProps) {
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

      const userDoc = await getDoc(doc(db, "users", userCred.uid));
      let userProfile: UserProfile;

      if (userDoc.exists()) {
        const data = userDoc.data();
        userProfile = {
          displayName: data.displayName || userCred.displayName || userCred.email?.split('@')[0] || 'Member',
          email: userCred.email || data.email || '',
          avatarUrl: userCred.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userCred.email || '')}`,
          loyaltyCards: data.loyaltyCards || { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
          preferredStoreLocation: data.preferredStoreLocation || 'Gauteng'
        };
      } else {
        userProfile = {
          displayName: userCred.displayName || userCred.email?.split('@')[0] || 'Member',
          email: userCred.email || '',
          avatarUrl: userCred.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userCred.email || '')}`,
          loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
          preferredStoreLocation: 'Gauteng'
        };
      }
      
      localStorage.setItem('sa_user_profile', JSON.stringify(userProfile));
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
      
      let loyaltyCards = { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false };
      let preferredStoreLocation = 'Gauteng';

      const userDoc = await getDoc(doc(db, "users", userCred.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.loyaltyCards) loyaltyCards = data.loyaltyCards;
        if (data.preferredStoreLocation) preferredStoreLocation = data.preferredStoreLocation;
      }

      const userProfile: UserProfile = {
        displayName: userCred.displayName || userCred.email?.split('@')[0] || 'Member',
        email: userCred.email || '',
        avatarUrl: userCred.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userCred.email || '')}`,
        loyaltyCards,
        preferredStoreLocation
      };

      localStorage.setItem('sa_user_profile', JSON.stringify(userProfile));
      navigate('/');
    } catch (err: any) {
      console.error(err);
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
            className="w-full h-11 text-sm font-medium border-border hover:bg-secondary"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
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
      <div className="mt-5 text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button onClick={onToggleForm} className="text-primary hover:underline font-medium">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
