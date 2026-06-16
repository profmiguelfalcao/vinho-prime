/* ============================================================
   Vinho Prime — Quiz de Harmonização
   ============================================================ */
const Quiz = (function () {

  const PRATOS = [
    { id: 'carnes',     emoji: '🥩', label: 'Carnes vermelhas',      subtipos: ['tinto'] },
    { id: 'churrasco',  emoji: '🔥', label: 'Churrasco',             subtipos: ['tinto'] },
    { id: 'frango',     emoji: '🍗', label: 'Frango & Aves',         subtipos: ['branco', 'rosé', 'tinto'] },
    { id: 'peixe',      emoji: '🐟', label: 'Peixe & Frutos do mar', subtipos: ['branco', 'espumante', 'rosé'] },
    { id: 'massas',     emoji: '🍝', label: 'Massas & Risoto',       subtipos: ['tinto', 'branco'] },
    { id: 'pizza',      emoji: '🍕', label: 'Pizza',                 subtipos: ['tinto'] },
    { id: 'queijos',    emoji: '🧀', label: 'Queijos & Frios',       subtipos: ['tinto', 'espumante', 'branco'] },
    { id: 'sobremesas', emoji: '🍰', label: 'Sobremesas',            subtipos: ['espumante', 'rosé'] },
    { id: 'aperitivo',  emoji: '🫒', label: 'Aperitivo & Petiscos',  subtipos: ['espumante', 'branco', 'rosé'] },
    { id: 'destilado',  emoji: '🥃', label: 'Quero um destilado',    tipos: ['destilado'] },
  ];

  const MENSAGENS = {
    carnes:     'Para carnes vermelhas, tintos encorpados são a escolha clássica do sommelier.',
    churrasco:  'Churrasco pede tinto robusto. Nada melhor para acompanhar a picanha na brasa.',
    frango:     'Brancos leves são os ideais para frango, mas um tinto frutado também surpreende.',
    peixe:      'Peixes e frutos do mar pedem brancos secos ou espumantes refrescantes.',
    massas:     'Massas com molho vermelho adoram um tinto encorpado. Com molho branco, um branco seco é perfeito.',
    pizza:      'Pizza pede tintos frutados — leves o suficiente para não competir com o molho.',
    queijos:    'Queijos curados adoram tintos robustos; os frescos combinam com espumantes e brancos.',
    sobremesas: 'Sobremesas pedem espumantes brut ou demi-sec para equilibrar a doçura.',
    aperitivo:  'Para aperitivo, espumantes e brancos refrescantes criam o clima perfeito.',
    destilado:  'Para a ocasião, separamos os melhores destilados do nosso catálogo.',
  };

  const GRADIENTES = {
    tinto: '#5C1515', branco: '#b8a96a', 'rosé': '#c97a8a',
    espumante: '#d4c86a', natural: '#7a9a6a',
    whisky: '#c4823a', gin: '#5a8a7a', cognac: '#c4943a',
    rum: '#8a5a3a', 'cachaça': '#a0b060', vodka: '#8a9ab0', licor: '#8a4a8a',
  };

  let _produtos = [];
  let _prato = null;

  async function init() {
    try {
      const { produtos } = await DB.getProdutos();
      _produtos = produtos.filter(p => p.ativo);
    } catch (e) {
      console.warn('[Quiz] Erro ao carregar produtos:', e);
    }
  }

  function selecionarPrato(id) {
    _prato = PRATOS.find(p => p.id === id);
    if (!_prato) return;

    let resultados;

    if (_prato.tipos) {
      resultados = _produtos.filter(p => _prato.tipos.includes(p.tipo));
    } else {
      resultados = _produtos.filter(p => _prato.subtipos.includes(p.subtipo));
      if (!resultados.length) {
        resultados = [..._produtos];
      }
    }

    resultados.sort((a, b) => {
      const aS = (a.destaque && a.destaque.sommelier) ? 1 : 0;
      const bS = (b.destaque && b.destaque.sommelier) ? 1 : 0;
      if (bS !== aS) return bS - aS;
      return (b.avaliacao || 0) - (a.avaliacao || 0);
    });

    _renderizarResultados(resultados.slice(0, 4));
  }

  function _renderizarResultados(lista) {
    document.getElementById('quiz-step-1').hidden = true;
    const tela = document.getElementById('quiz-resultado');
    tela.hidden = false;

    const temExatoMatch = _prato.tipos
      ? _produtos.some(p => _prato.tipos.includes(p.tipo))
      : _produtos.some(p => _prato.subtipos && _prato.subtipos[0] === p.subtipo);

    const notaEl = document.getElementById('quiz-nota-catalogo');
    if (notaEl) notaEl.hidden = temExatoMatch || !!_prato.tipos;

    document.getElementById('quiz-mensagem').textContent = MENSAGENS[_prato.id] || '';
    document.getElementById('quiz-prato-label').textContent = _prato.emoji + ' ' + _prato.label;

    const grid = document.getElementById('quiz-grid');
    if (!lista.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-sec)">Nenhum produto encontrado no momento.</p>';
      return;
    }
    grid.innerHTML = lista.map(_cardHTML).join('');
  }

  function _cardHTML(p) {
    const preco = (p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const cor   = GRADIENTES[p.subtipo] || '#3D0C0C';
    const emoji = p.tipo === 'destilado' ? '🥃' : '🍷';
    const sub   = [p.produtor, p.pais].filter(Boolean).join(' · ');
    const badge = p.destaque && p.destaque.sommelier
      ? '<span class="quiz-result-badge">Sommelier</span>' : '';
    return `
      <a href="produto.html?slug=${p.slug}" class="quiz-result-card">
        <div class="quiz-result-img" style="background:${cor}">${emoji}</div>
        <div class="quiz-result-body">
          ${badge}
          <p class="quiz-result-nome">${p.nome}</p>
          <p class="quiz-result-sub">${sub}</p>
          <p class="quiz-result-preco">${preco}</p>
        </div>
      </a>`;
  }

  function reiniciar() {
    _prato = null;
    document.getElementById('quiz-step-1').hidden = false;
    document.getElementById('quiz-resultado').hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { selecionarPrato, reiniciar };
})();
