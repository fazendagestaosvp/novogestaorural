-- Adicionar coluna user_id à tabela health_records
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Atualizar registros existentes com o ID do usuário admin (substitua o ID abaixo pelo ID real do admin)
UPDATE public.health_records 
SET user_id = '00000000-0000-0000-0000-000000000000'  -- Substitua pelo ID real do admin
WHERE user_id IS NULL;

-- Remover políticas RLS existentes
DROP POLICY IF EXISTS "Permitir SELECT para todos" ON public.health_records;
DROP POLICY IF EXISTS "Permitir INSERT para todos" ON public.health_records;
DROP POLICY IF EXISTS "Permitir UPDATE para todos" ON public.health_records;
DROP POLICY IF EXISTS "Permitir DELETE para todos" ON public.health_records;

-- Criar novas políticas RLS que filtram por user_id
CREATE POLICY "Permitir SELECT para usuário" ON public.health_records
    FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'admin');
    
CREATE POLICY "Permitir INSERT para usuário" ON public.health_records
    FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
    
CREATE POLICY "Permitir UPDATE para usuário" ON public.health_records
    FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'admin') 
    WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
    
CREATE POLICY "Permitir DELETE para usuário" ON public.health_records
    FOR DELETE USING (user_id = auth.uid() OR auth.role() = 'admin');
