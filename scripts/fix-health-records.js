// Script para corrigir a tabela health_records adicionando a coluna user_id
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = "https://uwgydwarqehwjjfqcilc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3lkd2FycWVod2pqZnFjaWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MTQ3ODQsImV4cCI6MjA2NDA5MDc4NH0.JyrZEXKwuumB7QcsSBT_Ui5QWWuZH7v3q1IrL_YWPYQ";

// Inicializar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixHealthRecordsTable() {
  console.log('Iniciando correção da tabela health_records...');

  try {
    // Passo 1: Verificar se a coluna user_id já existe
    console.log('Verificando se a coluna user_id existe...');
    
    let columnExists = false;
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('user_id')
        .limit(1);
      
      if (!error) {
        columnExists = true;
        console.log('A coluna user_id já existe na tabela.');
      }
    } catch (e) {
      console.log('A coluna user_id não existe ainda:', e.message);
    }

    // Passo 2: Se a coluna não existir, adicioná-la usando SQL bruto
    if (!columnExists) {
      console.log('Adicionando a coluna user_id à tabela...');
      
      // Usar a função rpc para executar SQL bruto
      const { error: addColumnError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)'
      });

      if (addColumnError) {
        console.error('Erro ao adicionar coluna user_id:', addColumnError);
        
        // Tentar método alternativo se o primeiro falhar
        console.log('Tentando método alternativo para adicionar a coluna...');
        
        // Verificar se a tabela existe
        const { data: tables, error: tableError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'health_records')
          .eq('table_schema', 'public');
          
        if (tableError) {
          console.error('Erro ao verificar tabela:', tableError);
        } else {
          console.log('Tabela health_records encontrada:', tables);
        }
      } else {
        console.log('Coluna user_id adicionada com sucesso!');
      }
    }

    // Passo 3: Obter um usuário admin para associar aos registros existentes
    console.log('Buscando usuário admin para associar aos registros...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    
    if (adminError) {
      console.error('Erro ao buscar usuário admin:', adminError);
      console.log('Tentando buscar qualquer usuário...');
      
      // Se não encontrar admin, buscar qualquer usuário
      const { data: anyUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();
        
      if (userError) {
        console.error('Erro ao buscar qualquer usuário:', userError);
        return;
      }
      
      if (anyUser) {
        console.log('Usuário encontrado:', anyUser.id);
        
        // Atualizar registros sem user_id
        await updateRecords(anyUser.id);
      }
    } else if (adminUser) {
      console.log('Usuário admin encontrado:', adminUser.id);
      
      // Atualizar registros sem user_id
      await updateRecords(adminUser.id);
    }
    
    console.log('Processo de correção concluído!');
  } catch (error) {
    console.error('Erro durante o processo de correção:', error);
  }
}

async function updateRecords(userId) {
  console.log(`Atualizando registros sem user_id para o usuário ${userId}...`);
  
  // Atualizar registros que não têm user_id
  const { data, error } = await supabase
    .from('health_records')
    .update({ user_id: userId })
    .is('user_id', null);
    
  if (error) {
    console.error('Erro ao atualizar registros:', error);
  } else {
    console.log('Registros atualizados com sucesso!');
  }
}

// Executar a função principal
fixHealthRecordsTable()
  .then(() => console.log('Script finalizado.'))
  .catch(err => console.error('Erro no script:', err));
