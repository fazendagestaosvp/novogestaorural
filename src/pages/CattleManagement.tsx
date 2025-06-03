import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Eye, Edit, Trash2, Activity, Weight, Heart } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AddCattleForm } from '@/components/cattle/AddCattleForm';
import { CattleData } from '@/types/cattle';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const CattleManagement: React.FC = () => {
  const [cattleData, setCattleData] = useState<CattleData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCattle, setSelectedCattle] = useState<CattleData | null>(null);
  const [editingCattle, setEditingCattle] = useState<CattleData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Carregar dados do banco de dados e locais
    if (user) {
      loadCattleData();
      // Tentar sincronizar dados locais com o servidor quando o usuário estiver autenticado
      syncLocalData();
    }
  }, [user]);

  // Função para sincronizar dados locais com o servidor
  const syncLocalData = async () => {
    if (!user || isSyncing) return;
    
    try {
      setIsSyncing(true);
      
      // Verificar se há dados locais para sincronizar
      const localData = localStorage.getItem('localCattleData');
      if (!localData) return;
      
      const localCattleData: CattleData[] = JSON.parse(localData);
      const localOnlyRecords = localCattleData.filter(item => 
        item.id && (item.id.toString().startsWith('local_') || item.id.toString().startsWith('temp-'))
      );
      
      if (localOnlyRecords.length === 0) return;
      
      console.log(`Tentando sincronizar ${localOnlyRecords.length} registros locais...`);
      
      // Verificar se a tabela e funções RPC existem
      try {
        const adminClient = await import('../integrations/supabase/admin-client');
        await adminClient.ensureCattleTableExists();
        await adminClient.ensureRpcFunctionsExist();
      } catch (initError) {
        console.warn('Erro ao inicializar tabela/funções:', initError);
      }
      
      // Sincronizar cada registro local
      let syncedCount = 0;
      const failedRecords: CattleData[] = [];
      
      for (const record of localOnlyRecords) {
        const syncRecord = {
          ...record,
          user_id: user.id || '00000000-0000-0000-0000-000000000000',
          id: undefined, // Remover ID temporário para gerar um novo no banco
          created_at: record.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        try {
          // Tentar usar RPC primeiro
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('insert_cattle', { cattle_data: syncRecord });
            
          if (!rpcError && rpcData) {
            syncedCount++;
            continue;
          }
          
          // Fallback para inserção direta
          const { error } = await supabase
            .from('cattle')
            .insert([syncRecord]);
            
          if (!error) {
            syncedCount++;
          } else {
            failedRecords.push(record);
          }
        } catch (syncError) {
          console.error('Erro ao sincronizar registro:', syncError);
          failedRecords.push(record);
        }
      }
      
      // Atualizar localStorage apenas com registros que falharam
      if (failedRecords.length > 0) {
        localStorage.setItem('localCattleData', JSON.stringify(failedRecords));
      } else {
        localStorage.removeItem('localCattleData');
      }
      
      // Notificar usuário sobre sincronização
      if (syncedCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${syncedCount} registros locais foram sincronizados com o servidor.`,
        });
        
        // Recarregar dados para mostrar os registros sincronizados
        loadCattleData();
      }
    } catch (error) {
      console.error('Erro na sincronização de dados locais:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Função para carregar dados do gado
  const loadCattleData = async () => {
    setIsLoading(true);
    try {
      // Primeiro carregar dados locais do localStorage como fallback
      const localData = localStorage.getItem('localCattleData');
      let localCattleData: CattleData[] = [];
      
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          if (Array.isArray(parsedData)) {
            localCattleData = parsedData;
          }
        } catch (e) {
          console.warn('Erro ao analisar dados locais:', e);
        }
      }
      
      // Verificar se a tabela cattle existe
      try {
        // Primeiro verificar se a coluna user_id existe na tabela cattle
        let hasUserIdColumn = true;
        
        try {
          // Tentar uma consulta que usa a coluna user_id
          const { data: testData, error: testError } = await supabase
            .from('cattle')
            .select('id, user_id')
            .limit(1);
            
          if (testError && (testError.message.includes('column "user_id" does not exist') || 
                           testError.message.includes('column user_id does not exist'))) {
            console.log('A coluna user_id não existe na tabela cattle');
            hasUserIdColumn = false;
          }
        } catch (columnError) {
          console.warn('Erro ao verificar coluna user_id:', columnError);
          hasUserIdColumn = false;
        }
        
        // Estratégia 1: Se a coluna user_id existir, filtrar por usuário
        if (hasUserIdColumn && user?.id) {
          const { data, error } = await supabase
            .from('cattle')
            .select('*')
            .eq('user_id', user.id);
            
          if (!error && data) {
            console.log('Dados carregados com filtro de user_id:', data.length);
            // Se conseguir dados do servidor, mesclar com dados locais
            // Identificar registros locais (IDs que começam com 'local_' ou 'temp-')
            const localOnlyRecords = localCattleData.filter(item => 
              item.id && (item.id.toString().startsWith('local_') || item.id.toString().startsWith('temp-'))
            );
            
            // Combinar dados do servidor com registros locais
            const combinedData = [...data, ...localOnlyRecords];
            setCattleData(combinedData);
            return;
          }
        }
        
        // Estratégia 2: Se não tiver coluna user_id ou falhar, tentar carregar todos os registros
        console.log('Tentando carregar todos os registros sem filtro de user_id');
        const { data, error } = await supabase
          .from('cattle')
          .select('*');
          
        if (!error && data) {
          console.log('Dados carregados sem filtro:', data.length);
          // Se conseguir dados do servidor, mesclar com dados locais
          // Identificar registros locais (IDs que começam com 'local_' ou 'temp-')
          const localOnlyRecords = localCattleData.filter(item => 
            item.id && (item.id.toString().startsWith('local_') || item.id.toString().startsWith('temp-'))
          );
          
          // Combinar dados do servidor com registros locais
          const combinedData = [...data, ...localOnlyRecords];
          setCattleData(combinedData);
          return;
        } else {
          // Se houver erro, provavelmente a tabela não existe
          console.log('A tabela cattle pode não existir:', error);
          
          // Tentar criar a tabela
          try {
            const adminClient = await import('../integrations/supabase/admin-client');
            await adminClient.ensureCattleTableExists();
            await adminClient.ensureRpcFunctionsExist();
            
            // Tentar novamente após criar a tabela
            const { data: retryData, error: retryError } = await supabase
              .from('cattle')
              .select('*');
              
            if (!retryError && retryData) {
              // Combinar dados do servidor com registros locais
              const localOnlyRecords = localCattleData.filter(item => 
                item.id && (item.id.toString().startsWith('local_') || item.id.toString().startsWith('temp-'))
              );
              
              const combinedData = [...retryData, ...localOnlyRecords];
              setCattleData(combinedData);
              return;
            }
          } catch (createError) {
            console.error('Erro ao tentar criar tabela cattle:', createError);
          }
          
          // Usar apenas dados locais neste caso
          setCattleData(localCattleData);
          
          // Notificar usuário se houver dados locais
          if (localCattleData.length > 0) {
            toast({
              title: "Usando dados armazenados localmente",
              description: "Os dados do rebanho estão sendo exibidos do armazenamento local."
            });
          }
        }
      } catch (dbError) {
        console.error('Erro ao acessar a tabela cattle:', dbError);
        
        // Usar apenas dados locais em caso de erro
        setCattleData(localCattleData);
        
        // Notificar usuário se houver dados locais
        if (localCattleData.length > 0) {
          toast({
            title: "Usando dados armazenados localmente",
            description: "Os dados do rebanho estão sendo exibidos do armazenamento local."
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados de gado:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do rebanho.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCattle = cattleData.filter(cattle =>
    cattle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cattle.breed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCattle = cattleData.length;
  const averageWeight = cattleData.length > 0 
    ? Math.round(cattleData.reduce((sum, cattle) => sum + cattle.weight, 0) / totalCattle) 
    : 0;
  const healthyPercentage = cattleData.length > 0 
    ? Math.round((cattleData.filter(cattle => cattle.status === 'Ativo').length / totalCattle) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-100 text-green-800';
      case 'Tratamento': return 'bg-yellow-100 text-yellow-800';
      case 'Vendido': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddCattle = async (newCattle: CattleData) => {
    try {
      setIsLoading(true);
      const cattleWithUserId = {
        ...newCattle,
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Verificar se a tabela cattle existe
      const { data: tableExists, error: tableError } = await supabase
        .from('cattle')
        .select('id')
        .limit(1);

      if (tableError && tableError.message.includes('does not exist')) {
        console.log('Tabela cattle não existe. Tentando criar...');
        // Tentar criar a tabela usando função administrativa
        const adminClient = await import('../integrations/supabase/admin-client');
        await adminClient.ensureCattleTableExists();
        // Também garantir que as funções RPC existam
        await adminClient.ensureRpcFunctionsExist();
      }

      // Estratégia 1: Tentar usar a função RPC primeiro (mais confiável)
      console.log('Tentando inserir via RPC...');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('insert_cattle', { cattle_data: cattleWithUserId });
        
      if (!rpcError && rpcData) {
        console.log('Inserido com sucesso via RPC:', rpcData);
        // Adicionar o novo registro ao estado
        const newCattleWithId = { ...cattleWithUserId, id: rpcData.id };
        setCattleData(prev => [...prev, newCattleWithId]);
        setIsSheetOpen(false);
        toast({
          title: "Animal adicionado com sucesso!",
          description: `${newCattle.name} foi adicionado ao rebanho via RPC.`,
        });
        // Recarregar dados para garantir sincronização
        loadCattleData();
        return;
      }
      
      console.log('RPC falhou, tentando método padrão...', rpcError);
      
      // Estratégia 2: Tentar inserir diretamente na tabela
      const { data, error } = await supabase
        .from('cattle')
        .insert([cattleWithUserId])
        .select();

      if (!error && data) {
        // Inserção bem-sucedida
        setCattleData(prev => [...prev, data[0]]);
        setIsSheetOpen(false);
        toast({
          title: "Animal adicionado com sucesso!",
          description: `${newCattle.name} foi adicionado ao rebanho.`,
        });
        loadCattleData();
        return;
      }
      
      console.error('Erro ao adicionar gado via método padrão:', error);
      
      // Estratégia 3: Salvar localmente como último recurso
      const tempId = `temp-${Date.now()}`;
      const cattleWithTempId = { ...cattleWithUserId, id: tempId };
      const localCattle = JSON.parse(localStorage.getItem('localCattleData') || '[]');
      localCattle.push(cattleWithTempId);
      localStorage.setItem('localCattleData', JSON.stringify(localCattle));
      
      setCattleData(prev => [...prev, cattleWithTempId]);
      setIsSheetOpen(false);
      toast({
        title: "Animal adicionado localmente",
        description: `${newCattle.name} foi adicionado ao rebanho localmente.`,
      });
    } catch (error) {
      console.error('Erro ao adicionar animal:', error);
      toast({
        title: "Erro ao adicionar animal",
        description: "Não foi possível adicionar o animal ao rebanho. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateCattle = async (updatedCattle: CattleData) => {
    try {
      // Verificar se é um registro local
      const isLocalRecord = updatedCattle.id?.toString().startsWith('local_');
      
      if (isLocalRecord) {
        // Atualizar apenas localmente
        setCattleData(prev => {
          const newData = prev.map(cattle => 
            cattle.id === updatedCattle.id ? updatedCattle : cattle
          );
          // Salvar no localStorage
          localStorage.setItem('localCattleData', JSON.stringify(newData));
          return newData;
        });
        
        setIsEditDialogOpen(false);
        setEditingCattle(null);
        
        toast({
          title: "Animal atualizado localmente",
          description: `${updatedCattle.name} foi atualizado com sucesso no armazenamento local.`,
        });
        return;
      }
      
      // Tentar atualizar no banco de dados
      try {
        // Garantir que o user_id seja mantido
        const cattleWithUserId = {
          ...updatedCattle,
          updated_at: new Date().toISOString(),
          user_id: user?.id || '00000000-0000-0000-0000-000000000000' // Manter a associação com o usuário atual
        };
        
        // Estratégia 1: Tentar usar a função RPC primeiro (mais confiável)
        console.log('Tentando atualizar via RPC...');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('update_cattle', { 
            cattle_id: updatedCattle.id, 
            cattle_data: cattleWithUserId 
          });
          
        if (!rpcError && rpcData && rpcData.success) {
          console.log('Atualizado com sucesso via RPC:', rpcData);
          // Atualizar o estado local
          setCattleData(prev => prev.map(cattle => 
            cattle.id === updatedCattle.id ? cattleWithUserId : cattle
          ));
          
          setIsEditDialogOpen(false);
          setEditingCattle(null);
          
          toast({
            title: "Animal atualizado com sucesso!",
            description: `${updatedCattle.name} foi atualizado via RPC.`,
          });
          
          // Recarregar dados para garantir sincronização
          loadCattleData();
          return;
        }
        
        console.log('RPC falhou, tentando método padrão...', rpcError);
        
        // Estratégia 2: Método padrão - Verificar primeiro se o gado pertence ao usuário atual
        const { data: existingCattle, error: fetchError } = await supabase
          .from('cattle')
          .select('user_id')
          .eq('id', updatedCattle.id)
          .single() as any;
          
        if (fetchError) {
          console.error('Erro ao verificar propriedade do gado:', fetchError);
          throw fetchError;
        }
        
        // Verificar se o gado pertence ao usuário atual
        if (existingCattle?.user_id && existingCattle.user_id !== user?.id && 
            existingCattle.user_id !== '00000000-0000-0000-0000-000000000000') {
          throw new Error('Você não tem permissão para atualizar este gado');
        }
        
        const { error } = await supabase
          .from('cattle')
          .update(cattleWithUserId)
          .eq('id', updatedCattle.id)
          .eq('user_id', user?.id) as any; // Garantir que apenas gado do usuário atual seja atualizado
          
        if (error) {
          console.error('Erro na atualização:', error);
          throw error;
        }
        
        // Atualizar o estado local
        setCattleData(prev => 
          prev.map(cattle => cattle.id === updatedCattle.id ? updatedCattle : cattle)
        );
        
        setIsEditDialogOpen(false);
        setEditingCattle(null);
        
        toast({
          title: "Animal atualizado com sucesso!",
          description: `${updatedCattle.name} foi atualizado no rebanho.`,
        });
      } catch (dbError) {
        console.warn('Falha ao atualizar no banco, atualizando localmente:', dbError);
        
        // Atualizar apenas localmente
        setCattleData(prev => {
          const newData = prev.map(cattle => 
            cattle.id === updatedCattle.id ? updatedCattle : cattle
          );
          return newData;
        });
        
        setIsEditDialogOpen(false);
        setEditingCattle(null);
        
        toast({
          title: "Animal atualizado localmente",
          description: `${updatedCattle.name} foi atualizado localmente.`,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar animal:', error);
      toast({
        title: "Erro ao atualizar animal",
        description: "Não foi possível atualizar as informações do animal. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteCattle = async (cattleToDelete: CattleData) => {
    try {
      // Verificar se é um registro local
      const isLocalRecord = cattleToDelete.id?.toString().startsWith('local_');
      
      if (isLocalRecord) {
        // Remover apenas localmente
        setCattleData(prev => {
          const newData = prev.filter(cattle => cattle.id !== cattleToDelete.id);
          // Atualizar localStorage
          localStorage.setItem('localCattleData', JSON.stringify(newData));
          return newData;
        });
        
        setIsDeleteDialogOpen(false);
        setSelectedCattle(null);
        
        toast({
          title: "Animal removido",
          description: `${cattleToDelete.name} foi removido do rebanho local.`,
        });
        return;
      }
      
      // Tentar excluir do banco de dados
      try {
        // Estratégia 1: Tentar usar a função RPC primeiro (mais confiável)
        console.log('Tentando excluir via RPC...');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('delete_cattle', { cattle_id: cattleToDelete.id });
          
        if (!rpcError && rpcData && rpcData.success) {
          console.log('Excluído com sucesso via RPC:', rpcData);
          
          // Remover do estado local
          setCattleData(prev => prev.filter(cattle => cattle.id !== cattleToDelete.id));
          
          setIsDeleteDialogOpen(false);
          setSelectedCattle(null);
          
          toast({
            title: "Animal removido com sucesso!",
            description: `${cattleToDelete.name} foi removido do rebanho via RPC.`,
          });
          
          // Recarregar dados para garantir sincronização
          loadCattleData();
          return;
        }
        
        console.log('RPC falhou, tentando método padrão...', rpcError);
        
        // Estratégia 2: Método padrão - Verificar primeiro se o gado pertence ao usuário atual
        const { data: existingCattle, error: fetchError } = await supabase
          .from('cattle')
          .select('user_id')
          .eq('id', cattleToDelete.id)
          .single() as any;
          
        if (fetchError) {
          console.error('Erro ao verificar propriedade do gado:', fetchError);
          throw fetchError;
        }
        
        // Verificar se o gado pertence ao usuário atual
        if (existingCattle?.user_id && existingCattle.user_id !== user?.id && 
            existingCattle.user_id !== '00000000-0000-0000-0000-000000000000') {
          throw new Error('Você não tem permissão para excluir este gado');
        }
        
        const { error } = await supabase
          .from('cattle')
          .delete()
          .eq('id', cattleToDelete.id)
          .eq('user_id', user?.id) as any; // Garantir que apenas gado do usuário atual seja excluído
          
        if (error) {
          console.error('Erro na exclusão:', error);
          throw error;
        }
        
        // Remover do estado local
        setCattleData(prev => prev.filter(cattle => cattle.id !== cattleToDelete.id));
        
        setIsDeleteDialogOpen(false);
        setSelectedCattle(null);
        
        toast({
          title: "Animal removido com sucesso!",
          description: `${cattleToDelete.name} foi removido do rebanho.`,
        });
      } catch (dbError) {
        console.warn('Falha ao excluir no banco, removendo localmente:', dbError);
        
        // Remover apenas localmente
        setCattleData(prev => prev.filter(cattle => cattle.id !== cattleToDelete.id));
        
        setIsDeleteDialogOpen(false);
        setSelectedCattle(null);
        
        toast({
          title: "Animal removido localmente",
          description: `${cattleToDelete.name} foi removido do rebanho localmente.`,
        });
      }
    } catch (error) {
      console.error('Erro ao remover animal:', error);
      toast({
        title: "Erro ao remover animal",
        description: "Não foi possível remover o animal do rebanho. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleViewCattle = (cattle: CattleData) => {
    setSelectedCattle(cattle);
    setIsViewDialogOpen(true);
  };

  const handleEditCattle = (cattle: CattleData) => {
    setSelectedCattle(cattle);
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (cattle: CattleData) => {
    setSelectedCattle(cattle);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCattle = async () => {
    if (!selectedCattle) return;
    
    try {
      const { error } = await supabase
        .from('cattle')
        .delete()
        .eq('id', selectedCattle.id);
        
      if (error) throw error;
      
      setCattleData(prev => prev.filter(cattle => cattle.id !== selectedCattle.id));
      setIsDeleteDialogOpen(false);
      
      toast({
        title: "Animal removido com sucesso!",
        description: `${selectedCattle.name} foi removido do rebanho.`,
      });
      
      setSelectedCattle(null);
    } catch (error) {
      console.error('Erro ao remover animal:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o animal do rebanho. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancelAdd = () => {
    setIsSheetOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingCattle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Gado</h1>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Gado
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            <AddCattleForm 
              onSubmit={handleAddCattle}
              onCancel={handleCancelAdd}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gado</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCattle}</div>
            <p className="text-xs text-muted-foreground">Total atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Médio</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageWeight} kg</div>
            <p className="text-xs text-muted-foreground">Média do rebanho</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saúde do Rebanho</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyPercentage}%</div>
            <p className="text-xs text-muted-foreground">Animais ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou raça..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Gado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando dados...</p>
            </div>
          ) : filteredCattle.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCattle.map((cattle) => (
                  <TableRow key={cattle.id}>
                    <TableCell className="font-medium">{cattle.id}</TableCell>
                    <TableCell>{cattle.name}</TableCell>
                    <TableCell>{cattle.breed}</TableCell>
                    <TableCell>{cattle.age} anos</TableCell>
                    <TableCell>{cattle.weight}</TableCell>
                    <TableCell>{cattle.gender}</TableCell>
                    <TableCell>{cattle.category}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(cattle.status)}>
                        {cattle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleViewCattle(cattle)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEditCattle(cattle)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => openDeleteDialog(cattle)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      {selectedCattle && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Animal</DialogTitle>
              <DialogDescription>
                Informações completas sobre o animal selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm">ID</h3>
                  <p>{selectedCattle.id}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Nome</h3>
                  <p>{selectedCattle.name}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Raça</h3>
                  <p>{selectedCattle.breed}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Idade</h3>
                  <p>{selectedCattle.age} anos</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Peso</h3>
                  <p>{selectedCattle.weight} kg</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Gênero</h3>
                  <p>{selectedCattle.gender}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Categoria</h3>
                  <p>{selectedCattle.category}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Status</h3>
                  <Badge className={getStatusColor(selectedCattle.status)}>
                    {selectedCattle.status}
                  </Badge>
                </div>
              </div>
              
              {/* Seção para informações adicionais que podem ser adicionadas no futuro */}
              {/* <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">Histórico</h3>
                <p className="text-sm text-muted-foreground">
                  Informações de histórico podem ser adicionadas aqui.
                </p>
              </div> */}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingCattle && (
        <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            <AddCattleForm 
              isEditing={true}
              defaultValues={selectedCattle}
              onSubmit={handleUpdateCattle}
              onCancel={handleCancelEdit}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente o animal
              <strong> {selectedCattle?.name} </strong>
              do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteCattle}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
