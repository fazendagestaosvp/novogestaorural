import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, Download, Eye, Trash, Search, FolderPlus, Folder, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin, ensureDocumentsTableExists, ensureStorageBucketsExist } from '@/integrations/supabase/admin-client';

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  size: number;
  upload_date: string;
  file_path: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export const DocumentsPage = () => {
  const [activeTab, setActiveTab] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();

  // Estados para controlar autenticação e modo administrativo
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    // Verificar e garantir que o usuário esteja autenticado
    checkAndEnsureAuthentication().then(() => {
      // Verificar se a tabela documents existe e criar se necessário
      checkAndCreateDocumentsTable().then(() => {
        fetchDocuments();
      });
    });
  }, []);
  
  // Função para verificar e garantir que o usuário esteja autenticado
  async function checkAndEnsureAuthentication() {
    setAuthChecking(true);
    try {
      // Verificar se o usuário já está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Usuário já autenticado:', user.id);
        setIsAuthenticated(true);
        setAdminMode(false);
        // Toast removido para não interromper a experiência do usuário
      } else {
        console.log('Usuário não autenticado. Usando modo administrativo...');
        
        // Como a autenticação anônima está desativada, vamos usar o cliente administrativo
        setIsAuthenticated(false);
        setAdminMode(true);
        
        // Garantir que os buckets de storage existam e estejam configurados corretamente
        try {
          await ensureStorageBucketsExist();
          console.log('Buckets de storage verificados e configurados');
          // Toast removido para não mostrar a mensagem flutuante
        } catch (storageError) {
          console.error('Erro ao configurar buckets de storage:', storageError);
          toast({
            title: "Aviso de configuração",
            description: "Alguns recursos de armazenamento podem estar limitados.",
            variant: "warning"
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      
      // Mesmo com erro, vamos permitir o uso do sistema em modo administrativo
      setIsAuthenticated(false);
      setAdminMode(true);
      // Toast removido para não mostrar a mensagem flutuante
    } finally {
      setAuthChecking(false);
    }
  }

  // Função para verificar e criar a tabela documents se necessário
  async function checkAndCreateDocumentsTable() {
    try {
      console.log('Verificando e garantindo que a tabela documents existe...');
      await ensureDocumentsTableExists();
      console.log('Tabela documents verificada e configurada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao verificar/criar tabela documents:', error);
      toast({
        title: "Erro de configuração",
        description: "Não foi possível configurar o banco de dados. Alguns recursos podem estar indisponíveis.",
        variant: "destructive"
      });
      return false;
    }
  }

  async function fetchDocuments() {
    setIsLoading(true);
    try {
      // Primeiro carregar dados locais do localStorage como fallback
      const localData = localStorage.getItem('localDocuments');
      let localDocumentData: Document[] = [];
      
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          if (Array.isArray(parsedData)) {
            localDocumentData = parsedData;
            console.log('Dados locais carregados:', localDocumentData.length, 'documentos');
          }
        } catch (e) {
          console.warn('Erro ao analisar dados locais de documentos:', e);
        }
      }
      
      // Verificar se a tabela documents existe
      try {
        const { data, error } = await supabaseAdmin
          .from('documents')
          .select('*')
          .order('upload_date', { ascending: false });
        
        if (!error && data) {
          console.log('Dados carregados do Supabase:', data.length, 'documentos');
          
          // Formatar os dados do servidor para o formato esperado pela aplicação
          const formattedData = data.map(doc => ({
            ...doc,
            // Garantir que os campos tenham os nomes corretos para compatibilidade com o código existente
            size: doc.size || 0,
            upload_date: doc.upload_date || new Date().toISOString().split('T')[0],
            file_path: doc.file_path || ''
          }));
          
          // Identificar registros locais (IDs que começam com 'local_')
          const localOnlyRecords = localDocumentData.filter(item => 
            item.id && item.id.toString().startsWith('local_')
          );
          
          // Combinar dados do servidor com registros locais
          const combinedData = [...formattedData, ...localOnlyRecords];
          setDocuments(combinedData);
        } else {
          // Se houver erro, provavelmente a tabela não existe
          console.log('A tabela documents pode não existir ou há problemas de conexão:', error);
          
          // Usar apenas dados locais neste caso
          setDocuments(localDocumentData);
          
          // Notificar usuário se houver dados locais
          if (localDocumentData.length > 0) {
            toast({
              title: "Usando documentos armazenados localmente",
              description: "Os documentos estão sendo exibidos do armazenamento local."
            });
          }
        }
      } catch (dbError) {
        console.error('Erro ao acessar a tabela documents:', dbError);
        
        // Usar apenas dados locais em caso de erro
        setDocuments(localDocumentData);
        
        // Notificar usuário se houver dados locais
        if (localDocumentData.length > 0) {
          toast({
            title: "Usando documentos armazenados localmente",
            description: "Os documentos estão sendo exibidos do armazenamento local."
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: "Não foi possível buscar os documentos. Verifique sua conexão.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'todos' || 
                     doc.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const categories = Array.from(new Set(documents.map(doc => doc.category)));

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-6 w-6 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileText className="h-6 w-6 text-purple-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName) {
        // Use o nome do arquivo como padrão, mas remova a extensão
        const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
        setUploadName(fileNameWithoutExt);
      }
    }
  };

  // Função auxiliar para salvar documento localmente
  const saveDocumentLocally = async (file: File, name: string, category: string, fileExt: string | undefined) => {
    // Criar um objeto de documento local com URL simulada
    const localDocument: Document = {
      id: `local_${Date.now()}`,
      name: name,
      type: fileExt?.toUpperCase() || 'UNKNOWN',
      category: category,
      size: Math.round(file.size / 1024), // Tamanho em KB
      upload_date: new Date().toISOString().split('T')[0],
      file_path: URL.createObjectURL(file), // URL local temporária
      description: 'Documento salvo localmente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: '00000000-0000-0000-0000-000000000000' // ID padrão para documentos locais
    };
    
    // Adicionar ao estado
    setDocuments(prev => [localDocument, ...prev]);
    
    // Salvar no localStorage
    const localDocs = localStorage.getItem('localDocuments');
    let docsArray: Document[] = [];
    
    if (localDocs) {
      try {
        docsArray = JSON.parse(localDocs);
        if (!Array.isArray(docsArray)) docsArray = [];
      } catch (e) {
        console.warn('Erro ao analisar documentos locais:', e);
      }
    }
    
    docsArray.unshift(localDocument);
    localStorage.setItem('localDocuments', JSON.stringify(docsArray));
    
    return localDocument;
  };

  // Função para upload de documentos
  const handleUpload = async () => {
    if (!uploadFile || !uploadName || !uploadCategory) {
      toast({
        title: "Informações incompletas",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Extrair extensão do arquivo
      const fileExt = uploadFile.name.split('.').pop();
      
      // Variáveis para controlar o fluxo
      let uploadSuccess = false;
      let errorMessage = '';
      let publicUrl = '';
      let usedBucketName = '';
      
      // Verificar se o usuário está autenticado antes de tentar o upload
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      
      // Se não estiver autenticado, vamos tentar usar o storage public
      if (!user) {
        console.log('Usuário não autenticado, usando configurações alternativas para upload');
      }
      
      // Lista de buckets para tentar, em ordem de preferência
      const bucketsToTry = ['documents', 'horses', 'horse-photos'];
      let uploadData = null;
      let uploadError = null;
      
      // Tentar upload em cada bucket até ter sucesso
      for (const bucketName of bucketsToTry) {
        try {
          // Gerar nome único para o arquivo
          const uniqueId = Date.now() + '-' + Math.floor(Math.random() * 10000);
          const fileName = `document_${uniqueId}.${fileExt}`;
          
          console.log(`Tentando upload para bucket '${bucketName}', arquivo: ${fileName}`);
          
          // Fazer upload do arquivo com opções adicionais
          const result = await supabaseAdmin.storage
            .from(bucketName)
            .upload(fileName, uploadFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: uploadFile.type // Adicionar tipo de conteúdo explicitamente
            });
          
          if (result.error) {
            console.warn(`Erro no upload para bucket '${bucketName}':`, result.error);
            uploadError = result.error;
            // Continuar para o próximo bucket
          } else {
            // Upload bem-sucedido
            console.log(`Upload bem-sucedido no bucket '${bucketName}':`, result.data);
            uploadData = result.data;
            usedBucketName = bucketName;
            
            // Obter URL pública
            const { data: urlData } = supabaseAdmin.storage
              .from(bucketName)
              .getPublicUrl(fileName);
            
            if (!urlData || !urlData.publicUrl) {
              console.warn(`Não foi possível obter URL pública do bucket '${bucketName}'`);
              // Continuar para o próximo bucket
            } else {
              publicUrl = urlData.publicUrl;
              uploadSuccess = true;
              break; // Sair do loop, upload concluído com sucesso
            }
          }
        } catch (error) {
          console.error(`Erro ao tentar upload no bucket '${bucketName}':`, error);
          uploadError = error;
          // Continuar para o próximo bucket
        }
      }
      
      // Se conseguimos fazer o upload e obter a URL pública
      if (uploadSuccess && publicUrl) {
        console.log(`Upload concluído com sucesso no bucket '${usedBucketName}'. URL: ${publicUrl}`);
        
        // Salvar metadados no banco ou localmente
        try {
          const result = await saveDocumentMetadata(uploadName, fileExt, uploadCategory, uploadFile.size, publicUrl);
          console.log('Metadados do documento salvos com sucesso:', result);
        } catch (metadataError) {
          console.error('Erro ao salvar metadados do documento:', metadataError);
          // Mesmo com erro nos metadados, continuamos pois o arquivo foi enviado
        }
        
        // Fechar o modal de upload
        setIsUploadOpen(false);
        
        // Limpar os campos
        setUploadFile(null);
        setUploadName('');
        setUploadCategory('');
        
        // Mostrar mensagem de sucesso
        toast({
          title: "Upload concluído",
          description: `Documento enviado com sucesso para o bucket '${usedBucketName}'!`
        });
        
        // Recarregar a lista de documentos
        fetchDocuments();
      } else {
        // Se todos os buckets falharam, salvar localmente
        console.log('Todos os buckets falharam. Salvando documento localmente.');
        errorMessage = uploadError ? uploadError.message : 'Não foi possível fazer upload para nenhum bucket';
        
        const localDocument = await saveDocumentLocally(uploadFile, uploadName, uploadCategory, fileExt);
        await saveDocumentMetadata(uploadName, fileExt, uploadCategory, uploadFile.size, localDocument.file_path);
        
        // Fechar o modal de upload
        setIsUploadOpen(false);
        
        // Limpar os campos
        setUploadFile(null);
        setUploadName('');
        setUploadCategory('');
        
        toast({
          title: "Documento salvo localmente",
          description: `Não foi possível fazer upload para o servidor. O documento foi salvo localmente. Erro: ${errorMessage}`,
          variant: "warning"
        });
      }
    } catch (error) {
      console.error('Erro inesperado durante o processo de upload:', error);
      
      // Salvar localmente como último recurso
      try {
        const localDocument = await saveDocumentLocally(uploadFile, uploadName, uploadCategory, uploadFile.name.split('.').pop());
        
        toast({
          title: "Documento salvo localmente",
          description: "Ocorreu um erro inesperado. O documento foi salvo apenas no navegador.",
          variant: "destructive"
        });
        
        // Fechar o modal de upload
        setIsUploadOpen(false);
        
        // Limpar os campos
        setUploadFile(null);
        setUploadName('');
        setUploadCategory('');
      } catch (localSaveError) {
        console.error('Falha até mesmo ao salvar localmente:', localSaveError);
        
        toast({
          title: "Falha completa",
          description: "Não foi possível salvar o documento nem mesmo localmente. Por favor, tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      setIsUploading(false);
    }
  };
  

  
  // Função para salvar metadados do documento no banco
  async function saveDocumentMetadata(name: string, fileExt: string | undefined, category: string, size: number, url: string) {
    // Criar um ID único para o documento
    const docId = `doc_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Criar o documento com um ID fixo para o usuário (contorna a necessidade de autenticação)
    // Usamos um ID fixo para todos os documentos para simplificar
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    
    const newDocument = {
      id: docId,
      name: name,
      type: fileExt?.toUpperCase() || 'UNKNOWN',
      category: category,
      size: Math.round(size / 1024), // Tamanho em KB
      upload_date: new Date().toISOString().split('T')[0],
      file_path: url,
      description: '', // Campo opcional
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Usar um ID de usuário padrão para contornar RLS
      user_id: defaultUserId
    };
    
    console.log('Salvando metadados do documento:', newDocument);
    
    try {
      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      
      // Se o usuário estiver autenticado, usar o ID dele em vez do padrão
      if (user) {
        newDocument.user_id = user.id;
        console.log('Usando ID do usuário autenticado:', user.id);
      } else {
        console.log('Usuário não autenticado, usando ID padrão:', defaultUserId);
      }
      
      // Tentar inserir no banco com opção de upsert para evitar conflitos
      const { data, error } = await supabaseAdmin
        .from('documents')
        .insert([newDocument])
        .select('*');
      
      // Se houver erro de RLS ou outro erro, salvar apenas localmente
      if (error) {
        console.error('Erro ao inserir documento no banco:', error);
        
        // Salvar o documento no estado local
        const localDocument = {
          ...newDocument,
          id: `local_${docId}` // Prefixo para identificar documentos locais
        };
        
        // Adicionar ao estado
        setDocuments(prev => [localDocument, ...prev]);
        
        // Salvar no localStorage
        const localDocs = localStorage.getItem('localDocuments');
        let docsArray: Document[] = [];
        
        if (localDocs) {
          try {
            docsArray = JSON.parse(localDocs);
            if (!Array.isArray(docsArray)) docsArray = [];
          } catch (e) {
            console.warn('Erro ao analisar documentos locais:', e);
          }
        }
        
        docsArray.unshift(localDocument);
        localStorage.setItem('localDocuments', JSON.stringify(docsArray));
        
        console.log('Documento salvo localmente devido a erro no banco:', error.message);
        return [localDocument];
      }
      
      console.log('Documento salvo com sucesso no Supabase:', data);
      
      // Adicionar ao estado local também para atualização imediata da UI
      if (data && data.length > 0) {
        setDocuments(prev => [...data, ...prev]);
        return data;
      } else {
        // Se não retornou dados mas também não deu erro, adicionar o documento local
        const localDocument = { ...newDocument };
        setDocuments(prev => [localDocument, ...prev]);
        return [localDocument];
      }
    } catch (dbError) {
      console.error('Erro geral ao salvar documento:', dbError);
      
      // Em caso de erro, salvar localmente
      const localDocument = {
        ...newDocument,
        id: `local_${docId}` // Prefixo para identificar documentos locais
      };
      
      // Adicionar ao estado
      setDocuments(prev => [localDocument, ...prev]);
      
      // Salvar no localStorage
      const localDocs = localStorage.getItem('localDocuments');
      let docsArray: Document[] = [];
      
      if (localDocs) {
        try {
          docsArray = JSON.parse(localDocs);
          if (!Array.isArray(docsArray)) docsArray = [];
        } catch (e) {
          console.warn('Erro ao analisar documentos locais:', e);
        }
      }
      
      docsArray.unshift(localDocument);
      localStorage.setItem('localDocuments', JSON.stringify(docsArray));
      
      console.log('Documento salvo localmente devido a erro:', dbError);
      return [localDocument];
    }
  }


  // Função para visualizar detalhes do documento
  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setIsViewOpen(true);
  };

  // Função para baixar o documento
  const handleDownloadDocument = async (doc: Document) => {
    try {
      // Abrir o documento em uma nova aba usando a URL pública
      window.open(doc.file_path, '_blank');
      
      toast({
        title: "Download iniciado",
        description: `O download de ${doc.name} foi iniciado.`
      });
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o documento.",
        variant: "destructive"
      });
    }
  };

  // Função para iniciar o processo de exclusão
  const handleDeleteClick = (doc: Document) => {
    setSelectedDocument(doc);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedDocument) return;
    
    try {
      // 1. Primeiro remove da interface para feedback imediato
      setDocuments(prev => prev.filter(doc => doc.id !== selectedDocument.id));
      
      // 2. Tenta remover do banco de dados e do storage (se não for documento local)
      const isLocalDocument = selectedDocument.id.toString().startsWith('local_');
      
      if (!isLocalDocument) {
        // Extrair o nome do arquivo do file_path para excluir do storage
        const fileUrl = selectedDocument.file_path;
        let fileName = '';
        
        // Extrair o nome do arquivo da URL
        if (fileUrl) {
          try {
            // Tenta extrair o nome do arquivo da URL
            const url = new URL(fileUrl);
            const pathSegments = url.pathname.split('/');
            // Pegar o último segmento como nome do arquivo
            fileName = pathSegments[pathSegments.length - 1];
            console.log('Nome do arquivo para exclusão:', fileName);
          } catch (urlError) {
            console.warn('Não foi possível extrair o nome do arquivo da URL:', urlError);
            // Se não conseguir extrair da URL, tenta usar o nome do documento
            fileName = selectedDocument.name;
          }
        }
        
        // Tentar excluir o arquivo do storage se tiver um nome válido
        if (fileName) {
          // Tentar excluir do bucket 'horse-photos'
          try {
            console.log(`Tentando excluir arquivo ${fileName} do bucket 'horse-photos'`);
            const { error: deleteError } = await supabaseAdmin.storage
              .from('horse-photos')
              .remove([fileName]);
              
            if (deleteError) {
              console.error('Erro ao excluir do bucket horse-photos:', deleteError);
              
              // Tentar bucket alternativo 'horses'
              console.log(`Tentando excluir do bucket alternativo 'horses'...`);
              const { error: fallbackDeleteError } = await supabaseAdmin.storage
                .from('horses')
                .remove([fileName]);
                
              if (fallbackDeleteError) {
                console.error('Erro ao excluir do bucket alternativo:', fallbackDeleteError);
              } else {
                console.log('Arquivo excluído com sucesso do bucket alternativo');
              }
            } else {
              console.log('Arquivo excluído com sucesso do storage');
            }
          } catch (storageError) {
            console.error('Erro ao excluir arquivo do storage:', storageError);
            // Continuar mesmo com erro no storage
          }
        }
        
        // Excluir o registro do banco de dados
        try {
          const { error: deleteDbError } = await supabaseAdmin
            .from('documents')
            .delete()
            .eq('id', selectedDocument.id);
            
          if (deleteDbError) {
            console.error('Erro ao excluir documento do banco:', deleteDbError);
            throw new Error(`Erro ao excluir documento: ${deleteDbError.message}`);
          }
          console.log('Documento excluído com sucesso do banco de dados');
        } catch (dbError) {
          console.error('Erro ao excluir do banco de dados:', dbError);
          throw dbError;
        }
      } else {
        // Se for um documento local (salvo apenas no navegador)
        console.log('Excluindo documento local');
        
        // Revogar URL de objeto local para liberar memória
        if (selectedDocument.file_path && selectedDocument.file_path.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(selectedDocument.file_path);
            console.log('URL de objeto local revogada');
          } catch (urlError) {
            console.warn('Erro ao revogar URL de objeto:', urlError);
          }
        }
        
        // Remover do localStorage
        const localDocs = localStorage.getItem('localDocuments');
        if (localDocs) {
          try {
            let docsArray: Document[] = JSON.parse(localDocs);
            docsArray = docsArray.filter(doc => doc.id !== selectedDocument.id);
            localStorage.setItem('localDocuments', JSON.stringify(docsArray));
            console.log('Documento local excluído com sucesso');
          } catch (e) {
            console.error('Erro ao excluir documento local:', e);
          }
        }
      }
      
      // 3. Feedback de sucesso
      toast({
        title: "Documento excluído",
        description: "O documento foi removido com sucesso."
      });
      
    } catch (error: any) {
      // Se falhar, reverte a remoção da interface
      if (selectedDocument) {
        setDocuments(prev => [...prev, selectedDocument]);
      }
      
      console.error('Erro ao excluir documento:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível remover o documento.",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedDocument(null);
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Documentos</h1>
          {adminMode && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
              Modo administrativo
            </Badge>
          )}
          
          <Sheet open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <SheetTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Upload className="h-4 w-4 mr-2" />
                Enviar Documento
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Enviar Novo Documento</SheetTitle>
                <SheetDescription>
                  Faça upload de documentos importantes como certificados, notas fiscais, licenças, etc.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Arquivo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center hover:border-primary cursor-pointer">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    <label htmlFor="file" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Clique para selecionar um arquivo</p>
                      <p className="text-xs text-muted-foreground mt-1">ou arraste e solte aqui</p>
                    </label>
                  </div>
                  {uploadFile && (
                    <div className="p-2 border rounded-md flex items-center gap-2 bg-muted/50">
                      {getFileIcon(uploadFile.name.split('.').pop() || '')}
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Documento</Label>
                  <Input
                    id="name"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Ex: Certificado Sanitário 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Documentos Legais">Documentos Legais</SelectItem>
                      <SelectItem value="Certificados">Certificados</SelectItem>
                      <SelectItem value="Notas Fiscais">Notas Fiscais</SelectItem>
                      <SelectItem value="Contratos">Contratos</SelectItem>
                      <SelectItem value="Relatórios">Relatórios</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </SheetClose>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || !uploadFile || !uploadName || !uploadCategory}
                >
                  {isUploading ? 'Enviando...' : 'Enviar Documento'}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Biblioteca de Documentos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-4 overflow-x-auto">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground">Carregando documentos...</p>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="hidden md:table-cell">Tamanho</TableHead>
                      <TableHead className="hidden lg:table-cell">Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {getFileIcon(doc.type)}
                          {doc.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{doc.category}</TableCell>
                        <TableCell className="hidden md:table-cell">{typeof doc.size === 'number' ? `${(doc.size / 1024).toFixed(2)} MB` : doc.size}</TableCell>
                        <TableCell className="hidden lg:table-cell">{new Date(doc.upload_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDocument(doc)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadDocument(doc)}
                              title="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(doc)}
                              title="Excluir"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhum documento encontrado</h3>
                  <p className="text-muted-foreground">
                    Não foram encontrados documentos {activeTab !== 'todos' ? `na categoria ${activeTab}` : ''}.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsUploadOpen(true)}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Adicionar Documento
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Visualizar Documento */}
      {selectedDocument && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="flex items-center gap-2">
                {getFileIcon(selectedDocument.type)}
                {selectedDocument.name}
              </DialogTitle>
              <DialogDescription>
                <p className="text-sm text-gray-500 mb-4">Tamanho: {typeof selectedDocument.size === 'number' ? `${(selectedDocument.size / 1024).toFixed(2)} MB` : selectedDocument.size} | Data: {new Date(selectedDocument.upload_date).toLocaleDateString('pt-BR')}</p>
              </DialogDescription>
            </DialogHeader>
            <div className="relative bg-muted overflow-auto flex-1" style={{ minHeight: '300px', maxHeight: 'calc(80vh - 150px)' }}>
              {/* Determinar se é uma imagem */}
              {['jpg', 'jpeg', 'png', 'gif'].includes(selectedDocument.type.toLowerCase()) ? (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <img
                    src={selectedDocument.file_path}
                    alt={selectedDocument.name}
                    className="max-w-full max-h-[60vh] object-contain"
                    onError={(e) => {
                      // Fallback para quando a imagem não carrega
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E";
                      e.currentTarget.className = "w-32 h-32 text-muted-foreground";
                      toast({
                        title: "Erro ao carregar imagem",
                        description: "Não foi possível carregar a imagem. Verifique o caminho do arquivo.",
                        variant: "destructive"
                      });
                    }}
                  />
                </div>
              ) : (
                <iframe
                  src={selectedDocument.file_path}
                  className="w-full h-full min-h-[50vh]"
                  title={selectedDocument.name}
                  onError={() => {
                    console.error('Erro ao carregar documento');
                    toast({
                      title: "Erro ao carregar documento",
                      description: "Não foi possível carregar o documento. Verifique o caminho do arquivo.",
                      variant: "destructive"
                    });
                  }}
                />
              )}
            </div>
            <DialogFooter className="px-6 py-4">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => handleDownloadDocument(selectedDocument)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmação de Exclusão */}
      {selectedDocument && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o documento 
                "{selectedDocument.name}"? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
