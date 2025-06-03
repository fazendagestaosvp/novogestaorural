-- Add user_id column to health_records table
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update RLS policies to filter by user_id
DROP POLICY IF EXISTS "Permitir SELECT para todos" ON public.health_records;
DROP POLICY IF EXISTS "Permitir INSERT para todos" ON public.health_records;
DROP POLICY IF EXISTS "Permitir UPDATE para todos" ON public.health_records;
DROP POLICY IF EXISTS "Permitir DELETE para todos" ON public.health_records;

-- Create new policies that filter by user_id
CREATE POLICY "Permitir SELECT para usuário" ON public.health_records
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'admin');
  
CREATE POLICY "Permitir INSERT para usuário" ON public.health_records
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
  
CREATE POLICY "Permitir UPDATE para usuário" ON public.health_records
  FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'admin') WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
  
CREATE POLICY "Permitir DELETE para usuário" ON public.health_records
  FOR DELETE USING (user_id = auth.uid() OR auth.role() = 'admin');

-- Backfill existing records with user_id (for admin user)
UPDATE public.health_records SET user_id = (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) WHERE user_id IS NULL;
