-- Cole e execute este script no Editor SQL do console do Supabase
-- Acesse: https://supabase.com -> Seu Projeto -> SQL Editor -> New Query

-- 1. Adicionar coluna exchange_rate na tabela public.sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) DEFAULT 1.0000;

-- 2. Adicionar coluna exchange_rate na tabela public.purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) DEFAULT 1.0000;
