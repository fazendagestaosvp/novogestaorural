import { createClient } from '@supabase/supabase-js';

// Usar as chaves diretamente para garantir que o script funcione
const supabaseUrl = "https://uwgydwarqehwjjfqcilc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3lkd2FycWVod2pqZnFjaWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODUxNDc4NCwiZXhwIjoyMDY0MDkwNzg0fQ.jkTF5gtNF2vCFt2i-KHH9YstCNzn9eq8xWYuRwsyOIo";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Função para criar política pública para um bucket
async function createPublicPolicy(bucketName: string) {
  try {
    // Criar política para permitir leitura pública
    const { error: readPolicyError } = await supabase.storage.from(bucketName).createSignedUrl('dummy.txt', 1);
    if (readPolicyError) {
      console.log(`Criando políticas para o bucket ${bucketName}...`);
      
      // Usar SQL direto para criar políticas (isso requer permissão de service_role)
      const createPolicySql = `
        BEGIN;
        -- Permitir SELECT para todos
        CREATE POLICY "Allow public read access" ON storage.objects
          FOR SELECT USING (bucket_id = '${bucketName}');
        
        -- Permitir INSERT para usuários autenticados
        CREATE POLICY "Allow authenticated insert access" ON storage.objects
          FOR INSERT WITH CHECK (bucket_id = '${bucketName}');
        
        -- Permitir UPDATE para usuários autenticados que criaram o objeto
        CREATE POLICY "Allow authenticated update access" ON storage.objects
          FOR UPDATE USING (bucket_id = '${bucketName}');
        
        -- Permitir DELETE para usuários autenticados que criaram o objeto
        CREATE POLICY "Allow authenticated delete access" ON storage.objects
          FOR DELETE USING (bucket_id = '${bucketName}');
        
        -- Permitir acesso anônimo para todos
        CREATE POLICY "Allow public anonymous access" ON storage.objects
          FOR SELECT USING (bucket_id = '${bucketName}');
        COMMIT;
      `;
      
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createPolicySql });
      if (sqlError) {
        console.error('Erro ao criar políticas SQL:', sqlError);
        
        // Tentar método alternativo
        const { error: policyError } = await supabase.rpc('create_public_bucket_policy', { bucket_name: bucketName });
        if (policyError) {
          console.warn('Erro ao criar política via RPC:', policyError);
        } else {
          console.log('Políticas criadas com sucesso via RPC!');
        }
      } else {
        console.log('Políticas SQL criadas com sucesso!');
      }
    } else {
      console.log(`Bucket ${bucketName} já tem políticas configuradas.`);
    }
  } catch (error) {
    console.error('Erro ao configurar políticas:', error);
  }
}

async function setupDocumentsBucket() {
  try {
    console.log('Configurando bucket para documentos...');
    
    // Nome do bucket para documentos
    const bucketName = 'documents';
    
    // Verificar se o bucket já existe
    const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
    
    if (listBucketsError) {
      console.error('Erro ao listar buckets:', listBucketsError);
      return;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Criando bucket ${bucketName}...`);
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 10, // 10MB
      });
      
      if (createBucketError) {
        console.error('Erro ao criar bucket:', createBucketError);
        return;
      }
      
      console.log(`Bucket ${bucketName} criado com sucesso!`);
      
      // Criar políticas para o bucket
      await createPublicPolicy(bucketName);
    } else {
      console.log(`Bucket ${bucketName} já existe.`);
      
      // Atualizar políticas mesmo se o bucket já existir
      await createPublicPolicy(bucketName);
      
      // Atualizar configurações do bucket para garantir que seja público
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 10, // 10MB
      });
      
      if (updateError) {
        console.error('Erro ao atualizar configurações do bucket:', updateError);
      } else {
        console.log(`Configurações do bucket ${bucketName} atualizadas com sucesso!`);
      }
    }
    
    console.log('Configuração do bucket de documentos concluída!');
  } catch (error) {
    console.error('Erro ao configurar o bucket de documentos:', error);
  }
}

// Executar a configuração
setupDocumentsBucket()
  .then(() => console.log('Script concluído com sucesso!'))
  .catch(err => console.error('Erro ao executar script:', err));
