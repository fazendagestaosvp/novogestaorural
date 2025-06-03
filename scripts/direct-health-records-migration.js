import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('URL ou chave do Supabase ausentes. Verifique seu arquivo .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateHealthRecords() {
  try {
    console.log('Iniciando migração da tabela health_records...');
    
    // Passo 1: Verificar se a coluna user_id já existe
    console.log('Verificando se a coluna user_id já existe...');
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
      console.log('A coluna user_id não existe ainda:', error.message);
    }
    
    // Passo 2: Se a coluna não existir, criar uma nova tabela temporária com a estrutura desejada
    if (!columnExists) {
      console.log('Criando coluna user_id na tabela health_records...');
      
      // Obter um registro para entender a estrutura atual
      const { data: sampleRecord, error: sampleError } = await supabase
        .from('health_records')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleError) {
        console.error('Erro ao obter amostra de registro:', sampleError);
        return;
      }
      
      console.log('Amostra de registro obtida para análise da estrutura.');
      
      // Obter o ID do usuário admin para associar aos registros existentes
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (adminError) {
        console.error('Erro ao obter usuário admin:', adminError);
        return;
      }
      
      const adminId = adminUser.id;
      console.log(`ID do usuário admin obtido: ${adminId}`);
      
      // Obter todos os registros existentes
      const { data: existingRecords, error: recordsError } = await supabase
        .from('health_records')
        .select('*');
      
      if (recordsError) {
        console.error('Erro ao obter registros existentes:', recordsError);
        return;
      }
      
      console.log(`${existingRecords.length} registros encontrados para migração.`);
      
      // Atualizar cada registro para incluir o user_id
      let successCount = 0;
      let failCount = 0;
      
      for (const record of existingRecords) {
        // Criar uma cópia do registro com o campo user_id
        const updatedRecord = { ...record, user_id: adminId };
        
        // Remover campos que podem causar problemas na atualização
        delete updatedRecord.created_at;
        delete updatedRecord.updated_at;
        
        // Atualizar o registro
        const { error: updateError } = await supabase
          .from('health_records')
          .update({ user_id: adminId })
          .eq('id', record.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar registro ${record.id}:`, updateError);
          failCount++;
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`${successCount} registros atualizados...`);
          }
        }
      }
      
      console.log(`Migração concluída: ${successCount} registros atualizados com sucesso, ${failCount} falhas.`);
    }
    
    // Passo 3: Configurar as políticas RLS
    console.log('Configurando políticas RLS para a tabela health_records...');
    
    // Remover políticas existentes
    try {
      await supabase.rpc('drop_policy', { 
        table_name: 'health_records',
        policy_name: 'Permitir SELECT para todos'
      });
      await supabase.rpc('drop_policy', { 
        table_name: 'health_records',
        policy_name: 'Permitir INSERT para todos'
      });
      await supabase.rpc('drop_policy', { 
        table_name: 'health_records',
        policy_name: 'Permitir UPDATE para todos'
      });
      await supabase.rpc('drop_policy', { 
        table_name: 'health_records',
        policy_name: 'Permitir DELETE para todos'
      });
      
      console.log('Políticas antigas removidas com sucesso.');
    } catch (error) {
      console.log('Erro ao remover políticas antigas (podem não existir):', error.message);
    }
    
    // Criar novas políticas
    try {
      await supabase.rpc('create_policy', {
        table_name: 'health_records',
        policy_name: 'Permitir SELECT para usuário',
        operation: 'SELECT',
        expression: 'user_id = auth.uid() OR auth.role() = \'admin\''
      });
      
      await supabase.rpc('create_policy', {
        table_name: 'health_records',
        policy_name: 'Permitir INSERT para usuário',
        operation: 'INSERT',
        expression: 'user_id = auth.uid() OR auth.role() = \'admin\''
      });
      
      await supabase.rpc('create_policy', {
        table_name: 'health_records',
        policy_name: 'Permitir UPDATE para usuário',
        operation: 'UPDATE',
        expression: 'user_id = auth.uid() OR auth.role() = \'admin\''
      });
      
      await supabase.rpc('create_policy', {
        table_name: 'health_records',
        policy_name: 'Permitir DELETE para usuário',
        operation: 'DELETE',
        expression: 'user_id = auth.uid() OR auth.role() = \'admin\''
      });
      
      console.log('Novas políticas RLS criadas com sucesso.');
    } catch (error) {
      console.error('Erro ao criar novas políticas RLS:', error);
    }
    
    console.log('Migração da tabela health_records concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

migrateHealthRecords();
