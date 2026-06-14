/* ============================================================
   Vinho Prime — Página de Produto Individual
   ============================================================ */
const Produto = (function () {

  let produto = null;
  let todosProdutos = [];
  let quantidade = 1;

  const GRADIENTES = {
    tinto:     'linear-gradient(160deg,#5C1515 0%,#3D0C0C 60%,#1a0808 100%)',
    branco:    'linear-gradient(160deg,#b8a96a 0%,#8a7a3a 60%,#5a4e20 100%)',
    'rosé':    'linear-gradient(160deg,#c97a8a 0%,#a04060 60%,#6e2040 100%)',
    espumante: 'linear-gradient(160deg,#d4c86a 0%,#a89840 60%,#7a6818 100%)',
    natural:   'linear-gradient(160deg,#7a9a6a 0%,#4a7040 60%,#2a4820 100%)',
    whisky:    'linear-gradient(160deg,#c4823a 0%,#8a5020 60%,#5a2800 100%)',
    gin:       'linear-gradient(160deg,#5a8a7a 0%,#2a6060 60%,#0a3838 100%)',
    cognac:    'linear-gradient(160deg,#c4943a 0%,#8a5a10 60%,#5a3000 100%)',
    rum:       'linear-gradient(160deg,#8a5a3a 0%,#5a2a0a 60%,#2a0800 100%)',
    'cachaça': 'linear-gradient(160deg,#a0b060 0%,#607020 60%,#303808 100%)',
    vodka:     'linear-gradient(160deg,#8a9ab0 0%,#4a5a70 60%,#1a2a40 100%)',
    licor:     'linear-gradient(160deg,#8a4a8a 0%,#5a1a5a 60%,#2a002a 100%)',
  };

  const HAMONIZACAO_EMOJI = {
    'Carnes vermelhas': '🥩', 'Churrasco': '🍖', 'Frutos do mar': '🦞',
    'Queijos': '🧀', 'Queijos curados': '🧀', 'Massas': '🍝', 'Aves': '🍗',
    'Cordeiro': '🐑', 'Peixes': '🐟', 'Veganos': '🥗', 'Sobremesas': '🍮',
    'Chocolate': '🍫', 'Defumados': '🥓',
  };

  /* ---- Inicialização ---- */
  async function init() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) { paginaErro('Produto não encontrado.'); return; }

    try {
      const dados = await DB.getProdutos();
      todosProdutos = dados.produtos.filter(p => p.ativo);
      produto = todosProdutos.find(p => p.slug === slug);
      if (!produto) { paginaErro('Produto não encontrado.'); return; }
      renderizar();
    } catch (e) {
      paginaErro('Erro ao carregar produto.');
    }
  }

  /* ---- Renderização principal ---- */
  function renderizar() {
    document.title = `${produto.nome} — Vinho Prime`;

    atualizarBreadcrumb();
    renderizarGaleria();
    renderizarInfo();
    renderizarAbas();
    renderizarRelacionados();
    renderizarBadgeCarrinho();
  }

  function atualizarBreadcrumb() {
    const bc = document.getElementById('cat-breadcrumb');
    if (!bc) return;
    const catalogoHref = produto.tipo === 'vinho' ? 'vinhos.html' : 'destilados.html';
    const catalogoLabel = produto.tipo === 'vinho' ? 'Vinhos' : 'Destilados';
    bc.innerHTML = `
      <a href="index.html">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="${catalogoHref}">${catalogoLabel}</a>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${produto.nome}</span>`;
  }

  function renderizarGaleria() {
    const grad = GRADIENTES[produto.subtipo] || GRADIENTES.tinto;
    const el = document.getElementById('produto-galeria');
    if (!el) return;
    el.innerHTML = `
      <div class="produto-imagem-principal" style="background:${grad}">
        <div class="produto-badges-galeria">
          ${produto.badges && produto.badges.includes('sommelier') ? '<span class="badge badge-sommelier" style="font-size:.7rem">★ Sommelier</span>' : ''}
          ${produto.badges && produto.badges.includes('oferta') ? '<span class="badge badge-oferta" style="font-size:.7rem">${desconto(produto)}% OFF</span>' : ''}
          ${produto.badges && produto.badges.includes('novo') ? '<span class="badge badge-novo" style="font-size:.7rem">Novo</span>' : ''}
        </div>
        <div class="produto-imagem-placeholder">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8 2 5 5.5 5 9c0 3 1.5 5.5 4 7v4h6v-4c2.5-1.5 4-4 4-7 0-3.5-3-7-7-7zm0 2c2.8 0 5 2.7 5 5 0 2.2-1.1 4.1-3 5.3V18h-4v-3.7C8.1 13.1 7 11.2 7 9c0-2.3 2.2-5 5-5z"/>
          </svg>
          <p>${produto.nome}</p>
        </div>
      </div>`;
  }

  function desconto(p) {
    if (!p.precoOriginal || p.precoOriginal <= p.preco) return 0;
    return Math.round((1 - p.preco / p.precoOriginal) * 100);
  }

  function renderizarInfo() {
    const el = document.getElementById('produto-info');
    if (!el) return;

    const desc = desconto(produto);
    const esgotado = produto.estoque <= 0;
    const scores = produto.pontuacoes ? Object.entries(produto.pontuacoes) : [];

    const labelSubtipo = {
      tinto:'Tinto', branco:'Branco', 'rosé':'Rosé', espumante:'Espumante',
      natural:'Natural', sobremesa:'Sobremesa', whisky:'Whisky', gin:'Gin',
      cognac:'Cognac', rum:'Rum', 'cachaça':'Cachaça', vodka:'Vodka', licor:'Licor',
    };

    el.innerHTML = `
      <p class="produto-origem">
        ${produto.pais}
        <span class="produto-origem-sep">·</span>
        ${produto.regiao || ''}
        <span class="produto-origem-sep">·</span>
        ${labelSubtipo[produto.subtipo] || produto.subtipo}
      </p>

      <h1 class="produto-nome">${produto.nome}</h1>

      <p class="produto-safra-uvas">
        ${produto.produtor}
        ${produto.safra ? ` · Safra ${produto.safra}` : ''}
        ${produto.uvas && produto.uvas.length ? ` · ${produto.uvas.join(', ')}` : ''}
      </p>

      <div class="produto-avaliacao">
        <div class="stars">${estrelas(produto.avaliacao)}</div>
        <span class="produto-avaliacao-num">${produto.avaliacao?.toFixed(1) || ''}</span>
        <span class="produto-avaliacao-count">(${produto.numeroAvaliacoes || 0} avaliações)</span>
      </div>

      ${scores.length ? `
      <div class="produto-scores">
        ${scores.map(([fonte, nota]) => `
          <div class="score-pill">
            <span class="score-num">${nota}</span>
            <span class="score-fonte">${formatarFonte(fonte)}</span>
          </div>`).join('')}
      </div>` : ''}

      <div class="produto-preco-bloco">
        ${desc > 0 ? `<p class="produto-preco-de">De ${formatarMoeda(produto.precoOriginal)}</p>` : ''}
        <div class="produto-preco-por">
          <span class="produto-preco-valor">${formatarMoeda(produto.preco)}</span>
          ${desc > 0 ? `<span style="background:var(--error);color:#fff;font-size:.75rem;font-weight:700;padding:.2rem .5rem;border-radius:100px">-${desc}%</span>` : ''}
        </div>
        <p class="produto-preco-parcelas">ou 12× de ${formatarMoeda(produto.preco / 12)} sem juros</p>
        <span class="produto-preco-pix">💰 ${formatarMoeda(produto.preco * 0.95)} no PIX (5% off)</span>
      </div>

      <div class="produto-cta-wrap">
        <div class="quantidade-selector">
          <button class="qtd-btn" onclick="Produto.decrementar()">−</button>
          <input class="qtd-valor" id="qtd-valor" type="number" value="1" min="1" max="${produto.estoque}" readonly>
          <button class="qtd-btn" onclick="Produto.incrementar()">+</button>
        </div>
        <button
          class="btn-adicionar"
          id="btn-adicionar"
          onclick="Produto.adicionarCarrinho()"
          ${esgotado ? 'disabled' : ''}
        >
          ${esgotado ? '❌ Esgotado' : '🛒 Adicionar ao Carrinho'}
        </button>
        <button class="btn-wishlist" title="Salvar na lista de desejos" onclick="Produto.toggleWishlist()">
          <svg id="wishlist-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>

      <p class="produto-frete-aviso">
        🚚 ${produto.preco >= 299 ? 'Frete grátis!' : `Adicione mais ${formatarMoeda(299 - produto.preco)} para frete grátis`}
      </p>

      <div class="produto-specs">
        <div class="produto-specs-titulo">Ficha Técnica</div>
        ${especificacao('Tipo', produto.tipo === 'vinho' ? 'Vinho' : 'Destilado')}
        ${produto.subtipo ? especificacao('Categoria', labelSubtipo[produto.subtipo] || produto.subtipo) : ''}
        ${produto.produtor ? especificacao('Produtor', produto.produtor) : ''}
        ${produto.pais ? especificacao('País', produto.pais) : ''}
        ${produto.regiao ? especificacao('Região', produto.regiao) : ''}
        ${produto.safra ? especificacao('Safra', produto.safra) : ''}
        ${produto.uvas && produto.uvas.length ? especificacao('Uvas', produto.uvas.join(', ')) : ''}
        ${produto.volume ? especificacao('Volume', `${produto.volume} ml`) : ''}
        ${produto.teorAlcoolico ? especificacao('Teor Alcoólico', `${produto.teorAlcoolico}%`) : ''}
        ${produto.temperaturaServico ? especificacao('Temperatura de Serviço', produto.temperaturaServico) : ''}
        ${produto.tempoDeGuarda ? especificacao('Tempo de Guarda', produto.tempoDeGuarda) : ''}
      </div>`;

    atualizarWishlistIcon();
  }

  function especificacao(chave, valor) {
    return `<div class="spec-linha"><span class="spec-chave">${chave}</span><span class="spec-valor">${valor}</span></div>`;
  }

  function formatarFonte(fonte) {
    const mapa = {
      wineSpectator: 'Wine Spectator',
      jamesSucckling: 'James Suckling',
      robertParker: 'Robert Parker',
      vinhos: 'Vinhos Magazine',
    };
    return mapa[fonte] || fonte;
  }

  function estrelas(rating) {
    const n = Math.round(rating || 0);
    return Array.from({length: 5}, (_, i) => `<span style="color:${i < n ? '#C4973A' : '#ddd'}">★</span>`).join('');
  }

  function formatarMoeda(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /* ---- Abas ---- */
  function renderizarAbas() {
    const el = document.getElementById('produto-abas');
    if (!el) return;

    const harmEmoji = (item) => HAMONIZACAO_EMOJI[item] || '🍽️';

    el.innerHTML = `
      <div class="abas-nav">
        <button class="aba-btn ativo" onclick="Produto.trocarAba('descricao', this)">Descrição</button>
        <button class="aba-btn" onclick="Produto.trocarAba('degustacao', this)">Notas de Degustação</button>
        <button class="aba-btn" onclick="Produto.trocarAba('harmonizacao', this)">Harmonização</button>
        ${Object.keys(produto.pontuacoes || {}).length ? '<button class="aba-btn" onclick="Produto.trocarAba(\'pontuacoes\', this)">Pontuações</button>' : ''}
      </div>

      <div class="aba-painel ativo" id="aba-descricao">
        <p class="aba-descricao">${produto.descricao || 'Sem descrição disponível.'}</p>
      </div>

      <div class="aba-painel" id="aba-degustacao">
        ${produto.notasDegustacao
          ? `<blockquote class="notas-degustacao">"${produto.notasDegustacao}"</blockquote>`
          : '<p class="aba-descricao">Notas de degustação não disponíveis.</p>'}
      </div>

      <div class="aba-painel" id="aba-harmonizacao">
        ${produto.harmonizacao && produto.harmonizacao.length
          ? `<div class="harmonizacao-grid">${produto.harmonizacao.map(h => `
              <span class="harmonizacao-item">${harmEmoji(h)} ${h}</span>`).join('')}
            </div>`
          : '<p class="aba-descricao">Sugestões de harmonização não disponíveis.</p>'}
      </div>

      <div class="aba-painel" id="aba-pontuacoes">
        <div class="pontuacoes-grid">
          ${Object.entries(produto.pontuacoes || {}).map(([fonte, nota]) => `
            <div class="pontuacao-card">
              <span class="pontuacao-num">${nota}</span>
              <p class="pontuacao-fonte">${formatarFonte(fonte)}</p>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ---- Produtos Relacionados ---- */
  function renderizarRelacionados() {
    const el = document.getElementById('relacionados-grid');
    if (!el) return;

    const relacionados = todosProdutos
      .filter(p => p.id !== produto.id && p.subtipo === produto.subtipo)
      .slice(0, 4);

    if (!relacionados.length) {
      document.getElementById('relacionados-secao').style.display = 'none';
      return;
    }

    el.innerHTML = relacionados.map(p => {
      const grad = GRADIENTES[p.subtipo] || GRADIENTES.tinto;
      const desc = desconto(p);
      return `
        <article class="product-card" onclick="location.href='produto.html?slug=${p.slug}'">
          <div class="card-image" style="background:${grad}">
            ${desc > 0 ? `<span class="badge badge-oferta" style="top:.75rem;left:.75rem;position:absolute">-${desc}%</span>` : ''}
          </div>
          <div class="card-body">
            <p class="card-origin">${p.pais} · ${p.regiao || p.subtipo}</p>
            <h3 class="card-name" style="font-size:.9375rem">${p.nome}${p.safra ? ` ${p.safra}` : ''}</h3>
            <div class="card-stars">${estrelas(p.avaliacao)}</div>
            <div class="card-preco">
              ${desc > 0 ? `<span class="preco-de">${formatarMoeda(p.precoOriginal)}</span>` : ''}
              <span class="preco-por">${formatarMoeda(p.preco)}</span>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  /* ---- Badge do carrinho ---- */
  function renderizarBadgeCarrinho() {
    const itens = JSON.parse(localStorage.getItem('vp_carrinho') || '[]');
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const total = itens.reduce((a, i) => a + i.quantidade, 0);
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }

  /* ---- Wishlist ---- */
  function getWishlist() {
    return JSON.parse(localStorage.getItem('vp_wishlist') || '[]');
  }
  function toggleWishlist() {
    const wl = getWishlist();
    const idx = wl.indexOf(produto.id);
    if (idx === -1) wl.push(produto.id);
    else wl.splice(idx, 1);
    localStorage.setItem('vp_wishlist', JSON.stringify(wl));
    atualizarWishlistIcon();
  }
  function atualizarWishlistIcon() {
    const btn = document.querySelector('.btn-wishlist');
    if (!btn) return;
    const ativo = getWishlist().includes(produto.id);
    btn.classList.toggle('ativo', ativo);
    const icon = document.getElementById('wishlist-icon');
    if (icon) icon.setAttribute('fill', ativo ? 'currentColor' : 'none');
  }

  /* ---- Quantidade ---- */
  function incrementar() {
    if (quantidade < produto.estoque) {
      quantidade++;
      document.getElementById('qtd-valor').value = quantidade;
    }
  }
  function decrementar() {
    if (quantidade > 1) {
      quantidade--;
      document.getElementById('qtd-valor').value = quantidade;
    }
  }

  /* ---- Adicionar ao carrinho ---- */
  function adicionarCarrinho() {
    if (!produto || produto.estoque <= 0) return;
    const carrinho = JSON.parse(localStorage.getItem('vp_carrinho') || '[]');
    const idx = carrinho.findIndex(i => i.id === produto.id);
    if (idx > -1) {
      carrinho[idx].quantidade = Math.min(carrinho[idx].quantidade + quantidade, produto.estoque);
    } else {
      carrinho.push({
        id: produto.id,
        slug: produto.slug,
        nome: produto.nome,
        preco: produto.preco,
        pais: produto.pais,
        subtipo: produto.subtipo,
        quantidade,
      });
    }
    localStorage.setItem('vp_carrinho', JSON.stringify(carrinho));
    renderizarBadgeCarrinho();
    mostrarToast();
  }

  function mostrarToast() {
    let t = document.getElementById('vp-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'vp-toast';
      t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#3D0C0C;color:#F8F4EE;padding:.75rem 1.5rem;border-radius:100px;font-size:.875rem;font-weight:600;z-index:9999;transition:opacity .3s';
      document.body.appendChild(t);
    }
    t.textContent = `✅ ${produto.nome} adicionado!`;
    t.style.opacity = '1';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => { t.style.opacity = '0'; }, 2500);
  }

  /* ---- Troca de aba ---- */
  function trocarAba(id, btn) {
    document.querySelectorAll('.aba-painel').forEach(p => p.classList.remove('ativo'));
    document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativo'));
    const painel = document.getElementById(`aba-${id}`);
    if (painel) painel.classList.add('ativo');
    if (btn) btn.classList.add('ativo');
  }

  /* ---- Erro ---- */
  function paginaErro(msg) {
    const main = document.querySelector('main');
    if (main) main.innerHTML = `
      <div style="text-align:center;padding:6rem 2rem">
        <p style="font-size:3rem;margin-bottom:1rem">🍷</p>
        <h1 style="font-family:var(--font-display);color:var(--text);margin-bottom:.5rem">${msg}</h1>
        <a href="index.html" class="btn btn-gold" style="display:inline-flex;margin-top:1.5rem">Voltar ao início</a>
      </div>`;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { incrementar, decrementar, adicionarCarrinho, toggleWishlist, trocarAba };
})();
