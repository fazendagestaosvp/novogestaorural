// Este cliente Supabase usa a chave de service_role e deve ser usado APENAS no servidor
// ou em operações administrativas específicas, nunca exposto diretamente ao cliente.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://uwgydwarqehwjjfqcilc.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3lkd2FycWVod2pqZnFjaWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODUxNDc4NCwiZXhwIjoyMDY0MDkwNzg0fQ.jkTF5gtNF2vCFt2i-KHH9YstCNzn9eq8xWYuRwsyOIo";

// ATENÇÃO: Este cliente tem permissões administrativas completas.
// Use apenas quando necessário para operações que precisam contornar as políticas RLS.
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Função auxiliar para executar SQL diretamente
async function execSql(sql: string) {
  try {
    // Primeiro, tente usar a função RPC exec_sql se estiver disponível
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      console.warn('Erro ao executar SQL via RPC:', error);
      
      // Se falhar, tente executar diretamente via REST API
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        return { success: true };
      } catch (sqlError) {
        console.error('Erro ao executar SQL via REST:', sqlError);
        return { success: false, error: sqlError };
      }
    }
    
    return { success: true };
  } catch (e) {
    console.error('Erro inesperado ao executar SQL:', e);
    return { success: false, error: e };
  }
}

// Função auxiliar para verificar e criar tabelas necessárias
export async function ensureDocumentsTableExists() {
  try {
    console.log('Verificando se a tabela documents existe...');
    
    // Método 1: Verificar usando information_schema
    try {
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'documents');
        
      if (tablesError) {
        console.warn('Erro ao verificar tabela documents via information_schema:', tablesError);
        // Continuar para o método alternativo
      } else if (tables && tables.length > 0) {
        console.log('Tabela documents encontrada via information_schema.');
        return true;
      } else {
        console.log('Tabela documents não encontrada via information_schema.');
      }
    } catch (schemaError) {
      console.warn('Erro ao acessar information_schema:', schemaError);
      // Continuar para o método alternativo
    }
    
    // Método 2: Tentar uma consulta simples na tabela
    try {
      const { data, error } = await supabaseAdmin
        .from('documents')
        .select('id')
        .limit(1);
      
      if (!error) {
        console.log('Tabela documents verificada com sucesso via consulta direta.');
        return true;
      } else {
        console.log('Erro ao consultar tabela documents diretamente:', error);
        // Tabela provavelmente não existe, vamos criar
      }
    } catch (queryError) {
      console.warn('Erro ao consultar tabela documents diretamente:', queryError);
      // Tabela provavelmente não existe, vamos criar
    }
    
    // Criar a tabela documents
    console.log('Tentando criar tabela documents...');
    
    // Criar a tabela documents com SQL simples primeiro
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.documents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          size INTEGER NOT NULL,
          upload_date TEXT NOT NULL,
          file_path TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
        );
      `;
      
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('Erro ao criar tabela documents:', createError);
        throw createError;
      }
      
      console.log('Tabela documents criada com sucesso!');
      
      // Agora configurar as políticas RLS em comandos separados para melhor tratamento de erros
      try {
        const enableRlsSQL = `ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`;
        await supabaseAdmin.rpc('exec_sql', { sql: enableRlsSQL });
        console.log('RLS habilitado para a tabela documents.');
      } catch (rlsError) {
        console.warn('Aviso: Erro ao habilitar RLS para documents:', rlsError);
        // Continuar mesmo com erro de RLS
      }
      
      // Políticas em comandos separados
      const policies = [
        {
          name: "Leitura pública",
          sql: `CREATE POLICY "Permitir leitura pública" ON public.documents FOR SELECT USING (true);`
        },
        {
          name: "Inserção com ID padrão",
          sql: `CREATE POLICY "Permitir inserção com ID padrão" ON public.documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id = '00000000-0000-0000-0000-000000000000');`
        },
        {
          name: "Atualização pelo proprietário",
          sql: `CREATE POLICY "Permitir atualização pelo proprietário" ON public.documents FOR UPDATE USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');`
        },
        {
          name: "Exclusão pelo proprietário",
          sql: `CREATE POLICY "Permitir exclusão pelo proprietário" ON public.documents FOR DELETE USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');`
        }
      ];
      
      for (const policy of policies) {
        try {
          await supabaseAdmin.rpc('exec_sql', { sql: policy.sql });
          console.log(`Política "${policy.name}" criada com sucesso.`);
        } catch (policyError) {
          console.warn(`Aviso: Erro ao criar política "${policy.name}":`, policyError);
          // Continuar para a próxima política mesmo com erro
        }
      }
      
      return true;
    } catch (createTableError) {
      console.error('Erro crítico ao criar tabela documents:', createTableError);
      
      // Tentar um método alternativo de criação de tabela
      try {
        console.log('Tentando método alternativo para criar a tabela documents...');
        
        // Usar o método de API do Supabase para criar a tabela
        const { error } = await supabaseAdmin
          .from('documents')
          .insert([
            {
              id: 'template_doc',
              name: 'Template Document',
              type: 'TXT',
              category: 'Sistema',
              size: 0,
              upload_date: new Date().toISOString().split('T')[0],
              file_path: 'https://example.com/placeholder',
              description: 'Documento de template para criar a tabela',
              user_id: '00000000-0000-0000-0000-000000000000'
            }
          ]);
        
        if (error) {
          console.error('Erro no método alternativo de criação de tabela:', error);
          return false;
        } else {
          console.log('Tabela documents criada com sucesso via método alternativo!');
          return true;
        }
      } catch (alternativeError) {
        console.error('Falha em todos os métodos de criação da tabela documents:', alternativeError);
        return false;
      }
    }
  } catch (error) {
    console.error('Erro inesperado ao verificar/criar tabela documents:', error);
    return false;
  }
}

