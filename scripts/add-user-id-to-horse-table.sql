-- Add user_id column to horse table
ALTER TABLE public.horse ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update RLS policies to filter by user_id
DROP POLICY IF EXISTS "Permitir SELECT para todos" ON public.horse;
DROP POLICY IF EXISTS "Permitir INSERT para todos" ON public.horse;
DROP POLICY IF EXISTS "Permitir UPDATE para todos" ON public.horse;
DROP POLICY IF EXISTS "Permitir DELETE para todos" ON public.horse;

-- Create new policies that filter by user_id
CREATE POLICY "Permitir SELECT para usuário" ON public.horse
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'admin');
  
CREATE POLICY "Permitir INSERT para usuário" ON public.horse
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
  
CREATE POLICY "Permitir UPDATE para usuário" ON public.horse
  FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'admin') WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');
  
CREATE POLICY "Permitir DELETE para usuário" ON public.horse
  FOR DELETE USING (user_id = auth.uid() OR auth.role() = 'admin');

-- Backfill existing records with user_id (for admin user)
UPDATE public.horse SET user_id = (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) WHERE user_id IS NULL;
