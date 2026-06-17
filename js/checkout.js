/* ============================================================
   Vinho Prime — Checkout
   ============================================================ */
const Checkout = (() => {

  /* ---- Configurações (personalize antes de ir ao ar) ---- */
  const CONFIG = {
    whatsappNumero: '5511999999999', // ATENÇÃO: substitua pelo número real (só dígitos)
    freteGratis:    299,             // Valor mínimo para frete grátis (R$)
    freteValor:     25,              // Valor do frete quando não atingir o mínimo (R$)
    pixDesconto:    0.05,            // 5% de desconto no PIX
  };

  /* ---- Gradientes por subtipo (igual ao app.js) ---- */
  const GRADIENTES = {
    tinto:     'linear-gradient(160deg,#5C1515,#3D0C0C)',
    branco:    'linear-gradient(160deg,#E8D5A3,#8A6A20)',
    'rosé':    'linear-gradient(160deg,#C04060,#5C0820)',
    espumante: 'linear-gradient(160deg,#C8B870,#706020)',
    natural:   'linear-gradient(160deg,#6B8C4A,#2A4A10)',
    whisky:    'linear-gradient(160deg,#2A1A0A,#0A0500)',
    gin:       'linear-gradient(160deg,#0A2A1A,#020D05)',
    cognac:    'linear-gradient(160deg,#3A1A0A,#1A0500)',
    rum:       'linear-gradient(160deg,#2A1A00,#0A0500)',
    cachaça:   'linear-gradient(160deg,#1A2A0A,#050A00)',
    vodka:     'linear-gradient(160deg,#1A1A2A,#050508)',
    licor:     'linear-gradient(160deg,#2A0A2A,#0A0010)',
  };

  /* ---- Estado ---- */
  let _itens     = [];
  let _pagamento = 'pix';

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  function init() {
    _itens = JSON.parse(localStorage.getItem('vp_carrinho') || '[]');

    const layoutEl = document.getElementById('checkout-layout');
    const vazioEl  = document.getElementById('checkout-vazio');

    if (_itens.length === 0) {
      if (layoutEl) layoutEl.style.display = 'none';
      if (vazioEl)  vazioEl.style.display  = 'block';
      return;
    }

    _renderizarResumo();
    _configurarParcelas();
    _atualizarTotais();
    _preencherDadosDoPerfil();
  }

  /* ============================================================
     PRÉ-PREENCHIMENTO COM DADOS DO PERFIL (se logado)
     ============================================================ */
  async function _preencherDadosDoPerfil() {
    if (typeof Auth === 'undefined') return;
    const perfil = await Auth.obterPerfil();
    if (!perfil) return;

    const nomeEl  = document.getElementById('nome');
    const emailEl = document.getElementById('email');
    const whatsEl = document.getElementById('whatsapp');

    if (nomeEl  && perfil.nome)     nomeEl.value  = perfil.nome;
    if (emailEl && perfil.email)    emailEl.value = perfil.email;
    if (whatsEl && perfil.telefone) whatsEl.value = perfil.telefone;
  }

  /* ============================================================
     RESUMO DO PEDIDO (sidebar)
     ============================================================ */
  function _renderizarResumo() {
    const el = document.getElementById('resumo-itens');
    const contEl = document.getElementById('resumo-contagem');
    if (!el) return;

    const totalQtd = _itens.reduce((acc, i) => acc + i.quantidade, 0);
    if (contEl) contEl.textContent = `${totalQtd} ${totalQtd === 1 ? 'item' : 'itens'}`;

    el.innerHTML = _itens.map(item => {
      const grad = GRADIENTES[item.subtipo] || GRADIENTES.tinto;
      const emoji = item.tipo === 'destilado' ? '🥃' : '🍷';
      const subtotal = (item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `
        <div class="resumo-item">
          <div class="resumo-item-img" style="background:${grad}">${emoji}</div>
          <div class="resumo-item-info">
            <p class="resumo-item-nome">${item.nome}</p>
            <p class="resumo-item-sub">${item.pais || ''}${item.safra ? ' · ' + item.safra : ''} · ×${item.quantidade}</p>
          </div>
          <span class="resumo-item-preco">${subtotal}</span>
        </div>`;
    }).join('');
  }

  function _atualizarTotais() {
    const subtotal = _itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const frete    = subtotal >= CONFIG.freteGratis ? 0 : CONFIG.freteValor;
    const isPix    = _pagamento === 'pix';
    const descPix  = isPix ? subtotal * CONFIG.pixDesconto : 0;
    const total    = subtotal + frete - descPix;

    const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const subEl    = document.getElementById('resumo-subtotal');
    const freteEl  = document.getElementById('resumo-frete');
    const totalEl  = document.getElementById('resumo-total');
    const pixLinha = document.getElementById('resumo-linha-pix');
    const descEl   = document.getElementById('resumo-desc-pix');

    if (subEl)   subEl.textContent   = fmt(subtotal);
    if (freteEl) freteEl.innerHTML   = frete === 0
      ? '<span class="resumo-frete-free">Grátis 🎉</span>'
      : fmt(frete);
    if (totalEl) totalEl.textContent = fmt(total);

    if (pixLinha) pixLinha.style.display = isPix ? 'flex' : 'none';
    if (descEl)   descEl.textContent = `−${fmt(descPix)}`;
  }

  /* ============================================================
     SELEÇÃO DE PAGAMENTO
     ============================================================ */
  function selecionarPagamento(metodo) {
    _pagamento = metodo;

    ['pix', 'cartao', 'boleto'].forEach(m => {
      const opcaoEl   = document.getElementById(`pag-${m}`);
      const detalheEl = document.getElementById(`detalhe-${m}`);
      const radioEl   = opcaoEl?.querySelector('input[type="radio"]');

      if (opcaoEl)   opcaoEl.classList.toggle('ativo', m === metodo);
      if (detalheEl) detalheEl.classList.toggle('visivel', m === metodo);
      if (radioEl)   radioEl.checked = (m === metodo);
    });

    _atualizarTotais();
  }

  /* ============================================================
     AUTO-PREENCHIMENTO DE CEP (ViaCEP)
     ============================================================ */
  async function buscarCEP() {
    const input  = document.getElementById('cep');
    const status = document.getElementById('cep-status');
    if (!input || !status) return;

    const cep = input.value.replace(/\D/g, '');
    if (cep.length !== 8) {
      status.textContent = 'CEP deve ter 8 dígitos.';
      status.className   = 'cep-status erro';
      return;
    }

    const btn = document.querySelector('.cep-buscar-btn');
    if (btn) btn.disabled = true;
    status.textContent = 'Buscando...';
    status.className   = 'cep-status';

    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data.erro) {
        status.textContent = 'CEP não encontrado.';
        status.className   = 'cep-status erro';
        return;
      }

      _preencherCampo('endereco',  data.logradouro);
      _preencherCampo('bairro',    data.bairro);
      _preencherCampo('cidade',    data.localidade);
      _preencherEstado(data.uf);

      status.textContent = '✓ Endereço preenchido automaticamente.';
      status.className   = 'cep-status ok';

      document.getElementById('numero')?.focus();
    } catch {
      status.textContent = 'Erro ao buscar CEP. Preencha manualmente.';
      status.className   = 'cep-status erro';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function _preencherCampo(id, valor) {
    const el = document.getElementById(id);
    if (el && valor) { el.value = valor; el.classList.remove('erro'); }
  }

  function _preencherEstado(uf) {
    const sel = document.getElementById('estado');
    if (!sel || !uf) return;
    for (const opt of sel.options) {
      if (opt.value === uf) { opt.selected = true; break; }
    }
    sel.classList.remove('erro');
  }

  /* ============================================================
     MÁSCARAS
     ============================================================ */
  function mascaraCPF(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1.$2');
    input.value = v;
  }

  function mascaraTel(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, '($1) $2');
    input.value = v;
  }

  function mascaraCEP(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d+)/, '$1-$2');
    input.value = v;
  }

  function mascaraCartao(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 16);
    v = v.replace(/(\d{4})(?=\d)/g, '$1 ').trimEnd();
    input.value = v;

    const tag = document.getElementById('cartao-bandeira');
    if (!tag) return;
    const n = v.replace(/\s/g, '');
    if      (/^4/.test(n))          tag.textContent = '💳 Visa';
    else if (/^5[1-5]/.test(n))     tag.textContent = '💳 Mastercard';
    else if (/^3[47]/.test(n))      tag.textContent = '💳 American Express';
    else if (/^6(?:011|5)/.test(n)) tag.textContent = '💳 Elo';
    else                             tag.textContent = '';
  }

  function mascaraValidade(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, '$1/$2');
    input.value = v;
  }

  /* ============================================================
     PARCELAMENTO (cartão)
     ============================================================ */
  function _configurarParcelas() {
    const sel = document.getElementById('cartao-parcelas');
    if (!sel) return;
    const subtotal = _itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const opts = [];
    for (let p = 1; p <= 12; p++) {
      const val = (subtotal / p).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      opts.push(`<option value="${p}">${p}× de ${val} sem juros</option>`);
    }
    sel.innerHTML = opts.join('');
  }

  /* ============================================================
     COPIAR CHAVE PIX
     ============================================================ */
  function copiarPix(el) {
    const chave = el.textContent.trim();
    navigator.clipboard?.writeText(chave).catch(() => {});
    const msg = document.getElementById('pix-copy-msg');
    if (!msg) return;
    msg.classList.add('visivel');
    setTimeout(() => msg.classList.remove('visivel'), 2000);
  }

  /* ============================================================
     VALIDAÇÃO DO FORMULÁRIO
     ============================================================ */
  function _validar() {
    let ok = true;

    function checar(id, erroId, condicao) {
      const input = document.getElementById(id);
      const msg   = document.getElementById(erroId);
      const invalido = !condicao(input?.value || '');
      input?.classList.toggle('erro', invalido);
      msg?.classList.toggle('visivel', invalido);
      if (invalido) ok = false;
    }

    checar('nome',      'erro-nome',      v => v.trim().length >= 3);
    checar('cpf',       'erro-cpf',       v => v.replace(/\D/g, '').length === 11);
    checar('email',     'erro-email',     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    checar('whatsapp',  'erro-whatsapp',  v => v.replace(/\D/g, '').length >= 10);
    checar('cep',       'erro-cep',       v => v.replace(/\D/g, '').length === 8);
    checar('endereco',  'erro-endereco',  v => v.trim().length >= 3);
    checar('numero',    'erro-numero',    v => v.trim().length >= 1);
    checar('bairro',    'erro-bairro',    v => v.trim().length >= 2);
    checar('cidade',    'erro-cidade',    v => v.trim().length >= 2);
    checar('estado',    'erro-estado',    v => v !== '');

    return ok;
  }

  /* ============================================================
     FINALIZAR PEDIDO (WhatsApp)
     ============================================================ */
  function finalizar() {
    if (!_validar()) {
      const erroEl = document.querySelector('.form-input.erro');
      erroEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const subtotal   = _itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const frete      = subtotal >= CONFIG.freteGratis ? 0 : CONFIG.freteValor;
    const isPix      = _pagamento === 'pix';
    const descPix    = isPix ? subtotal * CONFIG.pixDesconto : 0;
    const total      = subtotal + frete - descPix;
    const fmt        = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const val = id => document.getElementById(id)?.value?.trim() || '';

    const mapaPagamento = {
      pix:    '💰 PIX (5% de desconto)',
      cartao: `💳 Cartão de crédito — ${val('cartao-parcelas')}x`,
      boleto: '📄 Boleto bancário',
    };

    const numerosPedido = Math.floor(Math.random() * 900000 + 100000);
    const numPedido = `VP-${numerosPedido}`;

    const linhasItens = _itens.map(i =>
      `• ${i.quantidade}× ${i.nome}${i.safra ? ' ' + i.safra : ''} — ${fmt(i.preco * i.quantidade)}`
    ).join('\n');

    const complemento = val('complemento');
    const endFormatado = `${val('endereco')}, ${val('numero')}${complemento ? ' - ' + complemento : ''}\n${val('bairro')} — ${val('cidade')}/${val('estado')}\nCEP: ${val('cep')}`;

    const msg = [
      `🍷 *Vinho Prime — Novo Pedido*`,
      `*Nº do Pedido:* ${numPedido}`,
      ``,
      `*👤 Cliente*`,
      `*Nome:* ${val('nome')}`,
      `*WhatsApp:* ${val('whatsapp')}`,
      `*E-mail:* ${val('email')}`,
      `*CPF:* ${val('cpf')}`,
      ``,
      `*📦 Endereço de Entrega*`,
      endFormatado,
      ``,
      `*🛒 Itens do Pedido*`,
      linhasItens,
      ``,
      `*Subtotal:* ${fmt(subtotal)}`,
      `*Frete:* ${frete === 0 ? 'Grátis' : fmt(frete)}`,
      isPix ? `*Desconto PIX (5%):* −${fmt(descPix)}` : null,
      `*Total:* ${fmt(total)}`,
      ``,
      `*💳 Pagamento:* ${mapaPagamento[_pagamento] || _pagamento}`,
    ].filter(l => l !== null).join('\n');

    const url = `https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(msg)}`;

    if (typeof Auth !== 'undefined') {
      Auth.salvarPedido({
        numero_pedido:   numPedido,
        itens:           _itens,
        subtotal,
        frete,
        desconto:        descPix,
        total,
        forma_pagamento: _pagamento,
        endereco: {
          cep: val('cep'), endereco: val('endereco'), numero: val('numero'),
          complemento, bairro: val('bairro'), cidade: val('cidade'), estado: val('estado'),
        },
      }).catch(e => console.warn('[Checkout] erro ao salvar pedido:', e.message));
    }

    document.getElementById('checkout-conf-num').textContent = numPedido;
    document.getElementById('checkout-layout').style.display    = 'none';
    document.getElementById('checkout-confirmacao').classList.add('visivel');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    localStorage.removeItem('vp_carrinho');

    setTimeout(() => window.open(url, '_blank'), 400);
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  document.addEventListener('DOMContentLoaded', init);

  return {
    selecionarPagamento,
    buscarCEP,
    copiarPix,
    finalizar,
    mascaraCPF,
    mascaraTel,
    mascaraCEP,
    mascaraCartao,
    mascaraValidade,
  };

})();
