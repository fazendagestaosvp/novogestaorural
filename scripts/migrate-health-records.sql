-- Adicionar coluna user_id à tabela health_records se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'health_records'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.health_records ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        -- Atualizar registros existentes com o ID do usuário admin
        UPDATE public.health_records 
        SET user_id = (
            SELECT id FROM auth.users 
            WHERE role = 'admin' 
            ORDER BY created_at 
            LIMIT 1
        )
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
    END IF;
END
$$;
