import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('URL ou chave do Supabase ausentes. Verifique seu arquivo .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealthRecordsStructure() {
  try {
    console.log('Verificando estrutura da tabela health_records...');
    
    // Tentar acessar a coluna user_id
    let hasUserIdColumn = false;
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('user_id')
        .limit(1);
      
      if (!error) {
        hasUserIdColumn = true;
        console.log('✅ A coluna user_id já existe na tabela health_records.');
      }
    } catch (error) {
      console.log('❌ A coluna user_id não existe na tabela health_records.');
      console.log('Erro:', error.message);
    }
    
    if (!hasUserIdColumn) {
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
      const sqlPath = path.join(process.cwd(), 'scripts', 'health-records-migration-simple.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      console.log(sqlContent);
      console.log('--------------------------------------------------\n');
      
      // Obter o ID do usuário admin para substituir no SQL
      console.log('Obtendo ID do usuário admin para substituir no SQL...');
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (adminError) {
        console.error('Erro ao obter usuário admin:', adminError);
      } else if (adminUser) {
        console.log(`\n⚠️ IMPORTANTE: Substitua '00000000-0000-0000-0000-000000000000' pelo ID real do admin: '${adminUser.id}'`);
      }
      
      console.log('\n6. Após executar o SQL, volte ao aplicativo e verifique se a página de Histórico de Saúde está funcionando corretamente.');
    } else {
      // Se a coluna já existe, verificar se há registros sem user_id
      const { count, error: countError } = await supabase
        .from('health_records')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null);
      
      if (countError) {
        console.error('Erro ao verificar registros sem user_id:', countError);
      } else if (count && count > 0) {
        console.log(`⚠️ Encontrados ${count} registros sem user_id.`);
        
        // Obter o ID do usuário admin
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();
        
        if (adminError) {
          console.error('Erro ao obter usuário admin:', adminError);
        } else if (adminUser) {
          console.log('\nExecute o seguinte SQL para atualizar os registros:');
          console.log('--------------------------------------------------');
          console.log(`UPDATE public.health_records SET user_id = '${adminUser.id}' WHERE user_id IS NULL;`);
          console.log('--------------------------------------------------\n');
        }
      } else {
        console.log('✅ Todos os registros já têm user_id. Nenhuma atualização necessária.');
      }
      
      // Verificar políticas RLS
      console.log('\nVerificando políticas RLS...');
      console.log('Para garantir que as políticas RLS estejam configuradas corretamente, execute:');
      console.log('--------------------------------------------------');
      console.log(`
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
    FOR DELETE USING (user_id = auth.uid() OR auth.role() = 'admin');`);
      console.log('--------------------------------------------------\n');
    }
    
  } catch (error) {
    console.error('Erro ao verificar estrutura da tabela:', error);
  }
}

checkHealthRecordsStructure();
