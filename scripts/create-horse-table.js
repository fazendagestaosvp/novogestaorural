// Script para criar a tabela horse no Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uwgydwarqehwjjfqcilc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3lkd2FycWVod2pqZnFjaWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODUxNDc4NCwiZXhwIjoyMDY0MDkwNzg0fQ.jkTF5gtNF2vCFt2i-KHH9YstCNzn9eq8xWYuRwsyOIo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createHorseTable() {
  try {
    console.log('Criando tabela horse...');
    
    // SQL para criar a tabela horse
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.horse (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          breed TEXT NOT NULL,
          age INTEGER NOT NULL,
          color TEXT NOT NULL,
          gender TEXT NOT NULL,
          status TEXT NOT NULL,
          weight NUMERIC,
          observations TEXT,
          dateOfBirth DATE,
          entryDate DATE,
          animalPhotos TEXT[],
          fatherPhoto TEXT,
          motherPhoto TEXT,
          registrationCertificate TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
        
        -- Adicionar comentários para melhor documentação
        COMMENT ON TABLE public.horse IS 'Tabela para armazenar dados de cavalos';
        COMMENT ON COLUMN public.horse.id IS 'Identificador único do cavalo (ex: EQU001)';
        COMMENT ON COLUMN public.horse.animalPhotos IS 'Array de URLs das fotos do animal';
        
        -- Criar política de segurança RLS (Row Level Security)
        ALTER TABLE public.horse ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas para permitir operações CRUD
        CREATE POLICY "Permitir SELECT para todos" ON public.horse
          FOR SELECT USING (true);
          
        CREATE POLICY "Permitir INSERT para todos" ON public.horse
          FOR INSERT WITH CHECK (true);
          
        CREATE POLICY "Permitir UPDATE para todos" ON public.horse
          FOR UPDATE USING (true) WITH CHECK (true);
          
        CREATE POLICY "Permitir DELETE para todos" ON public.horse
          FOR DELETE USING (true);
      `
    });
    
    if (error) {
      console.error('Erro ao criar tabela:', error);
    } else {
      console.log('Tabela horse criada com sucesso!');
    }
  } catch (error) {
    console.error('Erro na criação da tabela:', error);
  }
}

createHorseTable();
