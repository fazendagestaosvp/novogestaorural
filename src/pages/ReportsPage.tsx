import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChartBarIcon,
  ChartPieIcon,
  CalendarIcon,
  TrendingUp,
  DollarSign,
  BarChart,
  LayoutGrid,
  LineChart,
  FileText,
  Download,
  Search,
  RefreshCw,
  Settings,
  Clock,
  Printer,
  Share2,
  Maximize2,
  AlertTriangle,
  Check,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  lastGenerated: string;
  status: 'Disponível' | 'Gerando' | 'Erro';
}

interface ReportFilter {
  dateStart?: Date;
  dateEnd?: Date;
  includeInactive: boolean;
  categories: string[];
  format: 'PDF' | 'Excel' | 'CSV';
}

export const ReportsPage = () => {
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Filtros de relatório
  const [filter, setFilter] = useState<ReportFilter>({
    includeInactive: false,
    categories: [],
    format: 'PDF'
  });
  
  const { toast } = useToast();

  // Carregar relatórios ao iniciar
  useEffect(() => {
    fetchReports();
  }, []);

  // Função para buscar relatórios do Supabase
  async function fetchReports() {
    setIsLoading(true);
    try {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('lastGenerated', { ascending: false });
        
        if (!error && data) {
          // Converter os dados para o formato do ReportCard
          const formattedReports: ReportCard[] = data.map(report => ({
            ...report,
            icon: getReportIcon(report.category)
          }));
          
          setReports(formattedReports);
        } else {
          // Se houver erro, provavelmente a tabela não existe
          console.log('A tabela reports pode não existir:', error);
          setReports([]);
        }
      } catch (dbError) {
        console.error('Erro ao acessar a tabela reports:', dbError);
        setReports([]);
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível buscar os relatórios. Verifique sua conexão.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Função para obter o ícone com base na categoria
  const getReportIcon = (category: string) => {
    switch (category) {
      case 'Financeiro':
        return <TrendingUp className="h-6 w-6" />;
      case 'Rebanho':
        return <BarChart className="h-6 w-6" />;
      case 'Saúde':
        return <LineChart className="h-6 w-6" />;
      case 'Reprodução':
        return <ChartPieIcon className="h-6 w-6" />;
      case 'Inventário':
        return <LayoutGrid className="h-6 w-6" />;
      default:
        return <FileText className="h-6 w-6" />;
    }
  };

  // Filtrar relatórios com base na busca e na aba ativa
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesTab = 
      activeTab === 'todos' || 
      (activeTab === 'financeiro' && report.category === 'Financeiro') ||
      (activeTab === 'rebanho' && report.category === 'Rebanho') ||
      (activeTab === 'saude' && report.category === 'Saúde') ||
      (activeTab === 'reproducao' && report.category === 'Reprodução') ||
      (activeTab === 'inventario' && report.category === 'Inventário');
      
    return matchesSearch && matchesTab;
  });

  // Função para gerar um relatório
  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    
    setIsGenerating(true);
    setGenerationError(false);
    setGenerationComplete(false);
    
    try {
      // Atualizar status para "Gerando"
      const updatedReports = reports.map(report => 
        report.id === selectedReport.id 
          ? { ...report, status: 'Gerando' as const } 
          : report
      );
      setReports(updatedReports);
      
      // Simular a geração do relatório
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Gerar um nome de arquivo para o relatório
      const fileExt = filter.format.toLowerCase();
      const fileName = `${selectedReport.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.${fileExt}`;
      const filePath = `reports/${uuidv4()}_${fileName}`;
      
      // Em uma implementação real, aqui seria onde você geraria o relatório com dados reais
      
      // Atualizar o banco de dados
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reports')
        .update({
          lastGenerated: now,
          status: 'Disponível'
        })
        .eq('id', selectedReport.id);
      
      if (error) throw error;
      
      // Atualizar a lista local
      const finalUpdatedReports = reports.map(report => 
        report.id === selectedReport.id 
          ? { 
              ...report, 
              status: 'Disponível' as const, 
              lastGenerated: now
            } 
          : report
      );
      setReports(finalUpdatedReports);
      
      setGenerationComplete(true);
      
      toast({
        title: "Relatório gerado com sucesso",
        description: `O relatório "${selectedReport.title}" está pronto para download.`,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      
      // Atualizar status para "Erro"
      const errorReports = reports.map(report => 
        report.id === selectedReport.id 
          ? { ...report, status: 'Erro' as const } 
          : report
      );
      setReports(errorReports);
      
      setGenerationError(true);
      
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um problema ao gerar o relatório. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para baixar um relatório
  const handleDownloadReport = async (report: ReportCard) => {
    try {
      // Em uma implementação real, você recuperaria o arquivo do Storage
      // e iniciaria o download

      toast({
        title: "Download iniciado",
        description: `O download do relatório "${report.title}" foi iniciado.`
      });
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o relatório. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Função para abrir o diálogo de geração de relatório
  const openGenerateDialog = (report: ReportCard) => {
    setSelectedReport(report);
    setIsGenerateDialogOpen(true);
    setGenerationComplete(false);
    setGenerationError(false);
    
    // Reiniciar filtros
    setFilter({
      includeInactive: false,
      categories: [],
      format: 'PDF'
    });
  };

  // Obter a cor de status do relatório
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível': return 'bg-green-100 text-green-800';
      case 'Gerando': return 'bg-blue-100 text-blue-800';
      case 'Erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
      </div>

      {/* Estatísticas de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-sm text-muted-foreground">Total de Relatórios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Download className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === 'Disponível').length}
                </p>
                <p className="text-sm text-muted-foreground">Disponíveis para Download</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <ChartBarIcon className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round((reports.filter(r => r.status === 'Disponível').length / Math.max(reports.length, 1)) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Disponibilidade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar relatórios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs e Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-6">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="rebanho">Rebanho</TabsTrigger>
              <TabsTrigger value="saude">Saúde</TabsTrigger>
              <TabsTrigger value="reproducao">Reprodução</TabsTrigger>
              <TabsTrigger value="inventario">Inventário</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando relatórios...</span>
                </div>
              ) : filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReports.map((report) => (
                    <Card key={report.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-primary/10 rounded">
                              {report.icon}
                            </div>
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                          </div>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          {report.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                          <span>Categoria: {report.category}</span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(report.lastGenerated).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            className="flex-1"
                            onClick={() => openGenerateDialog(report)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Gerar
                          </Button>
                          {report.status === 'Disponível' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDownloadReport(report)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Nenhum relatório encontrado</h3>
                  <p className="text-muted-foreground mt-2">
                    Não existem relatórios disponíveis{activeTab !== 'todos' ? ` na categoria ${activeTab}` : ''}.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Diálogo de Geração de Relatório */}
      {selectedReport && (
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Gerar Relatório</DialogTitle>
              <DialogDescription>
                Configure os parâmetros para gerar o relatório "{selectedReport.title}"
              </DialogDescription>
            </DialogHeader>
            
            {!generationComplete && !generationError ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateStart">Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="dateStart"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filter.dateStart ? (
                            format(filter.dateStart, 'PPP', { locale: ptBR })
                          ) : (
                            <span>Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filter.dateStart}
                          onSelect={(date) => setFilter({ ...filter, dateStart: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dateEnd">Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="dateEnd"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filter.dateEnd ? (
                            format(filter.dateEnd, 'PPP', { locale: ptBR })
                          ) : (
                            <span>Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filter.dateEnd}
                          onSelect={(date) => setFilter({ ...filter, dateEnd: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="format">Formato do Relatório</Label>
                  <Select 
                    value={filter.format} 
                    onValueChange={(value) => setFilter({ ...filter, format: value as 'PDF' | 'Excel' | 'CSV' })}
                  >
                    <SelectTrigger id="format">
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDF">PDF</SelectItem>
                      <SelectItem value="Excel">Excel</SelectItem>
                      <SelectItem value="CSV">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeInactive" 
                    checked={filter.includeInactive}
                    onCheckedChange={(checked) => 
                      setFilter({ ...filter, includeInactive: checked as boolean })
                    }
                  />
                  <Label htmlFor="includeInactive">Incluir itens inativos</Label>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Gerar Relatório
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            ) : generationComplete ? (
              <div className="py-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="bg-green-100 p-3 rounded-full mb-4">
                    <Check className="h-6 w-6 text-green-700" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Relatório Gerado com Sucesso!</h3>
                  <p className="text-muted-foreground mb-6">
                    Seu relatório "{selectedReport.title}" está pronto para download.
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => handleDownloadReport(selectedReport)}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Relatório
                    </Button>
                    <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="bg-red-100 p-3 rounded-full mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-700" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Erro ao Gerar Relatório</h3>
                  <p className="text-muted-foreground mb-6">
                    Ocorreu um erro ao gerar o relatório. Tente novamente.
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={handleGenerateReport}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tentar Novamente
                    </Button>
                    <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
