import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Search, Plus, Eye, Edit, Trash2, Heart, Users, User } from 'lucide-react';
import { HorseData } from '@/types/horse';
import { AddHorseForm } from '@/components/horse/AddHorseForm';
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
import { useAuth } from '@/components/auth/AuthProvider';

export const HorseManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [horses, setHorses] = useState<HorseData[]>([]);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user from auth context
  
  // Estados para modais de visualização, edição e exclusão
  const [selectedHorse, setSelectedHorse] = useState<HorseData | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Variáveis para filtros e contagens
  const filteredHorses = horses.filter(horse =>
    horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    horse.breed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalHorses = horses.length;
  const femaleCount = horses.filter(horse => horse.gender === 'Fêmea').length;
  const maleCount = horses.filter(horse => horse.gender === 'Macho').length;

  useEffect(() => {
    fetchHorses();
  }, []);

  // Função para carregar dados dos cavalos
  async function fetchHorses() {
    setIsLoading(true);
    try {
      // Filtrar cavalos pelo usuário atual
      const { data, error } = await supabase
        .from('horse')
        .select('*')
        .eq('user_id', user?.id); // Filtrar apenas cavalos do usuário atual
        
      if (!error && data) {
        // Processar os dados para garantir que as URLs das imagens estão corretas
        const processedData = data.map(horse => {
          // Para cada cavalo, verificar e formatar corretamente os campos de imagem
          return {
            ...horse,
            // Garantir que animalPhotos é um array ou null
            animalPhotos: Array.isArray(horse.animalPhotos) ? 
              horse.animalPhotos.filter(url => typeof url === 'string' && url.trim() !== '') : 
              null,
            
            // Garantir que fatherPhoto, motherPhoto e registrationCertificate são strings ou null
            fatherPhoto: typeof horse.fatherPhoto === 'string' && horse.fatherPhoto.trim() !== '' ? 
              horse.fatherPhoto : null,
              
            motherPhoto: typeof horse.motherPhoto === 'string' && horse.motherPhoto.trim() !== '' ? 
              horse.motherPhoto : null,
              
            registrationCertificate: typeof horse.registrationCertificate === 'string' && horse.registrationCertificate.trim() !== '' ? 
              horse.registrationCertificate : null
          };
        });
        
        console.log('Dados dos cavalos processados:', processedData);
        setHorses(processedData);
      } else {
        console.log('A tabela horses pode não existir:', error);
        setHorses([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de cavalos:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados dos cavalos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Função para retornar classe CSS baseada no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Domado': return 'bg-green-100 text-green-800';
      case 'Em treinamento': return 'bg-blue-100 text-blue-800';
      case 'Potro': return 'bg-yellow-100 text-yellow-800';
      case 'Vendido': return 'bg-gray-100 text-gray-800';
      case 'Morto': return 'bg-red-100 text-red-800';
      case 'Prenha': return 'bg-purple-100 text-purple-800';
      case 'Saudável': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // IMPORTANTE: Para que as imagens funcionem corretamente, é necessário configurar o bucket 'horses' no Supabase
  // Acesse o Supabase Dashboard > Storage > Buckets > horses > Settings
  // 1. Defina "Public bucket access" como ON
  // 2. Em "Security", certifique-se de que as políticas permitem acesso anônimo para leitura
  //    Exemplo de política: { "id": "read-objects", "name": "Public Read", "operation": "read", "resources": ["objects"], "effect": "allow", "subjects": ["anon"] }
  
  // Função compartilhada para upload de arquivos
  async function uploadFile(file: File | string, path: string): Promise<string | null> {
    // Para debug
    console.log('uploadFile chamado com:', { fileType: typeof file, path });
    
    // Se for nulo ou undefined, retornar null
    if (!file) {
      console.log('Arquivo nulo ou undefined');
      return null;
    }
    
    // Se já for uma string (URL) válida, retornar como está
    if (typeof file === 'string' && file.trim() !== '') {
      console.log('URL existente detectada:', file);
      
      // Se a URL já tiver o formato do Supabase Storage, retornar como está
      if (file.includes('supabase') && file.includes('/storage/v1/')) {
        console.log('URL do Supabase Storage válida, retornando:', file);
        return file;
      }
      
      // Se for uma URL externa, podemos considerá-la válida e retornar
      if (file.startsWith('http')) {
        console.log('URL externa válida, retornando:', file);
        return file;
      }
      
      // Se chegou aqui, a string não é uma URL válida
      console.log('String não é uma URL válida:', file);
    }

    // Se for string vazia ou inválida, retornar null
    if (typeof file === 'string') {
      console.log('String vazia ou inválida');
      return null;
    }
    
    try {
      // Se chegou aqui, é um arquivo File
      console.log('Processando arquivo:', file.name, 'tamanho:', file.size, 'tipo:', file.type);
      
      // Verificar tipo de arquivo - apenas imagens e PDFs são permitidos
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        console.error('Tipo de arquivo não suportado:', file.type);
        return null;
      }
      
      // Gerar nome de arquivo único
      const fileExt = file.name.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
      const uniqueId = Date.now() + '-' + Math.floor(Math.random() * 1000);
      const fileName = `${path.replace(/\//g, '_')}_${uniqueId}.${fileExt}`;
      
      // Nome do bucket
      const bucketName = 'horses';
      
      console.log(`Iniciando upload para ${bucketName}/${fileName}`);
      
      // Verificar se o bucket existe
      try {
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
        
        // Se o bucket não existir, criar
        if (bucketError && bucketError.message && bucketError.message.includes('does not exist')) {
          console.log(`Bucket '${bucketName}' não existe, criando...`);
          
          const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true
          });
          
          if (createError) {
            console.error(`Erro ao criar bucket '${bucketName}':`, createError);
            // Continuar tentando o upload mesmo assim
          } else {
            console.log(`Bucket '${bucketName}' criado com sucesso`);  
          }
          
          // Tentar criar políticas para o bucket
          const { error: policyError } = await supabase.rpc('create_public_bucket_policy', { bucket_name: bucketName });
          if (policyError) {
            console.error('Erro ao criar política de acesso público:', policyError);
            // Continuar tentando o upload mesmo assim
          } else {
            console.log('Política de acesso público criada com sucesso');
          }
        } else {
          console.log(`Bucket '${bucketName}' já existe:`, bucketData);
        }
      } catch (bucketCheckError) {
        console.error('Erro ao verificar bucket:', bucketCheckError);
        // Continuar tentando o upload mesmo assim
      }
      
      // Fazer upload do arquivo
      console.log(`Enviando arquivo para ${bucketName}/${fileName}...`);
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`Erro no upload para ${bucketName}/${fileName}:`, uploadError);
        return null;
      }
      
      console.log('Upload bem-sucedido:', uploadResult);
      
      // Gerar URL pública
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      console.log('URL pública gerada:', urlData?.publicUrl);
      
      if (!urlData || !urlData.publicUrl) {
        console.error('Falha ao gerar URL pública');
        return null;
      }
      
      // Adicionar timestamp à URL para evitar cache do navegador
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      console.log('URL final com timestamp:', publicUrl);
      
      return publicUrl;
    } catch (error) {
      console.error(`Erro não tratado durante o upload:`, error);
      return null;
    }
  }

  // Função para adicionar um novo cavalo
  const handleAddHorse = async (newHorse: HorseData) => {
    try {
      console.log('Recebendo dados para adicionar:', newHorse);
      
      // Array para armazenar URLs das fotos do animal
      const photoUrls: string[] = [];
      
      // Processar fotos do animal uma a uma
      if (newHorse.animalPhotos && Array.isArray(newHorse.animalPhotos)) {
        for (const photo of newHorse.animalPhotos) {
          if (!photo) continue;
          try {
            // Se já é uma string (URL), adicionar diretamente
            if (typeof photo === 'string') {
              photoUrls.push(photo);
            } else {
              // Caso contrário, fazer upload do arquivo
              const url = await uploadFile(photo, 'animal');
              if (url) photoUrls.push(url);
            }
          } catch (error) {
            console.error('Erro no upload de foto de animal:', error);
          }
        }
      }
      
      // Processar foto do pai
      let fatherPhotoUrl = null;
      if (newHorse.fatherPhoto) {
        try {
          if (typeof newHorse.fatherPhoto === 'string') {
            fatherPhotoUrl = newHorse.fatherPhoto;
          } else {
            fatherPhotoUrl = await uploadFile(newHorse.fatherPhoto, 'pai');
          }
        } catch (error) {
          console.error('Erro no upload de foto do pai:', error);
        }
      }
      
      // Processar foto da mãe
      let motherPhotoUrl = null;
      if (newHorse.motherPhoto) {
        try {
          if (typeof newHorse.motherPhoto === 'string') {
            motherPhotoUrl = newHorse.motherPhoto;
          } else {
            motherPhotoUrl = await uploadFile(newHorse.motherPhoto, 'mae');
          }
        } catch (error) {
          console.error('Erro no upload de foto da mãe:', error);
        }
      }
      
      // Processar certificado
      let certificateUrl = null;
      if (newHorse.registrationCertificate) {
        try {
          if (typeof newHorse.registrationCertificate === 'string') {
            certificateUrl = newHorse.registrationCertificate;
          } else {
            certificateUrl = await uploadFile(newHorse.registrationCertificate, 'certificado');
          }
        } catch (error) {
          console.error('Erro no upload de certificado:', error);
        }
      }
      
      // Preparar objeto com dados para inserção
      const horseData = {
        name: newHorse.name,
        breed: newHorse.breed,
        age: Number(newHorse.age),
        color: newHorse.color,
        gender: newHorse.gender,
        status: newHorse.status,
        weight: newHorse.weight ? Number(newHorse.weight) : null,
        observations: newHorse.observations || null,
        dateOfBirth: newHorse.dateOfBirth ? new Date(newHorse.dateOfBirth).toISOString().split('T')[0] : null,
        entryDate: newHorse.entryDate ? new Date(newHorse.entryDate).toISOString().split('T')[0] : null,
        animalPhotos: photoUrls.length > 0 ? photoUrls : null,
        fatherPhoto: fatherPhotoUrl,
        motherPhoto: motherPhotoUrl,
        registrationCertificate: certificateUrl,
        user_id: user?.id, // Associar o cavalo ao usuário atual
      };
      
      console.log('Inserindo novo cavalo:', horseData);
      
      // Inserir no banco de dados
      const { data, error } = await supabase
        .from('horse')
        .insert([horseData])
        .select();
        
      if (error) {
        console.error('Erro ao inserir no banco de dados:', error);
        throw error;
      }
      
      // Atualizar o estado local com o novo cavalo
      if (data && data.length > 0) {
        setHorses([...horses, data[0]]);
      }
      
      setIsAddFormOpen(false);
      
      toast({
        title: "Cavalo adicionado",
        description: `${newHorse.name} foi adicionado com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao adicionar cavalo:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o cavalo. Verifique o console para mais detalhes.",
        variant: "destructive"
      });
    }
  };
  
  // Função para atualizar cavalos
  const handleUpdateHorse = async (updatedHorse: HorseData) => {
    try {
      console.log('Recebendo dados para atualizar:', updatedHorse);
      
      // Buscar dados atuais do cavalo para preservar URLs existentes
      const { data: currentHorseData, error: fetchError } = await supabase
        .from('horse')
        .select('*')
        .eq('id', updatedHorse.id)
        .single();
      
      if (fetchError) {
        console.error('Erro ao buscar dados atuais do cavalo:', fetchError);
        throw fetchError;
      }
      
      // Array para armazenar URLs das fotos do animal
      let photoUrls: string[] = [];
      
      // Se já existem fotos, preservar as URLs existentes
      if (currentHorseData?.animalPhotos && Array.isArray(currentHorseData.animalPhotos)) {
        photoUrls = [...currentHorseData.animalPhotos];
      }
      
      // Processar novas fotos do animal (se houver)
      if (updatedHorse.animalPhotos && Array.isArray(updatedHorse.animalPhotos)) {
        for (const photo of updatedHorse.animalPhotos) {
          if (!photo) continue;
          // Se a foto não for uma string (URL existente), é um novo arquivo para upload
          if (typeof photo !== 'string') {
            try {
              const url = await uploadFile(photo, 'animal');
              if (url) photoUrls.push(url);
            } catch (error) {
              console.error('Erro no upload de foto de animal:', error);
            }
          }
        }
      }
      
      // Processar foto do pai (preservando a existente se não houver nova)
      let fatherPhotoUrl = currentHorseData?.fatherPhoto || null;
      if (updatedHorse.fatherPhoto && typeof updatedHorse.fatherPhoto !== 'string') {
        try {
          const newUrl = await uploadFile(updatedHorse.fatherPhoto, 'pai');
          if (newUrl) fatherPhotoUrl = newUrl;
        } catch (error) {
          console.error('Erro no upload de foto do pai:', error);
        }
      }
      
      // Processar foto da mãe (preservando a existente se não houver nova)
      let motherPhotoUrl = currentHorseData?.motherPhoto || null;
      if (updatedHorse.motherPhoto && typeof updatedHorse.motherPhoto !== 'string') {
        try {
          const newUrl = await uploadFile(updatedHorse.motherPhoto, 'mae');
          if (newUrl) motherPhotoUrl = newUrl;
        } catch (error) {
          console.error('Erro no upload de foto da mãe:', error);
        }
      }
      
      // Processar certificado (preservando o existente se não houver novo)
      let certificateUrl = currentHorseData?.registrationCertificate || null;
      if (updatedHorse.registrationCertificate && typeof updatedHorse.registrationCertificate !== 'string') {
        try {
          const newUrl = await uploadFile(updatedHorse.registrationCertificate, 'certificado');
          if (newUrl) certificateUrl = newUrl;
        } catch (error) {
          console.error('Erro no upload de certificado:', error);
        }
      }
      
      // Preparar objeto com dados básicos para atualização
      const horseData: any = {
        name: updatedHorse.name,
        breed: updatedHorse.breed,
        age: Number(updatedHorse.age),
        color: updatedHorse.color,
        gender: updatedHorse.gender,
        status: updatedHorse.status,
        weight: updatedHorse.weight ? Number(updatedHorse.weight) : null,
        observations: updatedHorse.observations || null,
        dateOfBirth: updatedHorse.dateOfBirth ? new Date(updatedHorse.dateOfBirth).toISOString().split('T')[0] : null,
        entryDate: updatedHorse.entryDate ? new Date(updatedHorse.entryDate).toISOString().split('T')[0] : null,
        // Incluir os campos de arquivo mesmo que não tenham sido atualizados
        animalPhotos: photoUrls.length > 0 ? photoUrls : null,
        fatherPhoto: fatherPhotoUrl,
        motherPhoto: motherPhotoUrl,
        registrationCertificate: certificateUrl,
        // Manter a associação com o usuário atual
        user_id: user?.id
      };
      
      console.log('Atualizando dados do cavalo:', horseData);
      
      console.log('Atualizando dados do cavalo:', horseData);
      
      // Atualizar os dados no banco de dados
      const { error } = await supabase
        .from('horse')
        .update(horseData)
        .eq('id', updatedHorse.id);
        
      if (error) {
        console.error('Erro ao atualizar no banco de dados:', error);
        throw error;
      }
      
      // Atualizar o estado local com os dados atualizados
      const updatedHorses = horses.map(horse => 
        horse.id === updatedHorse.id ? { ...horse, ...horseData } : horse
      );
      
      setHorses(updatedHorses);
      setIsEditFormOpen(false);
      setSelectedHorse(null);
      
      toast({
        title: "Cavalo atualizado",
        description: `Os dados de ${updatedHorse.name} foram atualizados com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar cavalo:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados do cavalo. Verifique o console para mais detalhes.",
        variant: "destructive"
      });
    }
  };
  // Funções de navegação e controle de modais
  const handleCancelAdd = () => {
    setIsAddFormOpen(false);
  };

  const handleViewHorse = (horse: HorseData) => {
    // Log detalhado das URLs das imagens para depuração
    console.log('Visualizando cavalo:', horse.name);
    console.log('Animal Photos:', horse.animalPhotos);
    console.log('Father Photo:', horse.fatherPhoto);
    console.log('Mother Photo:', horse.motherPhoto);
    console.log('Certificate:', horse.registrationCertificate);
    
    // Configurar o cavalo selecionado para visualização
    setSelectedHorse(horse);
    setIsViewModalOpen(true);
  };

  const handleEditHorse = (horse: HorseData) => {
    setSelectedHorse(horse);
    setIsEditFormOpen(true);
  };

  const handleDeleteHorse = (horse: HorseData) => {
    setSelectedHorse(horse);
    setIsDeleteDialogOpen(true);
  };

  // Função para confirmar exclusão de cavalos
  const confirmDelete = async () => {
    if (!selectedHorse) return;

    try {
      // Verificar se o cavalo pertence ao usuário atual antes de excluir
      const { data: horseData, error: fetchError } = await supabase
        .from('horse')
        .select('user_id')
        .eq('id', selectedHorse.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Verificar se o cavalo pertence ao usuário atual
      if (horseData?.user_id && horseData.user_id !== user?.id) {
        throw new Error('Você não tem permissão para excluir este cavalo');
      }

      const { error } = await supabase
        .from('horse')
        .delete()
        .eq('id', selectedHorse.id)
        .eq('user_id', user?.id); // Garantir que apenas cavalos do usuário atual sejam excluídos

      if (error) throw error;

      // Atualiza o estado local
      setHorses(horses.filter(h => h.id !== selectedHorse.id));
      setIsDeleteDialogOpen(false);
      setSelectedHorse(null);
  
      toast({
        title: "Cavalo removido",
        description: `${selectedHorse.name} foi removido com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao excluir cavalo:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o cavalo. Verifique o console para mais detalhes.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Cavalos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu plantel de cavalos facilmente.</p>
        </div>
        <Button 
          className="mt-4 md:mt-0" 
          onClick={() => setIsAddFormOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Cavalo
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Cavalos</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHorses}</div>
            <p className="text-xs text-muted-foreground">Cavalos registrados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fêmeas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{femaleCount}</div>
            <p className="text-xs text-muted-foreground">Éguas e potras</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Machos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maleCount}</div>
            <p className="text-xs text-muted-foreground">Garanhões e potros</p>
          </CardContent>
        </Card>
      </div>

      {/* Campo de busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou raça..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista de cavalos */}
      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-8 text-center">
            <p>Carregando dados...</p>
          </div>
        ) : filteredHorses.length === 0 ? (
          <div className="p-8 text-center">
            <p>Nenhum cavalo encontrado.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Gênero</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHorses.map((horse) => (
                <TableRow key={horse.id}>
                  <TableCell className="font-medium">{horse.name}</TableCell>
                  <TableCell>{horse.breed}</TableCell>
                  <TableCell>{horse.age} anos</TableCell>
                  <TableCell>{horse.gender}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(horse.status)}>
                      {horse.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleViewHorse(horse)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditHorse(horse)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteHorse(horse)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {/* Modal de detalhes */}
      {selectedHorse && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Cavalo: {selectedHorse.name}</DialogTitle>
              <DialogDescription>
                Informações detalhadas sobre o cavalo selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Informações Gerais</h3>
                <p><strong>ID:</strong> {selectedHorse.id}</p>
                <p><strong>Nome:</strong> {selectedHorse.name}</p>
                <p><strong>Raça:</strong> {selectedHorse.breed}</p>
                <p><strong>Idade:</strong> {selectedHorse.age} anos</p>
                <p><strong>Cor:</strong> {selectedHorse.color}</p>
                <p><strong>Gênero:</strong> {selectedHorse.gender}</p>
                <p><strong>Status:</strong> <Badge className={getStatusColor(selectedHorse.status)}>{selectedHorse.status}</Badge></p>
                <p><strong>Peso:</strong> {selectedHorse.weight ? `${selectedHorse.weight} kg` : 'Não informado'}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Datas e Observações</h3>
                <p><strong>Data de Nascimento:</strong> {selectedHorse.dateOfBirth ? new Date(selectedHorse.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                <p><strong>Data de Entrada:</strong> {selectedHorse.entryDate ? new Date(selectedHorse.entryDate).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                <p><strong>Observações:</strong> {selectedHorse.observations || 'Nenhuma observação'}</p>
              </div>
            </div>

            {/* Seção de Fotos */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Fotos do Animal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {selectedHorse.animalPhotos && Array.isArray(selectedHorse.animalPhotos) && selectedHorse.animalPhotos.length > 0 ? (
                  selectedHorse.animalPhotos.map((photo, index) => {
                    // Garantir que photo é uma string válida
                    const photoUrl = typeof photo === 'string' && photo.trim() !== '' ? photo : '';
                    console.log(`Renderizando foto ${index + 1}:`, photoUrl);
                    
                    if (!photoUrl) return null;
                    
                    return (
                      <div key={index} className="border rounded-md overflow-hidden flex flex-col">
                        <div className="text-xs p-1 bg-gray-100 break-all">
                          {photoUrl.substring(0, 30)}{photoUrl.length > 30 ? '...' : ''}
                        </div>
                        <div className="relative pt-[75%] w-full bg-gray-50">
                          <img 
                            src={photoUrl} 
                            alt={`Foto ${index + 1} de ${selectedHorse.name}`}
                            className="absolute top-0 left-0 w-full h-full object-contain p-2"
                            crossOrigin="anonymous" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              console.error(`Erro ao carregar imagem ${index + 1}:`, photoUrl);
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                              e.currentTarget.className = "absolute top-0 left-0 w-full h-full object-contain p-8 bg-muted";
                            }}
                            onLoad={() => console.log(`Imagem ${index + 1} carregada com sucesso:`, photoUrl)}
                          />
                        </div>
                      </div>
                    );
                  }).filter(Boolean)
                ) : (
                  <p className="text-muted-foreground col-span-full">Nenhuma foto disponível</p>
                )}
              </div>
            </div>

            {/* Fotos dos pais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <h3 className="font-semibold mb-2">Foto do Pai</h3>
                {selectedHorse.fatherPhoto ? (
                  <div className="border rounded-md overflow-hidden flex flex-col">
                    <div className="text-xs p-1 bg-gray-100 break-all">
                      {typeof selectedHorse.fatherPhoto === 'string' ? 
                        selectedHorse.fatherPhoto.substring(0, 30) + (selectedHorse.fatherPhoto.length > 30 ? '...' : '') : 'URL inválida'}
                    </div>
                    <div className="relative pt-[75%] w-full bg-gray-50">
                      <img 
                        src={typeof selectedHorse.fatherPhoto === 'string' ? selectedHorse.fatherPhoto + '?t=' + Date.now() : ''} 
                        alt={`Pai de ${selectedHorse.name}`}
                        className="absolute top-0 left-0 w-full h-full object-contain p-2"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.error(`Erro ao carregar imagem do pai:`, selectedHorse.fatherPhoto);
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                          e.currentTarget.className = "absolute top-0 left-0 w-full h-full object-contain p-8 bg-muted";
                        }}
                        onLoad={() => console.log(`Imagem do pai carregada com sucesso:`, selectedHorse.fatherPhoto)}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma foto do pai disponível</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Foto da Mãe</h3>
                {selectedHorse.motherPhoto ? (
                  <div className="border rounded-md overflow-hidden flex flex-col">
                    <div className="text-xs p-1 bg-gray-100 break-all">
                      {typeof selectedHorse.motherPhoto === 'string' ? 
                        selectedHorse.motherPhoto.substring(0, 30) + (selectedHorse.motherPhoto.length > 30 ? '...' : '') : 'URL inválida'}
                    </div>
                    <div className="relative pt-[75%] w-full bg-gray-50">
                      <img 
                        src={typeof selectedHorse.motherPhoto === 'string' ? selectedHorse.motherPhoto + '?t=' + Date.now() : ''} 
                        alt={`Mãe de ${selectedHorse.name}`}
                        className="absolute top-0 left-0 w-full h-full object-contain p-2"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.error(`Erro ao carregar imagem da mãe:`, selectedHorse.motherPhoto);
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                          e.currentTarget.className = "absolute top-0 left-0 w-full h-full object-contain p-8 bg-muted";
                        }}
                        onLoad={() => console.log(`Imagem da mãe carregada com sucesso:`, selectedHorse.motherPhoto)}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma foto da mãe disponível</p>
                )}
              </div>
            </div>
            
            {/* Certificado */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Certificado de Registro</h3>
              {selectedHorse.registrationCertificate ? (
                <div className="border rounded-md overflow-hidden">
                  <div className="text-xs p-1 bg-gray-100 break-all">
                    {typeof selectedHorse.registrationCertificate === 'string' ? 
                      (selectedHorse.registrationCertificate.substring(0, 30) + 
                      (selectedHorse.registrationCertificate.length > 30 ? '...' : '') +
                      (selectedHorse.registrationCertificate.toLowerCase().endsWith('.pdf') ? ' (PDF)' : ' (Imagem)')) 
                      : 'URL inválida'}
                  </div>
                  
                  {typeof selectedHorse.registrationCertificate === 'string' && selectedHorse.registrationCertificate.toLowerCase().endsWith('.pdf') ? (
                    <div className="bg-muted p-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <line x1="10" y1="9" x2="8" y2="9"></line>
                      </svg>
                      <a 
                        href={typeof selectedHorse.registrationCertificate === 'string' ? 
                          selectedHorse.registrationCertificate + '?t=' + Date.now() : '#'} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline"
                        onClick={() => console.log('Abrindo certificado PDF:', selectedHorse.registrationCertificate)}
                      >
                        Abrir Certificado (PDF)
                      </a>
                    </div>
                  ) : (
                    <div className="relative pt-[75%] w-full bg-gray-50">
                      <img 
                        src={typeof selectedHorse.registrationCertificate === 'string' ? 
                          selectedHorse.registrationCertificate + '?t=' + Date.now() : ''} 
                        alt="Certificado de Registro"
                        className="absolute top-0 left-0 w-full h-full object-contain p-2"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.error(`Erro ao carregar certificado:`, selectedHorse.registrationCertificate);
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                          e.currentTarget.className = "absolute top-0 left-0 w-full h-full object-contain p-8 bg-muted";
                        }}
                        onLoad={() => console.log(`Certificado carregado com sucesso:`, selectedHorse.registrationCertificate)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Certificado não disponível</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de edição */}
      {selectedHorse && (
        <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Cavalo: {selectedHorse.name}</DialogTitle>
              <DialogDescription>
                Atualize as informações do cavalo selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1">
              <AddHorseForm 
                onSubmit={handleUpdateHorse} 
                onCancel={() => setIsEditFormOpen(false)} 
                defaultValues={selectedHorse}
                isEditing={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cavalo {selectedHorse?.name} será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folha lateral para adicionar novo cavalo */}
      <Sheet open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Adicionar Novo Cavalo</h2>
          <AddHorseForm onSubmit={handleAddHorse} onCancel={handleCancelAdd} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HorseManagement;
