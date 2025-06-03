-- Função para inserir dados na tabela cattle
CREATE OR REPLACE FUNCTION public.insert_cattle(cattle_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  result JSONB;
BEGIN
  -- Verificar se a tabela existe
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cattle') THEN
    -- Criar a tabela se não existir
    CREATE TABLE public.cattle (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      breed TEXT NOT NULL,
      age INTEGER NOT NULL,
      weight NUMERIC NOT NULL,
      gender TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      dateOfBirth TEXT,
      entryDate TEXT,
      observations TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
    );
    
    -- Habilitar RLS
    ALTER TABLE public.cattle ENABLE ROW LEVEL SECURITY;
    
    -- Criar política permissiva para testes
    CREATE POLICY "Permitir acesso total temporariamente" 
      ON public.cattle 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Gerar um novo UUID para o registro
  SELECT uuid_generate_v4() INTO new_id;
  
  -- Inserir o registro com o novo ID
  INSERT INTO public.cattle (
    id,
    name,
    breed,
    age,
    weight,
    gender,
    category,
    status,
    dateOfBirth,
    entryDate,
    observations,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    new_id,
    cattle_data->>'name',
    cattle_data->>'breed',
    (cattle_data->>'age')::INTEGER,
    (cattle_data->>'weight')::NUMERIC,
    cattle_data->>'gender',
    cattle_data->>'category',
    cattle_data->>'status',
    cattle_data->>'dateOfBirth',
    cattle_data->>'entryDate',
    cattle_data->>'observations',
    COALESCE((cattle_data->>'user_id')::UUID, '00000000-0000-0000-0000-000000000000'),
    COALESCE((cattle_data->>'created_at')::TIMESTAMP WITH TIME ZONE, now()),
    COALESCE((cattle_data->>'updated_at')::TIMESTAMP WITH TIME ZONE, now())
  );
  
  -- Retornar o ID e os dados inseridos
  result := jsonb_build_object(
    'id', new_id,
    'success', true,
    'data', cattle_data
  );
  
  RETURN result;
END;
$$;

-- Função para atualizar dados na tabela cattle
CREATE OR REPLACE FUNCTION public.update_cattle(cattle_id UUID, cattle_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verificar se o registro existe
  IF NOT EXISTS (SELECT 1 FROM public.cattle WHERE id = cattle_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registro não encontrado'
    );
  END IF;
  
  -- Atualizar o registro
  UPDATE public.cattle
  SET
    name = COALESCE(cattle_data->>'name', name),
    breed = COALESCE(cattle_data->>'breed', breed),
    age = COALESCE((cattle_data->>'age')::INTEGER, age),
    weight = COALESCE((cattle_data->>'weight')::NUMERIC, weight),
    gender = COALESCE(cattle_data->>'gender', gender),
    category = COALESCE(cattle_data->>'category', category),
    status = COALESCE(cattle_data->>'status', status),
    dateOfBirth = COALESCE(cattle_data->>'dateOfBirth', dateOfBirth),
    entryDate = COALESCE(cattle_data->>'entryDate', entryDate),
    observations = COALESCE(cattle_data->>'observations', observations),
    updated_at = now()
  WHERE id = cattle_id;
  
  -- Retornar sucesso
  result := jsonb_build_object(
    'id', cattle_id,
    'success', true
  );
  
  RETURN result;
END;
$$;

-- Função para excluir dados na tabela cattle
CREATE OR REPLACE FUNCTION public.delete_cattle(cattle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verificar se o registro existe
  IF NOT EXISTS (SELECT 1 FROM public.cattle WHERE id = cattle_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registro não encontrado'
    );
  END IF;
  
  -- Excluir o registro
  DELETE FROM public.cattle
  WHERE id = cattle_id;
  
  -- Retornar sucesso
  result := jsonb_build_object(
    'id', cattle_id,
    'success', true
  );
  
  RETURN result;
END;
$$;
