
import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Leaf } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'reset';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-500 to-green-700 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <Leaf className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-white text-shadow-lg mb-2">
            Fazenda Vista
          </h1>
          <p className="text-green-100 text-lg">
            Sistema de Gestão Agropecuária
          </p>
        </div>

        {/* Auth Forms */}
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onSwitchToReset={() => setMode('reset')}
          />
        )}
        
        {mode === 'register' && (
          <RegisterForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        
        {mode === 'reset' && (
          <ResetPasswordForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
};
