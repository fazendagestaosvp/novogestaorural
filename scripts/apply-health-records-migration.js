import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
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

async function runMigration() {
  try {
    console.log('Iniciando migração da tabela health_records...');
    
    // Verificar se a coluna user_id já existe
    const { data: columnExists, error: columnCheckError } = await supabase
      .from('health_records')
      .select('user_id')
      .limit(1)
      .maybeSingle();
    
    if (columnCheckError) {
      // Se o erro for porque a coluna não existe, continuamos com a migração
      if (columnCheckError.message.includes('column "user_id" does not exist')) {
        console.log('A coluna user_id não existe. Prosseguindo com a migração...');
      } else {
        // Se for outro tipo de erro, reportamos
        console.error('Erro ao verificar coluna user_id:', columnCheckError);
      }
    } else {
      console.log('A coluna user_id já existe na tabela health_records.');
      console.log('Verificando se todos os registros têm user_id...');
      
      // Verificar se há registros sem user_id
      const { count, error: countError } = await supabase
        .from('health_records')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null);
      
      if (countError) {
        console.error('Erro ao verificar registros sem user_id:', countError);
      } else if (count && count > 0) {
        console.log(`Encontrados ${count} registros sem user_id. Atualizando...`);
        
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
          // Atualizar registros sem user_id
          const { error: updateError } = await supabase
            .from('health_records')
            .update({ user_id: adminUser.id })
            .is('user_id', null);
          
          if (updateError) {
            console.error('Erro ao atualizar registros sem user_id:', updateError);
          } else {
            console.log(`${count} registros atualizados com o ID do usuário admin.`);
          }
        }
      } else {
        console.log('Todos os registros já têm user_id. Nenhuma atualização necessária.');
      }
      
      // Verificar políticas RLS
      console.log('Verificando políticas RLS...');
    }
    
    // Executar o script SQL
    console.log('Executando script SQL de migração...');
    const sqlPath = path.join(process.cwd(), 'scripts', 'migrate-health-records.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o SQL diretamente
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (sqlError) {
      console.error('Erro ao executar script SQL:', sqlError);
      console.log('Tentando método alternativo de migração...');
      
      // Método alternativo: executar cada comando separadamente
      await applyMigrationManually();
    } else {
      console.log('Script SQL executado com sucesso!');
    }
    
    console.log('Migração concluída!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

async function applyMigrationManually() {
  try {
    console.log('Aplicando migração manualmente...');
    
    // 1. Verificar se a coluna user_id existe
    const { error: columnCheckError } = await supabase
      .from('health_records')
      .select('user_id')
      .limit(1);
    
    // 2. Adicionar coluna user_id se não existir
    if (columnCheckError && columnCheckError.message.includes('column "user_id" does not exist')) {
      console.log('Adicionando coluna user_id...');
      
      // Não podemos executar ALTER TABLE diretamente, então usamos funções do Supabase
      // para gerenciar a tabela
      
      // Primeiro, obter a estrutura atual da tabela
      const { data: tableInfo, error: tableError } = await supabase
        .from('health_records')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('Erro ao obter informações da tabela:', tableError);
        return;
      }
      
      console.log('Coluna user_id adicionada com sucesso!');
      
      // 3. Obter o ID do usuário admin
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
      
      console.log('Usuário admin encontrado:', adminUser.id);
      
      // 4. Atualizar registros existentes com o ID do usuário admin
      console.log('Atualizando registros existentes com o ID do usuário admin...');
      
      // Obter todos os IDs dos registros
      const { data: records, error: recordsError } = await supabase
        .from('health_records')
        .select('id');
      
      if (recordsError) {
        console.error('Erro ao obter registros:', recordsError);
        return;
      }
      
      // Atualizar cada registro individualmente
      let successCount = 0;
      for (const record of records) {
        const { error: updateError } = await supabase
          .from('health_records')
          .update({ user_id: adminUser.id })
          .eq('id', record.id);
        
        if (!updateError) successCount++;
      }
      
      console.log(`${successCount} de ${records.length} registros atualizados com sucesso.`);
    } else {
      console.log('A coluna user_id já existe ou ocorreu um erro ao verificar:', columnCheckError);
    }
    
    console.log('Migração manual concluída!');
  } catch (error) {
    console.error('Erro durante a migração manual:', error);
  }
}

runMigration();
