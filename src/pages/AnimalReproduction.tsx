import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Search, Plus, Eye, Edit, Baby, Trash2 } from 'lucide-react';
import { ReproductionData } from '@/types/reproduction';
import { AddReproductionForm } from '@/components/reproduction/AddReproductionForm';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider'; // Adicionar importação do contexto de autenticação

export const AnimalReproduction = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [reproductionData, setReproductionData] = useState<ReproductionData[]>([]);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth(); // Adicionar importação do contexto de autenticação
  
  // Estados para modais de visualização, edição e exclusão
  const [selectedRecord, setSelectedRecord] = useState<ReproductionData | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchReproductionData();
  }, []);

  async function fetchReproductionData() {
    setIsLoading(true);
    try {
      if (!user?.id) {
        setReproductionData([]);
        setIsLoading(false);
        return;
      }
      
      console.log('Verificando se a tabela reproduction_records tem coluna user_id');
      // Verificar se a coluna user_id existe na tabela reproduction_records
      let hasUserIdColumn = false;
      try {
        const { error: columnCheckError } = await supabase
          .from('reproduction_records')
          .select('user_id')
          .limit(1);
          
        hasUserIdColumn = !columnCheckError || !columnCheckError.message.includes('user_id');
        console.log('Tabela reproduction_records tem coluna user_id:', hasUserIdColumn);
      } catch (e) {
        console.log('Erro ao verificar coluna user_id na tabela reproduction_records:', e);
      }
      
      let reproductionRecords = [];
      
      // Estratégia 1: Se a coluna user_id existir, filtrar por ela
      if (hasUserIdColumn) {
        console.log('Buscando registros de reprodução com filtro de user_id');
        try {
          const { data, error } = await supabase
            .from('reproduction_records')
            .select(`
              *,
              animal:animals(id, name, type)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (!error && data) {
            reproductionRecords = data;
            console.log('Registros de reprodução encontrados com filtro de user_id:', data.length);
          } else {
            console.log('Erro ao buscar registros de reprodução com filtro:', error);
          }
        } catch (e) {
          console.log('Erro ao buscar registros de reprodução com filtro:', e);
        }
      } 
      // Estratégia 2: Se a coluna não existir ou se houver erro, buscar todos os registros
      else {
        console.log('Buscando registros de reprodução sem filtro de user_id');
        try {
          const { data, error } = await supabase
            .from('reproduction_records')
            .select(`
              *,
              animal:animals(id, name, type)
            `)
            .order('created_at', { ascending: false });
            
          if (!error && data) {
            reproductionRecords = data;
            console.log('Registros de reprodução encontrados sem filtro:', data.length);
          } else {
            console.log('Erro ao buscar registros de reprodução sem filtro:', error);
          }
        } catch (e) {
          console.log('Erro ao buscar registros de reprodução sem filtro:', e);
        }
      }
      
      // Verificar se há dados e formatá-los
      if (reproductionRecords.length > 0) {
        console.log('Formatando dados de reprodução:', reproductionRecords);
        
        // Mapear os dados do banco para o formato da interface
        const formattedData: ReproductionData[] = reproductionRecords.map(item => ({
          id: item.id,
          // Usar o nome do animal se disponível, caso contrário usar o ID como string
          animal: item.animal?.name || `Animal ID: ${item.animal_id}`,
          // Garantir que o tipo seja um dos valores esperados
          type: (item.type === 'Bovino' || item.type === 'Equino') ? item.type : 'Bovino',
          // Garantir que o método seja um dos valores esperados
          method: ['IATF', 'Monta Natural', 'Repasse'].includes(item.method) 
            ? item.method as 'IATF' | 'Monta Natural' | 'Repasse'
            : 'IATF',
          startDate: item.start_date,
          // Garantir que o status seja um dos valores esperados
          status: ['Pendente', 'Prenha', 'Falhada'].includes(item.status)
            ? item.status as 'Pendente' | 'Prenha' | 'Falhada'
            : 'Pendente',
          ultrasounds: item.ultrasounds || 0,
          observations: item.observations || undefined,
        }));
        
        setReproductionData(formattedData);
      } else {
        // Se não houver dados, definir array vazio
        console.log('Nenhum registro de reprodução encontrado');
        setReproductionData([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de reprodução:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os registros de reprodução.",
        variant: "destructive",
      });
      setReproductionData([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredData = reproductionData.filter(item => {
    const matchesSearch = item.animal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'todos' || 
                     (activeTab === 'bovinos' && item.type === 'Bovino') ||
                     (activeTab === 'equinos' && item.type === 'Equino');
    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Prenha': return 'bg-green-100 text-green-800';
      case 'Pendente': return 'bg-yellow-100 text-yellow-800';
      case 'Falhada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Funções para lidar com as ações
  const handleAddReproduction = async (newReproduction: ReproductionData) => {
    try {
      // Primeiro, verificar se o animal existe ou precisa ser criado
      let animalId: string;
      
      // Verificar se o valor de animal é um ID ou um nome
      if (newReproduction.animal.startsWith('Animal ID:')) {
        // Já é um ID, extrair apenas o ID
        animalId = newReproduction.animal.replace('Animal ID:', '').trim();
      } else {
        // É um nome, verificar se o animal já existe
        const { data: existingAnimal, error: findError } = await supabase
          .from('animals')
          .select('id')
          .ilike('name', newReproduction.animal.trim())
          .single();
        
        if (findError && findError.code !== 'PGRST116') {
          // Erro diferente de "não encontrado"
          console.error('Erro ao buscar animal:', findError);
          throw new Error('Erro ao verificar animal no banco de dados');
        }
        
        if (existingAnimal) {
          // Animal encontrado, usar seu ID
          animalId = existingAnimal.id;
          console.log('Animal encontrado:', existingAnimal.id);
        } else {
          // Animal não encontrado, criar um novo
          console.log('Criando novo animal:', newReproduction.animal);
          const { data: newAnimal, error: createError } = await supabase
            .from('animals')
            .insert([{ 
              name: newReproduction.animal.trim(),
              type: newReproduction.type === 'Bovino' ? 'cattle' : 'horse',
              status: 'active'
            }])
            .select()
            .single();
            
          if (createError) {
            console.error('Erro ao criar animal:', createError);
            throw new Error('Não foi possível criar o registro do animal');
          }
          
          if (newAnimal) {
            animalId = newAnimal.id;
            console.log('Novo animal criado:', newAnimal.id);
          } else {
            throw new Error('Falha ao criar animal - nenhum ID retornado');
          }
        }
      }
      
      // Agora mapear os dados para a estrutura correta da tabela no Supabase
      const dataToInsert = {
        animal_id: animalId,
        type: newReproduction.type,
        method: newReproduction.method,
        start_date: newReproduction.startDate,
        status: newReproduction.status,
        ultrasounds: newReproduction.ultrasounds,
        observations: newReproduction.observations || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('Tentando inserir dados de reprodução:', dataToInsert);
      
      const { data, error } = await supabase
        .from('reproduction_records')
        .insert([dataToInsert])
        .select();
      
      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }
      
      console.log('Dados inseridos com sucesso:', data);
      
      // Update local state with the newly created record
      if (data && data.length > 0) {
        // Converter dados do banco para o formato da interface
        const newRecord: ReproductionData = {
          id: data[0].id,
          animal: data[0].animal_id,
          type: data[0].type,
          method: data[0].method,
          startDate: data[0].start_date,
          status: data[0].status,
          ultrasounds: data[0].ultrasounds,
          observations: data[0].observations,
        };
        setReproductionData(prev => [newRecord, ...prev]);
      }
      
      setIsAddFormOpen(false);
      
      toast({
        title: "Registro adicionado",
        description: `Registro de reprodução para ${newReproduction.animal} adicionado com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao adicionar registro de reprodução:', error);
      toast({
        title: "Erro ao adicionar registro",
        description: "Ocorreu um erro ao salvar o registro. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancelAdd = () => {
    setIsAddFormOpen(false);
  };

  const handleViewRecord = (record: ReproductionData) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleEditRecord = (record: ReproductionData) => {
    setSelectedRecord(record);
    setIsEditFormOpen(true);
  };

  const handleDeleteRecord = (record: ReproductionData) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedRecord) {
      try {
        const { error } = await supabase
          .from('reproduction_records')
          .delete()
          .eq('id', selectedRecord.id);
          
        if (error) throw error;
        
        // Update local state
        setReproductionData(prevData => 
          prevData.filter(record => record.id !== selectedRecord.id)
        );
        
        setIsDeleteDialogOpen(false);
        setSelectedRecord(null);
        
        toast({
          title: "Registro excluído",
          description: `O registro de reprodução para ${selectedRecord.animal} foi excluído.`,
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

  const handleUpdateRecord = async (updatedRecord: ReproductionData) => {
    try {
      // Mapear dados para a estrutura correta da tabela
      const dataToUpdate = {
        animal_id: updatedRecord.animal,
        type: updatedRecord.type,
        method: updatedRecord.method,
        start_date: updatedRecord.startDate,
        status: updatedRecord.status,
        ultrasounds: updatedRecord.ultrasounds,
        observations: updatedRecord.observations || null,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('reproduction_records')
        .update(dataToUpdate)
        .eq('id', updatedRecord.id);
        
      if (error) {
        console.error('Erro ao atualizar registro:', error);
        throw error;
      }
      
      // Update local state
      setReproductionData(prevData =>
        prevData.map(record => record.id === updatedRecord.id ? updatedRecord : record)
      );
      
      setIsEditFormOpen(false);
      setSelectedRecord(null);
      
      toast({
        title: "Registro atualizado",
        description: `As informações de reprodução para ${updatedRecord.animal} foram atualizadas.`,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reprodução Animal</h1>
        <Sheet open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
          <SheetTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            <AddReproductionForm onSubmit={handleAddReproduction} onCancel={handleCancelAdd} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reproductionData.length}</div>
            <p className="text-xs text-muted-foreground">Ciclos reprodutivos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reproductionData.length > 0 
                ? Math.round((reproductionData.filter(item => item.status === 'Prenha').length / reproductionData.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Prenhezes confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reproductionData.filter(item => item.status === 'Pendente').length}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando confirmação</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por animal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Reprodução</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="bovinos">Bovinos</TabsTrigger>
              <TabsTrigger value="equinos">Equinos</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
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
                      <TableHead>Método</TableHead>
                      <TableHead>Data de Início</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ultrassons</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.animal}</TableCell>
                        <TableCell>{record.type}</TableCell>
                        <TableCell>{record.method}</TableCell>
                        <TableCell>{new Date(record.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.ultrasounds}</TableCell>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Dialog */}
      {selectedRecord && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Registro de Reprodução</DialogTitle>
              <DialogDescription>
                Informações completas sobre o ciclo reprodutivo.
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
                  <p>{selectedRecord.type}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Método</h3>
                  <p>{selectedRecord.method}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Data de Início</h3>
                  <p>{new Date(selectedRecord.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Status</h3>
                  <Badge className={getStatusColor(selectedRecord.status)}>
                    {selectedRecord.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Ultrassons Realizados</h3>
                  <p>{selectedRecord.ultrasounds}</p>
                </div>
                {selectedRecord.observations && (
                  <div>
                    <h3 className="font-medium text-sm">Observações</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedRecord.observations}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {selectedRecord && (
        <Sheet open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            <AddReproductionForm
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
              de reprodução do animal <strong>{selectedRecord?.animal}</strong>.
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
