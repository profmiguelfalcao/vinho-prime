/* ============================================================
   Vinho Prime — Camada de Dados (DB)
   Fase 1: JSON local  |  Fase 2: Supabase
   ============================================================
   Para ativar o Supabase, preencha as duas constantes abaixo
   com os valores do seu projeto em supabase.com → Settings → API
   ============================================================ */

const DB = (function () {

  /* ---- Configuração Supabase ---- */
  const SUPABASE_URL = 'https://zpifnlumawnkzxlbmcnq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwaWZubHVtYXdua3p4bGJtY25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTQyODMsImV4cCI6MjA5NzE3MDI4M30.taDCuonSaibYKrkZSvOI9JJNKhttp2Ll6uf0gniTUU8';

  const TABELA = 'produtos';
  const JSON_FALLBACK = 'dados/produtos.json';

  const ativo = SUPABASE_URL !== '' && SUPABASE_KEY !== '';
  let _client = null;

  function client() {
    if (_client) return _client;
    if (!ativo) return null;
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }

  /* ---- Normalização snake_case → camelCase ---- */
  function normalizar(row) {
    return {
      ...row,
      teorAlcoolico:      row.teor_alcoolico      ?? row.teorAlcoolico,
      temperaturaServico: row.temperatura_servico  ?? row.temperaturaServico,
      tempoDeGuarda:      row.tempo_de_guarda      ?? row.tempoDeGuarda,
      precoOriginal:      row.preco_original       != null ? parseFloat(row.preco_original)  : (row.precoOriginal ?? null),
      estoqueMinimo:      row.estoque_minimo       ?? row.estoqueMinimo,
      notasDegustacao:    row.notas_degustacao     ?? row.notasDegustacao,
      numeroAvaliacoes:   row.numero_avaliacoes    ?? row.numeroAvaliacoes,
      preco:              parseFloat(row.preco),
    };
  }

  /* ---- Denormalização camelCase → snake_case (para salvar) ---- */
  function denormalizar(p) {
    const { teorAlcoolico, temperaturaServico, tempoDeGuarda, precoOriginal,
            estoqueMinimo, notasDegustacao, numeroAvaliacoes, ...resto } = p;
    return {
      ...resto,
      teor_alcoolico:      teorAlcoolico,
      temperatura_servico: temperaturaServico,
      tempo_de_guarda:     tempoDeGuarda,
      preco_original:      precoOriginal,
      estoque_minimo:      estoqueMinimo,
      notas_degustacao:    notasDegustacao,
      numero_avaliacoes:   numeroAvaliacoes,
    };
  }

  /* ==============================================================
     LEITURA
  ============================================================== */

  async function getProdutos() {
    if (!ativo) return _fetchJSON();

    const { data, error } = await client()
      .from(TABELA)
      .select('*')
      .order('nome');

    if (error) {
      console.warn('[DB] Supabase error, fallback to JSON:', error.message);
      return _fetchJSON();
    }
    return { produtos: (data || []).map(normalizar) };
  }

  async function getProduto(slug) {
    if (!ativo) {
      const { produtos } = await _fetchJSON();
      return produtos.find(p => p.slug === slug) || null;
    }

    const { data, error } = await client()
      .from(TABELA)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) return null;
    return normalizar(data);
  }

  async function _fetchJSON() {
    try {
      const r = await fetch(JSON_FALLBACK);
      const d = await r.json();
      return { produtos: (d.produtos || []) };
    } catch (e) {
      console.error('[DB] Falha ao carregar JSON:', e);
      return { produtos: [] };
    }
  }

  /* ==============================================================
     ESCRITA (admin)
  ============================================================== */

  async function salvar(produto) {
    if (!ativo) throw new Error('Supabase não configurado. Configure SUPABASE_URL e SUPABASE_KEY em js/db.js');

    const row = denormalizar(produto);
    const { data, error } = await client()
      .from(TABELA)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return normalizar(data);
  }

  async function atualizar(id, campos) {
    if (!ativo) throw new Error('Supabase não configurado.');

    const row = denormalizar(campos);
    const { data, error } = await client()
      .from(TABELA)
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return normalizar(data);
  }

  async function deletar(id) {
    if (!ativo) throw new Error('Supabase não configurado.');

    const { error } = await client()
      .from(TABELA)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /* ---- API pública ---- */
  return {
    getProdutos,
    getProduto,
    salvar,
    atualizar,
    deletar,
    isSupabaseAtivo: () => ativo,
  };
})();