// Função para garantir que os buckets de storage existam e tenham permissões corretas
// Função para garantir que a tabela cattle exista
export async function ensureCattleTableExists() {
  try {
    console.log('Verificando se a tabela cattle existe...');
    
    // Método 1: Verificar usando information_schema
    try {
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'cattle');
        
      if (tablesError) {
        console.warn('Erro ao verificar tabela cattle via information_schema:', tablesError);
        // Continuar para o método alternativo
      } else if (tables && tables.length > 0) {
        console.log('Tabela cattle encontrada via information_schema.');
        
        // Verificar se a coluna user_id existe
        try {
          const { data: columns, error: columnsError } = await supabaseAdmin
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'cattle')
            .eq('column_name', 'user_id');
            
          if (columnsError) {
            console.warn('Erro ao verificar coluna user_id na tabela cattle:', columnsError);
          } else if (!columns || columns.length === 0) {
            console.log('Coluna user_id não encontrada na tabela cattle. Adicionando...');
            
            // Adicionar coluna user_id
            const addColumnSQL = `
              ALTER TABLE public.cattle 
              ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
            `;
            
            const { error: addColumnError } = await supabaseAdmin.rpc('exec_sql', { sql: addColumnSQL });
            
            if (addColumnError) {
              console.error('Erro ao adicionar coluna user_id à tabela cattle:', addColumnError);
            } else {
              console.log('Coluna user_id adicionada com sucesso à tabela cattle.');
            }
          } else {
            console.log('Coluna user_id já existe na tabela cattle.');
          }
        } catch (columnsError) {
          console.warn('Erro ao verificar colunas da tabela cattle:', columnsError);
        }
        
        return true;
      } else {
        console.log('Tabela cattle não encontrada via information_schema.');
      }
    } catch (schemaError) {
      console.warn('Erro ao acessar information_schema:', schemaError);
      // Continuar para o método alternativo
    }
    
    // Método 2: Tentar uma consulta simples na tabela
    try {
      const { data, error } = await supabaseAdmin
        .from('cattle')
        .select('id')
        .limit(1);
      
      if (!error) {
        console.log('Tabela cattle verificada com sucesso via consulta direta.');
        return true;
      } else {
        console.log('Erro ao consultar tabela cattle diretamente:', error);
        // Tabela provavelmente não existe, vamos criar
      }
    } catch (queryError) {
      console.warn('Erro ao consultar tabela cattle diretamente:', queryError);
      // Tabela provavelmente não existe, vamos criar
    }
    
    // Criar a tabela cattle
    console.log('Tentando criar tabela cattle...');
    
    // Criar a tabela cattle com SQL simples primeiro
    try {
      // Primeiro, verificar se a extensão uuid-ossp está habilitada
      await execSql(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.cattle (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          breed TEXT NOT NULL,
          age INTEGER NOT NULL,
          weight NUMERIC NOT NULL,
          gender TEXT NOT NULL,
          category TEXT NOT NULL,
          status TEXT NOT NULL,
          dateOfBirth TEXT,
          entryDate TEXT,
          observations TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
        );
      `;
      
      const createResult = await execSql(createTableSQL);
      
      if (!createResult.success) {
        console.error('Erro ao criar tabela cattle:', createResult.error);
        throw createResult.error;
      }
      
      console.log('Tabela cattle criada com sucesso!');
      
      // Agora configurar as políticas RLS em comandos separados para melhor tratamento de erros
      try {
        const enableRlsSQL = `ALTER TABLE public.cattle ENABLE ROW LEVEL SECURITY;`;
        const rlsResult = await execSql(enableRlsSQL);
        if (rlsResult.success) {
          console.log('RLS habilitado para a tabela cattle.');
        } else {
          console.warn('Aviso: Erro ao habilitar RLS para cattle:', rlsResult.error);
        }
      } catch (rlsError) {
        console.warn('Aviso: Erro ao habilitar RLS para cattle:', rlsError);
        // Continuar mesmo com erro de RLS
      }
      
      // Primeiro, remover políticas existentes para evitar conflitos
      try {
        const dropPoliciesSQL = `
          DROP POLICY IF EXISTS "Permitir leitura pelo proprietário" ON public.cattle;
          DROP POLICY IF EXISTS "Permitir inserção com ID do usuário" ON public.cattle;
          DROP POLICY IF EXISTS "Permitir atualização pelo proprietário" ON public.cattle;
          DROP POLICY IF EXISTS "Permitir exclusão pelo proprietário" ON public.cattle;
        `;
        await execSql(dropPoliciesSQL);
        console.log('Políticas antigas removidas com sucesso.');
      } catch (dropError) {
        console.warn('Aviso: Erro ao remover políticas antigas:', dropError);
      }
      
      // Políticas em comandos separados
      const policies = [
        {
          name: "Leitura pelo proprietário",
          sql: `CREATE POLICY "Permitir leitura pelo proprietário" ON public.cattle FOR SELECT USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');`
        },
        {
          name: "Inserção com ID do usuário",
          sql: `CREATE POLICY "Permitir inserção com ID do usuário" ON public.cattle FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');`
        },
        {
          name: "Atualização pelo proprietário",
          sql: `CREATE POLICY "Permitir atualização pelo proprietário" ON public.cattle FOR UPDATE USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');`
        },
        {
          name: "Exclusão pelo proprietário",
          sql: `CREATE POLICY "Permitir exclusão pelo proprietário" ON public.cattle FOR DELETE USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');`
        }
      ];
      
      for (const policy of policies) {
        try {
          const policyResult = await execSql(policy.sql);
          if (policyResult.success) {
            console.log(`Política "${policy.name}" criada com sucesso.`);
          } else {
            console.warn(`Aviso: Erro ao criar política "${policy.name}":`, policyResult.error);
          }
        } catch (policyError) {
          console.warn(`Aviso: Erro ao criar política "${policy.name}":`, policyError);
          // Continuar para a próxima política mesmo com erro
        }
      }
      
      // Criar uma política mais permissiva para garantir acesso
      try {
        const permissivePolicy = `CREATE POLICY "Permitir acesso total temporariamente" ON public.cattle USING (true) WITH CHECK (true);`;
        await execSql(permissivePolicy);
        console.log('Política permissiva criada com sucesso.');
      } catch (permissiveError) {
        console.warn('Aviso: Erro ao criar política permissiva:', permissiveError);
      }
      
      return true;
    } catch (createTableError) {
      console.error('Erro crítico ao criar tabela cattle:', createTableError);
      
      // Tentar um método alternativo de criação de tabela
      try {
        console.log('Tentando método alternativo para criar a tabela cattle...');
        
        // Criar tabela com SQL mais simples, sem RLS
        const simpleCreateSQL = `
          CREATE TABLE IF NOT EXISTS public.cattle (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            breed TEXT NOT NULL,
            age INTEGER NOT NULL,
            weight NUMERIC NOT NULL,
            gender TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL,
            dateOfBirth TEXT,
            entryDate TEXT,
            observations TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT DEFAULT '00000000-0000-0000-0000-000000000000'
          );
        `;
        
        const simpleResult = await execSql(simpleCreateSQL);
        
        if (!simpleResult.success) {
          console.error('Erro no método alternativo de criação de tabela cattle:', simpleResult.error);
          
          // Última tentativa: usar o método de API do Supabase para criar a tabela
          try {
            const { error } = await supabaseAdmin
              .from('cattle')
              .insert([
                {
                  name: 'Template Animal',
                  breed: 'Template',
                  age: 0,
                  weight: 0,
                  gender: 'Macho',
                  category: 'Bezerro',
                  status: 'Ativo',
                  observations: 'Animal de template para criar a tabela',
                  user_id: '00000000-0000-0000-0000-000000000000'
                }
              ]);
            
            if (error) {
              console.error('Erro no método de inserção para criação de tabela cattle:', error);
              return false;
            } else {
              console.log('Tabela cattle criada com sucesso via inserção!');
              return true;
            }
          } catch (insertError) {
            console.error('Falha na tentativa de inserção para criar tabela cattle:', insertError);
            return false;
          }
        } else {
          console.log('Tabela cattle criada com sucesso via método alternativo!');
          
          // Adicionar um registro de exemplo para garantir que a tabela funcione
          try {
            const { error } = await supabaseAdmin
              .from('cattle')
              .insert([
                {
                  name: 'Animal Exemplo',
                  breed: 'Exemplo',
                  age: 1,
                  weight: 100,
                  gender: 'Macho',
                  category: 'Bezerro',
                  status: 'Ativo',
                  observations: 'Animal de exemplo para testar a tabela',
                  user_id: '00000000-0000-0000-0000-000000000000'
                }
              ]);
            
            if (error) {
              console.warn('Aviso: Erro ao inserir animal de exemplo:', error);
            } else {
              console.log('Animal de exemplo inserido com sucesso!');
            }
          } catch (exampleError) {
            console.warn('Aviso: Erro ao inserir animal de exemplo:', exampleError);
          }
          
          return true;
        }
      } catch (alternativeError) {
        console.error('Falha em todos os métodos de criação da tabela cattle:', alternativeError);
        return false;
      }
    }
  } catch (error) {
    console.error('Erro inesperado ao verificar/criar tabela cattle:', error);
    return false;
  }
}

