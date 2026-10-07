/* birdly – bemutató prototípus
 * Minden adat helyben (localStorage) él, nincs szerver. A "Bemutató mód"
 * (Profil fül) segítségével előre lehet tekerni az időt, így látszik
 * a képek szélének befeketedése és a madarak pihenése is.
 */
(() => {
  const S = 1000, M = 60 * S, H = 60 * M;
  const POST_LIFE = 24 * H;   // ennyi ideig látható egy kép
  const FADE_START = 20 * H;  // innentől feketedik a széle
  const EGG_TIME = 72 * H;    // tojás keltetési ideje
  const EGG_SLOTS = 2;
  const STORE_KEY = 'birdly-demo-v1';

  // ---------- Madárfajok (a lista később bővül) ----------
  const SPECIES = {
    galamb:   { name: 'Galamb',   emoji: '🕊️', delivery: 1 * H,  rest: 23 * H, rarity: 'Gyakori',  bg: '#E4E8DD', weight: 40, desc: 'Megbízható postás. Lassú, de hamar újra bevethető.' },
    sas:      { name: 'Sas',      emoji: '🦅', delivery: 15 * M, rest: 24 * H, rarity: 'Ritka',    bg: '#F3DEC5', weight: 20, desc: 'Erős szárnyú, gyors és kiegyensúlyozott.' },
    solyom:   { name: 'Sólyom',   emoji: '🐦', delivery: 1 * M,  rest: 32 * H, rarity: 'Epikus',   bg: '#D6D0C4', weight: 6,  desc: 'Villámgyors kézbesítés, de sokat kell pihennie.' },
    bagoly:   { name: 'Bagoly',   emoji: '🦉', delivery: 3 * H,  rest: 12 * H, rarity: 'Ritka',    bg: '#E0D6EA', weight: 12, desc: 'Éjszakai futár – lassú, de gyorsan kipiheni magát.', example: true },
    papagaj:  { name: 'Papagáj',  emoji: '🦜', delivery: 30 * M, rest: 20 * H, rarity: 'Ritka',    bg: '#D4EBD8', weight: 12, desc: 'Fecsegő, színes kézbesítő.', example: true },
    hattyu:   { name: 'Hattyú',   emoji: '🦢', delivery: 2 * H,  rest: 16 * H, rarity: 'Epikus',   bg: '#E3EEF4', weight: 4,  desc: 'Elegáns és kitartó.', example: true },
    flamingo: { name: 'Flamingó', emoji: '🦩', delivery: 45 * M, rest: 22 * H, rarity: 'Epikus',   bg: '#F8DCE3', weight: 4,  desc: 'Rózsaszín stílusikon.', example: true },
    pava:     { name: 'Páva',     emoji: '🦚', delivery: 5 * M,  rest: 18 * H, rarity: 'Legendás', bg: '#D3E7E3', weight: 2,  desc: 'Ritka és pompás – gyors és keveset pihen.', example: true },
  };
  const BIRD_NAMES = ['Csőrike', 'Tollas Tibi', 'Szellő', 'Fütyi', 'Pihe', 'Röppentyű', 'Kapitány', 'Bogyó', 'Szárnyas Sári', 'Nyílvessző'];

  const FRIENDS = {
    anna:   { name: 'Anna',   color: '#FFD3A8' },
    bence:  { name: 'Bence',  color: '#CFE0BE' },
    csilla: { name: 'Csilla', color: '#F5C9C9' },
    dani:   { name: 'Dani',   color: '#C9DCF2' },
    emese:  { name: 'Emese',  color: '#E8D5F2' },
    flora:  { name: 'Flóra',  color: '#F7E7A8' },
  };

  // Bemutató "fotók" – valódi képek helyett színátmenet + emoji
  const SCENES = [
    { e: '🌅', bg: 'linear-gradient(160deg,#FFB476,#F2954B 45%,#6B4E7A)' },
    { e: '🚲', bg: 'linear-gradient(160deg,#CFE0BE,#7FA36A)' },
    { e: '🍝', bg: 'linear-gradient(160deg,#FFE2C6,#E8A56F)' },
    { e: '🎸', bg: 'linear-gradient(160deg,#3B2B4F,#121410)' },
    { e: '🏔️', bg: 'linear-gradient(180deg,#BFD8EE,#6E8BA6 60%,#2F3D24)' },
    { e: '🐶', bg: 'linear-gradient(160deg,#F7E7A8,#E5B85C)' },
    { e: '🌊', bg: 'linear-gradient(180deg,#9ED3E6,#2C6E8F)' },
    { e: '🎂', bg: 'linear-gradient(160deg,#F8DCE3,#E59AAE)' },
  ];

  // ---------- Állapot ----------
  let state = load() || seed();
  const now = () => Date.now() + state.offset;

  function seed() {
    const t = Date.now();
    let id = 1;
    return {
      offset: 0,
      birds: [
        { id: id++, sp: 'galamb', name: 'Postás Pali', sentAt: null },
        { id: id++, sp: 'galamb', name: 'Gizi',        sentAt: t - 20 * M },
        { id: id++, sp: 'sas',    name: 'Árpád',       sentAt: null },
        { id: id++, sp: 'solyom', name: 'Villám',      sentAt: t - 10 * H },
      ],
      eggs: [{ id: id++, startedAt: t - 50 * H }],
      discovered: ['galamb', 'sas', 'solyom'],
      posts: [
        { id: id++, from: 'anna',   sp: 'sas',    arriveAt: t - 1 * H,               scene: 0, caption: 'Reggeli kávé a Balatonnál ☕', liked: false },
        { id: id++, from: 'bence',  sp: 'galamb', arriveAt: t - 6 * H,               scene: 1, caption: 'Megjött az új bringa! 🚲', liked: true },
        { id: id++, from: 'csilla', sp: 'solyom', arriveAt: t - 14 * H,              scene: 2, caption: 'Ma ezt főztem, ki kér? 🍝', liked: false },
        { id: id++, from: 'dani',   sp: 'galamb', arriveAt: t - (20 * H + 40 * M),   scene: 3, caption: 'Tegnap esti koncert 🎸', liked: false },
        { id: id++, from: 'emese',  sp: 'sas',    arriveAt: t - (23 * H + 15 * M),   scene: 4, caption: 'Csúcson vagyunk! 🏔️', liked: true },
        // még úton lévő képek
        { id: id++, from: 'dani',   sp: 'sas',    arriveAt: t + 8 * M,               scene: 5, caption: 'Bemutatom az új kutyusunkat! 🐶', liked: false },
        { id: id++, from: 'flora',  sp: 'galamb', arriveAt: t + 35 * M,              scene: 6, caption: 'Tengerpart 🌊', liked: false },
      ],
      sent: [],
      nextId: id,
    };
  }
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* demo: nem baj */ } }

  // ---------- Segédfüggvények ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtDur(ms) {
    ms = Math.max(0, ms);
    const h = Math.floor(ms / H), m = Math.floor((ms % H) / M), s = Math.floor((ms % M) / S);
    if (h > 0) return `${h} ó ${m} p`;
    if (m > 0) return `${m} p ${s} mp`;
    return `${s} mp`;
  }
  function fmtSpan(ms) {
    if (ms >= H) return `${ms / H} óra`;
    return `${ms / M} perc`;
  }
  function ago(ms) {
    if (ms < M) return 'épp most';
    if (ms < H) return `${Math.floor(ms / M)} perce`;
    return `${Math.floor(ms / H)} órája`;
  }

  function birdState(b) {
    const sp = SPECIES[b.sp];
    if (b.sentAt == null) return { key: 'free' };
    const arrive = b.sentAt + sp.delivery, ready = arrive + sp.rest, t = now();
    if (t < arrive) return { key: 'flying', from: b.sentAt, until: arrive };
    if (t < ready) return { key: 'rest', from: arrive, until: ready };
    return { key: 'free' };
  }
  const eggReady = (e) => now() >= e.startedAt + EGG_TIME;
  const visiblePosts = () => state.posts
    .filter((p) => now() >= p.arriveAt && now() < p.arriveAt + POST_LIFE)
    .sort((a, b) => b.arriveAt - a.arriveAt);
  const incomingPosts = () => state.posts.filter((p) => now() < p.arriveAt).sort((a, b) => a.arriveAt - b.arriveAt);

  function photoHtml(p) {
    if (p.img) return `<img src="${p.img}" alt="">`;
    const sc = SCENES[p.scene % SCENES.length];
    return `<span class="scene">${sc.e}</span>`;
  }
  const photoBg = (p) => (p.img ? '#000' : SCENES[p.scene % SCENES.length].bg);

  function burnStyle(age) {
    if (age < FADE_START) return 'box-shadow:none';
    const k = Math.min(1, (age - FADE_START) / (POST_LIFE - FADE_START));
    const blur = 30 + 70 * k, spread = 6 + 40 * k, a = 0.55 + 0.4 * k;
    return `box-shadow: inset 0 0 ${blur}px ${spread}px rgba(0,0,0,${a.toFixed(2)})`;
  }

  // ---------- Nézetek ----------
  let tab = 'feed';
  const view = $('#view');

  function render() {
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    view.innerHTML = tab === 'feed' ? feedView() : tab === 'aviary' ? aviaryView() : profileView();
    lastSig = signature();
    fillLive();
  }

  function feedView() {
    const inc = incomingPosts();
    const posts = visiblePosts();
    let html = '';
    if (inc.length) {
      html += `<div class="section-title"><h2>Úton feléd</h2><small>${inc.length} madár</small></div>
        <div class="incoming">${inc.map((p) => `
          <div class="incoming-item">
            <span class="bird">${SPECIES[p.sp].emoji}</span>
            <div><b>${FRIENDS[p.from].name}</b> képet küldött<small>${SPECIES[p.sp].name} · érkezik: <span data-until="${p.arriveAt}"></span></small></div>
          </div>`).join('')}
        </div>`;
    }
    html += `<div class="section-title"><h2>Üzenőfal</h2><small>24 óráig látható</small></div>`;
    if (!posts.length) {
      html += `<div class="empty-state"><div class="e">🪹</div><p>Most üres a falad.<br>Várd meg, míg a madarak megérkeznek!</p></div>`;
    }
    html += posts.map((p) => {
      const f = FRIENDS[p.from], sp = SPECIES[p.sp], age = now() - p.arriveAt;
      const fading = age >= FADE_START;
      return `
      <article class="post">
        <div class="post-head">
          <div class="avatar" style="background:${f.color}">${f.name[0]}</div>
          <div class="who"><b>${f.name}</b><small>${sp.name} hozta · ${ago(age)}</small></div>
          <span class="post-bird" title="${sp.name}">${sp.emoji}</span>
        </div>
        <div class="photo" style="background:${photoBg(p)}">
          ${photoHtml(p)}
          <div class="burn" data-burn="${p.arriveAt}" style="${burnStyle(age)}"></div>
        </div>
        <div class="post-foot">
          <p>${esc(p.caption)}</p>
          <div class="post-meta">
            <button class="like ${p.liked ? 'on' : ''}" data-action="like" data-id="${p.id}">${p.liked ? '❤️' : '🤍'} Tetszik</button>
            <span class="timeleft ${fading ? 'fading' : ''}" data-left="${p.arriveAt}">${fading ? '🔥 ' : '⏳ '}<span data-until="${p.arriveAt + POST_LIFE}"></span></span>
          </div>
        </div>
      </article>`;
    }).join('');
    return html;
  }

  function birdCard(b) {
    const sp = SPECIES[b.sp], st = birdState(b);
    let status;
    if (st.key === 'free') status = `<div class="status st-free"><span class="dot"></span>Bevethető</div>`;
    else if (st.key === 'flying') status = `<div class="status st-flying"><span class="dot"></span>Úton · kézbesít: <span data-until="${st.until}"></span></div>
        <div class="bar orange"><i data-from="${st.from}" data-to="${st.until}"></i></div>`;
    else status = `<div class="status st-rest"><span class="dot"></span>Pihen · még <span data-until="${st.until}"></span></div>
        <div class="bar"><i data-from="${st.from}" data-to="${st.until}"></i></div>`;
    return `
      <div class="bird-card">
        <div class="bird-pic" style="background:${sp.bg}">${sp.emoji}</div>
        <div>
          <h3>${esc(b.name)} <span class="rarity r-${rarityKey(sp.rarity)}">${sp.rarity}</span></h3>
          <div class="stats">
            <span class="stat">${sp.name}</span>
            <span class="stat">🚀 Kiszállítás: ${fmtSpan(sp.delivery)}</span>
            <span class="stat">😴 Pihenés: ${fmtSpan(sp.rest)}</span>
          </div>
          ${status}
        </div>
      </div>`;
  }
  const rarityKey = (r) => r.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function aviaryView() {
    const free = state.birds.filter((b) => birdState(b).key === 'free').length;
    let eggs = '';
    for (let i = 0; i < EGG_SLOTS; i++) {
      const e = state.eggs[i];
      if (!e) {
        eggs += `<div class="egg-slot empty"><span style="font-size:30px;opacity:.6">🪺</span><small>Üres fészek</small>
          <button class="btn btn-orange" data-action="new-egg">+ Tojás keltetése</button></div>`;
      } else if (eggReady(e)) {
        eggs += `<div class="egg-slot"><span class="egg ready">🥚</span><b>Kikelt!</b>
          <button class="btn btn-orange" data-action="hatch" data-id="${e.id}">Megnézem 🐣</button></div>`;
      } else {
        eggs += `<div class="egg-slot"><span class="egg">🥚</span><small>Kikelésig</small><b data-until="${e.startedAt + EGG_TIME}"></b>
          <div class="bar"><i data-from="${e.startedAt}" data-to="${e.startedAt + EGG_TIME}"></i></div>
          <button class="btn btn-ghost" data-action="rush-egg" data-id="${e.id}">⏩ Demo: kikeltetés most</button></div>`;
      }
    }
    return `
      <div class="section-title"><h2>Keltető</h2><small>72 óra / tojás</small></div>
      <div class="nest">
        <p>Minden tojás pontosan <b>72 óra</b> alatt kel ki – hogy milyen madár bújik elő, az meglepetés!</p>
        <div class="eggs">${eggs}</div>
      </div>

      <div class="section-title"><h2>Madaraid</h2><small>${free}/${state.birds.length} bevethető</small></div>
      ${state.birds.map(birdCard).join('')}

      <div class="section-title"><h2>Madárkatalógus</h2><small>${state.discovered.length}/${Object.keys(SPECIES).length} felfedezve</small></div>
      <div class="catalog">
        ${Object.entries(SPECIES).map(([k, sp]) => {
          const known = state.discovered.includes(k);
          return `<div class="cat-item ${known ? '' : 'locked'}" title="${known ? sp.desc : 'Még nem fedezted fel'}">
            <span class="e">${sp.emoji}</span>${known ? sp.name : '???'}</div>`;
        }).join('')}
      </div>
      <p style="color:var(--muted);font-size:12px;text-align:center;margin-top:12px">A madárlista folyamatosan bővül 🪶</p>`;
  }

  function profileView() {
    return `
      <div class="profile-card">
        <div class="avatar">🐦</div>
        <h2>Bemutató Profil</h2>
        <div class="handle">@birdly.demo</div>
        <div class="pstats">
          <div><b>${state.birds.length}</b><small>madár</small></div>
          <div><b>${state.sent.length}</b><small>elküldött kép</small></div>
          <div><b>${Object.keys(FRIENDS).length}</b><small>ismerős</small></div>
        </div>
      </div>

      <div class="section-title"><h2>Ismerősök</h2><small>${Object.keys(FRIENDS).length} fő</small></div>
      <div class="list">
        ${Object.entries(FRIENDS).map(([k, f]) => `
          <div class="list-row">
            <div class="avatar" style="background:${f.color}">${f.name[0]}</div>
            <div class="grow"><b>${f.name}</b><small>@${k}</small></div>
            <button class="btn btn-moss" data-action="send-to" data-id="${k}">📷 Küldés</button>
          </div>`).join('')}
      </div>

      <div class="section-title"><h2>Elküldött képeid</h2></div>
      ${state.sent.length ? `<div class="list">${state.sent.slice().reverse().map((s) => {
        const sp = SPECIES[s.sp], arrive = s.sentAt + sp.delivery;
        const status = now() < arrive ? `úton · <span data-until="${arrive}"></span>`
          : now() < arrive + POST_LIFE ? 'kézbesítve ✓' : 'eltűnt';
        return `<div class="list-row"><span style="font-size:26px">${sp.emoji}</span>
          <div class="grow"><b>${FRIENDS[s.to].name}</b> részére<small>${esc(s.bird)} · ${status}</small></div></div>`;
      }).join('')}</div>`
      : `<div class="empty-state" style="padding:10px"><p>Még nem küldtél képet. Nyomd meg a 📷 gombot!</p></div>`}

      <div class="section-title"><h2>Beállítások</h2></div>
      <div class="list">
        <div class="list-row"><span>🔔</span><div class="grow">Értesítések<small>Ha megérkezik egy madár</small></div><span>›</span></div>
        <div class="list-row"><span>🔒</span><div class="grow">Adatvédelem</div><span>›</span></div>
        <div class="list-row"><span>💌</span><div class="grow">Ismerős meghívása</div><span>›</span></div>
      </div>

      <div class="section-title"><h2>Bemutató mód</h2></div>
      <div class="demo-box">
        <p>Tekerd előre az időt, hogy lásd, hogyan feketedik be a képek széle 20 óra után, és hogyan pihennek a madarak.</p>
        <div class="clock">🕒 Szimulált idő: <span id="simClock"></span></div>
        <div class="row">
          <button class="btn btn-orange" data-action="ff" data-h="1">+1 óra</button>
          <button class="btn btn-orange" data-action="ff" data-h="4">+4 óra</button>
          <button class="btn btn-orange" data-action="ff" data-h="24">+24 óra</button>
          <button class="btn btn-ghost" data-action="ff-reset">Idő vissza</button>
          <button class="btn btn-ghost" data-action="reset">Demo adatok újratöltése</button>
        </div>
      </div>`;
  }

  // ---------- Élő frissítés (visszaszámlálók) ----------
  let lastSig = '';
  function signature() {
    return [
      state.birds.map((b) => birdState(b).key).join(),
      state.eggs.map(eggReady).join(),
      visiblePosts().map((p) => p.id + (now() - p.arriveAt >= FADE_START ? 'f' : '')).join(),
      incomingPosts().length,
      state.sent.map((s) => now() < s.sentAt + SPECIES[s.sp].delivery).join(),
    ].join('|');
  }
  function liveUpdate() {
    if (signature() !== lastSig) render();
    else fillLive();
  }
  function fillLive() {
    const t = now();
    view.querySelectorAll('[data-until]').forEach((el) => { el.textContent = fmtDur(+el.dataset.until - t); });
    view.querySelectorAll('[data-from]').forEach((el) => {
      const a = +el.dataset.from, b = +el.dataset.to;
      el.style.width = `${Math.min(100, Math.max(0, ((t - a) / (b - a)) * 100))}%`;
    });
    view.querySelectorAll('[data-burn]').forEach((el) => { el.setAttribute('style', burnStyle(t - +el.dataset.burn)); });
    const clock = $('#simClock');
    if (clock) {
      clock.textContent = new Date(t).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        + (state.offset ? ` (+${Math.round(state.offset / H)} ó)` : ' (valós)');
    }
  }

  // ---------- Küldés ----------
  let draft = null;
  function openSend(to) {
    const free = state.birds.find((b) => birdState(b).key === 'free');
    draft = { scene: Math.floor(Math.random() * SCENES.length), img: null, to: to || null, birdId: free ? free.id : null, caption: '' };
    renderSend();
  }
  function renderSend() {
    const birds = state.birds.slice().sort((a, b) => (birdState(a).key === 'free' ? 0 : 1) - (birdState(b).key === 'free' ? 0 : 1));
    openSheet(`
      <h2>Kép küldése 📷</h2>
      <div style="color:var(--muted);font-size:14px">Válassz képet, címzettet és egy pihent madarat.</div>

      <div class="label">1. Kép</div>
      <div class="pick-photos">
        <label class="pick-photo upload ${draft.img ? 'sel' : ''}">
          ${draft.img ? `<img src="${draft.img}" alt="">` : '📁<br>Saját kép'}
          <input type="file" accept="image/*" id="uploadInput">
        </label>
        ${SCENES.slice(0, 7).map((s, i) => `<button class="pick-photo ${!draft.img && draft.scene === i ? 'sel' : ''}" style="background:${s.bg}" data-action="pick-scene" data-id="${i}">${s.e}</button>`).join('')}
      </div>

      <div class="label">2. Felirat</div>
      <input class="caption" id="captionInput" maxlength="120" placeholder="Írj valamit a képhez…" value="${esc(draft.caption)}">

      <div class="label">3. Kinek?</div>
      <div class="chips">
        ${Object.entries(FRIENDS).map(([k, f]) => `<button class="chip ${draft.to === k ? 'sel' : ''}" data-action="pick-friend" data-id="${k}">${f.name}</button>`).join('')}
      </div>

      <div class="label">4. Melyik madár vigye?</div>
      <div class="pick-birds">
        ${birds.map((b) => {
          const sp = SPECIES[b.sp], st = birdState(b), ok = st.key === 'free';
          const sub = ok ? `Kézbesítés: ${fmtSpan(sp.delivery)} · utána ${fmtSpan(sp.rest)} pihenő`
            : st.key === 'flying' ? `Úton van – visszaér: ${fmtDur(st.until - now() + sp.rest)}` : `Pihen még ${fmtDur(st.until - now())}`;
          return `<button class="pick-bird ${draft.birdId === b.id ? 'sel' : ''}" ${ok ? '' : 'disabled'} data-action="pick-bird" data-id="${b.id}">
            <span class="e">${sp.emoji}</span><span class="grow"><b>${esc(b.name)}</b> · ${sp.name}<small>${sub}</small></span>${ok ? '✅' : '😴'}</button>`;
        }).join('')}
      </div>

      <div style="margin-top:20px;display:flex;gap:10px">
        <button class="btn btn-line" data-action="close">Mégse</button>
        <button class="btn btn-moss btn-block" data-action="do-send" ${draft.to && draft.birdId ? '' : 'disabled'}>Elküldés 🪶</button>
      </div>`);
    $('#uploadInput').addEventListener('change', onUpload);
    $('#captionInput').addEventListener('input', (e) => { draft.caption = e.target.value; });
  }
  function onUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      // kicsinyítés, hogy a localStorage-ba beférjen
      const max = 720, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      draft.img = c.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(img.src);
      renderSend();
    };
    img.src = URL.createObjectURL(file);
  }
  function doSend() {
    const b = state.birds.find((x) => x.id === draft.birdId);
    if (!b || birdState(b).key !== 'free' || !draft.to) return;
    const sp = SPECIES[b.sp];
    b.sentAt = now();
    state.sent.push({ id: state.nextId++, to: draft.to, sp: b.sp, bird: b.name, sentAt: b.sentAt, caption: draft.caption, scene: draft.scene, img: draft.img });
    save();
    const to = FRIENDS[draft.to].name;
    closeSheet();
    toast(`${sp.emoji} ${b.name} elindult ${to} felé – ${fmtSpan(sp.delivery)} múlva kézbesít!`);
    render();
  }

  // ---------- Tojások ----------
  function newEgg() {
    if (state.eggs.length >= EGG_SLOTS) return;
    state.eggs.push({ id: state.nextId++, startedAt: now() });
    save(); render();
    toast('🥚 Új tojás a fészekben – 72 óra múlva kikel!');
  }
  function hatch(id) {
    const e = state.eggs.find((x) => x.id === id);
    if (!e || !eggReady(e)) return;
    const pool = Object.entries(SPECIES);
    let r = Math.random() * pool.reduce((s, [, sp]) => s + sp.weight, 0);
    let key = pool[0][0];
    for (const [k, sp] of pool) { r -= sp.weight; if (r <= 0) { key = k; break; } }
    const isNew = !state.discovered.includes(key);
    if (isNew) state.discovered.push(key);
    const name = BIRD_NAMES[Math.floor(Math.random() * BIRD_NAMES.length)];
    state.birds.push({ id: state.nextId++, sp: key, name, sentAt: null });
    state.eggs = state.eggs.filter((x) => x.id !== id);
    save(); render();
    const sp = SPECIES[key];
    openSheet(`
      <div class="reveal">
        <span class="big">${sp.emoji}</span>
        <h2 style="color:var(--moss)">${sp.name}!</h2>
        <span class="rarity r-${rarityKey(sp.rarity)}">${sp.rarity}</span> ${isNew ? '<span class="rarity r-legendas">ÚJ FAJ</span>' : ''}
        <p>${sp.desc}</p>
        <div class="stats" style="justify-content:center">
          <span class="stat">🚀 Kiszállítás: ${fmtSpan(sp.delivery)}</span>
          <span class="stat">😴 Pihenés: ${fmtSpan(sp.rest)}</span>
        </div>
        <p>A neve: <b>${name}</b> – már a madárházadban vár.</p>
        <button class="btn btn-moss btn-block" data-action="close">Szuper! 🎉</button>
      </div>`);
  }

  // ---------- Sheet & toast ----------
  function openSheet(html) {
    $('#sheetBody').innerHTML = `<div class="grab"></div>${html}`;
    $('#sheet').hidden = false;
  }
  function closeSheet() { $('#sheet').hidden = true; draft = null; }
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  // ---------- Események ----------
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tabbar button');
    if (tabBtn) { tab = tabBtn.dataset.tab; render(); view.scrollTop = 0; return; }
    if (e.target.id === 'sheet') { closeSheet(); return; }

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.action) {
      case 'like': {
        const p = state.posts.find((x) => x.id === +id);
        p.liked = !p.liked; save(); render(); break;
      }
      case 'new-egg': newEgg(); break;
      case 'hatch': hatch(+id); break;
      case 'rush-egg': {
        const egg = state.eggs.find((x) => x.id === +id);
        egg.startedAt = now() - EGG_TIME; save(); render(); break;
      }
      case 'send-to': openSend(id); break;
      case 'pick-scene': draft.scene = +id; draft.img = null; renderSend(); break;
      case 'pick-friend': draft.to = id; renderSend(); break;
      case 'pick-bird': draft.birdId = +id; renderSend(); break;
      case 'do-send': doSend(); break;
      case 'close': closeSheet(); break;
      case 'ff': state.offset += +el.dataset.h * H; save(); render(); toast(`⏩ +${el.dataset.h} óra előretekerve`); break;
      case 'ff-reset': state.offset = 0; save(); render(); break;
      case 'reset': state = seed(); save(); render(); toast('🔄 Demo adatok visszaállítva'); break;
    }
  });
  $('#sendBtn').addEventListener('click', () => openSend());

  render();
  liveUpdate();
  setInterval(liveUpdate, 1000);
})();
