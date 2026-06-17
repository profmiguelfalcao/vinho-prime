/* ============================================================
   Vinho Prime — Autenticação (Login, Cadastro, Perfil)
   Depende de js/db.js (usa DB.client() para acessar o Supabase)
   ============================================================ */
const Auth = (function () {

  function _baseUrl() {
    return window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  }

  /* ==============================================================
     SESSÃO
  ============================================================== */

  async function getSession() {
    const c = DB.client();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data?.session || null;
  }

  async function getUser() {
    const session = await getSession();
    return session?.user || null;
  }

  async function irParaConta() {
    const user = await getUser();
    window.location.href = user ? 'perfil.html' : 'login.html';
  }

  /* ==============================================================
     CADASTRO / LOGIN
  ============================================================== */

  async function cadastrar(nome, email, senha) {
    const c = DB.client();
    if (!c) throw new Error('Supabase não configurado.');
    const { data, error } = await c.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) throw error;
    return data;
  }

  async function entrar(email, senha) {
    const c = DB.client();
    if (!c) throw new Error('Supabase não configurado.');
    const { data, error } = await c.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
    return data;
  }

  async function entrarGoogle() {
    const c = DB.client();
    if (!c) throw new Error('Supabase não configurado.');
    const { error } = await c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: _baseUrl() + 'perfil.html' },
    });
    if (error) throw error;
  }

  async function recuperarSenha(email) {
    const c = DB.client();
    if (!c) throw new Error('Supabase não configurado.');
    const { error } = await c.auth.resetPasswordForEmail(email, {
      redirectTo: _baseUrl() + 'login.html',
    });
    if (error) throw error;
  }

  async function sair() {
    const c = DB.client();
    if (c) await c.auth.signOut();
    window.location.href = 'index.html';
  }

  /* ==============================================================
     PERFIL
  ============================================================== */

  async function obterPerfil() {
    const user = await getUser();
    if (!user) return null;

    const c = DB.client();
    const { data, error } = await c.from('perfis').select('*').eq('id', user.id).single();

    if (error) {
      return { id: user.id, nome: user.user_metadata?.nome || '', telefone: '', email: user.email };
    }
    return { ...data, email: user.email };
  }

  async function atualizarPerfil(campos) {
    const user = await getUser();
    if (!user) throw new Error('Não autenticado.');

    const c = DB.client();
    const { error } = await c.from('perfis').upsert({ id: user.id, ...campos });
    if (error) throw error;
  }

  /* ==============================================================
     PEDIDOS
  ============================================================== */

  async function listarPedidos() {
    const user = await getUser();
    if (!user) return [];

    const c = DB.client();
    const { data, error } = await c
      .from('pedidos')
      .select('*')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false });

    if (error) {
      console.warn('[Auth] erro ao listar pedidos:', error.message);
      return [];
    }
    return data || [];
  }

  async function salvarPedido(pedido) {
    const user = await getUser();
    if (!user) return;

    const c = DB.client();
    const { error } = await c.from('pedidos').insert({ ...pedido, user_id: user.id });
    if (error) console.warn('[Auth] erro ao salvar pedido:', error.message);
  }

  /* ---- API pública ---- */
  return {
    getSession,
    getUser,
    irParaConta,
    cadastrar,
    entrar,
    entrarGoogle,
    recuperarSenha,
    sair,
    obterPerfil,
    atualizarPerfil,
    listarPedidos,
    salvarPedido,
  };
})();