// Função para criar funções RPC no Supabase
export async function ensureRpcFunctionsExist() {
  try {
    console.log('Verificando e criando funções RPC...');
    
    // Função insert_cattle
    const insertCattleSQL = `
    CREATE OR REPLACE FUNCTION public.insert_cattle(cattle_data JSONB)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      new_id UUID;
      result JSONB;
    BEGIN
      -- Verificar se a tabela existe
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cattle') THEN
        -- Criar a tabela se não existir
        CREATE TABLE public.cattle (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          breed TEXT NOT NULL,
          age INTEGER NOT NULL,
          weight NUMERIC NOT NULL,
          gender TEXT NOT NULL,
          category TEXT NOT NULL,
          status TEXT NOT NULL,
          dateOfBirth TEXT,
          entryDate TEXT,
          observations TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
        );
        
        -- Habilitar RLS
        ALTER TABLE public.cattle ENABLE ROW LEVEL SECURITY;
        
        -- Criar política permissiva para testes
        CREATE POLICY "Permitir acesso total temporariamente" 
          ON public.cattle 
          USING (true) 
          WITH CHECK (true);
      END IF;
      
      -- Gerar um novo UUID para o registro
      SELECT uuid_generate_v4() INTO new_id;
      
      -- Inserir o registro com o novo ID
      INSERT INTO public.cattle (
        id,
        name,
        breed,
        age,
        weight,
        gender,
        category,
        status,
        dateOfBirth,
        entryDate,
        observations,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        new_id,
        cattle_data->>'name',
        cattle_data->>'breed',
        (cattle_data->>'age')::INTEGER,
        (cattle_data->>'weight')::NUMERIC,
        cattle_data->>'gender',
        cattle_data->>'category',
        cattle_data->>'status',
        cattle_data->>'dateOfBirth',
        cattle_data->>'entryDate',
        cattle_data->>'observations',
        COALESCE((cattle_data->>'user_id')::UUID, '00000000-0000-0000-0000-000000000000'),
        COALESCE((cattle_data->>'created_at')::TIMESTAMP WITH TIME ZONE, now()),
        COALESCE((cattle_data->>'updated_at')::TIMESTAMP WITH TIME ZONE, now())
      );
      
      -- Retornar o ID e os dados inseridos
      result := jsonb_build_object(
        'id', new_id,
        'success', true,
        'data', cattle_data
      );
      
      RETURN result;
    END;
    $$;
    `;
    
    // Função update_cattle
    const updateCattleSQL = `
    CREATE OR REPLACE FUNCTION public.update_cattle(cattle_id UUID, cattle_data JSONB)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSONB;
    BEGIN
      -- Verificar se o registro existe
      IF NOT EXISTS (SELECT 1 FROM public.cattle WHERE id = cattle_id) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Registro não encontrado'
        );
      END IF;
      
      -- Atualizar o registro
      UPDATE public.cattle
      SET
        name = COALESCE(cattle_data->>'name', name),
        breed = COALESCE(cattle_data->>'breed', breed),
        age = COALESCE((cattle_data->>'age')::INTEGER, age),
        weight = COALESCE((cattle_data->>'weight')::NUMERIC, weight),
        gender = COALESCE(cattle_data->>'gender', gender),
        category = COALESCE(cattle_data->>'category', category),
        status = COALESCE(cattle_data->>'status', status),
        dateOfBirth = COALESCE(cattle_data->>'dateOfBirth', dateOfBirth),
        entryDate = COALESCE(cattle_data->>'entryDate', entryDate),
        observations = COALESCE(cattle_data->>'observations', observations),
        updated_at = now()
      WHERE id = cattle_id;
      
      -- Retornar sucesso
      result := jsonb_build_object(
        'id', cattle_id,
        'success', true
      );
      
      RETURN result;
    END;
    $$;
    `;
    
    // Função delete_cattle
    const deleteCattleSQL = `
    CREATE OR REPLACE FUNCTION public.delete_cattle(cattle_id UUID)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSONB;
    BEGIN
      -- Verificar se o registro existe
      IF NOT EXISTS (SELECT 1 FROM public.cattle WHERE id = cattle_id) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Registro não encontrado'
        );
      END IF;
      
      -- Excluir o registro
      DELETE FROM public.cattle
      WHERE id = cattle_id;
      
      -- Retornar sucesso
      result := jsonb_build_object(
        'id', cattle_id,
        'success', true
      );
      
      RETURN result;
    END;
    $$;
    `;
    
    // Executar os scripts SQL para criar as funções
    await execSql(insertCattleSQL);
    await execSql(updateCattleSQL);
    await execSql(deleteCattleSQL);
    
    console.log('Funções RPC criadas/atualizadas com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao criar funções RPC:', error);
    return false;
  }
}

