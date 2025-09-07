import React, { useState } from 'react';
import { AnimatedBackground } from '../components/Layout/AnimatedBackground';
import { LoginForm } from '../components/Auth/LoginForm';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <AnimatedBackground />
      
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <LoginForm 
          onToggleMode={() => setIsRegister(!isRegister)}
          isRegister={isRegister}
        />
      </div>
    </div>
  );
};