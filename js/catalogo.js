/* ============================================================
   Vinho Prime — Lógica do Catálogo
   ============================================================ */

const Catalogo = (() => {

  /* ---- Configuração da página ---- */
  const CONFIG = {
    vinho:    { titulo: 'Vinhos',    subtipo_label: 'Tipo de Vinho',    subtipos: ['tinto','branco','rosé','espumante','natural','sobremesa'] },
    destilado:{ titulo: 'Destilados',subtipo_label: 'Categoria',         subtipos: ['whisky','gin','cognac','rum','cachaça','vodka','licor'] },
  };

  const POR_PAGINA = 12;

  /* ---- Estado dos filtros ---- */
  let estado = {
    tipo: 'vinho',
    subtipos: [],
    paises: [],
    precoMin: 0,
    precoMax: Infinity,
    avaliacaoMin: 0,
    apenasEstoque: false,
    apenasOferta: false,
    ordem: 'relevancia',
    pagina: 1,
  };

  let todosProdutos = [];
  let produtosFiltrados = [];

  /* ---- Carregar dados ---- */
  async function init() {
    const params = new URLSearchParams(window.location.search);
    estado.tipo = params.get('tipo') || 'vinho';

    const cfg = CONFIG[estado.tipo];
    if (!cfg) return;

    document.title = `${cfg.titulo} — Vinho Prime`;

    try {
      const res = await fetch('dados/produtos.json');
      const dados = await res.json();
      todosProdutos = dados.produtos.filter(p => p.ativo && p.tipo === estado.tipo);
    } catch {
      todosProdutos = [];
    }

    construirUI(cfg);
    aplicarFiltros();
  }

  /* ---- Construir interface ---- */
  function construirUI(cfg) {
    document.getElementById('cat-titulo').textContent = cfg.titulo;
    document.getElementById('cat-subtitulo').textContent =
      estado.tipo === 'vinho'
        ? 'Tintos, brancos, rosés, espumantes e muito mais'
        : 'Whiskies, gins, cognacs, rums e cachaças artesanais';

    document.getElementById('cat-breadcrumb').innerHTML =
      `<a href="/">Home</a>
       <span class="breadcrumb-sep">›</span>
       <span class="breadcrumb-current">${cfg.titulo}</span>`;

    construirFiltros(cfg);
  }

  function construirFiltros(cfg) {
    const paises = [...new Set(todosProdutos.map(p => p.pais))].sort();
    const precos = todosProdutos.map(p => p.preco);
    const precoMaxGlobal = Math.ceil(Math.max(...precos) / 50) * 50;

    document.getElementById('filtros-corpo').innerHTML = `

      <!-- Subtipo -->
      <div class="filtro-grupo aberto">
        <div class="filtro-grupo-header" onclick="Catalogo.toggleGrupo(this)">
          <span class="filtro-grupo-nome">${cfg.subtipo_label}</span>
          <span class="filtro-grupo-seta">▾</span>
        </div>
        <div class="filtro-grupo-corpo">
          ${cfg.subtipos.map(s => {
            const count = todosProdutos.filter(p => p.subtipo === s).length;
            return count === 0 ? '' : `
              <label class="filtro-opcao">
                <input type="checkbox" value="${s}" onchange="Catalogo.filtrarSubtipo(this)">
                <span class="filtro-checkbox"></span>
                <span>${s.charAt(0).toUpperCase() + s.slice(1)}</span>
                <span class="filtro-count">${count}</span>
              </label>`;
          }).join('')}
        </div>
      </div>

      <!-- País -->
      <div class="filtro-grupo aberto">
        <div class="filtro-grupo-header" onclick="Catalogo.toggleGrupo(this)">
          <span class="filtro-grupo-nome">País de Origem</span>
          <span class="filtro-grupo-seta">▾</span>
        </div>
        <div class="filtro-grupo-corpo">
          ${paises.map(pais => {
            const count = todosProdutos.filter(p => p.pais === pais).length;
            return `
              <label class="filtro-opcao">
                <input type="checkbox" value="${pais}" onchange="Catalogo.filtrarPais(this)">
                <span class="filtro-checkbox"></span>
                <span>${pais}</span>
                <span class="filtro-count">${count}</span>
              </label>`;
          }).join('')}
        </div>
      </div>

      <!-- Faixa de Preço -->
      <div class="filtro-grupo aberto">
        <div class="filtro-grupo-header" onclick="Catalogo.toggleGrupo(this)">
          <span class="filtro-grupo-nome">Faixa de Preço</span>
          <span class="filtro-grupo-seta">▾</span>
        </div>
        <div class="filtro-grupo-corpo">
          <div class="preco-range-wrap">
            <div class="preco-labels">
              <span id="preco-min-label">R$ 0</span>
              <span id="preco-max-label">R$ ${precoMaxGlobal.toLocaleString('pt-BR')}</span>
            </div>
            <div class="preco-ranges">
              ${gerarFaixasPreco(precoMaxGlobal).map(f => `
                <label class="filtro-opcao">
                  <input type="radio" name="preco-faixa" value="${f.min}-${f.max}"
                    onchange="Catalogo.filtrarPreco(${f.min}, ${f.max})">
                  <span class="filtro-checkbox" style="border-radius:50%"></span>
                  <span>${f.label}</span>
                </label>`).join('')}
              <label class="filtro-opcao">
                <input type="radio" name="preco-faixa" value="0-Infinity" checked
                  onchange="Catalogo.filtrarPreco(0, Infinity)">
                <span class="filtro-checkbox" style="border-radius:50%"></span>
                <span>Todos os preços</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Avaliação -->
      <div class="filtro-grupo">
        <div class="filtro-grupo-header" onclick="Catalogo.toggleGrupo(this)">
          <span class="filtro-grupo-nome">Avaliação Mínima</span>
          <span class="filtro-grupo-seta">▾</span>
        </div>
        <div class="filtro-grupo-corpo">
          ${[5, 4.5, 4, 3.5].map(v => `
            <label class="filtro-opcao">
              <input type="radio" name="avaliacao" value="${v}" onchange="Catalogo.filtrarAvaliacao(${v})">
              <span class="filtro-checkbox" style="border-radius:50%"></span>
              <span>${renderEstrelas(v)} ${v}+</span>
            </label>`).join('')}
          <label class="filtro-opcao">
            <input type="radio" name="avaliacao" value="0" checked onchange="Catalogo.filtrarAvaliacao(0)">
            <span class="filtro-checkbox" style="border-radius:50%"></span>
            <span>Qualquer avaliação</span>
          </label>
        </div>
      </div>

      <!-- Disponibilidade -->
      <div class="filtro-grupo">
        <div class="filtro-grupo-header" onclick="Catalogo.toggleGrupo(this)">
          <span class="filtro-grupo-nome">Disponibilidade</span>
          <span class="filtro-grupo-seta">▾</span>
        </div>
        <div class="filtro-grupo-corpo">
          <label class="filtro-opcao">
            <input type="checkbox" id="f-estoque" onchange="Catalogo.filtrarDisponibilidade()">
            <span class="filtro-checkbox"></span>
            <span>Apenas em estoque</span>
          </label>
          <label class="filtro-opcao">
            <input type="checkbox" id="f-oferta" onchange="Catalogo.filtrarDisponibilidade()">
            <span class="filtro-checkbox"></span>
            <span>Apenas em oferta</span>
          </label>
        </div>
      </div>
    `;
  }

  function gerarFaixasPreco(max) {
    const faixas = [];
    if (max > 80)   faixas.push({ min: 0,    max: 80,   label: 'Até R$ 80' });
    if (max > 150)  faixas.push({ min: 80,   max: 150,  label: 'R$ 80 – R$ 150' });
    if (max > 300)  faixas.push({ min: 150,  max: 300,  label: 'R$ 150 – R$ 300' });
    if (max > 600)  faixas.push({ min: 300,  max: 600,  label: 'R$ 300 – R$ 600' });
    if (max > 600)  faixas.push({ min: 600,  max: Infinity, label: 'Acima de R$ 600' });
    return faixas;
  }

  function renderEstrelas(n) {
    return '★'.repeat(Math.floor(n)) + (n % 1 >= .5 ? '½' : '');
  }

  /* ---- Filtros ---- */
  function filtrarSubtipo(cb) {
    if (cb.checked) estado.subtipos.push(cb.value);
    else estado.subtipos = estado.subtipos.filter(s => s !== cb.value);
    resetarPagina();
    aplicarFiltros();
  }

  function filtrarPais(cb) {
    if (cb.checked) estado.paises.push(cb.value);
    else estado.paises = estado.paises.filter(p => p !== cb.value);
    resetarPagina();
    aplicarFiltros();
  }

  function filtrarPreco(min, max) {
    estado.precoMin = min;
    estado.precoMax = max;
    resetarPagina();
    aplicarFiltros();
  }

  function filtrarAvaliacao(min) {
    estado.avaliacaoMin = min;
    resetarPagina();
    aplicarFiltros();
  }

  function filtrarDisponibilidade() {
    estado.apenasEstoque = document.getElementById('f-estoque')?.checked || false;
    estado.apenasOferta  = document.getElementById('f-oferta')?.checked || false;
    resetarPagina();
    aplicarFiltros();
  }

  function mudarOrdem(valor) {
    estado.ordem = valor;
    resetarPagina();
    aplicarFiltros();
  }

  function limparFiltros() {
    estado.subtipos = [];
    estado.paises = [];
    estado.precoMin = 0;
    estado.precoMax = Infinity;
    estado.avaliacaoMin = 0;
    estado.apenasEstoque = false;
    estado.apenasOferta = false;
    document.querySelectorAll('#filtros-corpo input').forEach(i => i.checked = false);
    document.querySelectorAll('input[name="preco-faixa"][value="0-Infinity"]').forEach(i => i.checked = true);
    document.querySelectorAll('input[name="avaliacao"][value="0"]').forEach(i => i.checked = true);
    resetarPagina();
    aplicarFiltros();
  }

  function toggleGrupo(header) {
    header.closest('.filtro-grupo').classList.toggle('aberto');
  }

  /* ---- Aplicar filtros e renderizar ---- */
  function aplicarFiltros() {
    produtosFiltrados = todosProdutos.filter(p => {
      if (estado.subtipos.length && !estado.subtipos.includes(p.subtipo)) return false;
      if (estado.paises.length  && !estado.paises.includes(p.pais))     return false;
      if (p.preco < estado.precoMin || p.preco > estado.precoMax)        return false;
      if (p.avaliacao < estado.avaliacaoMin)                             return false;
      if (estado.apenasEstoque && p.estoque === 0)                       return false;
      if (estado.apenasOferta  && !p.precoOriginal)                      return false;
      return true;
    });

    /* Ordenação */
    produtosFiltrados.sort((a, b) => {
      switch (estado.ordem) {
        case 'preco-asc':    return a.preco - b.preco;
        case 'preco-desc':   return b.preco - a.preco;
        case 'mais-vendidos':return (b.destaque.maisVendido ? 1 : 0) - (a.destaque.maisVendido ? 1 : 0);
        case 'novidades':    return (b.badges.includes('novo') ? 1 : 0) - (a.badges.includes('novo') ? 1 : 0);
        case 'avaliacao':    return b.avaliacao - a.avaliacao;
        default: /* relevancia */
          const pesoA = (a.destaque.sommelier ? 3 : 0) + (a.destaque.maisVendido ? 2 : 0) + (a.badges.includes('novo') ? 1 : 0);
          const pesoB = (b.destaque.sommelier ? 3 : 0) + (b.destaque.maisVendido ? 2 : 0) + (b.badges.includes('novo') ? 1 : 0);
          return pesoB - pesoA;
      }
    });

    renderizarResultados();
    renderizarChips();
    atualizarContador();
  }

  /* ---- Renderizar cards ---- */
  function renderizarResultados() {
    const grid = document.getElementById('produtos-grid');
    const inicio = (estado.pagina - 1) * POR_PAGINA;
    const pagina = produtosFiltrados.slice(inicio, inicio + POR_PAGINA);

    if (produtosFiltrados.length === 0) {
      grid.innerHTML = `
        <div class="estado-vazio">
          <div class="estado-vazio-icone">🍷</div>
          <h3 class="estado-vazio-titulo">Nenhum produto encontrado</h3>
          <p class="estado-vazio-sub">Tente ajustar os filtros ou <button onclick="Catalogo.limparFiltros()" style="color:var(--bordeaux);font-weight:600;cursor:pointer;background:none;border:none;font-size:inherit">limpar todos</button>.</p>
        </div>`;
      renderizarPaginacao(0);
      return;
    }

    grid.innerHTML = pagina.map(p => criarCard(p)).join('');

    /* Scroll suave para o topo do grid */
    if (estado.pagina > 1) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* Animação de entrada */
    requestAnimationFrame(() => {
      grid.querySelectorAll('.product-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(16px)';
        card.style.transition = `opacity .35s ease ${i * 0.06}s, transform .35s ease ${i * 0.06}s`;
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });

    renderizarPaginacao(produtosFiltrados.length);
  }

  function criarCard(p) {
    const desconto = p.precoOriginal
      ? Math.round(((p.precoOriginal - p.preco) / p.precoOriginal) * 100)
      : 0;
    const esgotado   = p.estoque === 0;
    const estoqueBaixo = p.estoque > 0 && p.estoque <= p.estoqueMinimo;
    const precoPix   = (p.preco * 0.95).toFixed(2);

    const badge = desconto > 0
      ? `<span class="card-badge badge--offer">-${desconto}%</span>`
      : p.badges.includes('novo')
        ? `<span class="card-badge badge--new">Novo</span>`
        : p.badges.includes('mais-vendido')
          ? `<span class="card-badge badge--hot">🥇 Mais vendido</span>`
          : p.badges.includes('sommelier')
            ? `<span class="card-badge badge--sommelier">⭐ Sommelier</span>`
            : '';

    const gradiente = {
      tinto:     'linear-gradient(160deg,#5C1515,#3D0C0C)',
      branco:    'linear-gradient(160deg,#C8B870,#9A8840)',
      'rosé':    'linear-gradient(160deg,#C04060,#8B2040)',
      espumante: 'linear-gradient(160deg,#B8A860,#8A7830)',
      natural:   'linear-gradient(160deg,#6B8C4A,#4A6A2A)',
      sobremesa: 'linear-gradient(160deg,#7A2A1A,#4A0A0A)',
      whisky:    'linear-gradient(160deg,#2A1A0A,#1A0A00)',
      gin:       'linear-gradient(160deg,#0A2A1A,#051A0A)',
      cognac:    'linear-gradient(160deg,#3A1A0A,#2A0A00)',
      rum:       'linear-gradient(160deg,#2A1A00,#1A0A00)',
      'cachaça': 'linear-gradient(160deg,#1A2A0A,#0A1A00)',
      vodka:     'linear-gradient(160deg,#1A1A2A,#0A0A1A)',
    }[p.subtipo] || 'linear-gradient(160deg,#5C1515,#3D0C0C)';

    const estrelas = Array.from({length: 5}, (_, i) => {
      const cl = i < Math.floor(p.avaliacao) ? 'star' : 'star star-empty';
      return `<svg class="${cl}" viewBox="0 0 12 12"><path d="M6 1l1.4 2.8 3.1.4-2.2 2.2.5 3.1L6 8.1l-2.8 1.4.5-3.1L1.5 4.2l3.1-.4z"/></svg>`;
    }).join('');

    return `
      <article class="product-card">
        <div class="card-img-wrap" style="background:${gradiente}">
          ${badge}
          ${!esgotado ? `<button class="card-wishlist" aria-label="Lista de desejos">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>` : ''}
          ${esgotado ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center">
            <span style="background:rgba(0,0,0,.6);color:#fff;padding:.4rem .875rem;border-radius:6px;font-size:.8125rem;font-weight:600">Esgotado</span>
          </div>` : ''}
        </div>
        <div class="card-body">
          <p class="card-origin">${p.pais} · ${p.regiao || p.subtipo}</p>
          <h3 class="card-name">
            <a href="produto.html?slug=${p.slug}" style="color:inherit">${p.nome}${p.safra ? ` ${p.safra}` : ''}</a>
          </h3>
          ${p.uvas && p.uvas.length ? `<p style="font-size:.6875rem;color:var(--text-light);margin-bottom:.375rem">${p.uvas.join(' · ')}</p>` : ''}
          <div class="card-stars">
            <div class="stars">${estrelas}</div>
            <span class="card-review-count">(${p.numeroAvaliacoes})</span>
          </div>
          <div class="card-pricing">
            ${p.precoOriginal ? `<p class="price-original">${p.precoOriginal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>` : ''}
            <p class="price-current">${p.preco.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
            <p class="price-pix">💰 ${Number(precoPix).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} no PIX</p>
          </div>
          ${estoqueBaixo ? `<p style="font-size:.6875rem;color:var(--error);font-weight:600;margin-bottom:.375rem">⚠️ Apenas ${p.estoque} restantes</p>` : ''}
          <button
            class="card-add-btn"
            ${esgotado ? 'disabled style="opacity:.5;cursor:not-allowed"' : `onclick="VinhoPrime && VinhoPrime.adicionarAoCarrinho('${p.id}')"`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            ${esgotado ? 'Indisponível' : 'Adicionar'}
          </button>
        </div>
      </article>`;
  }

  /* ---- Chips de filtros ativos ---- */
  function renderizarChips() {
    const wrap = document.getElementById('chips-ativos');
    const chips = [];

    estado.subtipos.forEach(s => chips.push({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      remover: () => { estado.subtipos = estado.subtipos.filter(x => x !== s); document.querySelectorAll(`#filtros-corpo input[value="${s}"]`).forEach(i => i.checked = false); resetarPagina(); aplicarFiltros(); }
    }));

    estado.paises.forEach(pais => chips.push({
      label: pais,
      remover: () => { estado.paises = estado.paises.filter(x => x !== pais); document.querySelectorAll(`#filtros-corpo input[value="${pais}"]`).forEach(i => i.checked = false); resetarPagina(); aplicarFiltros(); }
    }));

    if (estado.precoMax < Infinity) chips.push({
      label: `Até R$ ${estado.precoMax.toLocaleString('pt-BR')}`,
      remover: () => { filtrarPreco(0, Infinity); document.querySelectorAll('input[name="preco-faixa"][value="0-Infinity"]').forEach(i => i.checked = true); }
    });

    if (estado.avaliacaoMin > 0) chips.push({
      label: `${estado.avaliacaoMin}★ ou mais`,
      remover: () => { filtrarAvaliacao(0); document.querySelectorAll('input[name="avaliacao"][value="0"]').forEach(i => i.checked = true); }
    });

    if (estado.apenasEstoque) chips.push({ label: 'Em estoque', remover: () => { estado.apenasEstoque = false; document.getElementById('f-estoque').checked = false; resetarPagina(); aplicarFiltros(); } });
    if (estado.apenasOferta)  chips.push({ label: 'Em oferta',  remover: () => { estado.apenasOferta = false;  document.getElementById('f-oferta').checked  = false; resetarPagina(); aplicarFiltros(); } });

    wrap.innerHTML = chips.map((c, i) => `
      <span class="chip">
        ${c.label}
        <span class="chip-remove" onclick="Catalogo._removerChip(${i})">✕</span>
      </span>`).join('');

    document._chipRemovers = chips.map(c => c.remover);

    /* Badge mobile */
    const badgeMobile = document.getElementById('badge-filtros-mobile');
    if (badgeMobile) {
      badgeMobile.textContent = chips.length;
      badgeMobile.classList.toggle('visivel', chips.length > 0);
    }
  }

  function _removerChip(i) { document._chipRemovers[i](); }

  /* ---- Contador ---- */
  function atualizarContador() {
    const el = document.getElementById('resultados-count');
    const inicio = (estado.pagina - 1) * POR_PAGINA + 1;
    const fim = Math.min(estado.pagina * POR_PAGINA, produtosFiltrados.length);
    if (el) {
      el.innerHTML = produtosFiltrados.length === 0
        ? 'Nenhum produto encontrado'
        : `Exibindo <strong>${inicio}–${fim}</strong> de <strong>${produtosFiltrados.length}</strong> produtos`;
    }
  }

  /* ---- Paginação ---- */
  function renderizarPaginacao(total) {
    const wrap = document.getElementById('paginacao');
    if (!wrap) return;
    const totalPaginas = Math.ceil(total / POR_PAGINA);
    if (totalPaginas <= 1) { wrap.innerHTML = ''; return; }

    let html = `<button class="pag-btn" onclick="Catalogo.irPagina(${estado.pagina - 1})" ${estado.pagina === 1 ? 'disabled' : ''}>←</button>`;
    for (let i = 1; i <= totalPaginas; i++) {
      if (i === 1 || i === totalPaginas || (i >= estado.pagina - 1 && i <= estado.pagina + 1)) {
        html += `<button class="pag-btn ${i === estado.pagina ? 'ativo' : ''}" onclick="Catalogo.irPagina(${i})">${i}</button>`;
      } else if (i === estado.pagina - 2 || i === estado.pagina + 2) {
        html += `<span style="padding:0 .25rem;color:var(--text-light)">…</span>`;
      }
    }
    html += `<button class="pag-btn" onclick="Catalogo.irPagina(${estado.pagina + 1})" ${estado.pagina === totalPaginas ? 'disabled' : ''}>→</button>`;
    wrap.innerHTML = html;
  }

  function irPagina(n) {
    const total = Math.ceil(produtosFiltrados.length / POR_PAGINA);
    if (n < 1 || n > total) return;
    estado.pagina = n;
    renderizarResultados();
    atualizarContador();
  }

  function resetarPagina() { estado.pagina = 1; }

  /* ---- Sidebar Mobile ---- */
  function abrirFiltrosMobile() {
    document.getElementById('filtros-sidebar').classList.add('aberto');
    document.getElementById('filtros-overlay').classList.add('aberto');
    document.body.style.overflow = 'hidden';
  }
  function fecharFiltrosMobile() {
    document.getElementById('filtros-sidebar').classList.remove('aberto');
    document.getElementById('filtros-overlay').classList.remove('aberto');
    document.body.style.overflow = '';
  }

  return {
    init,
    filtrarSubtipo,
    filtrarPais,
    filtrarPreco,
    filtrarAvaliacao,
    filtrarDisponibilidade,
    mudarOrdem,
    limparFiltros,
    toggleGrupo,
    irPagina,
    abrirFiltrosMobile,
    fecharFiltrosMobile,
    _removerChip,
  };

})();

document.addEventListener('DOMContentLoaded', Catalogo.init);
