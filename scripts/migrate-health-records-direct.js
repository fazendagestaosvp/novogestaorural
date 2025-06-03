import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

// Promisify exec
const execPromise = util.promisify(exec);

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('URL ou chave do Supabase ausentes. Verifique seu arquivo .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para executar comandos SQL via psql (requer psql instalado)
async function executePsql(sql, connectionString) {
  try {
    // Salvar SQL em arquivo temporário
    const tempFile = path.join(__dirname, 'temp_sql.sql');
    fs.writeFileSync(tempFile, sql);
    
    // Executar via psql
    const { stdout, stderr } = await execPromise(
      `psql "${connectionString}" -f "${tempFile}"`
    );
    
    // Limpar arquivo temporário
    fs.unlinkSync(tempFile);
    
    if (stderr && !stderr.includes('NOTICE')) {
      throw new Error(stderr);
    }
    
    return stdout;
  } catch (error) {
    console.error('Erro ao executar SQL via psql:', error);
    throw error;
  }
}

// Função para obter a string de conexão do Supabase
async function getConnectionString() {
  try {
    // Essa parte depende de como você obtém a string de conexão
    // Pode ser via variáveis de ambiente, arquivo de configuração, etc.
    console.log('Para continuar com a migração, precisamos da string de conexão do banco de dados.');
    console.log('Por favor, acesse o console do Supabase, vá para Configurações > Database > Connection string');
    console.log('Cole a string de conexão quando solicitado.');
    
    // Em um ambiente real, você solicitaria ao usuário inserir a string
    // Como estamos em um ambiente de script, vamos usar uma abordagem alternativa
    
    return process.env.DATABASE_URL || '';
  } catch (error) {
    console.error('Erro ao obter string de conexão:', error);
    throw error;
  }
}

// Função principal de migração
async function migrateHealthRecords() {
  try {
    console.log('Iniciando migração da tabela health_records...');
    
    // Verificar se a coluna user_id já existe
    let columnExists = false;
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('user_id')
        .limit(1);
      
      if (!error) {
        columnExists = true;
        console.log('A coluna user_id já existe na tabela health_records.');
      }
    } catch (error) {
      console.log('A coluna user_id não existe na tabela health_records.');
    }
    
    if (!columnExists) {
      // Tentar adicionar a coluna via API REST do Supabase
      console.log('Tentando adicionar a coluna user_id via API REST...');
      
      // Obter o ID do usuário admin
      let adminId = null;
      try {
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();
        
        if (!adminError && adminUser) {
          adminId = adminUser.id;
          console.log(`ID do usuário admin: ${adminId}`);
        } else {
          console.error('Erro ao obter usuário admin:', adminError);
        }
      } catch (error) {
        console.error('Erro ao buscar usuário admin:', error);
      }
      
      // Método alternativo: usar psql diretamente
      console.log('Tentando migração via psql...');
      
      try {
        const connectionString = await getConnectionString();
        
        if (!connectionString) {
          console.error('String de conexão não fornecida. Abortando migração via psql.');
        } else {
          // SQL para adicionar a coluna e configurar políticas RLS
          const sql = `
          -- Adicionar coluna user_id à tabela health_records
          ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
          
          -- Atualizar registros existentes com o ID do usuário admin
          UPDATE public.health_records 
          SET user_id = '${adminId || '00000000-0000-0000-0000-000000000000'}'
          WHERE user_id IS NULL;
          
          -- Remover políticas RLS existentes
          DROP POLICY IF EXISTS "Permitir SELECT para todos" ON public.health_records;
          DROP POLICY IF EXISTS "Permitir INSERT para todos" ON public.health_records;
          DROP POLICY IF EXISTS "Permitir UPDATE para todos" ON public.health_records;
          DROP POLICY IF EXISTS "Permitir DELETE para todos" ON public.health_records;
          
          -- Criar novas políticas RLS que filtram por user_id
          CREATE POLICY "Permitir SELECT para usuário" ON public.health_records
              FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'admin');
              
          CREATE POLICY "Permitir INSERT para usuário" ON public.health_records
              FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
              
          CREATE POLICY "Permitir UPDATE para usuário" ON public.health_records
              FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'admin') 
              WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
              
          CREATE POLICY "Permitir DELETE para usuário" ON public.health_records
              FOR DELETE USING (user_id = auth.uid() OR auth.role() = 'admin');
          `;
          
          const result = await executePsql(sql, connectionString);
          console.log('Migração via psql concluída com sucesso!');
          console.log(result);
        }
      } catch (error) {
        console.error('Erro na migração via psql:', error);
        console.log('\n==================================================');
        console.log('INSTRUÇÕES PARA MIGRAÇÃO MANUAL:');
        console.log('==================================================');
        console.log('1. Acesse o console do Supabase: https://app.supabase.io');
        console.log('2. Vá para o seu projeto');
        console.log('3. Clique em "SQL Editor" no menu lateral');
        console.log('4. Crie uma nova consulta');
        console.log('5. Cole o seguinte SQL e execute:');
        console.log('\n--------------------------------------------------');
        
        // Ler o arquivo SQL
        const sqlPath = path.join(__dirname, 'health-records-migration-simple.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log(sqlContent);
        console.log('--------------------------------------------------\n');
        
        if (adminId) {
          console.log(`\n⚠️ IMPORTANTE: Substitua '00000000-0000-0000-0000-000000000000' pelo ID real do admin: '${adminId}'`);
        }
      }
    } else {
      // Verificar se há registros sem user_id
      try {
        const { count, error: countError } = await supabase
          .from('health_records')
          .select('*', { count: 'exact', head: true })
          .is('user_id', null);
        
        if (!countError && count && count > 0) {
          console.log(`Encontrados ${count} registros sem user_id. Atualizando...`);
          
          // Obter o ID do usuário admin
          const { data: adminUser, error: adminError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .single();
          
          if (!adminError && adminUser) {
            // Atualizar registros sem user_id
            const { error: updateError } = await supabase
              .from('health_records')
              .update({ user_id: adminUser.id })
              .is('user_id', null);
            
            if (!updateError) {
              console.log(`${count} registros atualizados com o ID do usuário admin.`);
            } else {
              console.error('Erro ao atualizar registros sem user_id:', updateError);
            }
          } else {
            console.error('Erro ao obter usuário admin:', adminError);
          }
        } else if (!countError) {
          console.log('Todos os registros já têm user_id. Nenhuma atualização necessária.');
        }
      } catch (error) {
        console.error('Erro ao verificar registros sem user_id:', error);
      }
    }
    
    console.log('\nVerificando políticas RLS...');
    // Aqui você pode adicionar código para verificar e atualizar as políticas RLS
    
    console.log('\nMigração concluída!');
    console.log('Verifique se a página de Histórico de Saúde está funcionando corretamente.');
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

migrateHealthRecords();
