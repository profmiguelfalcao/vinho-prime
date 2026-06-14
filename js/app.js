/* ============================================================
   Vinho Prime — Motor de Renderização de Produtos
   Lê dados/produtos.json e popula as seções da home
   ============================================================ */

const VinhoPrime = (() => {

  /* ---- Estado global do carrinho ---- */
  const carrinho = {
    itens: JSON.parse(localStorage.getItem('vp_carrinho') || '[]'),

    adicionar(produto, quantidade = 1) {
      const existente = this.itens.find(i => i.id === produto.id);
      if (existente) {
        existente.quantidade += quantidade;
      } else {
        this.itens.push({ ...produto, quantidade });
      }
      this.salvar();
      this.atualizarBadge();
      this.mostrarFeedback(produto.nome);
    },

    remover(id) {
      this.itens = this.itens.filter(i => i.id !== id);
      this.salvar();
      this.atualizarBadge();
    },

    salvar() {
      localStorage.setItem('vp_carrinho', JSON.stringify(this.itens));
    },

    get total() {
      return this.itens.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    },

    get totalItens() {
      return this.itens.reduce((acc, i) => acc + i.quantidade, 0);
    },

    atualizarBadge() {
      const badge = document.getElementById('cart-count');
      if (!badge) return;
      const total = this.totalItens;
      badge.textContent = total;
      badge.style.display = total > 0 ? 'flex' : 'none';
    },

    mostrarFeedback(nome) {
      let toast = document.getElementById('vp-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'vp-toast';
        toast.style.cssText = `
          position:fixed; bottom:5rem; right:2rem; z-index:2000;
          background:var(--bordeaux); color:var(--cream);
          padding:.875rem 1.25rem; border-radius:10px;
          font-size:.875rem; font-weight:500;
          box-shadow:0 8px 32px rgba(61,12,12,.3);
          transform:translateX(120%); transition:transform .35s cubic-bezier(.4,0,.2,1);
          max-width:280px; display:flex; align-items:center; gap:.625rem;
        `;
        document.body.appendChild(toast);
      }
      toast.innerHTML = `<span style="font-size:1.1rem">🛒</span><span><strong>${nome.substring(0, 30)}${nome.length > 30 ? '…' : ''}</strong><br><span style="opacity:.75;font-size:.8125rem">Adicionado ao carrinho</span></span>`;
      toast.style.transform = 'translateX(0)';
      clearTimeout(toast._timeout);
      toast._timeout = setTimeout(() => { toast.style.transform = 'translateX(120%)'; }, 3000);
    }
  };

  /* ---- Utilitários ---- */
  function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function calcularDesconto(preco, precoOriginal) {
    if (!precoOriginal) return 0;
    return Math.round(((precoOriginal - preco) / precoOriginal) * 100);
  }

  function renderizarEstrelas(avaliacao) {
    const cheias = Math.floor(avaliacao);
    const meia = avaliacao % 1 >= 0.5;
    let html = '<div class="stars">';
    for (let i = 1; i <= 5; i++) {
      const classe = i <= cheias ? 'star' : (i === cheias + 1 && meia ? 'star star-half' : 'star star-empty');
      html += `<svg class="${classe}" viewBox="0 0 12 12"><path d="M6 1l1.4 2.8 3.1.4-2.2 2.2.5 3.1L6 8.1l-2.8 1.4.5-3.1L1.5 4.2l3.1-.4z"/></svg>`;
    }
    html += '</div>';
    return html;
  }

  function renderizarBadges(badges, posicao = 'topo') {
    const mapaClasses = {
      'oferta': 'badge--offer',
      'novo': 'badge--new',
      'mais-vendido': 'badge--hot',
      'sommelier': 'badge--sommelier',
      'esgotado': 'badge--offer'
    };
    const mapaTexto = {
      'oferta': 'Oferta',
      'novo': 'Novo',
      'mais-vendido': '🥇 Mais vendido',
      'sommelier': '⭐ Sommelier',
      'esgotado': 'Esgotado'
    };

    const badgesParaExibir = posicao === 'topo'
      ? badges.filter(b => b !== 'oferta' || badges.length === 1)
      : badges.filter(b => b === 'oferta');

    return badges
      .slice(0, 1)
      .map(b => `<span class="card-badge ${mapaClasses[b] || ''}">${mapaTexto[b] || b}</span>`)
      .join('');
  }

  function corGradienteImagem(produto) {
    const gradientes = {
      'tinto':    'linear-gradient(160deg, #5C1515 0%, #3D0C0C 50%, #2A0808 100%)',
      'branco':   'linear-gradient(160deg, #E8D5A3 0%, #C4973A 50%, #8A6A20 100%)',
      'rosé':     'linear-gradient(160deg, #C04060 0%, #8B2040 50%, #5C0820 100%)',
      'espumante':'linear-gradient(160deg, #C8B870 0%, #A09040 50%, #706020 100%)',
      'natural':  'linear-gradient(160deg, #6B8C4A 0%, #4A6A2A 50%, #2A4A10 100%)',
      'whisky':   'linear-gradient(160deg, #2A1A0A 0%, #1A0A00 50%, #0A0500 100%)',
      'gin':      'linear-gradient(160deg, #0A2A1A 0%, #051A0A 50%, #020D05 100%)',
      'cognac':   'linear-gradient(160deg, #3A1A0A 0%, #2A0A00 50%, #1A0500 100%)',
      'rum':      'linear-gradient(160deg, #2A1A00 0%, #1A0A00 50%, #0A0500 100%)',
      'cachaca':  'linear-gradient(160deg, #1A2A0A 0%, #0A1A00 50%, #050A00 100%)',
      'vodka':    'linear-gradient(160deg, #1A1A2A 0%, #0A0A1A 50%, #050508 100%)',
    };
    return gradientes[produto.subtipo] || gradientes['tinto'];
  }

  /* ---- Template de card de produto ---- */
  function criarCardProduto(produto, variante = 'claro') {
    const escuro = variante === 'escuro';
    const desconto = calcularDesconto(produto.preco, produto.precoOriginal);
    const esgotado = produto.estoque === 0;
    const estoqueBaixo = produto.estoque > 0 && produto.estoque <= produto.estoqueMinimo;
    const precoPix = (produto.preco * 0.95).toFixed(2);

    const badge = desconto > 0
      ? `<span class="card-badge badge--offer">-${desconto}%</span>`
      : produto.badges.includes('novo')
        ? `<span class="card-badge badge--new">Novo</span>`
        : produto.badges.includes('mais-vendido')
          ? `<span class="card-badge badge--hot">🥇 Mais vendido</span>`
          : produto.badges.includes('sommelier')
            ? `<span class="card-badge badge--sommelier">⭐ Sommelier</span>`
            : '';

    return `
      <article class="product-card ${escuro ? 'product-card--dark' : ''} reveal" data-id="${produto.id}">
        <div class="card-img-wrap" style="background:${corGradienteImagem(produto)}">
          ${badge}
          ${!esgotado ? `
          <button
            class="card-wishlist"
            aria-label="Adicionar à lista de desejos"
            onclick="event.stopPropagation()"
          >
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>` : ''}
          ${esgotado ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"><span style="background:rgba(0,0,0,.7);color:#fff;padding:.5rem 1rem;border-radius:6px;font-size:.875rem;font-weight:600">Esgotado</span></div>' : ''}
        </div>
        <div class="card-body">
          <p class="card-origin ${escuro ? 'card-origin--light' : ''}">${produto.pais} · ${produto.regiao}</p>
          <h3 class="card-name ${escuro ? 'card-name--light' : ''}">
            <a href="produto.html?slug=${produto.slug}" style="color:inherit">${produto.nome}${produto.safra ? ` ${produto.safra}` : ''}</a>
          </h3>
          <div class="card-stars">
            ${renderizarEstrelas(produto.avaliacao)}
            <span class="card-review-count ${escuro ? 'style="color:rgba(248,244,238,.4)"' : ''}">
              (${produto.numeroAvaliacoes})
            </span>
          </div>
          <div class="card-pricing">
            ${produto.precoOriginal ? `<p class="price-original ${escuro ? 'style="color:rgba(248,244,238,.35)"' : ''}">${formatarPreco(produto.precoOriginal)}</p>` : ''}
            <p class="price-current ${escuro ? 'price-current--light' : ''}">${formatarPreco(produto.preco)}</p>
            <p class="price-pix">💰 ${formatarPreco(Number(precoPix))} no PIX</p>
          </div>
          ${estoqueBaixo ? `<p style="font-size:.6875rem;color:var(--error);font-weight:600;margin-bottom:.5rem">⚠️ Apenas ${produto.estoque} unidades restantes!</p>` : ''}
          <button
            class="card-add-btn ${escuro ? 'card-add-btn--gold' : ''}"
            ${esgotado ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}
            onclick="VinhoPrime.adicionarAoCarrinho('${produto.id}')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            ${esgotado ? 'Indisponível' : 'Adicionar'}
          </button>
        </div>
      </article>
    `;
  }

  /* ---- Carregamento dos dados ---- */
  let _produtos = [];

  async function carregarProdutos() {
    try {
      const dados = await DB.getProdutos();
      _produtos = dados.produtos.filter(p => p.ativo);
      return _produtos;
    } catch (err) {
      console.error('[Vinho Prime] Falha ao carregar produtos:', err);
      return [];
    }
  }

  /* ---- Populadores de seção ---- */
  function popularSommelierSection(produtos) {
    const container = document.getElementById('grade-sommelier');
    if (!container) return;

    const selecionados = produtos
      .filter(p => p.destaque.sommelier)
      .slice(0, 4);

    if (selecionados.length === 0) {
      container.innerHTML = '<p style="color:rgba(248,244,238,.5);grid-column:1/-1;text-align:center;padding:2rem">Nenhum produto em destaque no momento.</p>';
      return;
    }

    container.innerHTML = selecionados.map(p => criarCardProduto(p, 'escuro')).join('');
    ativarAnimacoes(container);
  }

  function popularMaisVendidos(produtos) {
    const container = document.getElementById('grade-mais-vendidos');
    if (!container) return;

    const selecionados = produtos
      .filter(p => p.destaque.maisVendido)
      .slice(0, 4);

    if (selecionados.length === 0) {
      container.innerHTML = '<p style="color:var(--text-sec);grid-column:1/-1;text-align:center;padding:2rem">Em breve.</p>';
      return;
    }

    container.innerHTML = selecionados.map(p => criarCardProduto(p, 'claro')).join('');
    ativarAnimacoes(container);
  }

  function popularOfertas(produtos) {
    const container = document.getElementById('grade-ofertas');
    if (!container) return;

    const selecionados = produtos
      .filter(p => p.destaque.ofertas && p.precoOriginal)
      .sort((a, b) => calcularDesconto(b.preco, b.precoOriginal) - calcularDesconto(a.preco, a.precoOriginal))
      .slice(0, 4);

    if (selecionados.length === 0) {
      container.innerHTML = '<p style="color:var(--text-sec);grid-column:1/-1;text-align:center;padding:2rem">Nenhuma oferta ativa no momento.</p>';
      return;
    }

    container.innerHTML = selecionados.map(p => criarCardProduto(p, 'claro')).join('');
    ativarAnimacoes(container);
  }

  /* ---- Animações de scroll ---- */
  function ativarAnimacoes(container) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    container.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.1}s`;
      io.observe(el);
    });
  }

  /* ---- API pública ---- */
  function adicionarAoCarrinho(id) {
    const produto = _produtos.find(p => p.id === id);
    if (!produto) return;
    carrinho.adicionar(produto);
  }

  function obterProduto(id) {
    return _produtos.find(p => p.id === id) || null;
  }

  function obterTodos() {
    return [..._produtos];
  }

  function filtrar({ tipo, subtipo, pais, precoMin, precoMax, emOferta, emEstoque } = {}) {
    return _produtos.filter(p => {
      if (tipo && p.tipo !== tipo) return false;
      if (subtipo && p.subtipo !== subtipo) return false;
      if (pais && p.pais !== pais) return false;
      if (precoMin !== undefined && p.preco < precoMin) return false;
      if (precoMax !== undefined && p.preco > precoMax) return false;
      if (emOferta && !p.precoOriginal) return false;
      if (emEstoque && p.estoque === 0) return false;
      return true;
    });
  }

  /* ---- Inicialização ---- */
  async function init() {
    const produtos = await carregarProdutos();
    if (produtos.length === 0) return;

    popularSommelierSection(produtos);
    popularMaisVendidos(produtos);
    popularOfertas(produtos);
    carrinho.atualizarBadge();

    console.log(`[Vinho Prime] ${produtos.length} produtos carregados com sucesso.`);
  }

  return { init, adicionarAoCarrinho, obterProduto, obterTodos, filtrar, carrinho };

})();

document.addEventListener('DOMContentLoaded', VinhoPrime.init);
