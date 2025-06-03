import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Database, RefreshCw } from 'lucide-react';
import { runDiagnostic } from '@/utils/db-diagnostic';
import { ensureCattleTableExists, ensureDocumentsTableExists, ensureStorageBucketsExist } from '@/integrations/supabase/admin-client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';

export function DiagnosticPage() {
  const [diagnosticResult, setDiagnosticResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const auth = useAuth();

  const runDatabaseDiagnostic = async () => {
    setIsLoading(true);
    try {
      const report = await runDiagnostic();
      setDiagnosticResult(report);
    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível executar o diagnóstico do banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const repairDatabase = async () => {
    setIsRepairing(true);
    try {
      // Tentar reparar as tabelas e buckets
      const cattleResult = await ensureCattleTableExists();
      const documentsResult = await ensureDocumentsTableExists();
      const bucketsResult = await ensureStorageBucketsExist();
      
      toast({
        title: 'Reparo concluído',
        description: `Tabelas: ${cattleResult && documentsResult ? 'OK' : 'Problemas'}, Buckets: ${bucketsResult ? 'OK' : 'Problemas'}`,
        variant: cattleResult && documentsResult && bucketsResult ? 'default' : 'destructive',
      });
      
      // Atualizar o diagnóstico após a tentativa de reparo
      await runDatabaseDiagnostic();
    } catch (error) {
      console.error('Erro ao reparar banco de dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reparar o banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setIsRepairing(false);
    }
  };

  useEffect(() => {
    runDatabaseDiagnostic();
  }, []);

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={runDatabaseDiagnostic} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </>
              )}
            </Button>
            <Button 
              onClick={repairDatabase} 
              disabled={isRepairing || isLoading}
            >
              {isRepairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reparando...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Reparar Banco de Dados
                </>
              )}
            </Button>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertTitle>Informação</AlertTitle>
          <AlertDescription>
            Esta página exibe o status do banco de dados e permite reparar problemas com tabelas e buckets.
            Use o botão "Reparar Banco de Dados" se estiver tendo problemas para salvar registros.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Status do Banco de Dados</CardTitle>
            <CardDescription>
              Diagnóstico das tabelas e buckets no Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="prose max-w-none dark:prose-invert">
                <ReactMarkdown>{diagnosticResult}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default DiagnosticPage;
