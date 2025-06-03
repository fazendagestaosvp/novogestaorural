// Script para criar a tabela horse no Supabase usando REST API
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://uwgydwarqehwjjfqcilc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3lkd2FycWVod2pqZnFjaWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODUxNDc4NCwiZXhwIjoyMDY0MDkwNzg0fQ.jkTF5gtNF2vCFt2i-KHH9YstCNzn9eq8xWYuRwsyOIo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createHorseTable() {
  try {
    console.log('Criando tabela horse...');
    
    // SQL para criar a tabela horse usando uma query direta
    const { data, error } = await supabase.from('_unverified_horse').insert([
      { 
        id: 'SETUP_RECORD', 
        name: 'Tabela Criada',
        breed: 'Sistema',
        age: 1,
        color: 'Preto',
        gender: 'Macho',
        status: 'Ativo'
      }
    ]);

    if (error) {
      console.log('Tentando criar a tabela via SQL...');

      // Primeira tentativa: tentar criar a tabela usando SQL direto
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({
          name: 'horse',
          schema: 'public',
          columns: [
            { name: 'id', type: 'text', is_primary: true },
            { name: 'name', type: 'text', is_nullable: false },
            { name: 'breed', type: 'text', is_nullable: false },
            { name: 'age', type: 'integer', is_nullable: false },
            { name: 'color', type: 'text', is_nullable: false },
            { name: 'gender', type: 'text', is_nullable: false },
            { name: 'status', type: 'text', is_nullable: false },
            { name: 'weight', type: 'numeric', is_nullable: true },
            { name: 'observations', type: 'text', is_nullable: true },
            { name: 'dateOfBirth', type: 'date', is_nullable: true },
            { name: 'entryDate', type: 'date', is_nullable: true },
            { name: 'animalPhotos', type: 'text[]', is_nullable: true },
            { name: 'fatherPhoto', type: 'text', is_nullable: true },
            { name: 'motherPhoto', type: 'text', is_nullable: true },
            { name: 'registrationCertificate', type: 'text', is_nullable: true },
          ]
        })
      });

      console.log('Resultado da criação da tabela:', await response.text());

      // Verificar se a tabela foi criada
      const { data: checkData, error: checkError } = await supabase.from('horse').select('*', { count: 'exact', head: true });
      
      if (checkError) {
        console.error('Erro ao verificar a tabela horse:', checkError);
      } else {
        console.log('Tabela horse criada com sucesso!');
      }
    } else {
      console.log('Tabela criada com sucesso!');
    }

    // Outra tentativa: Tenta inserir um registro de exemplo para criar a tabela automaticamente
    const { data: insertData, error: insertError } = await supabase
      .from('horse')
      .insert({
        id: 'EXAMPLE001',
        name: 'Cavalo Exemplo',
        breed: 'Exemplo',
        age: 5,
        color: 'Marrom',
        gender: 'Macho',
        status: 'Saudável'
      });

    if (insertError) {
      console.error('Erro ao inserir registro de exemplo:', insertError);
    } else {
      console.log('Registro de exemplo inserido com sucesso:', insertData);
    }

  } catch (error) {
    console.error('Erro na criação da tabela:', error);
  }
}

createHorseTable();
