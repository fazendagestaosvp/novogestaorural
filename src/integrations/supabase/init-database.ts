// Script de inicialização do banco de dados
// Este arquivo verifica e cria as tabelas necessárias se elas não existirem

import { ensureDocumentsTableExists, ensureStorageBucketsExist, ensureCattleTableExists } from './admin-client';

/**
 * Inicializa o banco de dados, verificando e criando tabelas e buckets necessários
 */
export async function initializeDatabase() {
  console.log('Inicializando banco de dados...');
  
  try {
    // Verificar e criar tabela cattle
    const cattleTableResult = await ensureCattleTableExists();
    console.log('Verificação da tabela cattle concluída:', cattleTableResult ? 'Sucesso' : 'Falha');
    
    // Verificar e criar tabela documents
    const documentsTableResult = await ensureDocumentsTableExists();
    console.log('Verificação da tabela documents concluída:', documentsTableResult ? 'Sucesso' : 'Falha');
    
    // Verificar e criar buckets de storage
    const storageBucketsResult = await ensureStorageBucketsExist();
    console.log('Verificação dos buckets de storage concluída:', storageBucketsResult ? 'Sucesso' : 'Falha');
    
    console.log('Inicialização do banco de dados concluída!');
    return true;
  } catch (error) {
    console.error('Erro durante a inicialização do banco de dados:', error);
    return false;
  }
}

// Exportar função para uso em outros arquivos
export default initializeDatabase;
