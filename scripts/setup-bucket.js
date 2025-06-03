// Script simples para configurar o bucket do Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uwgydwarqehwjjfqcilc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3lkd2FycWVod2pqZnFjaWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODUxNDc4NCwiZXhwIjoyMDY0MDkwNzg0fQ.jkTF5gtNF2vCFt2i-KHH9YstCNzn9eq8xWYuRwsyOIo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupHorseStorage() {
  try {
    console.log('Configurando bucket para fotos de cavalos...');
    
    // 1. Verificar se o bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'horse-photos';
    const bucketExists = buckets.some(b => b.name === bucketName);
    
    // 2. Criar o bucket se não existir
    if (!bucketExists) {
      console.log(`Criando bucket ${bucketName}...`);
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
      console.log('Bucket criado com sucesso');
    } else {
      console.log('Bucket já existe, atualizando configurações...');
      await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
    }
    
    // 3. Criar pastas necessárias
    const folders = ['animals', 'parents', 'certificates'];
    
    for (const folder of folders) {
      console.log(`Configurando pasta ${folder}...`);
      try {
        // Tentamos criar um arquivo vazio para garantir que a pasta exista
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(`${folder}/.folder`, new Blob([''], { type: 'text/plain' }), { upsert: true });
          
        if (error && !error.message.includes('already exists')) {
          console.log(`Erro ao criar pasta ${folder}:`, error.message);
        } else {
          console.log(`Pasta ${folder} configurada`);
        }
      } catch (err) {
        console.log(`Erro ao configurar pasta ${folder}:`, err);
      }
    }
    
    console.log('Configuração concluída!');
  } catch (error) {
    console.error('Erro na configuração:', error);
  }
}

setupHorseStorage();
