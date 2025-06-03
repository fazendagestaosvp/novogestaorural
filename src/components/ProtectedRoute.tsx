
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthPage } from '@/pages/AuthPage';
import { AppLayout } from '@/components/layout/AppLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-500 to-green-700">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Verifica se o usuário tem acesso de administrador
  const isAdmin = user.role === 'administrador' || user.role === 'admin';
  if (adminOnly && !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-600 mb-2">Acesso Restrito</h2>
            <p className="text-gray-500">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
};
