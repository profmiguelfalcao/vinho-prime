-- ============================================================
-- Vinho Prime — Schema de Autenticação (Login + Perfil)
-- Execute no painel: supabase.com → seu projeto → SQL Editor
-- Pré-requisito: Authentication → Providers → Email já vem ativo
-- por padrão; para login com Google, configure o provider Google
-- em Authentication → Providers (veja instruções no chat).
-- ============================================================

-- ----------------------------------------------------------
-- Tabela de perfis (estende auth.users)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfis (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT,
  telefone   TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil_select_proprio"
  ON perfis FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "perfil_update_proprio"
  ON perfis FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "perfil_insert_proprio"
  ON perfis FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Cria automaticamente uma linha em "perfis" quando um usuário se cadastra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------
-- Tabela de pedidos (histórico do checkout)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_pedido   TEXT        NOT NULL,
  itens           JSONB       NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  frete           NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  endereco        JSONB,
  status          TEXT        NOT NULL DEFAULT 'pendente',
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos (user_id);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedido_select_proprio"
  ON pedidos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "pedido_insert_proprio"
  ON pedidos FOR INSERT
  WITH CHECK (auth.uid() = user_id);
