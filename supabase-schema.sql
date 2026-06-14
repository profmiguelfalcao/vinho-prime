-- ============================================================
-- Vinho Prime — Schema Supabase
-- Execute no painel: supabase.com → seu projeto → SQL Editor
-- ============================================================

-- Tabela principal de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id                  TEXT        PRIMARY KEY,
  slug                TEXT        UNIQUE NOT NULL,
  nome                TEXT        NOT NULL,
  tipo                TEXT        NOT NULL CHECK (tipo IN ('vinho','destilado')),
  subtipo             TEXT,
  pais                TEXT,
  regiao              TEXT,
  produtor            TEXT,
  uvas                TEXT[]      DEFAULT '{}',
  safra               SMALLINT,
  volume              SMALLINT    DEFAULT 750,
  teor_alcoolico      NUMERIC(4,1),
  temperatura_servico TEXT,
  tempo_de_guarda     TEXT,
  descricao           TEXT,
  notas_degustacao    TEXT,
  harmonizacao        TEXT[]      DEFAULT '{}',
  preco               NUMERIC(10,2) NOT NULL,
  preco_original      NUMERIC(10,2),
  estoque             INTEGER     DEFAULT 0,
  estoque_minimo      INTEGER     DEFAULT 5,
  badges              TEXT[]      DEFAULT '{}',
  imagem              TEXT,
  galeria             TEXT[]      DEFAULT '{}',
  avaliacao           NUMERIC(3,1),
  numero_avaliacoes   INTEGER     DEFAULT 0,
  pontuacoes          JSONB       DEFAULT '{}',
  ativo               BOOLEAN     DEFAULT true,
  destaque            JSONB       DEFAULT '{}',
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em ON produtos;
CREATE TRIGGER trg_atualizado_em
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_tipo    ON produtos (tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_subtipo ON produtos (subtipo);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo   ON produtos (ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_preco   ON produtos (preco);

-- Row Level Security (RLS)
-- Por padrão: leitura pública, escrita requer autenticação futura
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Permite leitura para todos (produtos ativos)
CREATE POLICY "leitura_publica"
  ON produtos FOR SELECT
  USING (true);

-- Permite escrita para todos por enquanto (mude depois de configurar auth)
-- ATENÇÃO: em produção, troque por: USING (auth.role() = 'authenticated')
CREATE POLICY "escrita_admin"
  ON produtos FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- MIGRAÇÃO: insira os produtos do dados/produtos.json aqui
-- Copie o INSERT gerado pelo painel admin (Exportar → Copiar SQL)
-- OU use o botão "Importar para Supabase" após configurar as credenciais
-- ============================================================

-- Exemplo de um produto:
-- INSERT INTO produtos (id, slug, nome, tipo, subtipo, pais, regiao, produtor,
--   uvas, safra, volume, teor_alcoolico, temperatura_servico, tempo_de_guarda,
--   descricao, notas_degustacao, harmonizacao, preco, preco_original,
--   estoque, estoque_minimo, badges, avaliacao, numero_avaliacoes,
--   pontuacoes, ativo, destaque)
-- VALUES (
--   '001', 'achaval-ferrer-malbec-2021', 'Achaval Ferrer Malbec',
--   'vinho', 'tinto', 'Argentina', 'Mendoza', 'Achaval Ferrer',
--   ARRAY['Malbec'], 2021, 750, 14.5, '16-18°C', '5-10 anos',
--   'Um dos Malbecs mais aclamados da Argentina...',
--   'Frutas negras, ameixa, violeta...',
--   ARRAY['Carnes vermelhas','Churrasco','Queijos curados','Cordeiro'],
--   89.90, 120.00, 24, 5,
--   ARRAY['oferta','sommelier'],
--   5.0, 127,
--   '{"wineSpectator": 92, "jamesSucckling": 94}',
--   true,
--   '{"sommelier": true, "maisVendido": false, "ofertas": true}'
-- );
