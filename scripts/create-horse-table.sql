-- SQL para criar a tabela horse
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
  "dateOfBirth" DATE,
  "entryDate" DATE,
  "animalPhotos" TEXT[],
  "fatherPhoto" TEXT,
  "motherPhoto" TEXT,
  "registrationCertificate" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Adicionar comentários para melhor documentação
COMMENT ON TABLE public.horse IS 'Tabela para armazenar dados de cavalos';
COMMENT ON COLUMN public.horse.id IS 'Identificador único do cavalo (ex: EQU001)';
COMMENT ON COLUMN public.horse."animalPhotos" IS 'Array de URLs das fotos do animal';

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
