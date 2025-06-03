import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStorage() {
  try {
    console.log('Verificando e configurando o bucket de fotos...');
    
    // Verifica se o bucket já existe
    const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
    
    if (listBucketsError) {
      console.error('Erro ao listar buckets:', listBucketsError);
      return;
    }
    
    const bucketName = 'horse-photos';
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Criando bucket ${bucketName}...`);
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 1024 * 1024 * 5, // 5MB
      });
      
      if (createBucketError) {
        console.error('Erro ao criar bucket:', createBucketError);
        return;
      }
      
      console.log(`Bucket ${bucketName} criado com sucesso!`);
    } else {
      console.log(`Bucket ${bucketName} já existe.`);
    }
    
    console.log('Configuração de armazenamento concluída!');
  } catch (error) {
    console.error('Erro ao configurar o armazenamento:', error);
  }
}

setupStorage();
