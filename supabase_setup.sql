-- EXECUTE ESTE SCRIPT NO EDITOR SQL DO SEU CONSOLE DO SUPABASE
-- Acesse: https://supabase.com -> Seu Projeto -> SQL Editor -> New Query -> Cole e execute o código abaixo.

-- 1. Adicionar colunas de preços por filial na tabela de produtos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price_trade NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS price_connect NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS price_bioss NUMERIC(10, 2);

-- 2. Adicionar coluna de armazém nas tabelas de compras, estoque e vendas
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT 'Dubai';
ALTER TABLE public.stock ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT 'Dubai';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT 'Dubai';

-- 3. Tabela de Chat em Tempo Real (Mensagens Privadas + Sala Geral)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_branch TEXT NOT NULL, -- 'pharmix', 'trade', 'connect', 'connecthealth', 'bioss'
  recipient_email TEXT DEFAULT 'GERAL', -- 'GERAL' para Sala Geral ou o e-mail do usuário no chat privado
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- 4. Habilitar Supabase Realtime na tabela de chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 5. Tabela de configurações gerais (caso ainda não tenha sido criada)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

INSERT INTO public.settings (id, key, value) 
VALUES ('cash-initial', 'caixa_inicial', '50000')
ON CONFLICT (key) DO NOTHING;
