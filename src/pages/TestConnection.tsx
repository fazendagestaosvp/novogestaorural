import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, DatabaseIcon } from 'lucide-react';
import { testSupabaseConnection } from '@/test-connection';

const TestConnectionPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ 
    success?: boolean; 
    error?: string; 
    data?: any;
  } | null>(null);

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const connectionResult = await testSupabaseConnection();
      setResult(connectionResult);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-6 w-6" />
            Teste de Conexão com Supabase
          </CardTitle>
          <CardDescription>
            Verifique se a aplicação consegue se conectar ao banco de dados Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            result.success ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-800">Conexão bem-sucedida!</AlertTitle>
                <AlertDescription className="text-green-700">
                  A conexão com o banco de dados Supabase foi estabelecida com sucesso.
                  {result.data && (
                    <div className="mt-4 p-4 bg-white rounded border border-green-100">
                      <p className="font-semibold mb-2">Dados de teste recuperados:</p>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-800">Falha na conexão</AlertTitle>
                <AlertDescription className="text-red-700">
                  Não foi possível estabelecer conexão com o banco de dados Supabase.
                  {result.error && (
                    <div className="mt-4 p-4 bg-white rounded border border-red-100">
                      <p className="font-semibold mb-2">Erro:</p>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {result.error}
                      </pre>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )
          ) : (
            <p className="text-gray-500 text-center py-6">
              Clique no botão abaixo para testar a conexão com o banco de dados
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={handleTestConnection} 
            disabled={isLoading}
            className="w-full max-w-xs"
          >
            {isLoading ? 'Testando conexão...' : 'Testar Conexão'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TestConnectionPage;
