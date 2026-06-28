import { useState } from 'react';
import { SignUpCarousel } from './SignUpCarousel';
import { SignUpForm } from './SignUpForm';
import { SignInForm } from './SignInForm'; // This will be created next

export function AuthenticationPage() {
  const [showSignIn, setShowSignIn] = useState(true);

  const toggleForm = () => {
    setShowSignIn(!showSignIn);
  };

  return (
    <div className="w-full h-screen flex">
      <div className="w-1/2 h-full hidden md:block">
        <SignUpCarousel />
      </div>
      <div className="w-full md:w-1/2 h-full flex items-center justify-center bg-background">
        {showSignIn ? (
          <SignInForm onToggleForm={toggleForm} />
        ) : (
          <SignUpForm onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
}
