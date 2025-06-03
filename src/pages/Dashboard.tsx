import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Badge } from '@/components/ui/badge';
import { Leaf, Sun, CloudRain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [weather, setWeather] = useState({
    temperature: '0',
    precipitation: '0'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    cattle: 0,
    horses: 0,
    healthRecords: 0,
    documents: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Buscar tarefas pendentes
      await fetchUpcomingTasks();
      
      // Definir dados de clima padrão
      setWeather({
        temperature: '25',
        precipitation: '0'
      });
      
      // Buscar estatísticas gerais do sistema
      await fetchSystemStats();

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar algumas informações do dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Função para buscar tarefas pendentes
  async function fetchUpcomingTasks() {
    try {
      if (!user?.id) {
        setUpcomingTasks([]);
        return;
      }
      
      console.log('Verificando se a tabela tasks tem coluna user_id');
      // Verificar se a coluna user_id existe na tabela tasks
      let hasUserIdColumn = false;
      try {
        const { error: columnCheckError } = await supabase
          .from('tasks')
          .select('user_id')
          .limit(1);
          
        hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
        console.log('Tabela tasks tem coluna user_id:', hasUserIdColumn);
      } catch (e) {
        console.log('Erro ao verificar coluna user_id na tabela tasks:', e);
      }
      
      let tasksData = [];
      
      // Estratégia 1: Se a coluna user_id existir, filtrar por ela
      if (hasUserIdColumn) {
        console.log('Buscando tarefas com filtro de user_id');
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pendente')
          .order('dueDate', { ascending: true })
          .limit(5);
          
        if (!error && data) {
          tasksData = data;
          console.log('Tarefas encontradas com filtro de user_id:', data.length);
        } else {
          console.log('Erro ao buscar tarefas com filtro:', error);
        }
      } 
      // Estratégia 2: Se a coluna não existir ou se houver erro, buscar todos os registros
      else {
        console.log('Buscando tarefas sem filtro de user_id');
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'pendente')
          .order('dueDate', { ascending: true })
          .limit(5);
          
        if (!error && data) {
          tasksData = data;
          console.log('Tarefas encontradas sem filtro:', data.length);
        } else {
          console.log('Erro ao buscar tarefas sem filtro:', error);
        }
      }
      
      // Verificar se a tabela tasks existe
      if (tasksData.length > 0) {
        setUpcomingTasks(tasksData);
      } else {
        // Se não houver dados ou a tabela não existir, mostrar dados simulados
        console.log('Usando dados simulados para tarefas');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const simulatedTasks = [
          {
            id: '1',
            title: 'Vacinação de gado',
            description: 'Aplicar vacinas no rebanho',
            dueDate: tomorrow.toISOString().split('T')[0],
            priority: 'alta',
            status: 'pendente'
          },
          {
            id: '2',
            title: 'Manutenção de cercas',
            description: 'Verificar cercas do pasto leste',
            dueDate: nextWeek.toISOString().split('T')[0],
            priority: 'média',
            status: 'pendente'
          }
        ];
        setUpcomingTasks(simulatedTasks);
      }
    } catch (e) {
      console.error('Erro ao carregar tarefas:', e);
      setUpcomingTasks([]);
    }
  }

  async function fetchSystemStats() {
    try {
      let cattleCount = 0, horsesCount = 0, healthCount = 0, docsCount = 0;
      
      // Contagem de gado
      try {
        console.log('Verificando se a tabela cattle tem coluna user_id');
        // Verificar se a coluna user_id existe na tabela cattle
        let hasUserIdColumn = false;
        try {
          const { error: columnCheckError } = await supabase
            .from('cattle')
            .select('user_id')
            .limit(1);
            
          hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
          console.log('Tabela cattle tem coluna user_id:', hasUserIdColumn);
        } catch (e) {
          console.log('Erro ao verificar coluna user_id na tabela cattle:', e);
        }
        
        // Estratégia 1: Se a coluna user_id existir, filtrar por ela
        if (hasUserIdColumn && user?.id) {
          console.log('Buscando contagem de gado com filtro de user_id');
          const { count, error } = await supabase
            .from('cattle')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          if (!error) {
            cattleCount = count || 0;
            console.log('Contagem de gado com filtro de user_id:', cattleCount);
          } else {
            console.log('Erro ao buscar contagem de gado com filtro:', error);
          }
        } 
        // Estratégia 2: Se a coluna não existir ou se houver erro, buscar todos os registros
        else {
          console.log('Buscando contagem de gado sem filtro de user_id');
          const { count, error } = await supabase
            .from('cattle')
            .select('*', { count: 'exact', head: true });
            
          if (!error) {
            cattleCount = count || 0;
            console.log('Contagem de gado sem filtro:', cattleCount);
          } else {
            console.log('Erro ao buscar contagem de gado sem filtro:', error);
          }
        }
      } catch (e) {
        console.log('Erro ao buscar contagem de gado:', e);
      }

      // Contagem de cavalos
      try {
        console.log('Verificando se a tabela horse tem coluna user_id');
        // Verificar se a coluna user_id existe na tabela horse
        let hasUserIdColumn = false;
        try {
          const { error: columnCheckError } = await supabase
            .from('horse')
            .select('user_id')
            .limit(1);
            
          hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
          console.log('Tabela horse tem coluna user_id:', hasUserIdColumn);
        } catch (e) {
          console.log('Erro ao verificar coluna user_id na tabela horse:', e);
        }
        
        // Estratégia 1: Se a coluna user_id existir, filtrar por ela
        if (hasUserIdColumn && user?.id) {
          console.log('Buscando contagem de cavalos com filtro de user_id');
          const { count, error } = await supabase
            .from('horse')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          if (!error) {
            horsesCount = count || 0;
            console.log('Contagem de cavalos com filtro de user_id:', horsesCount);
          } else {
            console.log('Erro ao buscar contagem de cavalos com filtro:', error);
          }
        } 
        // Estratégia 2: Se a coluna não existir ou se houver erro, buscar todos os registros
        else {
          console.log('Buscando contagem de cavalos sem filtro de user_id');
          const { count, error } = await supabase
            .from('horse')
            .select('*', { count: 'exact', head: true });
            
          if (!error) {
            horsesCount = count || 0;
            console.log('Contagem de cavalos sem filtro:', horsesCount);
          } else {
            console.log('Erro ao buscar contagem de cavalos sem filtro:', error);
          }
        }
      } catch (e) {
        console.log('Erro ao buscar contagem de cavalos:', e);
      }

      // Contagem de registros de saúde
      try {
        console.log('Verificando se a tabela health_records tem coluna user_id');
        // Verificar se a coluna user_id existe na tabela health_records
        let hasUserIdColumn = false;
        try {
          const { error: columnCheckError } = await supabase
            .from('health_records')
            .select('user_id')
            .limit(1);
            
          hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
          console.log('Tabela health_records tem coluna user_id:', hasUserIdColumn);
        } catch (e) {
          console.log('Erro ao verificar coluna user_id na tabela health_records:', e);
        }
        
        // Estratégia 1: Se a coluna user_id existir, filtrar por ela
        if (hasUserIdColumn && user?.id) {
          console.log('Buscando contagem de registros de saúde com filtro de user_id');
          const { count, error } = await supabase
            .from('health_records')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          if (!error) {
            healthCount = count || 0;
            console.log('Contagem de registros de saúde com filtro de user_id:', healthCount);
          } else {
            console.log('Erro ao buscar contagem de registros de saúde com filtro:', error);
          }
        } 
        // Estratégia 2: Se a coluna não existir ou se houver erro, buscar todos os registros
        else {
          console.log('Buscando contagem de registros de saúde sem filtro de user_id');
          const { count, error } = await supabase
            .from('health_records')
            .select('*', { count: 'exact', head: true });
            
          if (!error) {
            healthCount = count || 0;
            console.log('Contagem de registros de saúde sem filtro:', healthCount);
          } else {
            console.log('Erro ao buscar contagem de registros de saúde sem filtro:', error);
          }
        }
      } catch (e) {
        console.log('Erro ao buscar contagem de registros de saúde:', e);
      }

      // Contagem de documentos
      try {
        console.log('Verificando se a tabela documents tem coluna user_id');
        // Verificar se a coluna user_id existe na tabela documents
        let hasUserIdColumn = false;
        try {
          const { error: columnCheckError } = await supabase
            .from('documents')
            .select('user_id')
            .limit(1);
            
          hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
          console.log('Tabela documents tem coluna user_id:', hasUserIdColumn);
        } catch (e) {
          console.log('Erro ao verificar coluna user_id na tabela documents:', e);
        }
        
        // Estratégia 1: Se a coluna user_id existir, filtrar por ela
        if (hasUserIdColumn && user?.id) {
          console.log('Buscando contagem de documentos com filtro de user_id');
          const { count, error } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          if (!error) {
            docsCount = count || 0;
            console.log('Contagem de documentos com filtro de user_id:', docsCount);
          } else {
            console.log('Erro ao buscar contagem de documentos com filtro:', error);
          }
        } 
        // Estratégia 2: Se a coluna não existir ou se houver erro, buscar todos os registros
        else {
          console.log('Buscando contagem de documentos sem filtro de user_id');
          const { count, error } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true });
            
          if (!error) {
            docsCount = count || 0;
            console.log('Contagem de documentos sem filtro:', docsCount);
          } else {
            console.log('Erro ao buscar contagem de documentos sem filtro:', error);
          }
        }
      } catch (e) {
        console.log('Erro ao buscar contagem de documentos:', e);
      }

      // Atualizar estatísticas
      setStats({
        cattle: cattleCount,
        horses: horsesCount, 
        healthRecords: healthCount,
        documents: docsCount
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getTaskBadgeColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-yellow-100 text-yellow-800';
      case 'média':
        return 'bg-blue-100 text-blue-800';
      case 'baixa':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskLabel = (dueDate: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskDate = new Date(dueDate);
    
    if (taskDate.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (taskDate.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã';
    } else {
      const diffTime = Math.abs(taskDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        return 'Esta semana';
      } else if (diffDays <= 14) {
        return 'Próxima semana';
      } else {
        return new Date(dueDate).toLocaleDateString();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-farm-gradient rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-shadow-lg">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-green-100 mt-2">
              Bem-vindo de volta ao sistema de gestão da fazenda
            </p>
            <div className="flex items-center space-x-2 mt-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {user?.role === 'admin' ? 'Administrador' : 
                 user?.role === 'manager' ? 'Editor' : 'Visualizador'}
              </Badge>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4 text-green-100">
            <div className="text-center">
              <Sun className="h-8 w-8 mx-auto mb-1" />
              <p className="text-sm">{weather.temperature}°C</p>
            </div>
            <div className="text-center">
              <CloudRain className="h-8 w-8 mx-auto mb-1" />
              <p className="text-sm">{weather.precipitation}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <DashboardStats stats={stats} />

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RecentActivity />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <span>Próximas Tarefas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <p className="text-muted-foreground">Carregando tarefas...</p>
              </div>
            ) : upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    task.priority === 'alta' ? 'bg-yellow-50 border border-yellow-200' :
                    task.priority === 'média' ? 'bg-blue-50 border border-blue-200' :
                    'bg-green-50 border border-green-200'
                  }`}>
                    <div>
                      <p className="font-medium text-gray-800">{task.title}</p>
                      <p className="text-sm text-gray-600">{task.description}</p>
                    </div>
                    <Badge variant="secondary" className={getTaskBadgeColor(task.priority)}>
                      {getTaskLabel(task.dueDate)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground">Nenhuma tarefa pendente</p>
                <p className="text-xs text-muted-foreground mt-1">As próximas tarefas aparecerão aqui</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
