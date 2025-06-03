// Script para testar a conexão com o Supabase
import { supabase } from "./integrations/supabase/client";

/**
 * Testa a conexão com o banco de dados Supabase
 * Este arquivo pode ser importado em qualquer componente para teste
 */
export async function testSupabaseConnection() {
  try {
    // Realiza uma consulta simples para testar a conexão
    const { data, error } = await supabase.from('_schema_migrations').select('*').limit(1);
    
    if (error) {
      console.error("❌ Erro na conexão com o banco de dados:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log("✅ Conexão com o banco de dados estabelecida com sucesso!");
    console.log("Dados de teste:", data);
    
    return {
      success: true,
      data
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("❌ Erro ao testar a conexão:", errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}
