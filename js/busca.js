/* ============================================================
   Vinho Prime — Busca Global
   ============================================================ */
const Busca = (function () {

  let _produtos  = [];
  let _carregado = false;
  let _timer     = null;
  let _aberta    = false;
  let _ultimoTermo = '';

  const GRADIENTES = {
    tinto:     '#5C1515', branco: '#b8a96a', 'rosé': '#c97a8a',
    espumante: '#d4c86a', natural: '#7a9a6a',
    whisky:    '#c4823a', gin: '#5a8a7a', cognac: '#c4943a',
    rum:       '#8a5a3a', 'cachaça': '#a0b060', vodka: '#8a9ab0', licor: '#8a4a8a',
  };

  const EMOJI = { vinho: '🍷', destilado: '🥃' };

  const _norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---- Carregar produtos ---- */
  async function _carregar() {
    if (_carregado) return;
    try {
      const res = await DB.getProdutos();
      _produtos  = (res && res.produtos ? res.produtos : []).filter(p => p.ativo);
      _carregado = true; // marcado mesmo se lista vazia — evita loop
      // Se havia termo pendente, busca agora que os dados chegaram
      if (_ultimoTermo.length >= 2) _buscar(_ultimoTermo);
    } catch (e) {
      console.warn('[Busca] Falha ao carregar produtos:', e);
      _carregado = false; // permite nova tentativa
    }
  }

  /* ---- Posicionar modal abaixo da lupa (desktop only) ---- */
  function _posicionar() {
    if (window.innerWidth <= 640) return;
    const modal = document.querySelector('.busca-modal');
    const btn   = document.querySelector('.action-btn[aria-label="Buscar"]');
    if (!modal || !btn) return;
    const rect = btn.getBoundingClientRect();
    modal.style.top   = (rect.bottom + 8) + 'px';
    modal.style.right = (window.innerWidth - rect.right) + 'px';
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
    _ultimoTermo = '';
    const input = document.getElementById('busca-input');
    if (input) { input.value = ''; setTimeout(function () { input.focus(); }, 60); }
    _renderizarDica();
    await _carregar();
  }

  /* ---- Fechar ---- */
  function fechar() {
    _aberta = false;
    _ultimoTermo = '';
    clearTimeout(_timer);
    const overlay = document.getElementById('busca-overlay');
    if (overlay) overlay.classList.remove('aberta');
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
    _ultimoTermo = valor.trim();
    if (_ultimoTermo.length < 2) { _renderizarDica(); return; }
    if (!_carregado) {
      _renderizarCarregando();
      _timer = setTimeout(function () { _carregar(); }, 300);
      return;
    }
    _timer = setTimeout(function () { _buscar(_ultimoTermo); }, 250);
  }

  /* ---- Executar busca ---- */
  function _buscar(termo) {
    const t = _norm(termo);
    const resultados = _produtos.filter(function (p) {
      const campos = [p.nome, p.produtor, p.pais, p.regiao]
        .concat(p.uvas || [])
        .concat([p.subtipo, p.descricao])
        .filter(Boolean).join(' ');
      return _norm(campos).includes(t);
    });
    _renderizarResultados(resultados, termo);
  }

  /* ---- Destacar termo ---- */
  function _destacar(texto, termo) {
    if (!texto) return '';
    const t = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return texto.replace(new RegExp(t, 'gi'), function (m) {
      return '<mark class="busca-match">' + m + '</mark>';
    });
  }

  /* ---- Dica inicial ---- */
  function _renderizarDica() {
    const el = document.getElementById('busca-resultados');
    if (!el) return;
    el.innerHTML =
      '<div class="busca-dica">' +
        '<div class="busca-dica-icone">🔍</div>' +
        '<p>Busque por nome, produtor, país ou uva</p>' +
        '<div class="busca-dica-categorias">' +
          '<a href="vinhos.html?subtipo=tinto"      class="busca-categoria-btn" onclick="Busca.fechar()">Tintos</a>' +
          '<a href="vinhos.html?subtipo=branco"     class="busca-categoria-btn" onclick="Busca.fechar()">Brancos</a>' +
          '<a href="vinhos.html?subtipo=espumante"  class="busca-categoria-btn" onclick="Busca.fechar()">Espumantes</a>' +
          '<a href="destilados.html?subtipo=whisky" class="busca-categoria-btn" onclick="Busca.fechar()">Whisky</a>' +
          '<a href="destilados.html?subtipo=gin"    class="busca-categoria-btn" onclick="Busca.fechar()">Gin</a>' +
          '<a href="vinhos.html"                    class="busca-categoria-btn" onclick="Busca.fechar()">Ver todos →</a>' +
        '</div>' +
      '</div>';
  }

  function _renderizarCarregando() {
    const el = document.getElementById('busca-resultados');
    if (el) el.innerHTML = '<div class="busca-dica"><p style="color:var(--text-sec)">Aguarde, carregando catálogo…</p></div>';
  }

  /* ---- Resultados ---- */
  function _renderizarResultados(lista, termo) {
    const el = document.getElementById('busca-resultados');
    if (!el) return;
    if (!lista.length) {
      el.innerHTML =
        '<div class="busca-vazio">' +
          '<p class="busca-vazio-titulo">Nenhum resultado para "' + termo + '"</p>' +
          '<p class="busca-vazio-sub">Tente outro nome, país ou uva.</p>' +
        '</div>';
      return;
    }
    var MAX = 8;
    var exibir     = lista.slice(0, MAX);
    var vinhos     = exibir.filter(function (p) { return p.tipo === 'vinho'; });
    var destilados = exibir.filter(function (p) { return p.tipo === 'destilado'; });
    var html = '';
    if (vinhos.length)     html += '<div class="busca-grupo-label">Vinhos</div>'     + vinhos.map(function (p) { return _cardHTML(p, termo); }).join('');
    if (destilados.length) html += '<div class="busca-grupo-label">Destilados</div>' + destilados.map(function (p) { return _cardHTML(p, termo); }).join('');
    if (lista.length > MAX) {
      var q = encodeURIComponent((document.getElementById('busca-input') || {}).value || '');
      html += '<button class="busca-ver-todos" onclick="Busca.fechar();location.href=\'vinhos.html?busca=' + q + '\'">Ver todos os ' + lista.length + ' resultados →</button>';
    }
    el.innerHTML = html;
  }

  function _cardHTML(p, termo) {
    var cor   = GRADIENTES[p.subtipo] || '#3D0C0C';
    var preco = (p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    var nome  = _destacar(p.nome, termo);
    var sub   = [p.produtor, p.pais].filter(Boolean).join(' · ');
    return '<a class="busca-resultado" href="produto.html?slug=' + p.slug + '" onclick="Busca.fechar()">' +
      '<div class="busca-resultado-img" style="background:' + cor + '">' + (EMOJI[p.tipo] || '🍾') + '</div>' +
      '<div class="busca-resultado-info">' +
        '<p class="busca-resultado-nome">' + nome + '</p>' +
        '<p class="busca-resultado-sub">' + sub + '</p>' +
      '</div>' +
      '<span class="busca-resultado-preco">' + preco + '</span>' +
    '</a>';
  }

  /* ================================================================
     EVENTOS
  ================================================================ */

  // Fechar ao clicar fora (capture garante que roda antes do target)
  document.addEventListener('click', function (e) {
    if (!_aberta) return;
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    if (t.closest('.busca-modal')) return;
    if (t.closest('[aria-label="Buscar"]')) return;
    fechar();
  }, true);

  // ESC fecha, Ctrl+K abre
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fechar();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); abrir(); }
  });

  // Fecha ao restaurar do bfcache E ao carregar a página
  function _resetarBusca() {
    var overlay = document.getElementById('busca-overlay');
    if (overlay) overlay.classList.remove('aberta');
    _aberta = false;
  }
  window.addEventListener('pageshow', _resetarBusca);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _resetarBusca);
  } else {
    _resetarBusca();
  }

  return { abrir, fechar, alternar, aoDigitar };

})();
