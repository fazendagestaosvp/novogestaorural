import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, Activity, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const AccessControl: React.FC = () => {
  const { users, getUserStats } = useAuth();
  const stats = getUserStats();
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivityLogs() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        if (data) setActivityLogs(data);
      } catch (error) {
        console.error('Erro ao carregar logs de atividade:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchActivityLogs();
  }, []);

  // Função para registrar uma nova atividade
  const logActivity = async (user: string, action: string, type: string) => {
    try {
      const newLog = {
        user,
        action,
        timestamp: new Date().toISOString(),
        type
      };
      
      const { data, error } = await supabase
        .from('activity_logs')
        .insert([newLog])
        .select();
        
      if (error) throw error;
      
      // Atualiza o estado local com o novo log
      setActivityLogs(prev => [data[0], ...prev.slice(0, 4)]);
      
      return data[0];
    } catch (error) {
      console.error('Erro ao registrar atividade:', error);
      return null;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'role_change': return Shield;
      case 'user_create': return Users;
      case 'data_create': return CheckCircle;
      case 'data_view': return Activity;
      case 'access_denied': return XCircle;
      default: return Activity;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'role_change': return 'text-blue-600';
      case 'user_create': return 'text-green-600';
      case 'data_create': return 'text-green-600';
      case 'data_view': return 'text-gray-600';
      case 'access_denied': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Há poucos minutos';
    if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    return `Há ${Math.floor(diffInHours / 24)} dia${Math.floor(diffInHours / 24) > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Controle de Acesso</h1>
        <p className="text-muted-foreground">Monitor de atividades e controle de permissões do sistema</p>
      </div>

      {/* Access Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{activityLogs.length}</p>
                <p className="text-sm text-muted-foreground">Atividades Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {activityLogs.length > 0 ? 
                    Math.round(((activityLogs.length - (activityLogs.filter(log => log.type === 'access_denied').length)) / activityLogs.length) * 100) + '%' : 
                    '0%'}
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{activityLogs.filter(log => log.type === 'access_denied').length}</p>
                <p className="text-sm text-muted-foreground">Acessos Negados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Administradores</span>
                <Badge className="bg-red-100 text-red-800">{stats.administrador}</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${(stats.administrador / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Editores</span>
                <Badge className="bg-blue-100 text-blue-800">{stats.editor}</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(stats.editor / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Visualizadores</span>
                <Badge className="bg-gray-100 text-gray-800">{stats.visualizador}</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gray-600 h-2 rounded-full" 
                  style={{ width: `${(stats.visualizador / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Log de Atividades</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando dados...</p>
            </div>
          ) : activityLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.type);
                  const actionColorClass = getActionColor(log.type);
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{formatTimeAgo(log.timestamp)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${actionColorClass}`}>
                          <ActionIcon className="h-4 w-4 mr-1" />
                          {log.type.replace('_', ' ')}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Nenhum log de atividade encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

