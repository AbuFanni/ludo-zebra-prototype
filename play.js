/* Ludo Zebra – live game for the prototype (#play).
   Starts from the setup choices: the players in their order, their colours and the level.
   The board follows SRS Table 4 for that level; special squares are drawn again in every game (FR-10).
   Rules are simplified: this is still a throwaway prototype, not the Java game. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const COLORS = ['red', 'green', 'yellow', 'blue'];
  const CNAME = { red: 'אדום', green: 'ירוק', yellow: 'צהוב', blue: 'כחול' };
  const LEVELS = {
    easy: { R: 0, he: 'קל', cell: 38, boost: null, q: 0, s: 0 },
    medium: { R: 1, he: 'בינוני', cell: 33, boost: { name: 'Boost', max: 3 }, q: 6, s: 2 },
    hard: { R: 2, he: 'קשה', cell: 30, boost: { name: 'UltraBoost', max: 6 }, q: 9, s: 3 },
  };
  const QLV = { easy: 'קלה', med: 'בינונית', hard: 'קשה' };
  const QSTEP = { easy: 1, med: 2, hard: 3 };
  const LET = ['א', 'ב', 'ג', 'ד'];
  const steps = (n) => (n === 1 ? 'צעד אחד' : n + ' צעדים');
  const BANK = {
    easy: [
      { t: 'מה מתאר User Story?', a: ['תכונה מנקודת המבט של המשתמש', 'דוח תקלות', 'קטע קוד', 'תרשים מחלקות'], r: 0 },
      { t: 'מה התפקיד של ה-Product Owner?', a: ['כותב את כל הקוד', 'קובע עדיפויות ומאשר את העבודה', 'מתקין את השרת', 'בודק רק עיצוב'], r: 1 },
      { t: 'מה מסמך ה-SRS מגדיר?', a: ['את לוח הזמנים', 'את התקציב', 'מה המערכת צריכה לעשות', 'איך לכתוב את הקוד'], r: 2 },
    ],
    med: [
      { t: 'איזו תבנית עיצוב מעדכנת את ה-View כשה-Model משתנה?', a: ['Singleton', 'Observer', 'Factory Method', 'Decorator'], r: 1 },
      { t: 'מהי הגדרת Done?', a: ['רשימת התקלות הפתוחות', 'תאריך ההגשה', 'התנאים שמשימה חייבת לעמוד בהם כדי להיחשב גמורה', 'שם הענף ב-Git'], r: 2 },
      { t: 'מה ההבדל בין אימות (Verification) לתיקוף (Validation)?', a: ['אימות: בנינו נכון; תיקוף: בנינו את המוצר הנכון', 'אין הבדל', 'אימות נעשה רק אצל הלקוח', 'תיקוף בודק רק את הקוד'], r: 0 },
    ],
    hard: [
      { t: 'ב-Inspection, מי מציג את החומר?', a: ['הכותב', 'הלקוח', 'חבר צוות שאינו הכותב', 'המנחה'], r: 2 },
      { t: 'באיזה שלב הכי זול לתקן תקלה?', a: ['בשלב הדרישות', 'בבדיקות מערכת', 'אצל הלקוח', 'באינטגרציה'], r: 0 },
      { t: 'מה המטרה של בדיקת רגרסיה?', a: ['לתכנן מסד נתונים', 'להחליף את בדיקות היחידה', 'לתעד דרישות', 'לוודא ששינוי לא שבר יכולת קיימת'], r: 3 },
    ],
  };
  const EVENTS = [ // FR-44
    { p: 10, k: 'home', he: 'קפיצה ישירה לבית הסיום!' },
    { p: 10, k: 'rival', he: 'הזזת כלי של יריב אחורה' },
    { p: 10, k: 'castle', he: 'הכלי חוזר לטירה' },
    { p: 30, k: 'back3', he: 'הכלי חוזר 3 צעדים' },
    { p: 30, k: 'skip', he: 'הפסד התור הבא' },
    { p: 10, k: 'ultra', he: 'הטלת UltraBoost מיוחדת' },
  ];

  /* ---------- geometry (15×15 classic board, plus one outer ring per level step) ---------- */
  const key = (p) => p[0] + ',' + p[1];
  const CLASSIC = (() => {
    const a = [];
    for (let c = 1; c <= 5; c++) a.push([6, c]);
    for (let r = 5; r >= 0; r--) a.push([r, 6]);
    a.push([0, 7], [0, 8]);
    for (let r = 1; r <= 5; r++) a.push([r, 8]);
    for (let c = 9; c <= 14; c++) a.push([6, c]);
    a.push([7, 14], [8, 14]);
    for (let c = 13; c >= 9; c--) a.push([8, c]);
    for (let r = 9; r <= 14; r++) a.push([r, 8]);
    a.push([14, 7], [14, 6]);
    for (let r = 13; r >= 9; r--) a.push([r, 6]);
    for (let c = 5; c >= 0; c--) a.push([8, c]);
    a.push([7, 0], [6, 0]);
    return a; // 52 squares, clockwise from red's start
  })();
  const CLASSIC_START = { red: 0, green: 13, yellow: 26, blue: 39 };
  const LANE_ENTRY = { red: 50, green: 11, yellow: 24, blue: 37 };
  const LANE = {
    red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  };
  const DIR = { red: '→', green: '↓', yellow: '←', blue: '↑' };
  function ring(G, j) {
    const a = [], lo = j, hi = G - 1 - j;
    for (let c = lo; c <= hi; c++) a.push([lo, c]);
    for (let r = lo + 1; r <= hi; r++) a.push([r, hi]);
    for (let c = hi - 1; c >= lo; c--) a.push([hi, c]);
    for (let r = hi - 1; r > lo; r--) a.push([r, lo]);
    return a;
  }
  const corner = (c, G) => ({ red: [0, 0], green: [0, G - 1], yellow: [G - 1, G - 1], blue: [G - 1, 0] }[c]);
  function arrowCell(c, G, j) {
    const m = (G - 1) / 2;
    return { red: [m, j], green: [j, m], yellow: [m, G - 1 - j], blue: [G - 1 - j, m] }[c];
  }
  function buildPath(color, G, R) {
    const cl = CLASSIC.map(([r, c]) => [r + R, c + R]);
    const path = [];
    if (R === 0) {
      const s = CLASSIC_START[color];
      for (let i = 0; i <= 50; i++) path.push(cl[(s + i) % 52]);
    } else {
      const r0 = ring(G, 0), a0 = key(arrowCell(color, G, 0));
      const s0 = r0.findIndex((p) => key(p) === key(corner(color, G)));
      for (let i = 0; ; i++) { const p = r0[(s0 + i) % r0.length]; path.push(p); if (key(p) === a0) break; }
      for (let j = 1; j < R; j++) {
        const rj = ring(G, j), aj = rj.findIndex((p) => key(p) === key(arrowCell(color, G, j)));
        for (let i = 0; i <= rj.length; i++) path.push(rj[(aj + i) % rj.length]);
      }
      const e = LANE_ENTRY[color];
      for (let i = 0; i <= 52; i++) path.push(cl[(e + i) % 52]);
    }
    return path.concat(LANE[color].map(([r, c]) => [r + R, c + R]), [[7 + R, 7 + R]]);
  }
  function cellKind(r, c, G, R) {
    if (Math.min(r, c, G - 1 - r, G - 1 - c) < R) return 'track';
    const ir = r - R, ic = c - R, mid = (x) => x >= 6 && x <= 8;
    if (!mid(ir) && !mid(ic)) return 'castle';
    if (mid(ir) && mid(ic)) return 'center';
    if (ir === 7 && ic >= 1 && ic <= 5) return 'lane-red';
    if (ic === 7 && ir >= 1 && ir <= 5) return 'lane-green';
    if (ir === 7 && ic >= 9 && ic <= 13) return 'lane-yellow';
    if (ic === 7 && ir >= 9 && ir <= 13) return 'lane-blue';
    return 'track';
  }
  function buildSpecials(G, R, lv) {
    const sp = {};
    const cl = CLASSIC.map(([r, c]) => [r + R, c + R]);
    COLORS.forEach((c) => { sp[key(R === 0 ? cl[CLASSIC_START[c]] : corner(c, G))] = { t: 'start', c }; });
    COLORS.forEach((c) => {
      for (let j = 0; j < R; j++) sp[key(arrowCell(c, G, j))] = { t: 'arrow', c };
      sp[key(cl[LANE_ENTRY[c]])] = { t: 'arrow', c };
    });
    [8, 21, 34, 47].forEach((i) => { sp[key(cl[i])] = { t: 'star' }; });
    for (let j = 0; j < R; j++) { const rj = ring(G, j), q = rj.length / 4; [2, 2 + q, 2 + 2 * q, 2 + 3 * q].forEach((i) => { sp[key(rj[i])] = { t: 'star' }; }); }
    // question and surprise squares: random free squares of the shared track (FR-10, FR-11)
    const free = [];
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (cellKind(r, c, G, R) === 'track' && !sp[r + ',' + c]) free.push([r, c]);
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    const per = lv.q / 3;
    ['easy', 'med', 'hard'].forEach((l) => { for (let n = 0; n < per; n++) sp[key(free.pop())] = { t: 'q', lv: l }; });
    for (let n = 0; n < lv.s; n++) sp[key(free.pop())] = { t: 'surprise' };
    return sp;
  }

  /* ---------- state ---------- */
  let S = null, clock = null, busy = null;
  const phoneMQ = window.matchMedia('(max-width: 760px)');
  function cellPx() { // desktop: the level's fixed size; phone: fit the board to the screen width
    if (!phoneMQ.matches) return S.lv.cell;
    const w = document.documentElement.clientWidth || window.innerWidth;
    return Math.max(12, Math.floor((w - 16 - 6) / S.G));
  }
  function sizeBoard() { if (S) $('#pboard').style.setProperty('--cell', cellPx() + 'px'); }
  window.addEventListener('resize', sizeBoard);
  const cells = {}, yards = {};
  let centerTray = null;
  const shared = () => window.LZShared || {};
  const cur = () => S.players[S.turn];

  function loadSetup() {
    let st = null;
    try { st = JSON.parse(sessionStorage.getItem('lz-setup') || 'null'); } catch (e) { /* private mode */ }
    if (!st || !st.players || !st.players.length) {
      st = { level: 'medium', players: [{ name: 'דנה', color: 'red' }, { name: 'עומר', color: 'green' }, { name: 'נועה', color: 'yellow' }, { name: 'יוסי', color: 'blue' }] };
    }
    return st;
  }

  function enter() {
    leave();
    const st = loadSetup();
    const lv = LEVELS[st.level] || LEVELS.medium;
    const G = 15 + 2 * lv.R;
    S = {
      lv, levelKey: st.level in LEVELS ? st.level : 'medium', G, R: lv.R, turn: 0, phase: 'roll', sixes: 0, dice: null, opts: [],
      ultraNext: false, noExtra: false, places: [], log: [], secs: 0,
      used: { easy: [], med: [], hard: [] },
      players: st.players.map((p) => ({ name: p.name.trim(), color: p.color, path: buildPath(p.color, G, lv.R), pieces: [-1, -1, -1, -1], skip: false, done: false })),
    };
    S.sp = buildSpecials(G, lv.R, lv);
    $('#play-level').textContent = 'רמה: ' + lv.he;
    $('#play-level').dataset.short = lv.he; // the phone bar shows only the level name
    $('#play-clock').textContent = '00:00:00';
    clock = setInterval(() => { S.secs += 1; $('#play-clock').textContent = fmt(S.secs); }, 1000);
    buildBoard();
    buildDemo();
    say('המשחק מתחיל. ' + cur().name + ' ראשון בתור: לחצו "הטל קוביות".');
    render();
  }
  function leave() { if (clock) clearInterval(clock); clock = null; if (busy) clearTimeout(busy); busy = null; }
  const fmt = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, '0')).join(':');

  /* ---------- board ---------- */
  function buildBoard() {
    const { G, R, sp } = S, b = $('#pboard'), sh = shared();
    b.innerHTML = '';
    b.style.setProperty('--cell', cellPx() + 'px');
    b.style.gridTemplateColumns = 'repeat(' + G + ', var(--cell))';
    b.style.gridTemplateRows = 'repeat(' + G + ', var(--cell))';
    Object.keys(cells).forEach((k) => delete cells[k]);
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        const k = cellKind(r, c, G, R);
        if (k === 'castle' || k === 'center') continue;
        const d = document.createElement('div');
        d.className = 'cell' + (k.indexOf('lane') === 0 ? ' ' + k : '');
        d.style.gridRow = String(r + 1); d.style.gridColumn = String(c + 1);
        const s = sp[r + ',' + c];
        if (s) {
          if (s.t === 'start') { d.classList.add('start', s.c); d.innerHTML = '<span class="sym">#</span>'; d.title = 'משבצת התחלה'; }
          else if (s.t === 'arrow') { d.classList.add('arrow'); d.innerHTML = sh.arrowSvg ? sh.arrowSvg(sh.ARROW_INK[s.c], DIR[s.c]) : DIR[s.c]; d.title = 'משבצת חץ'; }
          else if (s.t === 'star') { d.classList.add('star'); d.innerHTML = sh.STAR_SVG || '★'; d.title = 'משבצת הגנה'; }
          else if (s.t === 'q') { d.classList.add('q-' + s.lv); d.innerHTML = '<span class="sym">?</span>'; d.title = 'משבצת שאלה ' + QLV[s.lv]; }
          else if (s.t === 'surprise') { d.classList.add('surprise'); d.innerHTML = '<span class="sym">!</span>'; d.title = 'משבצת הפתעה'; }
        }
        cells[r + ',' + c] = d;
        b.appendChild(d);
      }
    }
    const active = new Set(S.players.map((p) => p.color));
    [['red', 0, 0], ['green', 0, 9], ['blue', 9, 0], ['yellow', 9, 9]].forEach(([c, r0, c0]) => {
      const d = document.createElement('div');
      d.className = 'castle ' + c + (active.has(c) ? '' : ' idle');
      d.style.gridRow = (R + r0 + 1) + ' / span 6'; d.style.gridColumn = (R + c0 + 1) + ' / span 6';
      d.title = active.has(c) ? 'הטירה של ' + S.players.find((p) => p.color === c).name : 'צבע שלא משתתף במשחק';
      const y = document.createElement('div'); y.className = 'yard';
      for (let i = 0; i < 4; i++) { const s = document.createElement('div'); s.className = 'slot'; y.appendChild(s); }
      d.appendChild(y); b.appendChild(d); yards[c] = y;
    });
    const ce = document.createElement('div');
    ce.className = 'center'; ce.style.gridRow = (R + 7) + ' / span 3'; ce.style.gridColumn = (R + 7) + ' / span 3'; ce.title = 'בית הסיום';
    centerTray = document.createElement('div'); centerTray.className = 'done-tray'; ce.appendChild(centerTray);
    b.appendChild(ce);
    $('#play-legend').innerHTML =
      '<span><i class="mini">' + (sh.STAR_SVG || '★') + '</i>הגנה</span><span><i class="mini" style="background:#1C2330;color:#fff">#</i>התחלה</span>' +
      '<span><i class="mini">' + (sh.arrowSvg ? sh.arrowSvg(sh.ARROW_INK.red, '→') : '→') + '</i>חץ: הכלי בצבע הזה נכנס פנימה</span>' +
      (S.lv.q ? '<span><i class="mini" style="background:var(--q-easy-l);color:var(--q-easy)">?</i><i class="mini" style="background:var(--q-med-l);color:var(--q-med)">?</i><i class="mini" style="background:var(--q-hard-l);color:var(--q-hard)">?</i>שאלה קלה / בינונית / קשה</span>' +
        '<span><i class="mini" style="background:var(--surprise);color:#fff;border-color:#6C2E86">!</i>הפתעה</span>' : '');
  }
  function mkPiece(color, pi, i) {
    const p = document.createElement('div');
    p.className = 'piece ' + color; p.dataset.p = pi; p.dataset.i = i;
    p.innerHTML = shared().PAWN_SVG || '';
    return p;
  }
  function renderPieces() {
    $$('#pboard .piece').forEach((p) => p.remove());
    S.players.forEach((pl, pi) => {
      const slots = $$('.slot', yards[pl.color]); let k = 0;
      pl.pieces.forEach((pos, i) => {
        const el = mkPiece(pl.color, pi, i);
        el.title = 'כלי של ' + pl.name;
        if (pos === -1) slots[k++].appendChild(el);
        else if (pos >= pl.path.length - 1) { el.classList.add('done'); centerTray.appendChild(el); }
        else cells[key(pl.path[pos])].appendChild(el);
        if (S.phase === 'pick' && pi === S.turn && S.opts.some((o) => o.i === i)) {
          el.classList.add('pick'); el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'הזזת הכלי של ' + pl.name);
        }
      });
    });
    Object.values(cells).forEach((c) => {
      const ps = $$('.piece', c);
      if (ps.length > 1) ps.forEach((p, j) => { p.style.transform = 'translate(' + ((j - (ps.length - 1) / 2) * 30) + '%, ' + (j % 2 ? 8 : -8) + '%) scale(.78)'; });
    });
  }

  /* ---------- side panels ---------- */
  function die(n, cls) {
    if (n == null) return '<div class="pdie blank ' + (cls || '') + '">?</div>';
    const pos = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [1, 3], [3, 1], [3, 3]],
      5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]], 6: [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]] }[n];
    return '<div class="pdie ' + (cls || '') + '" aria-label="' + n + '">' + pos.map(([r, c]) => '<span class="pip" style="grid-row:' + r + ';grid-column:' + c + '"></span>').join('') + '</div>';
  }
  function panel(color) {
    const pi = S.players.findIndex((p) => p.color === color);
    if (pi < 0) return '<div class="pp empty" aria-hidden="true"></div>';
    const pl = S.players[pi], now = pi === S.turn && S.phase !== 'over';
    const inCastle = pl.pieces.filter((x) => x === -1).length;
    const home = pl.pieces.filter((x) => x >= pl.path.length - 1).length;
    const onBoard = 4 - inCastle - home;
    const place = S.places.indexOf(pi);
    let body = '<div class="pp-stat">בטירה ' + inCastle + ' · בלוח ' + onBoard + ' · בבית ' + home + (pl.skip ? ' · <b>מפסיד את התור הבא</b>' : '') + '</div>';
    if (place >= 0) body += '<div class="pp-place">מקום ' + (place + 1) + '</div>';
    if (now) {
      const d = S.dice, boost = S.ultraNext ? { name: 'UltraBoost' } : S.lv.boost;
      body += '<div class="pp-dice"><div><div class="die-cell">' + die(d ? d.d : null) + '</div><div class="pdie-label">צעדים</div></div>' +
        (boost ? '<div><div class="die-cell">' + die(d ? d.b : null, 'boost') + '</div><div class="pdie-label">' + boost.name + '</div></div>' : '') + '</div>';
      if (d && d.b != null) body += '<div class="pp-formula"><bdo dir="ltr">' + d.d + ' × (' + d.b + ' − 1) = ' + d.move + '</bdo></div>';
      if (S.phase === 'roll') body += '<button type="button" class="btn roll" id="play-roll">הטל קוביות</button>';
      else if (S.phase === 'pick') body += '<div class="pp-hint">בחרו כלי מסומן בלוח</div>';
    }
    return '<div class="pp ' + color + (now ? ' active' : '') + '"><div class="pp-head"><span class="avatar">' + esc(pl.name.charAt(0)) + '</span><div><b>' + esc(pl.name) + '</b><small>' + CNAME[color] + ' · שחקן ' + (pi + 1) + '</small></div></div>' + body + '</div>';
  }
  function render() {
    $('#pp-left').innerHTML = panel('red') + panel('blue');
    $('#pp-right').innerHTML = panel('green') + panel('yellow');
    renderPieces();
    $('#play-log').innerHTML = S.log.slice(-2).map((m, i, a) => '<div class="' + (i === a.length - 1 ? 'last' : '') + '">' + m + '</div>').join('');
    $$('#play-demo [data-demo]').forEach((b) => { b.disabled = S.phase !== 'roll'; });
  }
  function say(m) { S.log.push(m); }

  /* ---------- turns ---------- */
  function occupants(cellKey) {
    const out = [];
    S.players.forEach((pl, pi) => pl.pieces.forEach((pos, i) => { if (pos >= 0 && pos < pl.path.length - 1 && key(pl.path[pos]) === cellKey) out.push({ pi, i }); }));
    return out;
  }
  function blockedBy(pi, cellKey) { // an opponent's Double Block (FR-33)
    const o = occupants(cellKey).filter((x) => x.pi !== pi);
    return o.length >= 2 && o.every((x) => x.pi === o[0].pi);
  }
  function roll() {
    if (!S || S.phase !== 'roll') return;
    const pl = cur(), lv = S.lv;
    const ultra = S.ultraNext; S.ultraNext = false;
    const d = 1 + Math.floor(Math.random() * 6);
    const bmax = ultra ? 6 : (lv.boost ? lv.boost.max : 0);
    const b = bmax ? 1 + Math.floor(Math.random() * bmax) : null;
    const move = b == null ? d : d * (b - 1); // FR-16
    S.dice = { d, b, move };
    if (!ultra) S.sixes = d === 6 ? S.sixes + 1 : 0;
    if (S.sixes === 3) { // FR-18
      S.sixes = 0; say(pl.name + ' הטיל 6 שלישי ברצף: ההטלה מבוטלת והתור עובר.');
      S.phase = 'wait'; render(); busy = setTimeout(() => nextTurn(false), 1300); return;
    }
    const opts = [];
    pl.pieces.forEach((pos, i) => {
      if (pos === -1) { if (d === 6 && !blockedBy(S.turn, key(pl.path[0]))) opts.push({ i, to: 0 }); return; } // FR-20, FR-36
      if (pos >= pl.path.length - 1 || move === 0) return;
      const to = pos + move;
      if (to > pl.path.length - 1) return; // FR-24
      for (let k = pos + 1; k <= to; k++) if (blockedBy(S.turn, key(pl.path[k]))) return; // FR-33
      opts.push({ i, to });
    });
    const tag = b == null ? 'יצא ' + d : 'יצא ' + d + ' ו-' + (ultra ? 'UltraBoost ' : (lv.boost.name + ' ')) + b + ': ' + steps(move);
    if (!opts.length) {
      say(pl.name + ': ' + tag + '. ' + (move === 0 && d !== 6 ? 'מקדם 0, אין תזוזה.' : 'אין מהלך חוקי.') + (d === 6 ? ' יצא 6, מגיעה הטלה נוספת.' : ' התור עובר.'));
      S.phase = 'wait'; render(); busy = setTimeout(() => nextTurn(d === 6), 1400); return;
    }
    S.opts = opts; S.phase = 'pick';
    say(pl.name + ': ' + tag + '.' + (d === 6 && opts.some((o) => pl.pieces[o.i] === -1) ? ' אפשר להוציא כלי מהטירה או להזיז כלי בלוח.' : ' בחרו כלי מסומן.'));
    render();
  }
  function choose(i) {
    const o = S.opts.find((x) => x.i === i); if (!o) return;
    const pl = cur(), from = pl.pieces[i];
    S.phase = 'anim'; S.opts = [];
    if (from === -1) { pl.pieces[i] = 0; say(pl.name + ' הוציא כלי מהטירה.'); render(); afterLanding(i, 0, () => endMove()); return; }
    let k = from;
    const step = () => {
      k += 1; pl.pieces[i] = k; render();
      if (k < o.to) { busy = setTimeout(step, 90); return; } // FR-28
      afterLanding(i, 0, () => endMove());
    };
    busy = setTimeout(step, 90);
  }
  function afterLanding(i, depth, done) {
    const pl = cur(), pos = pl.pieces[i];
    if (pos >= pl.path.length - 1) { say('כלי של ' + pl.name + ' הגיע לבית הסיום!'); render(); done(); return; }
    const ck = key(pl.path[pos]), s = S.sp[ck];
    const rivals = occupants(ck).filter((x) => x.pi !== S.turn);
    if (rivals.length === 1 && !(s && s.t === 'star')) { // FR-29, FR-30
      const v = rivals[0], vp = S.players[v.pi]; vp.pieces[v.i] = -1;
      say('אכילה! הכלי של ' + vp.name + ' חזר לטירה.'); render();
    }
    if (depth > 2 || !s) { done(); return; }
    if (s.t === 'q') { ask(s.lv, i, depth, done); return; }
    if (s.t === 'surprise') { surprise(i, depth, done); return; }
    done();
  }
  function endMove() {
    const pl = cur(), pi = S.turn;
    if (!pl.done && pl.pieces.every((x) => x >= pl.path.length - 1)) { // FR-53
      pl.done = true; S.places.push(pi); say(pl.name + ' סיים במקום ' + S.places.length + '!');
      const left = S.players.map((p, j) => j).filter((j) => !S.players[j].done);
      if (left.length <= 1) { if (left.length) { S.players[left[0]].done = true; S.places.push(left[0]); } return gameOver(); } // FR-54
    }
    const extra = S.dice && S.dice.d === 6 && !S.noExtra && !pl.done; // FR-17
    S.noExtra = false;
    S.phase = 'wait'; render();
    busy = setTimeout(() => nextTurn(extra || S.ultraNext), 700);
  }
  function nextTurn(again) {
    S.dice = null;
    if (!again) {
      S.sixes = 0;
      for (let n = 0; n < S.players.length; n++) {
        S.turn = (S.turn + 1) % S.players.length;
        const p = cur();
        if (p.done) continue;
        if (p.skip) { p.skip = false; say(p.name + ' מפסיד את התור הזה.'); continue; } // FR-50
        break;
      }
      say('התור של ' + cur().name + '.');
    } else if (!S.ultraNext) say(cur().name + ' מטיל שוב.');
    S.phase = 'roll'; render();
  }

  /* ---------- question and surprise windows ---------- */
  function openModal(html) { $('#modal').innerHTML = html; $('#modal-back').hidden = false; setTimeout(() => $('#modal').focus({ preventScroll: true }), 0); }
  function closeModal() { $('#modal-back').hidden = true; $('#modal').innerHTML = ''; }
  let modalNext = null;
  function ask(level, i, depth, done) { // FR-38 – FR-42
    const pl = cur();
    let pool = BANK[level].map((q, n) => n).filter((n) => !S.used[level].includes(n));
    if (!pool.length) { S.used[level] = []; pool = BANK[level].map((q, n) => n); }
    const n = pool[Math.floor(Math.random() * pool.length)], q = BANK[level][n];
    S.used[level].push(n);
    openModal('<div class="modal-head"><span class="qtag q-' + level + '">?</span><h2>שאלה ' + QLV[level] + '</h2><span class="who">עונה: ' + esc(pl.name) + '</span></div>' +
      '<div class="modal-body"><p class="q-text">' + q.t + '</p><div class="answers">' +
      q.a.map((a, k) => '<button type="button" class="ans" data-pans="' + k + '"><b>' + LET[k] + '</b><span>' + a + '</span></button>').join('') +
      '</div><p class="q-note">תשובה נכונה מקדמת את הכלי ' + steps(QSTEP[level]) + ', וטעות מחזירה אותו ' + steps(QSTEP[level]) + '.</p></div>');
    modalNext = { kind: 'q', level, q, i, depth, done };
  }
  function answer(k) {
    const m = modalNext; if (!m || m.kind !== 'q' || m.answered) return;
    m.answered = true;
    const right = k === m.q.r;
    $$('#modal .ans').forEach((b, n) => { b.disabled = true; if (n === m.q.r) b.classList.add('right'); else if (n === k) b.classList.add('wrong'); });
    const pl = cur(), st = QSTEP[m.level], pos = pl.pieces[m.i];
    let to = right ? pos + st : Math.max(0, pos - st); // FR-40, FR-26
    if (right && to > pl.path.length - 1) to = pos; // FR-24
    m.to = to;
    $('#modal .modal-body').insertAdjacentHTML('beforeend', '<div class="q-result ' + (right ? 'ok' : 'bad') + '">' +
      (right ? 'נכון! הכלי מתקדם ' + steps(st) + '.' : 'לא נכון. התשובה הנכונה: ' + LET[m.q.r] + '. הכלי חוזר ' + steps(st) + '.') +
      (right && to === pos ? ' (אין מספיק משבצות עד הבית, הכלי נשאר.)' : '') + '</div>');
    $('#modal').insertAdjacentHTML('beforeend', '<div class="modal-foot"><button type="button" class="btn primary" data-pnext>המשך</button></div>');
    say(pl.name + (right ? ' ענה נכון.' : ' טעה בשאלה.'));
  }
  function surprise(i, depth, done) { // FR-44 – FR-52
    let r = Math.random() * 100, ev = EVENTS[0];
    for (const e of EVENTS) { if (r < e.p) { ev = e; break; } r -= e.p; }
    openModal('<div class="modal-head"><span class="qtag surprise">!</span><h2>משבצת הפתעה</h2><span class="who">' + esc(cur().name) + '</span></div>' +
      '<div class="modal-body"><p class="ev">' + ev.he + '</p><p class="q-note">ההגרלה לפי ההסתברויות שב-SRS: 10% בית, 10% יריב, 10% טירה, 30% שלושה צעדים אחורה, 30% הפסד תור, 10% UltraBoost.</p></div>' +
      '<div class="modal-foot"><button type="button" class="btn primary" data-pnext>הבנתי</button></div>');
    modalNext = { kind: 's', ev, i, depth, done };
  }
  function proceed() {
    const m = modalNext; if (!m) return;
    if (m.kind === 'q' && !m.answered) return;
    modalNext = null; closeModal();
    const pl = cur();
    if (m.kind === 'q') {
      if (m.to === pl.pieces[m.i]) { render(); m.done(); return; }
      pl.pieces[m.i] = m.to; render(); afterLanding(m.i, m.depth + 1, m.done); return;
    }
    const pos = pl.pieces[m.i];
    switch (m.ev.k) {
      case 'home': pl.pieces[m.i] = pl.path.length - 1; say('הכלי של ' + pl.name + ' קפץ לבית הסיום.'); render(); m.done(); return; // FR-45
      case 'castle': pl.pieces[m.i] = -1; say('הכלי של ' + pl.name + ' חזר לטירה.'); render(); m.done(); return; // FR-48
      case 'back3': pl.pieces[m.i] = Math.max(0, pos - 3); say('הכלי של ' + pl.name + ' חזר 3 צעדים.'); render(); afterLanding(m.i, m.depth + 1, m.done); return; // FR-49
      case 'skip': pl.skip = true; S.noExtra = true; say(pl.name + ' יפסיד את התור הבא.'); render(); m.done(); return; // FR-50
      case 'ultra': S.ultraNext = true; say(pl.name + ' מקבל הטלת UltraBoost מיוחדת.'); render(); m.done(); return; // FR-51
      case 'rival': { // FR-46, FR-47
        const cand = [];
        S.players.forEach((p, pi) => { if (pi === S.turn) return; p.pieces.forEach((x, k) => { if (x > 0 && x < p.path.length - 6) cand.push({ pi, k, x }); }); });
        if (!cand.length) { say('לאף יריב אין כלי להזיז: האירוע מבוטל.'); render(); m.done(); return; }
        cand.sort((a, b) => b.x - a.x);
        const v = cand[0], vp = S.players[v.pi], back = Math.ceil((1 + Math.floor(Math.random() * 6)) / 2);
        vp.pieces[v.k] = Math.max(0, v.x - back);
        say('הכלי המתקדם ביותר של ' + vp.name + ' חזר ' + steps(back) + '.'); render(); m.done(); return;
      }
      default: m.done();
    }
  }
  function gameOver() {
    S.phase = 'over'; leave(); render();
    const rows = S.places.map((pi, n) => '<li><b>מקום ' + (n + 1) + '</b> ' + esc(S.players[pi].name) + '</li>').join('');
    openModal('<div class="modal-head"><h2>המשחק הסתיים</h2></div><div class="modal-body"><ol class="ranks">' + rows + '</ol>' +
      '<p>רמה: ' + S.lv.he + ' · זמן: <bdi>' + fmt(S.secs) + '</bdi></p><p class="q-note">בגרסה המלאה התוצאה נשמרת בקובץ ההיסטוריה (FR-55).</p></div>' +
      '<div class="modal-foot"><a class="btn primary" href="#s16-history">היסטוריית משחקים</a><a class="btn" href="#s02-setup">משחק חדש</a></div>');
  }

  /* ---------- demo shortcuts: reach any feature in class without waiting for the dice ---------- */
  function buildDemo() {
    const q = S.lv.q > 0; // SRS Table 4: the easy board has no question or surprise squares
    $('#play-demo').classList.remove('open');
    $('#play-demo').innerHTML = '<button type="button" class="btn demo-toggle" data-demotoggle aria-expanded="false">הדגמה</button><div class="demo-items"><span class="demo-label">הדגמה:</span>' +
      '<button type="button" class="btn" data-demo="mid" title="מעביר את הכלים למצב של אמצע משחק">אמצע משחק</button>' +
      (q ? ['easy', 'med', 'hard'].map((l) => '<button type="button" class="btn" data-demo="q" data-lv="' + l + '" title="הכלי של השחקן שבתור הולך למשבצת שאלה ' + QLV[l] + '"><i class="dchip q-' + l + '">?</i>שאלה ' + QLV[l] + '</button>').join('') +
        '<button type="button" class="btn" data-demo="s" title="הכלי של השחקן שבתור הולך למשבצת הפתעה"><i class="dchip surprise">!</i>הפתעה</button>'
        : '<span class="demo-note">ברמה קלה אין משבצות שאלה והפתעה</span>') + '</div>';
  }
  const MID = [ // where each player's 4 pieces stand in the middle of a game
    [{ at: 'home' }, { at: 'lane' }, { star: 0.45 }, { at: 'castle' }],
    [{ f: 0.35 }, { pair: true }, { f: 0.7 }, { at: 'castle' }], // two pieces on one square: Double Block (FR-32)
    [{ at: 'home' }, { f: 0.55 }, { f: 0.15 }, { at: 'castle' }],
    [{ star: 0.25 }, { f: 0.6 }, { at: 'castle' }, { at: 'castle' }],
  ];
  function demoMid() {
    if (!S || S.phase !== 'roll') return;
    const taken = new Set();
    S.players.forEach((pl, pi) => {
      const L = pl.path.length, last = L - 7; // last square of the shared track
      const sq = (k) => S.sp[key(pl.path[k])];
      const near = (k0, ok) => {
        for (let d = 0; d <= last; d++) for (const k of [k0 + d, k0 - d]) if (k >= 1 && k <= last && !taken.has(key(pl.path[k])) && ok(k)) return k;
        return -1;
      };
      pl.pieces = [-1, -1, -1, -1];
      MID[pi].forEach((m, i) => {
        let pos = -1;
        if (m.at === 'home') pos = L - 1;
        else if (m.at === 'lane') pos = L - 3;
        else if (m.pair) pos = pl.pieces[i - 1];
        else if (m.star != null) pos = near(Math.round(m.star * last), (k) => (sq(k) || {}).t === 'star');
        else if (m.f != null) pos = near(Math.round(m.f * last), (k) => !sq(k));
        pl.pieces[i] = pos;
        if (pos >= 1 && pos <= last) taken.add(key(pl.path[pos]));
      });
      pl.done = false; pl.skip = false;
    });
    S.places = []; S.dice = null; S.sixes = 0; S.ultraNext = false; S.noExtra = false;
    S.secs = Math.max(S.secs, 754); $('#play-clock').textContent = fmt(S.secs);
    say('הדגמה: קפצנו לאמצע המשחק. ל' + S.players[1].name + ' יש חסימה כפולה (Double\u00a0Block).'); // no line break inside the English term
    render();
  }
  function demoLand(kind, lvq) { // the current player's piece walks to a question square of that level, or to a surprise square
    if (!S || S.phase !== 'roll' || !S.lv.q) return;
    const pl = cur(), last = pl.path.length - 7;
    const want = (k) => {
      const s = S.sp[key(pl.path[k])];
      return !!s && (kind === 'q' ? s.t === 'q' && s.lv === lvq : s.t === 'surprise') && !blockedBy(S.turn, key(pl.path[k]));
    };
    const targets = [];
    for (let k = 1; k <= last; k++) if (want(k)) targets.push(k);
    // the piece closest behind one of those squares; a piece leaves the castle only if none on the board can
    let best = null;
    [(x) => x >= 0 && x <= last, (x) => x === -1].forEach((can) => {
      if (best) return;
      pl.pieces.forEach((x, i) => {
        if (!can(x)) return;
        const from = Math.max(x, 0);
        targets.forEach((t) => { if (t > from && (!best || t - from < best.t - best.from)) best = { i, from, t }; });
      });
    });
    const label = kind === 'q' ? 'משבצת שאלה ' + QLV[lvq] : 'משבצת הפתעה';
    if (!best) { // every piece is already past those squares: place one on the first of them
      const i = pl.pieces.findIndex((x) => x <= last);
      if (i < 0 || !targets.length) { say('הדגמה: אין ל' + pl.name + ' כלי שיכול להגיע ל' + label + '.'); render(); return; }
      best = { i, from: targets[0], t: targets[0] };
    }
    S.phase = 'anim'; S.dice = null;
    say('הדגמה: הכלי של ' + pl.name + ' הולך ל' + label + '.');
    pl.pieces[best.i] = best.from; render();
    const dt = Math.max(20, Math.min(70, Math.round(1400 / Math.max(1, best.t - best.from))));
    let k = best.from;
    const step = () => {
      if (k < best.t) { k += 1; pl.pieces[best.i] = k; render(); busy = setTimeout(step, dt); return; }
      afterLanding(best.i, 0, () => endMove());
    };
    busy = setTimeout(step, 200);
  }

  function closeDemo() { // the phone demo menu closes after any other tap
    const bar = $('#play-demo');
    if (!bar.classList.contains('open')) return;
    bar.classList.remove('open');
    const tg = $('[data-demotoggle]', bar); if (tg) tg.setAttribute('aria-expanded', 'false');
  }

  /* ---------- input ---------- */
  document.addEventListener('click', (e) => {
    if ($('#v-play').hidden || !S) return;
    const t = e.target;
    if (t.closest('#play-roll')) { roll(); return; }
    const tg = t.closest('[data-demotoggle]');
    if (tg) { const open = !$('#play-demo').classList.contains('open'); $('#play-demo').classList.toggle('open', open); tg.setAttribute('aria-expanded', String(open)); return; }
    closeDemo();
    const dm = t.closest('[data-demo]');
    if (dm) { if (dm.dataset.demo === 'mid') demoMid(); else demoLand(dm.dataset.demo, dm.dataset.lv); return; }
    const pc = t.closest('#pboard .piece.pick');
    if (pc && S.phase === 'pick') { choose(+pc.dataset.i); return; }
    const a = t.closest('[data-pans]');
    if (a) { answer(+a.dataset.pans); return; }
    if (t.closest('[data-pnext]')) { proceed(); return; }
    if (t.closest('#play-exit')) {
      openModal('<div class="modal-head"><h2>לצאת לתפריט?</h2></div><div class="modal-body"><p>המשחק הנוכחי לא יישמר בהיסטוריה.</p></div>' +
        '<div class="modal-foot"><a class="btn primary" href="#s01-menu">כן, לצאת</a><button type="button" class="btn" data-close>המשך לשחק</button></div>');
    }
  });
  document.addEventListener('keydown', (e) => {
    if ($('#v-play').hidden || !S) return;
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('#pboard .piece.pick')) { e.preventDefault(); choose(+e.target.closest('.piece').dataset.i); }
  });

  window.LZPlay = { enter, leave, _state: () => S, _roll: roll, _choose: choose, _demo: (k, lv) => (k === 'mid' ? demoMid() : demoLand(k, lv)) };
  // app.js routes before this file loads: start here if the page opened straight on #play
  if ((location.hash || '').replace('#', '') === 'play' && !$('#v-play').hidden) enter();
})();
