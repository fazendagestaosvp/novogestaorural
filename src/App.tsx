
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Dashboard } from "@/pages/Dashboard";
import { UserManagement } from "@/pages/UserManagement";
import { AccessControl } from "@/pages/AccessControl";
import { CattleManagement } from "@/pages/CattleManagement";
import { HorseManagement } from "@/pages/HorseManagement";
import { AnimalReproduction } from "@/pages/AnimalReproduction";
import { HealthHistory } from "@/pages/HealthHistory";
import { CalendarPage } from "@/pages/CalendarPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import TestConnectionPage from "@/pages/TestConnection";
import DiagnosticPage from "@/pages/DiagnosticPage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import initializeDatabase from "@/integrations/supabase/init-database";
import { toast } from "@/components/ui/use-toast";

const queryClient = new QueryClient();

const App = () => {
  // Inicializar banco de dados ao carregar a aplicação
  useEffect(() => {
    const initDb = async () => {
      try {
        console.log('Iniciando inicialização do banco de dados...');
        // Tentar inicializar o banco de dados várias vezes em caso de falha
        let attempts = 0;
        let result = false;
        
        while (!result && attempts < 3) {
          attempts++;
          console.log(`Tentativa ${attempts} de inicializar o banco de dados...`);
          
          try {
            result = await initializeDatabase();
            if (result) {
              console.log('Banco de dados inicializado com sucesso!');
              toast({
                title: "Sistema pronto",
                description: "Banco de dados inicializado com sucesso.",
                variant: "default",
              });
            } else {
              console.warn(`Falha na tentativa ${attempts} de inicializar o banco de dados.`);
              // Aguardar 1 segundo antes de tentar novamente
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (attemptError) {
            console.error(`Erro na tentativa ${attempts}:`, attemptError);
            // Aguardar 1 segundo antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (!result) {
          console.warn('Inicialização do banco de dados concluída com avisos após múltiplas tentativas.');
          toast({
            title: "Aviso do sistema",
            description: "Algumas tabelas podem não ter sido inicializadas corretamente. Os dados podem ser salvos localmente.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        toast({
          title: "Erro de sistema",
          description: "Não foi possível inicializar o banco de dados. Os dados serão salvos localmente.",
          variant: "destructive",
        });
      }
    };
    
    // Executar inicialização com um pequeno atraso para garantir que a UI esteja carregada
    setTimeout(() => {
      initDb();
    }, 500);
  }, []);
  
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/gado" element={
              <ProtectedRoute>
                <CattleManagement />
              </ProtectedRoute>
            } />
            <Route path="/cavalos" element={
              <ProtectedRoute>
                <HorseManagement />
              </ProtectedRoute>
            } />
            <Route path="/reproducao" element={
              <ProtectedRoute>
                <AnimalReproduction />
              </ProtectedRoute>
            } />
            <Route path="/saude" element={
              <ProtectedRoute>
                <HealthHistory />
              </ProtectedRoute>
            } />
            <Route path="/calendario" element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            } />
            <Route path="/documentos" element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute adminOnly>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/controle-acesso" element={
              <ProtectedRoute adminOnly>
                <AccessControl />
              </ProtectedRoute>
            } />
            <Route path="/test-connection" element={
              <TestConnectionPage />
            } />
            <Route path="/diagnostico" element={
              <ProtectedRoute adminOnly>
                <DiagnosticPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
