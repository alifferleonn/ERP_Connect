-- EXECUTE ESTE SCRIPT NO EDITOR SQL DO SEU CONSOLE DO SUPABASE
-- Acesse: https://supabase.com -> Seu Projeto -> SQL Editor -> New Query -> Cole e execute o código abaixo.

-- 1. Criação da tabela de configurações
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar políticas de acesso públicas (para leitura e escrita via chave anônima)
-- Desativa segurança de linhas (RLS) para permitir leitura/escrita rápida
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- 3. Inserir o valor inicial padrão de R$ 50.000,00 para o caixa inicial
INSERT INTO public.settings (id, key, value) 
VALUES ('cash-initial', 'caixa_inicial', '50000')
ON CONFLICT (key) DO NOTHING;
