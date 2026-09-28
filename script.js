/* BLACKMARKET AUCTIONS — fictional front-end demo. No backend, no real items. */
(() => {
  'use strict';

  /* ========== DATA ========== */
  const now = () => Date.now();
  const lots = [
    { id: 47, name: 'BLACK ECLIPSE', cat: 'Artefato confidencial', start: 4000, bid: 18500, bidders: 23, state: 'live', ends: now() + 5400e3, hue: 150, desc: 'Um disco de obsidiana lacrado e de origem desconhecida. O registro de procedência está parcialmente oculto.' },
    { id: 1, name: 'RED VEIL', cat: 'Tecido lacrado', start: 800, bid: 1250, bidders: 9, state: 'live', ends: now() + 3 * 3600e3, hue: 355, desc: 'Tecido catalogado como uma curiosidade. A cadeia de custódia não foi verificada.' },
    { id: 14, name: 'GHOST KEY', cat: 'Token criptografado', start: 2000, bid: 3400, bidders: 14, state: 'live', ends: now() + 420e3, hue: 170, desc: 'Uma chave sem fechadura: não abre nada, mas três colecionadores disputam o item.' },
    { id: 27, name: 'OBSIDIAN FILE', cat: 'Arquivo censurado', start: 1500, bid: 1500, bidders: 0, state: 'upcoming', ends: now() + 26 * 3600e3, hue: 200, desc: 'Um dossiê com todas as páginas ocultas. Ainda sem lance inicial.' },
    { id: 39, name: 'NIGHTFALL', cat: 'Instrumento raro', start: 5000, bid: 9800, bidders: 17, state: 'live', ends: now() + 50 * 60e3, hue: 260, desc: 'Um protótipo de navegação que só funciona depois de anoitecer.' },
    { id: 52, name: 'BLACK ORCHID', cat: 'Espécime preservado', start: 700, bid: 2100, bidders: 11, state: 'closed', ends: now() - 3600e3, hue: 300, desc: 'Uma flor quase negra preservada em vidro. Leilão encerrado.' },
    { id: 73, name: 'SILENT CODE', cat: 'Cifra lacrada', start: 3000, bid: 3000, bidders: 0, state: 'upcoming', ends: now() + 8 * 3600e3, hue: 120, desc: 'Uma roda cifrada sem alfabeto conhecido. O leilão abre em breve.' },
  ];
  const history = { 47: [['USER_482', 18500], ['USER_129', 18000], ['USER_077', 17200]] };
  const featured = lots[0];
  let openLot = null;
  let bidsPlaced = 128;

  /* ========== HELPERS ========== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = n => '₿ ' + n.toLocaleString('en-US');
  const pad = n => String(n).padStart(2, '0');
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const byId = id => lots.find(l => l.id === Number(id));

  function formatTime(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
  }

  function statusOf(lot) {
    if (lot.state === 'closed') return { label: 'ENCERRADO', css: 'closed' };
    if (lot.state === 'upcoming') return { label: 'EM BREVE', css: 'upcoming' };
    const left = lot.ends - now();
    if (left <= 0) { lot.state = 'closed'; return { label: 'ENCERRADO', css: 'closed' }; }
    return left < 600e3 ? { label: 'ENCERRANDO', css: 'ending' } : { label: 'AO VIVO', css: 'live' };
  }

  /* ========== NOTIFICATIONS ========== */
  function toast(title, text = '', type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<b></b><span></span>`;
    $('b', el).textContent = title;
    $('span', el).textContent = text;
    $('#toasts').append(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3500);
  }

  /* ========== COUNTDOWN ========== */
  function tickCountdowns() {
    const t = now();
    $('#heroCountdown').textContent = formatTime(featured.ends - t);
    $('#featTime').textContent = formatTime(featured.ends - t);
    lots.forEach(lot => {
      const timeEl = $(`[data-time="${lot.id}"]`);
      const statusEl = $(`[data-status="${lot.id}"]`);
      const st = statusOf(lot);
      if (timeEl) timeEl.textContent = lot.state === 'closed' ? '--:--:--' : formatTime(lot.ends - t);
      if (statusEl) { statusEl.textContent = st.label; statusEl.className = 'badge badge-' + st.css; }
    });
    if (openLot) $('#modalTime').textContent = openLot.state === 'closed' ? '--:--:--' : formatTime(openLot.ends - t);
  }

  /* ========== RENDERING ========== */
  function watchedIds() {
    try { return JSON.parse(localStorage.getItem('bm-watchlist')) || []; } catch { return []; }
  }

  function renderGrid() {
    const watched = watchedIds();
    $('#lotGrid').innerHTML = lots.map(lot => {
      const st = statusOf(lot);
      const on = watched.includes(lot.id);
      return `
      <article class="lot-card ${on ? 'watched' : ''}" data-id="${lot.id}" tabindex="0">
        <div class="lot-art" style="--hue:${lot.hue}"><span>◐</span></div>
        <span class="card-top badge badge-${st.css}" data-status="${lot.id}">${st.label}</span>
        <button class="fav ${on ? 'on' : ''}" data-fav="${lot.id}" aria-label="Alternar lista de interesse" aria-pressed="${on}">${on ? '★' : '☆'}</button>
        <div class="lot-info">
          <p class="label">LOTE #${pad(lot.id).padStart(3, '0')} · ${lot.cat}</p>
          <h4>${lot.name}</h4>
          <p class="lot-price">${money(lot.bid)}</p>
          <div class="lot-meta"><span>${lot.bidders} participantes</span><span data-time="${lot.id}">--:--:--</span></div>
          <div class="lot-extra"><p class="lot-meta">Lance inicial ${money(lot.start)}</p><span class="btn btn-primary">VER LOTE</span></div>
        </div>
      </article>`;
    }).join('');
    tickCountdowns();
  }

  function renderHistory(list, id) {
    list.innerHTML = (history[id] || []).slice(0, 8)
      .map(([user, amount]) => `<li><span>${user}</span><span>${money(amount)}</span></li>`).join('')
      || '<li><span>Nenhum lance</span><span>—</span></li>';
  }

  function renderFeatured() {
    $('#featBid').textContent = money(featured.bid);
    $('#featBidders').textContent = featured.bidders;
    renderHistory($('#featHistory'), featured.id);
  }

  function renderWatchlist() {
    const ids = watchedIds();
    $('#watchList').innerHTML = ids.length
      ? ids.map(id => byId(id)).filter(Boolean).map(l => `<li data-id="${l.id}">★ LOT #${l.id} — ${l.name}<br>${money(l.bid)}</li>`).join('')
      : '<li class="empty">Sua lista está vazia. Selecione ☆ em um lote para acompanhá-lo.</li>';
    $('#profWatched').textContent = ids.length;
  }

  /* ========== WATCHLIST ========== */
  function toggleWatch(id) {
    const ids = watchedIds();
    const adding = !ids.includes(id);
    const next = adding ? [...ids, id] : ids.filter(x => x !== id);
    try { localStorage.setItem('bm-watchlist', JSON.stringify(next)); } catch { /* storage blocked */ }
    toast(adding ? 'LISTA DE INTERESSE' : 'REMOVIDO', adding ? 'Lote adicionado à sua lista.' : 'Lote removido da sua lista.');
    renderGrid(); renderWatchlist();
  }

  /* ========== MODAL ========== */
  function fillModal(lot) {
    const st = statusOf(lot);
    $('#modalArt').style.setProperty('--hue', lot.hue);
    $('#modalStatus').textContent = st.label;
    $('#modalStatus').className = 'badge badge-' + st.css;
    $('#modalTitle').textContent = `LOTE #${lot.id} — ${lot.name}`;
    $('#modalDesc').textContent = lot.desc;
    $('#modalStart').textContent = money(lot.start);
    $('#modalBid').textContent = money(lot.bid);
    $('#modalBidders').textContent = lot.bidders;
    renderHistory($('#modalHistory'), lot.id);
    const bidInput = $('#bidInput');
    bidInput.min = String(lot.bid + 50);
    bidInput.step = '50';
    bidInput.placeholder = `Mín. ${money(lot.bid + 50)}`;
  }

  function openModal(id) {
    openLot = byId(id);
    if (!openLot) return;
    fillModal(openLot);
    $('#bidError').textContent = '';
    $('#bidInput').value = '';
    $('#modal').classList.remove('closing');
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-close').focus();
  }

  function closeModal() {
    const modal = $('#modal');
    modal.classList.add('closing');
    setTimeout(() => { modal.hidden = true; modal.classList.remove('closing'); document.body.style.overflow = ''; openLot = null; }, 300);
  }

  /* ========== BIDDING (simulated) ========== */
  function placeBid(event) {
    event.preventDefault();
    const error = $('#bidError');
    const value = Number($('#bidInput').value);
    if (!openLot || statusOf(openLot).css === 'closed' || openLot.state === 'upcoming') {
      error.textContent = 'Os lances não estão abertos para este lote.'; return;
    }
    const minimumBid = openLot.bid + 50;
    if (!Number.isSafeInteger(value) || value < minimumBid || (value - minimumBid) % 50 !== 0) {
      error.textContent = `O lance mínimo é ${money(minimumBid)} e os próximos devem aumentar em 50.`; return;
    }
    error.textContent = '';
    openLot.bid = value;
    openLot.bidders += rand(0, 1);
    (history[openLot.id] ||= []).unshift(['YOU', value]);
    bidsPlaced++;
    fillModal(openLot); renderGrid(); renderFeatured();
    $('#profBids').textContent = bidsPlaced;
    $('#modalBid').classList.add('bump');
    setTimeout(() => $('#modalBid').classList.remove('bump'), 600);
    $('#modalHistory li').classList.add('new');
    $('#bidInput').value = '';
    toast('LANCE ACEITO', 'REDE ATUALIZADA');
    addActivity(`VOCÊ fez um lance no LOTE #${openLot.id}`, true);
  }

  /* ========== LIVE ACTIVITY ========== */
  const activityTemplates = [
    () => `USUÁRIO_${rand(100, 999)} fez um lance`,
    () => `USUÁRIO_${rand(100, 999)} entrou no LOTE #047`,
    () => `LOTE #014 recebeu um novo lance`,
    () => 'Um participante anônimo entrou na rede',
    () => `LOTE #039 visualizado por ${rand(3, 40)} nós`,
  ];

  function addActivity(text, hot = false) {
    const li = document.createElement('li');
    if (hot) li.className = 'hot';
    const d = new Date();
    li.innerHTML = `<time>${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}</time>`;
    li.append(text);
    const feed = $('#activityFeed');
    feed.prepend(li);
    while (feed.children.length > 8) feed.lastChild.remove();
  }

  function startActivityLoop() {
    const step = () => {
      addActivity(activityTemplates[rand(0, activityTemplates.length - 1)]());
      if (Math.random() < .25) { featured.bidders += 1; renderFeatured(); }
      setTimeout(step, rand(1800, 5000));
    };
    step();
  }

  function startNotificationLoop() {
    const messages = [['LOTE #047', 'está encerrando.', 'alert'], ['NOVO LANCE', 'Novo lance detectado.'], ['SEGURO', 'Conexão protegida.']];
    setInterval(() => { const m = messages[rand(0, 2)]; toast(...m); }, 25000);
  }

  /* ========== TERMINAL ========== */
  const commands = {
    status: () => 'REDE: ATIVA\nNÓS: 128\nLEILÕES ATIVOS: ' + lots.filter(l => l.state === 'live').length + '\nCRIPTOGRAFIA: ATIVA',
    varrer: () => 'Verificando nós...\n' + Array.from({ length: 4 }, () => `no-${rand(10, 99)}.shadow  latência ${rand(8, 90)}ms  OK`).join('\n') + '\nVerificação concluída. Nenhuma intrusão.',
    leiloes: () => lots.map(l => `#${pad(l.id).padStart(3, '0')} ${l.name.padEnd(14)} ${money(l.bid)}  [${statusOf(l).label}]`).join('\n'),
    rede: () => `CONEXÃO: ${rand(400, 900)} Mbps\nROTA: 7 saltos (mascarada)\nUSUÁRIOS CONECTADOS: ${$('#onlineUsers').textContent}`,
  };

  function runCommand(raw) {
    const out = $('#termOutput');
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === 'limpar') { out.innerHTML = ''; return; }
    const line = document.createElement('div');
    line.innerHTML = `<span class="cmd">$ </span>`;
    line.firstChild.append(cmd);
    const reply = document.createElement('div');
    if (commands[cmd]) reply.textContent = commands[cmd]();
    else { reply.className = 'warn'; reply.textContent = `Comando não encontrado: ${cmd}. Tente status, varrer, leiloes, rede ou limpar.`; }
    out.append(line, reply);
    out.scrollTop = out.scrollHeight;
  }

  function initTerminal() {
    $('#termForm').addEventListener('submit', e => { e.preventDefault(); runCommand($('#termInput').value); $('#termInput').value = ''; });
    $('.term-chips').addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b) runCommand(b.dataset.cmd); });
    runCommand('status');
  }

  /* ========== ANIMATIONS ========== */
  function animateCount(el) {
    const target = Number(el.dataset.count);
    const t0 = performance.now();
    const frame = t => {
      const p = Math.min(1, (t - t0) / 1200);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function initReveal() {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      $$('[data-count]', e.target).forEach(animateCount);
      io.unobserve(e.target);
    }), { threshold: .15 });
    $$('.reveal').forEach(el => io.observe(el));
  }

  function initCursorEffects() {
    const glow = $('.cursor-glow');
    const art = $('.parallax');
    window.addEventListener('pointermove', e => {
      glow.style.transform = `translate(${e.clientX - 160}px, ${e.clientY - 160}px)`;
      if (art) {
        const r = art.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        if (Math.abs(x) < 1 && Math.abs(y) < 1) art.firstElementChild.style.transform = `translate(${x * 24}px, ${y * 24}px) scale(1.08)`;
      }
    });
    // Magnetic buttons
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
    // Ripple
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height);
      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      btn.append(dot);
      setTimeout(() => dot.remove(), 600);
    });
  }

  function initParticles() {
    const canvas = $('#particles'), ctx = canvas.getContext('2d');
    let w, h;
    const resize = () => { w = canvas.width = innerWidth; h = canvas.height = innerHeight; };
    resize(); addEventListener('resize', resize);
    const dots = Array.from({ length: 45 }, () => ({ x: Math.random() * w, y: Math.random() * h, v: .1 + Math.random() * .3, r: Math.random() * 1.4 + .3 }));
    const draw = () => {
      if (!document.hidden) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(61,255,143,.35)';
        dots.forEach(d => { d.y -= d.v; if (d.y < 0) { d.y = h; d.x = Math.random() * w; } ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.3); ctx.fill(); });
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  function initActivityChart() {
    const line = $('#activityChart polyline');
    const values = Array.from({ length: 30 }, () => rand(20, 60));
    const paint = () => line.setAttribute('points', values.map((v, i) => `${i * 10.3},${80 - v}`).join(' '));
    paint();
    setInterval(() => { values.shift(); values.push(rand(15, 70)); paint(); }, 1200);
  }

  function initOnlineUsers() {
    let users = rand(120, 140);
    const el = $('#onlineUsers');
    el.textContent = users;
    setInterval(() => { users = Math.max(90, users + rand(-3, 3)); el.textContent = users; }, 3000);
  }

  /* ========== RESPONSIVE MENU ========== */
  function initMenu() {
    const toggle = $('#menuToggle'), nav = $('#mainNav');
    toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', nav.classList.toggle('open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
  }

  /* ========== INTRO ========== */
  function runIntro() {
    const steps = ['CONEXÃO CRIPTOGRAFADA', 'VERIFICANDO NÓ', 'ACESSO AUTORIZADO'];
    const log = $('#introLog'), fill = $('#loadFill'), btn = $('#enterBtn');
    let entered = false;
    const enter = () => {
      if (entered) return; entered = true;
      const intro = $('#intro');
      $('.logo', intro).classList.add('glitching');
      intro.classList.add('leaving');
      $('#app').hidden = false;
      setTimeout(() => { intro.remove(); initReveal(); toast('SEGURO', 'Conexão protegida.'); }, 750);
    };
    steps.forEach((text, i) => setTimeout(() => {
      log.insertAdjacentHTML('beforeend', `<li>${text}</li>`);
      fill.style.width = ((i + 1) / steps.length) * 100 + '%';
      if (i === steps.length - 1) { btn.hidden = false; setTimeout(enter, 2500); }
    }, 700 * (i + 1)));
    btn.addEventListener('click', enter);
  }

  /* ========== INIT ========== */
  function init() {
    renderGrid(); renderFeatured(); renderWatchlist();
    tickCountdowns(); setInterval(tickCountdowns, 1000);
    // Delegated events for cards, modal triggers and favorites
    document.addEventListener('click', e => {
      const fav = e.target.closest('[data-fav]');
      if (fav) return toggleWatch(Number(fav.dataset.fav));
      const opener = e.target.closest('[data-open], .lot-card, .watch-list li[data-id]');
      if (opener) return openModal(opener.dataset.open || opener.dataset.id);
      if (e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
    $('#lotGrid').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.lot-card')) openModal(e.target.dataset.id); });
    $('#bidForm').addEventListener('submit', placeBid);
    initTerminal(); initMenu(); initCursorEffects(); initParticles();
    initActivityChart(); initOnlineUsers(); startActivityLoop(); startNotificationLoop();
    runIntro();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