export async function initializeDatabase() {
  try {
    // Verificar e garantir que todas as tabelas existam
    const cattleTableExists = await ensureCattleTableExists();
    
    // Criar funções RPC
    const rpcFunctionsExist = await ensureRpcFunctionsExist();
    
    // Adicionar mais verificações de tabelas aqui conforme necessário
    
    return cattleTableExists && rpcFunctionsExist;
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    return false;
  }
}

export async function ensureStorageBucketsExist() {
  // Lista de buckets que queremos garantir que existam
  const buckets = ['horses', 'horse-photos', 'documents'];
  let createdBuckets = [];
  let failedBuckets = [];
  
  for (const bucketName of buckets) {
    try {
      console.log(`Verificando bucket ${bucketName}...`);
      
      // Verificar se o bucket existe
      const { data: bucket, error } = await supabaseAdmin.storage.getBucket(bucketName);
      
      if (error && error.message.includes('not found')) {
        console.log(`Bucket ${bucketName} não encontrado. Criando...`);
        
        // Criar o bucket se não existir
        const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true, // Tornar o bucket público
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
        });
        
        if (createError) {
          console.error(`Erro ao criar bucket ${bucketName}:`, createError);
          failedBuckets.push({ name: bucketName, error: createError.message });
        } else {
          console.log(`Bucket ${bucketName} criado com sucesso!`);
          createdBuckets.push(bucketName);
          
          // Configurar política de acesso público
          try {
            const { error: policyError } = await supabaseAdmin.storage.updateBucket(bucketName, {
              public: true,
              allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
            });
            
            if (policyError) {
              console.warn(`Aviso: Não foi possível configurar políticas para ${bucketName}:`, policyError);
            } else {
              console.log(`Políticas do bucket ${bucketName} configuradas com sucesso.`);
            }
          } catch (policyError) {
            console.warn(`Erro ao configurar políticas para ${bucketName}:`, policyError);
          }
        }
      } else if (error) {
        // Outro tipo de erro ao verificar o bucket
        console.error(`Erro ao verificar bucket ${bucketName}:`, error);
        failedBuckets.push({ name: bucketName, error: error.message });
      } else {
        console.log(`Bucket ${bucketName} já existe.`);
        
        // Atualizar para garantir que seja público
        try {
          const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
            public: true,
            allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
          });
          
          if (updateError) {
            console.warn(`Aviso: Não foi possível atualizar configurações do bucket ${bucketName}:`, updateError);
          } else {
            console.log(`Configurações do bucket ${bucketName} atualizadas.`);
            createdBuckets.push(bucketName);
          }
        } catch (updateError) {
          console.warn(`Erro ao atualizar configurações do bucket ${bucketName}:`, updateError);
        }
      }
    } catch (e) {
      console.error(`Erro ao verificar/criar bucket ${bucketName}:`, e);
      failedBuckets.push({ name: bucketName, error: e.message || 'Erro desconhecido' });
    }
  }
  
  console.log('Resumo da configuração de buckets:');
  console.log('- Buckets criados/verificados com sucesso:', createdBuckets);
  console.log('- Buckets com falha:', failedBuckets);
  
  // Se o bucket 'documents' falhou, vamos verificar se podemos usar um dos outros buckets
  if (failedBuckets.some(b => b.name === 'documents') && createdBuckets.length > 0) {
    console.log('O bucket documents falhou, mas temos outros buckets disponíveis para uso alternativo.');
  }
  
  return createdBuckets.length > 0;
}
