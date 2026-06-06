/* BeautyTime - SPA simples com armazenamento no localStorage */ 

const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => [...root.querySelectorAll(sel)];

// Rotas simples
const routes = ['login', 'cadastro', 'home', 'agendar', 'agendamentos'];

// Dados fixos de serviços
const SERVICOS = [
    { id: 'corte', nome: 'Corte de Cabelo', duracao: 45, preco: 80 },
    { id: 'escova', nome: 'Escova', duracao: 30, preco: 50 },
    { id: 'coloracao', nome: 'Coloração', duracao: 120, preco: 180 },
    { id: 'manicure', nome: 'Manicure', duracao: 40, preco: 35 },
    { id: 'pedicure', nome: 'Pedicure', duracao: 50, preco: 40 },
    { id: 'sobrancelha', nome: 'Design de Sobrancelhas', duracao: 30, preco: 45 },
    { id: 'maquiagem', nome: 'Maquiagem', duracao: 60, preco: 120 },
    { id: 'massagem', nome: 'Massagem Capilar', duracao: 30, preco: 60 },
];

// Geração de horários (09:00 - 18:30, de 30 em 30)
const HORARIOS = (() => {
    const out = [];
    for (let h = 9; h <= 18; h++) {
        out.push(`${String(h).padStart(2, '0')}:00`);
        if (!(h === 18)) out.push(`${String(h).padStart(2, '0')}:30`);
    }
    return out;
})();

// Estado
let state = {
    usuario: null,
    agendar: { servicoId: null, data: null, hora: null }
};

// Utilidades de storage
const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)) }
};

function init() {
    // Usuário logado?
    state.usuario = storage.get('bt_usuario', null);

    // Navegação
    els('[data-route]').forEach(b => b.addEventListener('click', () => go(b.dataset.route)));
    el('#btn-sair').addEventListener('click', logout);

    // Auth
    el('#to-cadastro').addEventListener('click', () => go('cadastro'));
    el('#to-login').addEventListener('click', () => go('login'));
    el('#form-login').addEventListener('submit', onLogin);
    el('#form-cadastro').addEventListener('submit', onCadastro);

    // Agendar
    renderServicos();
    renderHorarios();
    el('#lista-servicos').addEventListener('click', onPickServico);
    el('#horarios-grid').addEventListener('click', onPickHora);
    el('#data-input').addEventListener('change', e => { state.agendar.data = e.target.value; });
    el('#btn-confirmar').addEventListener('click', confirmarAgendamento);

    // Rota inicial
    go(state.usuario ? 'home' : 'login');
}
document.addEventListener('DOMContentLoaded', init);

/* Navegação */
function go(view) {
    routes.forEach(r => {
        const v = el(`#view-${r}`);
        if (!v) return;
        v.classList.toggle('active', r === view);
    });

    // Topbar: exibir nav apenas autenticado e fora das telas de auth
    const showNav = !(view === 'login' || view === 'cadastro') && !!state.usuario;
    el('#main-nav').style.display = showNav ? 'flex' : 'none';

    if (view === 'home') mountHome();
    if (view === 'agendar') mountAgendar();
    if (view === 'agendamentos') mountAgendamentos();
}

/* AUTH */
function onCadastro(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const usuarios = storage.get('bt_usuarios', []);
    if (usuarios.find(u => u.email === data.email)) {
        alert('E-mail já cadastrado.');
        return;
    }
    const novo = { id: Date.now(), nome: data.nome, telefone: data.telefone, email: data.email, senha: data.senha };
    usuarios.push(novo);
    storage.set('bt_usuarios', usuarios);
    storage.set('bt_usuario', novo);
    state.usuario = novo;
    e.target.reset();
    go('home');
}
function onLogin(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const usuarios = storage.get('bt_usuarios', []);
    const user = usuarios.find(u => u.email === data.email && u.senha === data.senha);
    if (!user) { alert('Credenciais inválidas.'); return; }
    storage.set('bt_usuario', user);
    state.usuario = user;
    e.target.reset();
    go('home');
}
function logout() {
    storage.set('bt_usuario', null);
    state.usuario = null;
    go('login');
}

/* HOME */
function mountHome() {
    el('#nome-usuario').textContent = (state.usuario?.nome?.split(' ')[0] || 'Cliente') + '!';
}

/* AGENDAR */
function renderServicos() {
    const wrap = el('#lista-servicos');
    wrap.innerHTML = '';
    SERVICOS.slice(0, 8).forEach(s => {
        const node = document.createElement('button');
        node.className = 'service';
        node.type = 'button';
        node.dataset.id = s.id;
        node.innerHTML = `
          <div style="flex:1; min-width:0;">
            <h4 style="margin:0 0 4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.nome}</h4>
            <div class="meta">${Math.round(s.duracao)} min</div>
          </div>
          <div class="price" style="white-space:nowrap; flex-shrink:0;">R$ ${s.preco.toFixed(2).replace('.', ',')}</div>
        `;
        wrap.appendChild(node);
    });
}

