// Utilitário para diagnóstico do banco de dados
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin-client';

/**
 * Verifica o status das tabelas no banco de dados
 */
export async function checkDatabaseStatus() {
  console.log('Iniciando diagnóstico do banco de dados...');
  const results: Record<string, any> = {};
  
  // Lista de tabelas para verificar
  const tables = ['cattle', 'horses', 'health_records', 'documents', 'calendar_events'];
  
  for (const table of tables) {
    try {
      // Verificar se a tabela existe
      const { data, error } = await supabase
        .from(table)
        .select('count(*)')
        .limit(1);
      
      if (error) {
        console.error(`Erro ao verificar tabela ${table}:`, error);
        results[table] = { exists: false, error: error.message };
      } else {
        console.log(`Tabela ${table} existe.`);
        
        // Contar registros
        const { data: countData, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error(`Erro ao contar registros na tabela ${table}:`, countError);
          results[table] = { exists: true, count: 'erro', error: countError.message };
        } else {
          console.log(`Tabela ${table} tem ${countData?.length || 0} registros.`);
          results[table] = { exists: true, count: countData?.length || 0 };
        }
      }
    } catch (e) {
      console.error(`Erro ao verificar tabela ${table}:`, e);
      results[table] = { exists: false, error: e.message };
    }
  }
  
  // Verificar buckets de storage
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) {
      console.error('Erro ao listar buckets:', error);
      results.buckets = { error: error.message };
    } else {
      console.log('Buckets encontrados:', buckets.map(b => b.name).join(', '));
      results.buckets = { list: buckets.map(b => b.name) };
    }
  } catch (e) {
    console.error('Erro ao verificar buckets:', e);
    results.buckets = { error: e.message };
  }
  
  console.log('Diagnóstico concluído:', results);
  return results;
}

/**
 * Executa o diagnóstico e retorna os resultados formatados para exibição
 */
export async function runDiagnostic() {
  const results = await checkDatabaseStatus();
  
  let report = '# Diagnóstico do Banco de Dados\n\n';
  
  // Tabelas
  report += '## Tabelas\n\n';
  for (const [table, status] of Object.entries(results)) {
    if (table === 'buckets') continue;
    
    if (status.exists) {
      report += `✅ **${table}**: ${status.count} registros\n`;
    } else {
      report += `❌ **${table}**: Não encontrada - ${status.error}\n`;
    }
  }
  
  // Buckets
  report += '\n## Buckets de Storage\n\n';
  if (results.buckets.list) {
    report += `✅ Buckets encontrados: ${results.buckets.list.join(', ')}\n`;
  } else {
    report += `❌ Erro ao verificar buckets: ${results.buckets.error}\n`;
  }
  
  return report;
}

export default runDiagnostic;
