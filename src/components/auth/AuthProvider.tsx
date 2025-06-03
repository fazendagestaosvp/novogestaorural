import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Admin functions
  users: User[];
  updateUserRole: (userId: string, newRole: string) => Promise<void>;
  addUser: (userData: { email: string, full_name: string, role: string }) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  getUserStats: () => { visualizador: number; editor: number; administrador: number; total: number };
  refreshUsers: () => Promise<void>; // Added function to refresh users list
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // Carregar usuários do Supabase
  const fetchUsers = async () => {
    try {
      console.log('Carregando lista de usuários...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao carregar usuários:', error);
        throw error;
      }
      
      if (data) {
        console.log(`${data.length} usuários carregados`);
        setUsers(data);
      } else {
        console.warn('Nenhum usuário encontrado');
        setUsers([]);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };
  
  // Função para recarregar a lista de usuários
  const refreshUsers = async () => {
    await fetchUsers();
  };

  useEffect(() => {
    // Verificar autenticação e carregar usuários
    const checkAuth = async () => {
      setIsLoading(true);
      
      // Verificar se há um usuário salvo no localStorage
      const savedUser = localStorage.getItem('fazenda-vista-user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      
      // Carregar todos os usuários
      await fetchUsers();
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Buscar o usuário no Supabase com base no email
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error('Usuário não encontrado');
      }
      
      // Em um sistema real, a verificação da senha seria feita pelo serviço de autenticação
      // Aqui estamos apenas simulando para este projeto

      // Atualizar a data de atualização do usuário
      const updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('users')
        .update({ updated_at } as any)
        .eq('id', data.id);
        
      if (updateError) throw updateError;
      
      // Atualizar o usuário com a nova data de atualização
      const updatedUser = { ...data, updated_at };
      
      setUser(updatedUser);
      localStorage.setItem('fazenda-vista-user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('fazenda-vista-user');
    setUser(null);
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    try {
      // Verificar se o usuário já existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('Usuário já existe');
      }

      // Criar novo usuário
      const now = new Date().toISOString();
      const newUser = {
        email,
        full_name: `${firstName} ${lastName}`,
        role: 'user', // Default role
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select();

      if (error) throw error;

      // Login automático após registro
      setUser(data[0]);
      localStorage.setItem('fazenda-vista-user', JSON.stringify(data[0]));
      
      // Atualizar lista de usuários
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao registrar:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string): Promise<void> => {
    try {
      // Map the UI role to database role if needed
      const dbRole = mapRoleToDb(newRole);
      
      console.log(`Atualizando usuário ${userId} para role ${dbRole}`);
      
      const { error } = await supabase
        .from('users')
        .update({ role: dbRole } as any)
        .eq('id', userId);
        
      if (error) {
        console.error('Erro ao atualizar role:', error);
        throw error;
      }
      
      // Atualizar state local
      setUsers(prevUsers => 
        prevUsers.map(u => u.id === userId ? { ...u, role: dbRole } : u)
      );
      
      // Se o usuário atualizado for o atual usuário logado, atualizar também
      if (user && user.id === userId) {
        const updatedUser = { ...user, role: dbRole };
        setUser(updatedUser);
        localStorage.setItem('fazenda-vista-user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  };

  const addUser = async (userData: { email: string, full_name: string, role: string }): Promise<void> => {
    try {
      // Map the UI role to database role
      const dbRole = mapRoleToDb(userData.role);
      
      // Generate a UUID for the new user to ensure it has a valid ID
      const now = new Date().toISOString();
      const newUser = {
        ...userData,
        role: dbRole, // Use the mapped role value for the database
        created_at: now,
        updated_at: now
      };
      
      console.log('Tentando adicionar usuário com dados:', newUser);
      
      // Insert the new user and return the complete record
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select();
        
      if (error) {
        console.error('Erro ao adicionar usuário:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('Usuário criado mas nenhum dado retornado');
        // Fetch users to ensure we have the latest data
        await fetchUsers();
        return;
      }
      
      // Update local state with the new user
      setUsers(prevUsers => [...prevUsers, data[0]]);
      
      // Log the success for debugging
      console.log('Usuário adicionado com sucesso:', data[0]);
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  };

  const removeUser = async (userId: string): Promise<void> => {
    try {
      console.log(`Removendo usuário com ID: ${userId}`);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
        
      if (error) {
        console.error('Erro ao remover usuário:', error);
        throw error;
      }
      
      // Atualizar state local
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      console.log('Usuário removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  };

  const resetPassword = async (email: string) => {
    // Implementação de reset de senha depende do serviço de autenticação utilizado
    // Por enquanto, apenas simulamos a operação
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Password reset email sent to ${email}`);
  };

  // Map between UI role names and database role names
  const mapRoleToDb = (uiRole: string): string => {
    switch (uiRole) {
      case 'administrador': return 'admin';
      case 'editor': return 'manager';
      case 'visualizador': return 'user';
      // Handle database roles when displayed in UI
      case 'admin': return 'admin';
      case 'manager': return 'manager';
      case 'user': return 'user';
      default: return 'user';
    }
  };

  const mapRoleToUi = (dbRole: string): string => {
    switch (dbRole) {
      case 'admin': return 'administrador';
      case 'manager': return 'editor';
      case 'user': return 'visualizador';
      default: return 'visualizador';
    }
  };

  const getUserStats = () => {
    const total = users.length;
    const visualizador = users.filter(u => u.role === 'user').length;
    const editor = users.filter(u => u.role === 'manager').length;
    const administrador = users.filter(u => u.role === 'admin').length;
    
    return { visualizador, editor, administrador, total };
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      register,
      resetPassword,
      users,
      updateUserRole,
      addUser,
      removeUser,
      getUserStats,
      refreshUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
