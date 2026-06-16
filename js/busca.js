/* ============================================================
   Vinho Prime — Busca Global
   ============================================================ */
const Busca = (function () {

  let _produtos  = [];
  let _carregado = false;
  let _timer     = null;
  let _aberta    = false;

  const GRADIENTES = {
    tinto:     '#5C1515', branco: '#b8a96a', 'rosé': '#c97a8a',
    espumante: '#d4c86a', natural: '#7a9a6a',
    whisky:    '#c4823a', gin: '#5a8a7a', cognac: '#c4943a',
    rum:       '#8a5a3a', 'cachaça': '#a0b060', vodka: '#8a9ab0', licor: '#8a4a8a',
  };

  const EMOJI = { vinho: '🍷', destilado: '🥃' };

  const _norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---- Carregar produtos (lazy) ---- */
  async function _carregar() {
    if (_carregado) return;
    try {
      const res = await DB.getProdutos();
      _produtos = (res.produtos || []).filter(p => p.ativo);
      _carregado = _produtos.length > 0;
    } catch (e) {
      console.warn('[Busca] Erro ao carregar produtos:', e);
    }
  }

  /* ---- Posicionar modal abaixo da lupa (desktop only) ---- */
  function _posicionar() {
    if (window.innerWidth <= 640) return;
    const modal = document.querySelector('.busca-modal');
    const btn   = document.querySelector('.action-btn[aria-label="Buscar"]');
    if (!modal || !btn) return;
    const rect = btn.getBoundingClientRect();
    modal.style.top   = `${rect.bottom + 8}px`;
    modal.style.right = `${window.innerWidth - rect.right}px`;
    modal.style.left  = 'auto';
  }

  /* ---- Abrir ---- */
  async function abrir() {
    if (_aberta) return;
    const overlay = document.getElementById('busca-overlay');
    if (!overlay) return;

    const modal = document.querySelector('.busca-modal');
    if (modal) { modal.style.top = ''; modal.style.right = ''; modal.style.left = ''; }

    _posicionar();
    _aberta = true;
    overlay.classList.add('aberta');

    const input = document.getElementById('busca-input');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 60); }

    _renderizarDica();
    await _carregar();
  }

  /* ---- Fechar ---- */
  function fechar() {
    _aberta = false;
    clearTimeout(_timer);
    const overlay = document.getElementById('busca-overlay');
    if (!overlay) return;
    overlay.classList.remove('aberta');
    const modal = document.querySelector('.busca-modal');
    if (modal) { modal.style.top = ''; modal.style.right = ''; modal.style.left = ''; }
  }

  /* ---- Alternar ---- */
  function alternar() {
    _aberta ? fechar() : abrir();
  }

  /* ---- Input com debounce ---- */
  function aoDigitar(valor) {
    clearTimeout(_timer);
    if (valor.trim().length < 2) { _renderizarDica(); return; }
    _timer = setTimeout(() => _buscar(valor.trim()), 250);
  }

  /* ---- Executar busca ---- */
  function _buscar(termo) {
    const t = _norm(termo);
    const resultados = _produtos.filter(p => {
      const campos = [p.nome, p.produtor, p.pais, p.regiao, ...(p.uvas || []), p.subtipo, p.descricao]
        .filter(Boolean).join(' ');
      return _norm(campos).includes(t);
    });
    _renderizarResultados(resultados, termo);
  }

  /* ---- Destacar termo ---- */
  function _destacar(texto, termo) {
    if (!texto) return '';
    const t = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return texto.replace(new RegExp(t, 'gi'), m => `<mark class="busca-match">${m}</mark>`);
  }

  /* ---- Dica inicial ---- */
  function _renderizarDica() {
    const el = document.getElementById('busca-resultados');
    if (!el) return;
    el.innerHTML = `
      <div class="busca-dica">
        <div class="busca-dica-icone">🔍</div>
        <p>Busque por nome, produtor, país ou uva</p>
        <div class="busca-dica-categorias">
          <a href="vinhos.html?subtipo=tinto"      class="busca-categoria-btn" onclick="Busca.fechar()">Tintos</a>
          <a href="vinhos.html?subtipo=branco"     class="busca-categoria-btn" onclick="Busca.fechar()">Brancos</a>
          <a href="vinhos.html?subtipo=espumante"  class="busca-categoria-btn" onclick="Busca.fechar()">Espumantes</a>
          <a href="destilados.html?subtipo=whisky" class="busca-categoria-btn" onclick="Busca.fechar()">Whisky</a>
          <a href="destilados.html?subtipo=gin"    class="busca-categoria-btn" onclick="Busca.fechar()">Gin</a>
          <a href="vinhos.html"                    class="busca-categoria-btn" onclick="Busca.fechar()">Ver todos →</a>
        </div>
      </div>`;
  }

  /* ---- Resultados ---- */
  function _renderizarResultados(lista, termo) {
    const el = document.getElementById('busca-resultados');
    if (!el) return;

    if (!lista.length) {
      const msg = _carregado
        ? `<p class="busca-vazio-titulo">Nenhum resultado para "<em>${termo}</em>"</p><p class="busca-vazio-sub">Tente outro nome, país ou uva.</p>`
        : `<p class="busca-vazio-titulo">Carregando catálogo…</p>`;
      el.innerHTML = `<div class="busca-vazio">${msg}</div>`;
      return;
    }

    const MAX        = 8;
    const exibir     = lista.slice(0, MAX);
    const vinhos     = exibir.filter(p => p.tipo === 'vinho');
    const destilados = exibir.filter(p => p.tipo === 'destilado');

    let html = '';
    if (vinhos.length)     { html += `<div class="busca-grupo-label">Vinhos</div>` + vinhos.map(p => _cardHTML(p, termo)).join(''); }
    if (destilados.length) { html += `<div class="busca-grupo-label">Destilados</div>` + destilados.map(p => _cardHTML(p, termo)).join(''); }

    if (lista.length > MAX) {
      const q = encodeURIComponent(document.getElementById('busca-input')?.value.trim() || '');
      html += `<button class="busca-ver-todos" onclick="Busca.fechar();location.href='vinhos.html?busca=${q}'">Ver todos os ${lista.length} resultados →</button>`;
    }

    el.innerHTML = html;
  }

  function _cardHTML(p, termo) {
    const cor   = GRADIENTES[p.subtipo] || '#3D0C0C';
    const preco = (p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const nome  = _destacar(p.nome, termo);
    const sub   = [p.produtor, p.pais].filter(Boolean).join(' · ');
    return `
      <a class="busca-resultado" href="produto.html?slug=${p.slug}" onclick="Busca.fechar()">
        <div class="busca-resultado-img" style="background:${cor}">${EMOJI[p.tipo] || '🍾'}</div>
        <div class="busca-resultado-info">
          <p class="busca-resultado-nome">${nome}</p>
          <p class="busca-resultado-sub">${sub}</p>
        </div>
        <span class="busca-resultado-preco">${preco}</span>
      </a>`;
  }

  /* ---- Eventos ---- */

  // Fechar ao clicar fora do modal (click em capture = antes do target)
  document.addEventListener('click', function (e) {
    if (!_aberta) return;
    if (e.target.closest('.busca-modal')) return;
    if (e.target.closest('[aria-label="Buscar"]')) return;
    fechar();
  }, true);

  // ESC fecha, Ctrl+K abre
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fechar();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); abrir(); }
  });

  // Garante estado limpo ao restaurar do bfcache
  window.addEventListener('pageshow', function () { fechar(); });

  return { abrir, fechar, alternar, aoDigitar };

})();
