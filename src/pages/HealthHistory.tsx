import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Plus, Eye, Edit, Syringe, Stethoscope, Pill, Calendar, Trash2 } from 'lucide-react';
import { AddHealthRecordForm } from '@/components/health/AddHealthRecordForm';
import { HealthRecord } from '@/types/health';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const HealthHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [healthData, setHealthData] = useState<HealthRecord[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user from auth context
  
  // Estados para modais de visualização, edição e exclusão
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Cache para mapeamento de nomes de animais para IDs
  const [animalNameToIdMap, setAnimalNameToIdMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setIsLoading(true);
      console.log('Iniciando carregamento de dados de saúde...');
      
      // Verificar se o usuário está logado
      if (!user?.id) {
        console.log('Usuário não autenticado, retornando lista vazia');
        setHealthData([]);
        setIsLoading(false);
        return;
      }
      
      console.log('Usuário autenticado:', user.id);
      
      // Verificar se a coluna user_id existe antes de tentar filtrar por ela
      let hasUserIdColumn = false;
      try {
        const { error: columnCheckError } = await supabase
          .from('health_records')
          .select('user_id')
          .limit(1);
          
        hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
        console.log('Coluna user_id existe:', hasUserIdColumn);
      } catch (e) {
        console.log('Erro ao verificar coluna user_id:', e);
      }
      
      // Estratégia 1: Se a coluna user_id existir, filtrar por ela
      if (hasUserIdColumn) {
        try {
          console.log('Carregando registros com filtro de user_id:', user.id);
          const { data, error } = await supabase
            .from('health_records')
            .select(`
              *,
              animal:animals (id, name)
            `)
            .eq('user_id', user.id)
            .order('date', { ascending: false });
            
          if (error) {
            console.error('Erro ao carregar com filtro de user_id:', error);
            // Se houver erro, retornar lista vazia para garantir que o usuário não veja dados de outros
            setHealthData([]);
          } else {
            console.log(`Encontrados ${data?.length || 0} registros para o usuário`);
            
            // Mapear os dados para o formato esperado pelo componente
            const formattedData = data?.map(record => ({
              id: record.id,
              animal: record.animal?.name || 'Animal desconhecido',
              type: record.type,
              procedure: record.procedure,
              date: record.date,
              veterinarian: record.veterinarian,
              status: record.status,
              observations: record.observations,
              cost: record.cost || 0,
            })) || [];
            
            setHealthData(formattedData);
          }
          
          setIsLoading(false);
          return;
        } catch (e) {
          console.error('Exceção ao carregar com filtro de user_id:', e);
        }
      }
      
      // Estratégia 2: Se a coluna user_id não existir, retornar lista vazia para novos usuários
      console.log('Coluna user_id não existe ou houve erro, retornando lista vazia para o novo usuário');
      setHealthData([]);
      
      // Atualizar o mapa de nomes de animais para IDs
      try {
        const { data: animals } = await supabase
          .from('animals')
          .select('id, name');
          
        if (animals && animals.length > 0) {
          const newMap = animals.reduce((map, animal) => {
            map[animal.name] = animal.id;
            return map;
          }, {});
          
          setAnimalNameToIdMap(newMap);
        }
      } catch (e) {
        console.log('Erro ao carregar mapa de animais:', e);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados de saúde:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os registros de saúde.",
        variant: "destructive"
      });
      setHealthData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = healthData.filter(item => {
    const matchesSearch = item.animal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.procedure.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleAddRecord = async (newRecord: HealthRecord) => {
    try {
      // Validate required fields
      if (!newRecord.animal || !newRecord.procedure || !newRecord.date || !newRecord.veterinarian) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Get or create animal ID
      let animalId = animalNameToIdMap[newRecord.animal];
      let animalType = 'cattle'; // Valor padrão para o tipo de animal
      
      // If we don't have an ID for this animal yet, try to find it in the database
      if (!animalId) {
        // Try to find the animal by name
        const { data: animalData, error: animalError } = await supabase
          .from('animals')
          .select('id, type')
          .ilike('name', newRecord.animal)
          .single();
        
        if (animalError || !animalData) {
          // If animal not found, create a new one
          const { data: newAnimal, error: createError } = await supabase
            .from('animals')
            .insert([{ 
              name: newRecord.animal.trim(),
              type: 'cattle', // Valor padrão para novos animais
              status: 'active'
            }])
            .select()
            .single();
            
          if (createError || !newAnimal) {
            console.error('Erro ao criar animal:', createError);
            throw new Error('Não foi possível criar o registro do animal');
          }
          
          animalId = newAnimal.id;
          animalType = newAnimal.type;
          
          // Update the local mapping
          setAnimalNameToIdMap(prev => ({
            ...prev,
            [newRecord.animal]: animalId
          }));
        } else {
          animalId = animalData.id;
          animalType = animalData.type || 'cattle';
        }
      }

      // Format the date to ISO string if it's not already
      const formattedDate = newRecord.date ? new Date(newRecord.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Prepare data for insertion
      const dataToInsert = {
        animal_id: animalId,
        animal_type: animalType, // Adicionando o tipo do animal
        type: newRecord.type || 'Vacinação',
        procedure: newRecord.procedure.trim(),
        date: formattedDate,
        veterinarian: newRecord.veterinarian.trim(),
        status: newRecord.status || 'Agendado',
        observations: newRecord.observations?.trim() || null,
        cost: newRecord.cost ? parseFloat(newRecord.cost.toString()) : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Verificar se a coluna user_id existe antes de tentar adicioná-la
      let hasUserIdColumn = false;
      try {
        const { error: columnCheckError } = await supabase
          .from('health_records')
          .select('user_id')
          .limit(1);
          
        hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
        console.log('Coluna user_id existe:', hasUserIdColumn);
      } catch (e) {
        console.log('Erro ao verificar coluna user_id:', e);
      }
      
      // Adicionar user_id apenas se a coluna existir e o usuário estiver logado
      if (hasUserIdColumn && user?.id) {
        dataToInsert['user_id'] = user.id;
        console.log('Adicionando user_id ao registro:', user.id);
      } else {
        console.log('Não foi possível adicionar user_id: coluna não existe ou usuário não está logado');
      }
      
      console.log('Tentando inserir dados de saúde:', dataToInsert);
      
      // First, insert the health record
      const { data: insertedRecord, error } = await supabase
        .from('health_records')
        .insert([dataToInsert])
        .select(`
          *,
          animal:animals (id, name)
        `)
        .single();
      
      if (error) {
        console.error('Erro do Supabase:', error);
        throw new Error(error.message || 'Erro ao salvar no banco de dados');
      }
      
      console.log('Dados de saúde inseridos com sucesso:', insertedRecord);
      
      if (insertedRecord) {
        const animalName = insertedRecord.animal?.name || newRecord.animal;
        
        // Update the local mapping if we have a new animal
        if (insertedRecord.animal?.id && !animalNameToIdMap[animalName]) {
          setAnimalNameToIdMap(prev => ({
            ...prev,
            [animalName]: insertedRecord.animal_id
          }));
        }
        
        const newData: HealthRecord = {
          id: insertedRecord.id,
          animal: animalName,
          type: insertedRecord.type,
          procedure: insertedRecord.procedure,
          date: insertedRecord.date,
          veterinarian: insertedRecord.veterinarian,
          status: insertedRecord.status,
          observations: insertedRecord.observations,
          cost: insertedRecord.cost || 0,
        };
        
        setHealthData(prev => [newData, ...prev]);
      }
      
      setIsSheetOpen(false);
      
      toast({
        title: "✅ Registro adicionado",
        description: "Novo registro de saúde foi adicionado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao adicionar registro de saúde:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o registro';
      
      toast({
        title: "❌ Erro ao adicionar registro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-100 text-green-800';
      case 'Agendado': return 'bg-blue-100 text-blue-800';
      case 'Em andamento': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Vacinação': return <Syringe className="h-4 w-4" />;
      case 'Exame': return <Stethoscope className="h-4 w-4" />;
      case 'Tratamento': return <Pill className="h-4 w-4" />;
      case 'Consulta': return <Calendar className="h-4 w-4" />;
      default: return <Stethoscope className="h-4 w-4" />;
    }
  };
  
  // Funções para lidar com as ações
  const handleViewRecord = (record: HealthRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleEditRecord = (record: HealthRecord) => {
    setSelectedRecord(record);
    setIsEditFormOpen(true);
  };

  const handleDeleteRecord = (record: HealthRecord) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedRecord) {
      try {
        console.log('Iniciando exclusão do registro:', selectedRecord.id);
        
        // Verificar se a coluna user_id existe antes de tentar filtrar por ela
        let hasUserIdColumn = false;
        try {
          const { error: columnCheckError } = await supabase
            .from('health_records')
            .select('user_id')
            .limit(1);
            
          hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
          console.log('Coluna user_id existe:', hasUserIdColumn);
        } catch (e) {
          console.log('Erro ao verificar coluna user_id:', e);
        }
        
        // Verificar propriedade do registro apenas se a coluna user_id existir
        let canDelete = true;
        if (hasUserIdColumn && user?.id) {
          try {
            // Verificar se o registro pertence ao usuário atual
            const { data: existingRecord, error: fetchError } = await supabase
              .from('health_records')
              .select('user_id')
              .eq('id', selectedRecord.id)
              .single();
              
            if (fetchError) {
              console.log('Erro ao verificar propriedade do registro:', fetchError);
            } else if (existingRecord?.user_id && existingRecord.user_id !== user.id) {
              // Se a coluna existe e o valor não corresponde ao usuário atual
              canDelete = false;
              throw new Error('Você não tem permissão para excluir este registro');
            }
          } catch (e) {
            if (!canDelete) throw e; // Propagar apenas erros de permissão
            console.log('Verificação de propriedade falhou, mas continuando:', e);
          }
        }
        
        // Estratégia em camadas para exclusão
        let deleteResult;
        let success = false;
        
        // Estratégia 1: Tentar excluir com filtro de user_id (se a coluna existir e o usuário estiver logado)
        if (hasUserIdColumn && user?.id) {
          try {
            console.log('Tentando excluir com filtro de user_id');
            deleteResult = await supabase
              .from('health_records')
              .delete()
              .eq('id', selectedRecord.id)
              .eq('user_id', user.id);
              
            if (!deleteResult.error) {
              success = true;
              console.log('Exclusão com filtro de user_id bem-sucedida');
            }
          } catch (e) {
            console.log('Erro ao excluir com filtro de user_id:', e);
          }
        }
        
        // Estratégia 2: Se a primeira falhar, tentar sem o filtro de user_id
        if (!success) {
          try {
            console.log('Tentando excluir sem filtro de user_id');
            deleteResult = await supabase
              .from('health_records')
              .delete()
              .eq('id', selectedRecord.id);
              
            if (!deleteResult.error) {
              success = true;
              console.log('Exclusão sem filtro de user_id bem-sucedida');
            }
          } catch (e) {
            console.log('Erro ao excluir sem filtro de user_id:', e);
            throw e; // Se ambas as estratégias falharem, propagar o erro
          }
        }
        
        const { error } = deleteResult;
          
        if (error) throw error;
        
        // Update local state
        setHealthData(prevData => 
          prevData.filter(record => record.id !== selectedRecord.id)
        );
        
        setIsDeleteDialogOpen(false);
        setSelectedRecord(null);
        
        toast({
          title: "Registro excluído",
          description: "O registro de saúde foi excluído com sucesso.",
        });
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o registro. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleUpdateRecord = async (updatedRecord: HealthRecord) => {
    try {
      console.log('Iniciando atualização do registro:', updatedRecord.id);
      
      // Verificar se a coluna user_id existe antes de tentar filtrar por ela
      let hasUserIdColumn = false;
      try {
        const { error: columnCheckError } = await supabase
          .from('health_records')
          .select('user_id')
          .limit(1);
          
        hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
        console.log('Coluna user_id existe:', hasUserIdColumn);
      } catch (e) {
        console.log('Erro ao verificar coluna user_id:', e);
      }
      
      // Verificar propriedade do registro apenas se a coluna user_id existir
      let canUpdate = true;
      if (hasUserIdColumn && user?.id) {
        try {
          // Verificar se o registro pertence ao usuário atual
          const { data: existingRecord, error: fetchError } = await supabase
            .from('health_records')
            .select('user_id')
            .eq('id', updatedRecord.id)
            .single();
            
          if (fetchError) {
            console.log('Erro ao verificar propriedade do registro:', fetchError);
          } else if (existingRecord?.user_id && existingRecord.user_id !== user.id) {
            // Se a coluna existe e o valor não corresponde ao usuário atual
            canUpdate = false;
            throw new Error('Você não tem permissão para atualizar este registro');
          }
        } catch (e) {
          if (!canUpdate) throw e; // Propagar apenas erros de permissão
          console.log('Verificação de propriedade falhou, mas continuando:', e);
        }
      }
      
      // Obter o ID do animal a partir do mapa ou buscar no banco de dados
      let animalId = animalNameToIdMap[updatedRecord.animal];
      if (!animalId) {
        // Tentar buscar o animal pelo nome
        const { data: animalData } = await supabase
          .from('animals')
          .select('id')
          .ilike('name', updatedRecord.animal)
          .single();
          
        if (animalData) {
          animalId = animalData.id;
          // Atualizar o mapa local
          setAnimalNameToIdMap(prev => ({
            ...prev,
            [updatedRecord.animal]: animalId
          }));
        }
      }
      
      // Mapear dados para a estrutura correta da tabela
      const dataToUpdate = {
        // Usar animal_id em vez de animal_name
        animal_id: animalId,
        type: updatedRecord.type,
        procedure: updatedRecord.procedure,
        date: updatedRecord.date,
        veterinarian: updatedRecord.veterinarian,
        status: updatedRecord.status,
        observations: updatedRecord.observations || null,
        cost: updatedRecord.cost || 0,
        updated_at: new Date().toISOString(),
      };
      
      // Adicionar user_id apenas se a coluna existir
      if (hasUserIdColumn && user?.id) {
        dataToUpdate['user_id'] = user.id;
        console.log('Incluindo user_id na atualização:', user.id);
      }
      
      console.log('Tentando atualizar dados de saúde:', dataToUpdate);
      
      // Estratégia em camadas para atualização
      let updateResult;
      let success = false;
      
      // Estratégia 1: Tentar atualizar com filtro de user_id (se a coluna existir e o usuário estiver logado)
      if (hasUserIdColumn && user?.id) {
        try {
          console.log('Tentando atualizar com filtro de user_id');
          updateResult = await supabase
            .from('health_records')
            .update(dataToUpdate)
            .eq('id', updatedRecord.id)
            .eq('user_id', user.id);
            
          if (!updateResult.error) {
            success = true;
            console.log('Atualização com filtro de user_id bem-sucedida');
          }
        } catch (e) {
          console.log('Erro ao atualizar com filtro de user_id:', e);
        }
      }
      
      // Estratégia 2: Se a primeira falhar, tentar sem o filtro de user_id
      if (!success) {
        try {
          console.log('Tentando atualizar sem filtro de user_id');
          updateResult = await supabase
            .from('health_records')
            .update(dataToUpdate)
            .eq('id', updatedRecord.id);
            
          if (!updateResult.error) {
            success = true;
            console.log('Atualização sem filtro de user_id bem-sucedida');
          }
        } catch (e) {
          console.log('Erro ao atualizar sem filtro de user_id:', e);
          throw e; // Se ambas as estratégias falharem, propagar o erro
        }
      }
      
      const { error } = updateResult;
      if (error) {
        console.error('Erro ao atualizar registro:', error);
        throw error;
      }
      
      // Update local state
      setHealthData(prevData =>
        prevData.map(record => record.id === updatedRecord.id ? updatedRecord : record)
      );
      
      setIsEditFormOpen(false);
      setSelectedRecord(null);
      
      toast({
        title: "Registro atualizado",
        description: "O registro de saúde foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar registro:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o registro. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const vaccinationCount = healthData.filter(item => item.type === 'Vacinação').length;
  const examCount = healthData.filter(item => item.type === 'Exame').length;
  const treatmentCount = healthData.filter(item => item.type === 'Tratamento').length;
  const consultationCount = healthData.filter(item => item.type === 'Consulta').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Histórico de Saúde</h1>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Adicionar Registro de Saúde</SheetTitle>
              <SheetDescription>
                Preencha as informações para adicionar um novo registro de saúde.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 pb-4">
              <AddHealthRecordForm
                onSubmit={handleAddRecord}
                onCancel={() => setIsSheetOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacinações</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaccinationCount}</div>
            <p className="text-xs text-muted-foreground">Aplicadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exames</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{examCount}</div>
            <p className="text-xs text-muted-foreground">Realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tratamentos</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{treatmentCount}</div>
            <p className="text-xs text-muted-foreground">Em curso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consultationCount}</div>
            <p className="text-xs text-muted-foreground">Agendadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por animal ou procedimento..."
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
          <CardTitle>Registros de Saúde</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando dados...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Veterinário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell>{record.animal}</TableCell>
                    <TableCell className="flex items-center space-x-1">
                      {getTypeIcon(record.type)}
                      <span>{record.type}</span>
                    </TableCell>
                    <TableCell>{record.procedure}</TableCell>
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell>{record.veterinarian}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleViewRecord(record)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEditRecord(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDeleteRecord(record)}>
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
      {selectedRecord && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Registro de Saúde</DialogTitle>
              <DialogDescription>
                Informações completas sobre o procedimento selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm">ID</h3>
                  <p>{selectedRecord.id}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Animal</h3>
                  <p>{selectedRecord.animal}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Tipo</h3>
                  <div className="flex items-center mt-1">
                    {getTypeIcon(selectedRecord.type)}
                    <span className="ml-1">{selectedRecord.type}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Procedimento</h3>
                  <p>{selectedRecord.procedure}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Data</h3>
                  <p>{new Date(selectedRecord.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Veterinário</h3>
                  <p>{selectedRecord.veterinarian}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Status</h3>
                  <Badge className={getStatusColor(selectedRecord.status)}>
                    {selectedRecord.status}
                  </Badge>
                </div>
                {selectedRecord.cost && (
                  <div>
                    <h3 className="font-medium text-sm">Custo</h3>
                    <p>R$ {selectedRecord.cost.toFixed(2)}</p>
                  </div>
                )}
              </div>
              {selectedRecord.observations && (
                <div className="col-span-2 mt-2">
                  <h3 className="font-medium text-sm">Observações</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedRecord.observations}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Sheet */}
      {selectedRecord && (
        <Sheet open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            <AddHealthRecordForm
              isEditing={true}
              defaultValues={selectedRecord}
              onSubmit={handleUpdateRecord}
              onCancel={() => setIsEditFormOpen(false)}
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
              Esta ação não pode ser desfeita. Isso removerá permanentemente o registro
              de saúde do animal <strong>{selectedRecord?.animal}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
