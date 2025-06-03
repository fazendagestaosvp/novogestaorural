# Guia de Migração da Tabela Health Records

Este guia fornece instruções passo a passo para adicionar a coluna `user_id` à tabela `health_records` e configurar as políticas RLS (Row Level Security) para isolamento de dados por usuário.

## Pré-requisitos

- Acesso administrativo ao projeto Supabase
- ID do usuário admin (será necessário para atualizar registros existentes)

## Passos para Migração

### 1. Obter o ID do Usuário Admin

1. Acesse o console do Supabase: https://app.supabase.io
2. Vá para o seu projeto
3. Clique em "Table Editor" no menu lateral
4. Selecione a tabela "users"
5. Encontre o usuário com role = 'admin'
6. Copie o valor da coluna "id" (será um UUID como `123e4567-e89b-12d3-a456-426614174000`)

### 2. Executar o Script SQL de Migração

1. No console do Supabase, clique em "SQL Editor" no menu lateral
2. Clique em "New Query" para criar uma nova consulta
3. Cole o seguinte SQL, substituindo `[ADMIN_USER_ID]` pelo ID do usuário admin que você copiou:

```sql
-- Adicionar coluna user_id à tabela health_records
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Atualizar registros existentes com o ID do usuário admin
UPDATE public.health_records 
SET user_id = '[ADMIN_USER_ID]'
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
```

4. Clique em "Run" para executar o script

### 3. Verificar a Migração

1. Volte para "Table Editor" no menu lateral
2. Selecione a tabela "health_records"
3. Verifique se a coluna "user_id" foi adicionada
4. Verifique se todos os registros têm um valor na coluna "user_id"

### 4. Verificar as Políticas RLS

1. No "Table Editor", selecione a tabela "health_records"
2. Clique na aba "Policies"
3. Verifique se as seguintes políticas estão presentes:
   - "Permitir SELECT para usuário"
   - "Permitir INSERT para usuário"
   - "Permitir UPDATE para usuário"
   - "Permitir DELETE para usuário"
4. Verifique se cada política tem a condição correta (user_id = auth.uid() OR auth.role() = 'admin')

### 5. Testar o Aplicativo

1. Volte ao aplicativo Fazenda Vista Control
2. Acesse a página de Histórico de Saúde
3. Verifique se a página carrega sem erros
4. Teste a adição, edição e exclusão de registros para garantir que tudo funcione corretamente

## Solução de Problemas

Se você encontrar problemas durante a migração, verifique:

1. **Erro ao adicionar a coluna**: Verifique se a coluna já existe
2. **Erro ao atualizar registros**: Verifique se o ID do usuário admin está correto
3. **Erro ao criar políticas**: Verifique se as políticas antigas foram removidas corretamente
4. **Erro no aplicativo**: Verifique o console do navegador para mensagens de erro específicas

## Notas Adicionais

- O código do aplicativo foi atualizado para ser resiliente à ausência da coluna `user_id`, então ele deve funcionar mesmo que a migração não tenha sido concluída
- Se você encontrar problemas com as políticas RLS, pode ser necessário habilitar RLS na tabela com: `ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;`