function renderHorarios() {
    const grid = el('#horarios-grid');
    grid.innerHTML = '';
    HORARIOS.forEach(h => {
        const b = document.createElement('button');
        b.className = 'time';
        b.type = 'button';
        b.textContent = h;
        b.dataset.hora = h;
        grid.appendChild(b);
    });
}
function onPickServico(e) {
    const btn = e.target.closest('.service');
    if (!btn) return;
    state.agendar.servicoId = btn.dataset.id;
    els('.service', e.currentTarget).forEach(x => x.classList.toggle('selected', x === btn));
}
function onPickHora(e) {
    const btn = e.target.closest('.time');
    if (!btn || btn.classList.contains('disabled')) return;
    state.agendar.hora = btn.dataset.hora;
    els('.time', e.currentTarget).forEach(x => x.classList.toggle('selected', x === btn));
}
function mountAgendar() {
    // Zera seleção visual e estado
    els('.service').forEach(n => n.classList.remove('selected'));
    els('.time').forEach(n => n.classList.remove('selected'));
    state.agendar = { servicoId: null, data: null, hora: null };
    el('#data-input').value = '';

    // Desabilita horários já ocupados na data selecionada + serviço selecionado?
    // Estratégia: quando usuário definir data, recalcular bloqueios
    el('#data-input').addEventListener('change', refreshBloqueios);
}
function refreshBloqueios() {
    const dataSel = el('#data-input').value;
    const grid = el('#horarios-grid');
    els('.time', grid).forEach(n => n.classList.remove('disabled'));
    if (!dataSel) return;
    const ags = meusAgendamentos().filter(a => a.data === dataSel);
    const ocupadas = new Set(ags.map(a => a.hora));
    els('.time', grid).forEach(n => { if (ocupadas.has(n.dataset.hora)) n.classList.add('disabled'); });
}

function confirmarAgendamento() {
    const msg = el('#agendar-msg');
    msg.className = 'status';
    const { servicoId, data, hora } = state.agendar;
    if (!servicoId || !data || !hora) {
        msg.textContent = 'Selecione um serviço, uma data e um horário.';
        msg.classList.add('err');
        return;
    }
    // Impede datas passadas
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dSel = new Date(data + 'T00:00');
    if (dSel < hoje) {
        msg.textContent = 'Escolha uma data futura.';
        msg.classList.add('err');
        return;
    }
    // Checar conflito
    const lista = storage.get('bt_agendamentos', []);
    const conflito = lista.find(a => a.userId === state.usuario.id && a.data === data && a.hora === hora);
    if (conflito) {
        msg.textContent = 'Você já tem um agendamento neste horário.';
        msg.classList.add('err');
        return;
    }

    const serv = SERVICOS.find(s => s.id === servicoId);
    const novo = {
        id: Date.now(),
        userId: state.usuario.id,
        servicoId,
        servicoNome: serv.nome,
        preco: serv.preco,
        data,
        hora
    };
    lista.push(novo);
    storage.set('bt_agendamentos', lista);

    msg.textContent = 'Agendamento confirmado!';
    msg.classList.add('ok');
    refreshBloqueios();

    // Navegar para lista após pequena pausa
    setTimeout(() => go('agendamentos'), 700);
}

/* AGENDAMENTOS */
function meusAgendamentos() {
    const all = storage.get('bt_agendamentos', []);
    return all.filter(a => a.userId === state.usuario?.id);
}
function mountAgendamentos() {
    const lista = meusAgendamentos().sort((a, b) => {
        const da = new Date(`${a.data}T${a.hora}:00`).getTime();
        const db = new Date(`${b.data}T${b.hora}:00`).getTime();
        return da - db;
    });
    el('#contagem-agendamentos').textContent =
        `Você tem ${lista.length} agendamento${lista.length !== 1 ? 's' : ''} confirmados`;

    const wrap = el('#lista-agendamentos');
    wrap.innerHTML = '';

    if (!lista.length) {
        const empty = document.createElement('div');
        empty.className = 'card';
        empty.innerHTML = '<p class="muted">Nenhum agendamento por enquanto.</p>';
        wrap.appendChild(empty);
        return;
    }

    for (const a of lista) {
        const item = document.createElement('div');
        item.className = 'item';

        const head = document.createElement('div');
        head.className = 'item-head';
        head.innerHTML = `
      <div class="item-title">${a.servicoNome}</div>
      <button class="nav-btn outline" data-del="${a.id}" title="Excluir">🗑</button>
    `;

        const meta = document.createElement('div');
        meta.className = 'item-meta';
        meta.innerHTML = `
      <span class="badge"><span class="dot"></span> R$ ${a.preco.toFixed(2).replace('.', ',')}</span>
      <span class="badge">📅 ${formatDatePt(a.data)}</span>
      <span class="badge">🕒 ${a.hora}</span>
    `;

        item.appendChild(head);
        item.appendChild(meta);
        wrap.appendChild(item);
    }

    // Exclusão
    wrap.addEventListener('click', e => {
        const id = e.target.closest('[data-del]')?.dataset.del;
        if (!id) return;
        if (confirm('Excluir este agendamento?')) {
            const all = storage.get('bt_agendamentos', []);
            storage.set('bt_agendamentos', all.filter(x => String(x.id) !== String(id)));
            mountAgendamentos();
        }
    }, { once: true });
}

/* Helpers */
function formatDatePt(iso) {
    // iso no formato yyyy-mm-dd
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
