import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ArrowRight, ArrowLeft, Mail, Lock, User, MapPin, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, createUserWithEmailAndPassword, signInWithPopup, doc, setDoc, getDoc, db } from '../lib/firebase';
import { UserProfile } from '../types';

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  province: string;
  agreeToTerms: boolean;
};

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

const STEPS = [
  { id: 1, title: 'Account', description: 'Create your account' },
  { id: 2, title: 'Location', description: 'Where do you shop?' },
  { id: 3, title: 'Review', description: 'Confirm your details' }
];

interface SignUpFormProps {
  onToggleForm: () => void;
}

export function SignUpForm({ onToggleForm }: SignUpFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    province: 'Gauteng',
    agreeToTerms: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
        if (currentStep === 1) {
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
            if (formData.password.length < 6) {
                setError("Password should be at least 6 characters.");
                return;
            }
        }
        setError('');
        setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreeToTerms) {
      setError("You must agree to the terms of service.");
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const userCred = credential.user;

      const userProfile: UserProfile = {
        displayName: `${formData.firstName} ${formData.lastName}`,
        email: userCred.email || formData.email,
        avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(formData.email)}`,
        loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
        preferredStoreLocation: formData.province,
      };

      await setDoc(doc(db, "users", userCred.uid), {
        uid: userCred.uid,
        displayName: userProfile.displayName,
        email: userProfile.email,
        loyaltyCards: userProfile.loyaltyCards,
        preferredStoreLocation: userProfile.preferredStoreLocation,
        updatedAt: new Date().toISOString()
      });
      
      localStorage.setItem('sa_user_profile', JSON.stringify(userProfile));
      navigate('/');

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else {
        setError('An error occurred during sign-up.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google') => {
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
      } else {
         await setDoc(doc(db, "users", userCred.uid), {
            uid: userCred.uid,
            displayName: userCred.displayName,
            email: userCred.email,
            loyaltyCards: loyaltyCards,
            preferredStoreLocation: preferredStoreLocation,
            updatedAt: new Date().toISOString()
        });
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
      {/* Brand lockup */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center shrink-0">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span
            className="text-foreground font-bold tracking-widest text-sm uppercase"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.15em' }}
          >
            chuse
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    currentStep > step.id
                      ? 'bg-primary text-primary-foreground'
                      : currentStep === step.id
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-[11px] mt-1.5 text-muted-foreground text-center tracking-wide uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-1 -mt-5">
                  <div
                    className={`h-full transition-all duration-300 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.28 }}
      >
        <div className="mb-5">
          <h2
            className="text-3xl font-bold text-foreground mb-1 uppercase leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {STEPS[currentStep - 1].description}
          </h2>
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </p>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {currentStep === 1 && (
            <>
              {/* Social sign-in */}
              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 text-sm font-medium border-border hover:bg-secondary"
                  onClick={() => handleSocialSignIn('google')}
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
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
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
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className="pl-9 h-11 bg-input-background border-transparent focus:border-primary focus:ring-primary/20 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className="pl-9 h-11 bg-input-background border-transparent focus:border-primary focus:ring-primary/20 text-sm"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="firstName" className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    First name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Thabo"
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                      className="pl-9 h-11 bg-input-background border-transparent focus:border-primary text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="lastName" className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Nkosi"
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    className="h-11 bg-input-background border-transparent focus:border-primary text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="province" className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Province
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <select
                    id="province"
                    value={formData.province}
                    onChange={(e) => updateFormData('province', e.target.value)}
                    className="w-full pl-9 pr-4 h-11 bg-input-background border border-transparent rounded-md text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select your province</option>
                    {SA_PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"/>
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-0.5">
                  We use this to show you prices from stores near you
                </p>
              </div>

              {/* Preferred retailers */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Retailers you visit
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Checkers', 'Pick n Pay', 'Woolworths', 'Shoprite'].map(store => (
                    <label
                      key={store}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border bg-card cursor-pointer hover:border-primary/40 hover:bg-secondary transition-colors"
                    >
                      <input type="checkbox" className="accent-primary w-3.5 h-3.5" />
                      <span className="text-sm text-foreground">{store}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="bg-card border border-border rounded-md divide-y divide-border overflow-hidden">
                <div className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Email</p>
                  <p className="text-sm font-medium text-foreground">{formData.email || '—'}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Name</p>
                  <p className="text-sm font-medium text-foreground">
                    {formData.firstName || formData.lastName
                      ? `${formData.firstName} ${formData.lastName}`.trim()
                      : '—'}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Province</p>
                  <p className="text-sm font-medium text-foreground">{formData.province || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => updateFormData('agreeToTerms', checked as boolean)}
                  className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                  I agree to the{' '}
                  <a href="#" className="text-primary hover:underline font-medium">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-2.5 pt-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-11 border-border hover:bg-secondary text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold"
                disabled={!formData.agreeToTerms || isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            )}
          </div>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button onClick={onToggleForm} className="text-primary hover:underline font-medium">
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
