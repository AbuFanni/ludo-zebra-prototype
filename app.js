/* Ludo Zebra – throwaway clickable prototype (Exercise 3, part 1).
   No game logic: every screen is a fixed example with fake data.
   Each screen has its own address (#s01-menu … #s20-add-question). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  const COLOR_NAME = { red: 'אדום', green: 'ירוק', yellow: 'צהוב', blue: 'כחול' };
  const ARROW_INK = { red: '#E53935', green: '#2E7D32', yellow: '#D49A00', blue: '#1E88E5' };
  const P = { red: 'דנה', green: 'עומר', yellow: 'נועה', blue: 'יוסי' };
  const ORDER = ['red', 'green', 'yellow', 'blue'];

  /* ---------- choices made while clicking (kept for the session only) ---------- */
  const choice = { s06: 0, ans: 0, ansRight: false, rival: 'red', rivalPiece: 0 };
  try { Object.assign(choice, JSON.parse(sessionStorage.getItem('lz-choice') || '{}')); } catch (e) { /* private mode */ }
  const saveChoice = () => { try { sessionStorage.setItem('lz-choice', JSON.stringify(choice)); } catch (e) { /* ignore */ } };

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- routes ---------- */
  const ROUTES = {
    's01-menu': { view: 'menu', title: 'מסך פתיחה' },
    's02-setup': { view: 'setup', state: 'filled', title: 'הגדרת משחק' },
    's03-setup-errors': { view: 'setup', state: 'errors', title: 'הגדרת משחק – שגיאות' },
    's04-setup-ok': { view: 'setup', state: 'ok', title: 'הגדרת משחק – תקין' },
    's05-board': { view: 'game', g: 's05', title: 'מסך משחק' },
    's06-roll-boost3': { view: 'game', g: 's06', title: 'הטלה עם Boost 3' },
    's07-roll-boost1': { view: 'game', g: 's07', title: 'הטלה עם Boost 1' },
    's08-question': { view: 'game', g: 's08', title: 'משבצת שאלה' },
    's09-answer-wrong': { view: 'game', g: 's09', title: 'תשובה שגויה' },
    's10-answer-right': { view: 'game', g: 's10', title: 'תשובה נכונה' },
    's11-surprise': { view: 'game', g: 's11', title: 'משבצת הפתעה' },
    's12-choose-rival': { view: 'game', g: 's12', title: 'בחירת יריב' },
    's13-choose-piece': { view: 'game', g: 's13', title: 'בחירת כלי' },
    's14-move-back': { view: 'game', g: 's14', title: 'הכלי זז אחורה' },
    's15-results': { view: 'results', title: 'סיום משחק' },
    's16-history': { view: 'history', title: 'היסטוריית משחקים' },
    's17-admin-login': { view: 'login', state: 'empty', title: 'כניסת מנהל' },
    's18-admin-error': { view: 'login', state: 'error', title: 'כניסת מנהל – שגיאה' },
    's19-questions': { view: 'questions', title: 'אשף ניהול שאלות' },
    's20-add-question': { view: 'addq', title: 'הוספת שאלה' },
  };
  const currentHash = () => (location.hash || '').replace('#', '') || 's01-menu';
  const setTitle = (h) => { document.title = 'Ludo Zebra · ' + (ROUTES[h] ? ROUTES[h].title : 'אב טיפוס'); };
  const go = (h) => { location.hash = h; };

  function route() {
    let h = currentHash();
    if (!ROUTES[h]) h = 's01-menu';
    const r = ROUTES[h];
    $$('.screen').forEach((s) => { s.hidden = s.id !== 'v-' + r.view; });
    closeModal();
    stopClock();
    setTitle(h);
    const enter = { setup: enterSetup, game: enterGame, history: enterHistory, login: enterLogin, questions: enterQuestions, addq: enterAddQ }[r.view];
    if (enter) enter(r);
    window.scrollTo(0, 0);
  }

  /* =====================================================================
     Setup (FR-03 – FR-08)
     ===================================================================== */
  const SETUP_PRESETS = {
    filled: { count: 4, level: 'medium', show: false, players: [['דנה', 'red'], ['דנה', 'green'], ['נועה', 'yellow'], ['יוסי, הגדול', 'red']] },
    errors: { count: 4, level: 'medium', show: true, players: [['דנה', 'red'], ['דנה', 'green'], ['נועה', 'yellow'], ['יוסי, הגדול', 'red']] },
    ok: { count: 4, level: 'medium', show: true, players: [['דנה', 'red'], ['עומר', 'green'], ['נועה', 'yellow'], ['יוסי', 'blue']] },
  };
  let setup = null;
  let keepSetup = false;

  function enterSetup(r) {
    if (!(keepSetup && setup)) {
      const d = SETUP_PRESETS[r.state];
      setup = { count: d.count, level: d.level, show: d.show, players: d.players.map(([name, color]) => ({ name, color })) };
    }
    keepSetup = false;
    renderSetupForm();
    updateSetupUI();
  }

  function validate(s) {
    const act = s.players.slice(0, s.count);
    const errs = act.map(() => ({}));
    act.forEach((p, i) => {
      const n = p.name.trim();
      if (!n) errs[i].name = 'יש להזין שם בין 1 ל-15 תווים.';
      else if (n.length > 15) errs[i].name = 'השם ארוך מדי: עד 15 תווים.';
      else if (n.includes(',')) errs[i].name = 'אי אפשר להשתמש בפסיק בשם, כי השם נשמר בקובץ ההיסטוריה.';
      else if (act.slice(0, i).some((q) => q.name.trim().toLowerCase() === n.toLowerCase())) errs[i].name = 'השם כבר קיים. בחרו שם אחר.';
      if (act.slice(0, i).some((q) => q.color === p.color)) errs[i].color = 'הצבע ' + COLOR_NAME[p.color] + ' כבר נבחר. בחרו צבע אחר.';
    });
    const total = errs.reduce((a, e) => a + (e.name ? 1 : 0) + (e.color ? 1 : 0), 0);
    return { errs, total };
  }

  function renderSetupForm() {
    $$('#count-seg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.count === setup.count)));
    $$('#levels .level').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === setup.level)));
    const wrap = $('#players');
    wrap.innerHTML = '';
    setup.players.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'prow';
      row.dataset.i = i;
      row.innerHTML =
        '<div class="pnum">שחקן ' + (i + 1) + '</div>' +
        '<div><input type="text" id="pname-' + i + '" maxlength="30" aria-label="שם שחקן ' + (i + 1) + '" value="' + esc(p.name) + '"><div class="err-slot" data-for="name"></div></div>' +
        '<div><div class="swatches" role="group" aria-label="צבע שחקן ' + (i + 1) + '">' +
        ORDER.map((c) => '<button type="button" class="swatch" style="background:var(--' + c + ')" data-c="' + c + '" aria-label="' + COLOR_NAME[c] + '" aria-pressed="' + (p.color === c) + '"></button>').join('') +
        '</div><div class="err-slot" data-for="color"></div></div>';
      wrap.appendChild(row);
    });
  }

  function updateSetupUI() {
    const v = validate(setup);
    $$('#players .prow').forEach((row, i) => {
      row.hidden = i >= setup.count;
      const e = (setup.show && v.errs[i]) || {};
      $('input', row).classList.toggle('bad', !!e.name);
      $('.err-slot[data-for=name]', row).innerHTML = e.name ? '<div class="err-msg">' + e.name + '</div>' : '';
      $$('.swatch', row).forEach((s) => {
        s.setAttribute('aria-pressed', String(s.dataset.c === setup.players[i].color));
        s.classList.toggle('bad', !!e.color);
      });
      $('.err-slot[data-for=color]', row).innerHTML = e.color ? '<div class="err-msg">' + e.color + '</div>' : '';
    });
    $$('#count-seg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.count === setup.count)));
    $$('#levels .level').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === setup.level)));
    const sum = $('#setup-summary');
    const btn = $('#start-btn');
    if (!setup.show) {
      sum.innerHTML = '<div class="summary neutral">בלחיצה על "התחל משחק" המערכת בודקת שכל השמות והצבעים תקינים.</div>';
      btn.setAttribute('aria-disabled', 'false');
    } else if (v.total > 0) {
      sum.innerHTML = '<div class="summary bad">אי אפשר להתחיל: יש לתקן ' + (v.total === 1 ? 'שדה אחד' : v.total + ' שדות') + ' המסומנים באדום.</div>';
      btn.setAttribute('aria-disabled', 'true');
    } else {
      sum.innerHTML = '<div class="summary good">✓ הכל תקין. אפשר להתחיל את המשחק.</div>';
      btn.setAttribute('aria-disabled', 'false');
    }
    // During live editing the address follows the state: errors ↔ ok.
    const h = currentHash();
    if (setup.show && (h === 's03-setup-errors' || h === 's04-setup-ok')) {
      const want = v.total > 0 ? 's03-setup-errors' : 's04-setup-ok';
      if (want !== h) { history.replaceState(null, '', '#' + want); setTitle(want); }
    }
  }

  function onStart() {
    if ($('#start-btn').getAttribute('aria-disabled') === 'true') { toast('קודם מתקנים את השדות המסומנים באדום.'); return; }
    const v = validate(setup);
    if (v.total === 0) { go('s05-board'); return; }
    setup.show = true;
    if (currentHash() === 's03-setup-errors') { updateSetupUI(); return; }
    keepSetup = true;
    go('s03-setup-errors');
  }

  /* =====================================================================
     Board (medium level: classic 15×15 board + an outer ring of 64 squares)
     ===================================================================== */
  const N = 17;
  const SPECIAL = {};
  const mark = (r, c, o) => { SPECIAL[r + ',' + c] = o; };
  mark(0, 0, { t: 'start', c: 'red' }); mark(0, 16, { t: 'start', c: 'green' });
  mark(16, 16, { t: 'start', c: 'yellow' }); mark(16, 0, { t: 'start', c: 'blue' });
  [['red', 8, 0, '→'], ['green', 0, 8, '↓'], ['yellow', 8, 16, '←'], ['blue', 16, 8, '↑'],
   ['red', 8, 1, '→'], ['green', 1, 8, '↓'], ['yellow', 8, 15, '←'], ['blue', 15, 8, '↑']]
    .forEach(([c, r, col, g]) => mark(r, col, { t: 'arrow', c, g }));
  [[2, 0], [0, 14], [14, 16], [16, 2], [7, 3], [3, 9], [9, 13], [13, 7]].forEach(([r, c]) => mark(r, c, { t: 'star' }));
  [[0, 5], [9, 11]].forEach(([r, c]) => mark(r, c, { t: 'q', lv: 'easy' }));
  [[16, 11], [7, 5]].forEach(([r, c]) => mark(r, c, { t: 'q', lv: 'med' }));
  [[10, 16], [2, 7]].forEach(([r, c]) => mark(r, c, { t: 'q', lv: 'hard' }));
  [[12, 0], [4, 16]].forEach(([r, c]) => mark(r, c, { t: 'surprise' }));

  function cellKind(r, c) {
    if (r === 0 || r === N - 1 || c === 0 || c === N - 1) return 'track';
    const castleRow = (r >= 1 && r <= 6) || (r >= 10 && r <= 15);
    const castleCol = (c >= 1 && c <= 6) || (c >= 10 && c <= 15);
    if (castleRow && castleCol) return 'castle';
    if (r >= 7 && r <= 9 && c >= 7 && c <= 9) return 'center';
    if (r === 8 && c >= 2 && c <= 6) return 'lane-red';
    if (c === 8 && r >= 2 && r <= 6) return 'lane-green';
    if (r === 8 && c >= 10 && c <= 14) return 'lane-yellow';
    if (c === 8 && r >= 10 && r <= 14) return 'lane-blue';
    return 'track';
  }

  const cells = {};
  const yards = {};
  function buildBoard() {
    const b = $('#board');
    b.innerHTML = '';
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const k = cellKind(r, c);
        if (k === 'castle' || k === 'center') continue;
        const d = document.createElement('div');
        d.className = 'cell' + (k.indexOf('lane') === 0 ? ' ' + k : '');
        d.style.gridRow = String(r + 1);
        d.style.gridColumn = String(c + 1);
        const sp = SPECIAL[r + ',' + c];
        if (sp) {
          if (sp.t === 'start') { d.classList.add('start', sp.c); d.innerHTML = '<span class="sym">#</span>'; d.title = 'משבצת התחלה'; }
          else if (sp.t === 'arrow') { d.classList.add('arrow'); d.innerHTML = '<span class="sym" style="color:' + ARROW_INK[sp.c] + '">' + sp.g + '</span>'; d.title = 'משבצת חץ'; }
          else if (sp.t === 'star') { d.classList.add('star'); d.innerHTML = '<span class="sym">★</span>'; d.title = 'משבצת הגנה'; }
          else if (sp.t === 'q') { d.classList.add('q-' + sp.lv); d.innerHTML = '<span class="sym">?</span>'; d.title = 'משבצת שאלה'; }
          else if (sp.t === 'surprise') { d.classList.add('surprise'); d.innerHTML = '<span class="sym">!</span>'; d.title = 'משבצת הפתעה'; }
        }
        cells[r + ',' + c] = d;
        b.appendChild(d);
      }
    }
    [['red', 1, 1], ['green', 1, 10], ['blue', 10, 1], ['yellow', 10, 10]].forEach(([c, r0, c0]) => {
      const d = document.createElement('div');
      d.className = 'castle ' + c;
      d.style.gridRow = (r0 + 1) + ' / span 6';
      d.style.gridColumn = (c0 + 1) + ' / span 6';
      d.title = 'הטירה של ' + P[c];
      const y = document.createElement('div');
      y.className = 'yard';
      for (let i = 0; i < 4; i++) { const s = document.createElement('div'); s.className = 'slot'; y.appendChild(s); }
      d.appendChild(y);
      b.appendChild(d);
      yards[c] = y;
    });
    const ce = document.createElement('div');
    ce.className = 'center';
    ce.style.gridRow = '8 / span 3';
    ce.style.gridColumn = '8 / span 3';
    ce.title = 'בית הסיום';
    b.appendChild(ce);
  }

  function mkPiece(color) {
    const p = document.createElement('div');
    p.className = 'piece ' + color;
    p.dataset.color = color;
    return p;
  }

  function placePieces(st) {
    $$('#board .piece').forEach((p) => p.remove());
    ORDER.forEach((color) => {
      const info = st.pieces[color];
      const slots = $$('.slot', yards[color]);
      for (let i = 0; i < info.castle; i++) {
        const p = mkPiece(color);
        p.dataset.where = 'castle';
        p.title = 'כלי בטירה של ' + P[color];
        slots[i].appendChild(p);
      }
      info.track.forEach((pos, idx) => {
        const p = mkPiece(color);
        p.dataset.where = 'track';
        p.dataset.idx = idx;
        p.title = 'כלי של ' + P[color];
        if (st.pick && st.pick.color === color) {
          p.classList.add('pick');
          p.tabIndex = 0;
          p.setAttribute('role', 'button');
          p.setAttribute('aria-label', 'בחירת הכלי של ' + P[color]);
        }
        cells[pos[0] + ',' + pos[1]].appendChild(p);
      });
    });
    (st.ghosts || []).forEach(([color, r, c]) => {
      const g = mkPiece(color);
      g.classList.add('ghost');
      g.dataset.where = 'ghost';
      g.title = 'המקום הקודם של הכלי';
      cells[r + ',' + c].appendChild(g);
    });
  }

  /* =====================================================================
     Game states (one fixed example per screen)
     ===================================================================== */
  const BACK = { '0,12': [0, 9], '16,6': [16, 9], '0,4': [0, 1], '14,0': [16, 1], '16,13': [16, 16], '6,16': [3, 16], '16,9': [16, 12] };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const baseFlow2 = () => ({
    red: { castle: 2, track: [[0, 4], [16, 6]] },
    green: { castle: 3, track: [[0, 16]] },
    yellow: { castle: 2, track: [[16, 13], [6, 16]] },
    blue: { castle: 3, track: [[13, 0]] },
  });
  const redAfterMove = () => (choice.s06 === 1 ? [[0, 4], [14, 0]] : [[0, 12], [16, 6]]);
  const baseFlow3 = () => { const b = baseFlow2(); b.red.track = redAfterMove(); b.yellow.track = [[16, 11], [6, 16]]; return b; };
  const baseFlow4 = () => {
    const b = baseFlow2();
    b.red.track = redAfterMove();
    b.yellow.track = choice.ansRight ? [[16, 9], [6, 16]] : [[16, 13], [6, 16]];
    b.blue.track = [[12, 0]];
    return b;
  };

  function die(n, cls) {
    if (n == null) return '<div class="die empty ' + (cls || '') + '">?</div>';
    const pos = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [1, 3], [3, 1], [3, 3]],
      5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]], 6: [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]] }[n];
    return '<div class="die ' + (cls || '') + '" aria-label="' + n + '">' + pos.map(([r, c]) => '<span class="pip" style="grid-row:' + r + ';grid-column:' + c + '"></span>').join('') + '</div>';
  }
  const turnBox = (color, sub) =>
    '<div class="box turn"><span class="disc ' + color + '"></span><div><div class="what">התור של</div><div class="who">' + P[color] + '</div></div>' +
    '<div class="what" style="margin-inline-start:auto;max-width:330px;text-align:end">' + sub + '</div></div>';
  // eq is a math line shown left-to-right; raw=true keeps it as a Hebrew (right-to-left) line
  const formula = (eq, why, cls, raw) => '<div class="formula ' + (cls || '') + '">' + (raw ? '<div class="eq" dir="rtl" style="direction:rtl;font-size:20px">' + eq + '</div>' : '<div class="eq"><bdo dir="ltr">' + eq + '</bdo></div>') + '<div class="why">' + why + '</div></div>';
  const diceBox = (steps, boost, f, boostLabel) =>
    '<div class="box"><div class="dice-row">' +
    '<div class="die-wrap">' + die(steps) + '<span>קוביית צעדים</span></div>' +
    (boost === undefined ? '' : '<div class="die-wrap">' + die(boost, 'boost') + '<span>' + (boostLabel || 'Boost (1–3)') + '</span></div>') +
    f + '</div></div>';
  const noteBox = (html) => '<div class="box step-note">' + html + '</div>';
  const msgsBox = (list) => '<div class="box"><div class="msgs-title">הודעות</div><div class="msgs">' + list.map((m) => '<div>' + m + '</div>').join('') + '</div></div>';
  function playersBox(pieces, turn) {
    return '<div class="box"><div class="plist">' + ORDER.map((c) => {
      const inf = pieces[c];
      const home = 4 - inf.castle - inf.track.length;
      return '<div class="pr' + (c === turn ? ' now' : '') + '"><span class="disc ' + c + '"></span><b>' + P[c] + '</b><span class="cnt">בטירה ' + inf.castle + ' · בלוח ' + inf.track.length + ' · סיימו ' + home + '</span></div>';
    }).join('') + '</div></div>';
  }
  const legendBox = () =>
    '<div class="box legend">' +
    '<span><i class="mini" style="color:#B8901A">★</i>הגנה</span>' +
    '<span><i class="mini" style="background:#1C2330;color:#fff">#</i>התחלה</span>' +
    '<span><i class="mini" style="color:#E53935">→</i>חץ (רק לכלי בצבע שלו)</span>' +
    '<span><i class="mini" style="background:var(--q-easy-l);color:var(--q-easy)">?</i><i class="mini" style="background:var(--q-med-l);color:var(--q-med)">?</i><i class="mini" style="background:var(--q-hard-l);color:var(--q-hard)">?</i>שאלה קלה / בינונית / קשה</span>' +
    '<span><i class="mini" style="background:var(--surprise-l);color:var(--surprise)">!</i>הפתעה</span>' +
    '</div>';
  const btn = (href, text, primary) => '<a class="btn big wide' + (primary ? ' primary' : '') + '" href="#' + href + '">' + text + '</a>';

  const QUESTION = { text: 'ב<span class="nw">-MVC</span>, איזו תבנית עיצוב מעדכנת את <span class="nw">ה-View</span> אוטומטית <span class="nw">כשה-Model</span> משתנה?', answers: ['Singleton', 'Observer', 'Factory Method', 'Decorator'], right: 1 };
  const LET = ['א', 'ב', 'ג', 'ד'];
  function questionModal(mode) {
    const head = '<div class="modal-head" style="background:var(--q-med-l)"><span class="lvl-chip med">? שאלה בינונית</span>' +
      '<span style="margin-inline-start:auto;display:inline-flex;align-items:center;gap:8px"><span class="disc yellow"></span>עונה: <b>' + P.yellow + '</b></span></div>';
    let answers;
    if (mode === 'ask') {
      answers = QUESTION.answers.map((a, i) => '<button type="button" class="ans" data-ans="' + i + '"><span class="let">' + LET[i] + '</span><span class="ltr">' + a + '</span></button>').join('');
    } else {
      const chosen = mode === 'right' ? QUESTION.right : (choice.ans === QUESTION.right ? 0 : choice.ans);
      answers = QUESTION.answers.map((a, i) => {
        let cls = '', tag = '';
        if (i === QUESTION.right) { cls = ' right'; tag = mode === 'right' ? '✓ התשובה שלך' : '✓ התשובה הנכונה'; }
        else if (i === chosen) { cls = ' wrong'; tag = '✗ התשובה שלך'; }
        return '<div class="ans static' + cls + '"><span class="let">' + LET[i] + '</span><span class="ltr">' + a + '</span>' + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</div>';
      }).join('');
    }
    let body = '<div class="modal-body"><p class="q-text">' + QUESTION.text + '</p><div class="answers">' + answers + '</div>';
    if (mode === 'wrong') body += '<div class="result bad">תשובה שגויה. הכלי של ' + P.yellow + ' חוזר 2 צעדים אחורה.</div>';
    if (mode === 'right') body += '<div class="result ok">תשובה נכונה! הכלי של ' + P.yellow + ' מתקדם 2 צעדים קדימה.</div>';
    body += '</div>';
    const foot = mode === 'ask'
      ? '<div class="modal-foot"><span class="note">תשובה נכונה: 2 צעדים קדימה. תשובה שגויה: 2 צעדים אחורה. אין הגבלת זמן.</span></div>'
      : '<div class="modal-foot"><span class="note">התור עובר לשחקן הבא.</span><a class="btn primary" href="#s11-surprise">המשך</a></div>';
    return head + body + foot;
  }

  function surpriseModal() {
    const ev = [['קפיצה לבית הסיום', '10%'], ['הזזת כלי יריב', '10%', 1], ['חזרה לטירה', '10%'], ['חזרה 3 צעדים', '30%'], ['הפסד התור הבא', '30%'], ['הטלת UltraBoost', '10%']];
    return '<div class="modal-head" style="background:var(--surprise-l)"><span class="mini" style="width:34px;height:34px;font-size:20px;background:#fff;color:var(--surprise);border-color:#D3B6E2">!</span>' +
      '<h2>משבצת הפתעה</h2><span style="margin-inline-start:auto;display:inline-flex;align-items:center;gap:8px"><span class="disc blue"></span><b>' + P.blue + '</b></span></div>' +
      '<div class="modal-body"><p>הכלי של ' + P.blue + ' נחת על משבצת הפתעה. המערכת הגרילה אירוע:</p>' +
      '<div class="drawn"><b>הזזת כלי יריב</b>בוחרים יריב וכלי שלו במסלול המשותף. הכלי יזוז אחורה בחצי מתוצאת הטלה חדשה, מעוגל למעלה.</div>' +
      '<p class="muted" style="font-size:14px">הסיכוי של כל אירוע:</p><div class="ev-list">' +
      ev.map((e) => '<div class="ev' + (e[2] ? ' on' : '') + '"><span>' + e[0] + '</span><span>' + e[1] + '</span></div>').join('') + '</div></div>' +
      '<div class="modal-foot"><span class="note">אי אפשר לוותר על אירוע הפתעה.</span><a class="btn primary" href="#s12-choose-rival">בחירת יריב</a></div>';
  }

  function rivalModal(pieces) {
    const n = (c) => pieces[c].track.length;
    return '<div class="modal-head" style="background:var(--surprise-l)"><h2>בחרו יריב</h2><span class="muted" style="margin-inline-start:auto">הכלי שתבחרו יזוז אחורה</span></div>' +
      '<div class="modal-body"><div class="rivals">' +
      '<a class="rival" href="#s13-choose-piece" data-rival="red"><span class="disc red"></span><b>' + P.red + '</b><span class="why">' + n('red') + ' כלים במסלול המשותף</span><span class="go">בחירה ←</span></a>' +
      '<div class="rival" aria-disabled="true" data-why="לעומר אין כלי שאפשר להזיז אחורה. בחרו יריב אחר."><span class="disc green"></span><b>' + P.green + '</b><span class="why">אין כלי שאפשר להחזיר: הכלי היחיד שלו במסלול עומד במשבצת ההתחלה שלו.</span></div>' +
      '<a class="rival" href="#s13-choose-piece" data-rival="yellow"><span class="disc yellow"></span><b>' + P.yellow + '</b><span class="why">' + n('yellow') + ' כלים במסלול המשותף</span><span class="go">בחירה ←</span></a>' +
      '</div></div><div class="modal-foot"><span class="note">אם לאף יריב אין כלי להזיז, האירוע מתבטל.</span></div>';
  }

  const GAME = {
    s05() {
      const pieces = baseFlow2();
      return { turn: 'red', clock: '00:12:47', pieces,
        side: turnBox('red', 'לחצו על "הטל" כדי להטיל את שתי הקוביות.') +
          diceBox(null, null, formula('צעדים = קוביית צעדים × (Boost − 1)', 'ברמה בינונית מטילים יחד קוביית צעדים וקוביית Boost.', '', true)) +
          btn('s06-roll-boost3', 'הטל', true) +
          msgsBox(['יוסי הזיז כלי 2 צעדים.', 'נועה ענתה נכון על שאלה קלה ועלתה צעד אחד.']) +
          playersBox(pieces, 'red') + legendBox(),
        castleTip: { red: 'כדי להזיז כלי קודם מטילים. לחצו על "הטל".' } };
    },
    s06() {
      const pieces = baseFlow2();
      return { turn: 'red', clock: '00:12:52', pieces, pick: { color: 'red', next: 's07-roll-boost1', key: 's06' },
        side: turnBox('red', 'בחרו כלי מסומן בלוח.') +
          diceBox(4, 3, formula('4 × (3 − 1) = 8', 'מספר הצעדים: קוביית הצעדים × (Boost − 1).')) +
          noteBox('בחרו אחד משני הכלים המסומנים, והוא יזוז <b>8 צעדים</b>.<br><span class="muted">כלים בטירה יוצאים רק כשבקוביית הצעדים יוצא 6.</span>') +
          msgsBox(['דנה הטילה 4 בקוביית הצעדים ו-3 בקוביית ה-Boost.']) +
          playersBox(pieces, 'red') + legendBox(),
        castleTip: { red: 'הכלי הזה בטירה. מוציאים כלי מהטירה רק כשבקוביית הצעדים יוצא 6.' } };
    },
    s07() {
      const pieces = baseFlow2();
      pieces.red.track = redAfterMove();
      return { turn: 'green', clock: '00:13:05', pieces,
        side: turnBox('green', 'התוצאה הוכפלה ב-0.') +
          diceBox(4, 1, formula('4 × (1 − 1) = 0', 'מקדם 0: הכלי לא זז בתוצאה המוכפלת.', 'zero')) +
          noteBox('לא יצא 6 בקוביית הצעדים, ולכן אין הטלה נוספת ואי אפשר להוציא כלי מהטירה.<br><b>התור עובר לנועה.</b>') +
          btn('s08-question', 'המשך', true) +
          msgsBox(['דנה הזיזה כלי 8 צעדים.', 'עומר קיבל מקדם 0, ולכן אין תזוזה.']) +
          playersBox(pieces, 'green') + legendBox(),
        trackTip: { green: 'במקדם 0 הכלי לא זז בתור הזה.' } };
    },
    s08() {
      const pieces = baseFlow3();
      return { turn: 'yellow', clock: '00:13:21', pieces,
        side: turnBox('yellow', 'ענו על השאלה בחלון.') +
          diceBox(2, 2, formula('2 × (2 − 1) = 2', 'הכלי זז 2 צעדים.')) +
          noteBox('הכלי של נועה נחת על <b>משבצת שאלה בינונית</b> (צהובה).') +
          msgsBox(['נועה הטילה 2 ו-Boost 2.']) + playersBox(pieces, 'yellow') + legendBox(),
        modal: questionModal('ask') };
    },
    s09() {
      const pieces = baseFlow3();
      pieces.yellow.track = [[16, 13], [6, 16]];
      return { turn: 'yellow', clock: '00:13:40', pieces, ghosts: [['yellow', 16, 11]],
        side: turnBox('yellow', 'ענתה לא נכון.') +
          diceBox(2, 2, formula('2 × (2 − 1) = 2', 'הכלי זז 2 צעדים.')) +
          noteBox('תשובה שגויה: הכלי של נועה חזר 2 צעדים אחורה.') +
          msgsBox(['נועה ענתה לא נכון על שאלה בינונית.']) + playersBox(pieces, 'yellow') + legendBox(),
        modal: questionModal('wrong') };
    },
    s10() {
      const pieces = baseFlow3();
      pieces.yellow.track = [[16, 9], [6, 16]];
      return { turn: 'yellow', clock: '00:13:40', pieces, ghosts: [['yellow', 16, 11]],
        side: turnBox('yellow', 'ענתה נכון.') +
          diceBox(2, 2, formula('2 × (2 − 1) = 2', 'הכלי זז 2 צעדים.')) +
          noteBox('תשובה נכונה: הכלי של נועה התקדם 2 צעדים קדימה.') +
          msgsBox(['נועה ענתה נכון על שאלה בינונית.']) + playersBox(pieces, 'yellow') + legendBox(),
        modal: questionModal('right') };
    },
    s11() {
      const pieces = baseFlow4();
      return { turn: 'blue', clock: '00:14:02', pieces,
        side: turnBox('blue', 'אירוע הפתעה.') +
          diceBox(1, 2, formula('1 × (2 − 1) = 1', 'הכלי זז צעד אחד.')) +
          noteBox('הכלי של יוסי נחת על <b>משבצת הפתעה</b>.') +
          msgsBox(['יוסי הטיל 1 ו-Boost 2.']) + playersBox(pieces, 'blue') + legendBox(),
        modal: surpriseModal() };
    },
    s12() {
      const pieces = baseFlow4();
      return { turn: 'blue', clock: '00:14:09', pieces,
        side: turnBox('blue', 'בוחר יריב.') +
          diceBox(1, 2, formula('1 × (2 − 1) = 1', 'הכלי זז צעד אחד.')) +
          noteBox('הוגרל: <b>הזזת כלי יריב</b>.') +
          msgsBox(['יוסי נחת על משבצת הפתעה: הזזת כלי יריב.']) + playersBox(pieces, 'blue') + legendBox(),
        modal: rivalModal(pieces) };
    },
    s13() {
      const pieces = baseFlow4();
      const rv = choice.rival === 'yellow' ? 'yellow' : 'red';
      return { turn: 'blue', clock: '00:14:15', pieces, pick: { color: rv, next: 's14-move-back', key: 'rivalPiece' },
        side: turnBox('blue', 'בוחר כלי של היריב.') +
          noteBox('הזזת כלי יריב: <b>בחרו כלי של ' + P[rv] + '</b> מבין הכלים המסומנים בלוח.<br><span class="muted">אפשר לבחור רק כלי שנמצא במסלול המשותף. אחרי הבחירה מטילים קוביית צעדים, והכלי זז אחורה בחצי מהתוצאה.</span>') +
          '<a class="btn wide" href="#s12-choose-rival">החלפת יריב</a>' +
          msgsBox(['יוסי בחר את ' + P[rv] + '.']) + playersBox(pieces, 'blue') + legendBox(),
        castleTip: { [rv]: 'אפשר לבחור רק כלי שנמצא במסלול המשותף.' } };
    },
    s14() {
      const pieces = baseFlow4();
      const rv = choice.rival === 'yellow' ? 'yellow' : 'red';
      const idx = Math.min(choice.rivalPiece || 0, pieces[rv].track.length - 1);
      const from = pieces[rv].track[idx];
      const to = BACK[from.join(',')] || from;
      pieces[rv].track = clone(pieces[rv].track);
      pieces[rv].track[idx] = to;
      return { turn: 'blue', clock: '00:14:21', pieces, ghosts: [[rv, from[0], from[1]]],
        side: turnBox('blue', 'הטיל קוביית צעדים.') +
          diceBox(5, undefined, formula('5 ÷ 2 = 2.5 → 3', 'חצי מהתוצאה, מעוגל למעלה.', 'back')) +
          noteBox('הכלי של ' + P[rv] + ' זז <b>3 צעדים אחורה</b> (חצי מ-5, מעוגל למעלה).<br><span class="muted">העיגול המקווקו מראה איפה הכלי היה.</span>') +
          btn('s15-results', 'המשך', true) +
          '<p class="muted" style="font-size:13px;margin:0">באב הטיפוס: מכאן קופצים לסוף המשחק.</p>' +
          msgsBox(['הכלי של ' + P[rv] + ' חזר 3 צעדים.']) + playersBox(pieces, 'blue') };
    },
  };

  let gameState = null;
  function enterGame(r) {
    gameState = GAME[r.g]();
    $('#side').innerHTML = gameState.side;
    placePieces(gameState);
    startClock(gameState.clock);
    if (gameState.modal) openModal(gameState.modal);
  }

  /* clock (FR-13: updates every second) */
  let clockTimer = null, clockSecs = 0;
  const fmt = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, '0')).join(':');
  function startClock(hms) {
    const [h, m, s] = hms.split(':').map(Number);
    clockSecs = h * 3600 + m * 60 + s;
    $('#clock').textContent = fmt(clockSecs);
    clockTimer = setInterval(() => { clockSecs += 1; $('#clock').textContent = fmt(clockSecs); }, 1000);
  }
  function stopClock() { if (clockTimer) clearInterval(clockTimer); clockTimer = null; }

  /* =====================================================================
     Modal layer
     ===================================================================== */
  function openModal(html) {
    $('#modal').innerHTML = html;
    $('#modal-back').hidden = false;
    const m = $('#modal');
    m.setAttribute('tabindex', '-1');
    setTimeout(() => m.focus({ preventScroll: true }), 0);
  }
  function closeModal() { $('#modal-back').hidden = true; $('#modal').innerHTML = ''; }
  function exitConfirm() {
    openModal('<div class="modal-head"><h2>לצאת לתפריט?</h2></div>' +
      '<div class="modal-body"><p>המשחק הנוכחי לא יישמר בהיסטוריה.</p></div>' +
      '<div class="modal-foot"><a class="btn primary" href="#s01-menu">כן, לצאת</a><button type="button" class="btn" data-close>המשך לשחק</button></div>');
  }

  /* =====================================================================
     History (FR-58 – FR-60)
     ===================================================================== */
  const LV = { easy: 'קל', med: 'בינוני', hard: 'קשה' };
  const HIST = [
    { id: 7, lv: 'med', ts: '31/10/2026 18:42:05', p: ['נועה', 'דנה', 'יוסי', 'עומר'], dur: '00:47:12', isNew: true },
    { id: 6, lv: 'easy', ts: '30/10/2026 20:15:40', p: ['עומר', 'יוסי', '', ''], dur: '00:21:08' },
    { id: 5, lv: 'hard', ts: '29/10/2026 17:03:22', p: ['דנה', 'נועה', 'עומר', ''], dur: '01:05:31' },
    { id: 4, lv: 'med', ts: '28/10/2026 21:30:00', p: ['יוסי', 'דנה', 'נועה', 'עומר'], dur: '00:52:44' },
    { id: 2, lv: 'easy', ts: '27/10/2026 19:12:09', p: ['נועה', 'יוסי', 'דנה', ''], dur: '00:33:17' },
    { id: 1, lv: 'hard', ts: '26/10/2026 16:48:51', p: ['דנה', 'עומר', '', ''], dur: '00:58:02' },
  ];
  const HCOLS = [
    ['id', 'מס\' משחק', 'gameID'], ['lv', 'רמה', 'difficulty'], ['ts', 'תאריך ושעה', 'timestamp'],
    ['p0', 'מקום 1', '1st_place_name'], ['p1', 'מקום 2', '2nd_place_name'], ['p2', 'מקום 3', '3rd_place_name'], ['p3', 'מקום 4', '4rd_place_name'],
    ['dur', 'משך', 'game_duration'],
  ];
  const hist = { filter: 'all', sort: 'id', dir: -1 };
  function enterHistory() { hist.filter = 'all'; hist.sort = 'id'; hist.dir = -1; renderHistory(); }
  function hval(row, key) {
    if (key[0] === 'p' && key.length === 2) return row.p[+key[1]] || '';
    if (key === 'ts') { const [d, t] = row.ts.split(' '); const [dd, mm, yy] = d.split('/'); return yy + mm + dd + t; }
    return row[key];
  }
  function renderHistory() {
    const counts = { all: HIST.length, easy: 0, med: 0, hard: 0 };
    HIST.forEach((r) => { counts[r.lv] += 1; });
    $('#hist-chips').innerHTML = [['all', 'כל הרמות'], ['easy', 'קל'], ['med', 'בינוני'], ['hard', 'קשה']]
      .map(([k, t]) => '<button type="button" class="chip" data-hfilter="' + k + '" aria-pressed="' + (hist.filter === k) + '">' + t + ' (' + counts[k] + ')</button>').join('');
    const rows = HIST.filter((r) => hist.filter === 'all' || r.lv === hist.filter).slice()
      .sort((a, b) => { const x = hval(a, hist.sort), y = hval(b, hist.sort); return (x > y ? 1 : x < y ? -1 : 0) * hist.dir; });
    const head = '<thead><tr>' + HCOLS.map(([k, t, f]) => '<th><button type="button" data-hsort="' + k + '">' + t + (hist.sort === k ? (hist.dir < 0 ? ' ▼' : ' ▲') : ' <span class="muted">↕</span>') + '</button><small>' + f + '</small></th>').join('') + '</tr></thead>';
    const body = '<tbody>' + rows.map((r) => '<tr' + (r.isNew ? ' class="new"' : '') + '><td class="num">' + r.id + (r.isNew ? '<span class="new-tag">חדש</span>' : '') + '</td>' +
      '<td><span class="lvl-dot ' + r.lv + '">' + LV[r.lv] + '</span></td><td class="mono"><span class="ltr">' + r.ts + '</span></td>' +
      r.p.map((n) => (n ? '<td>' + n + '</td>' : '<td class="empty">—</td>')).join('') +
      '<td class="mono">' + r.dur + '</td></tr>').join('') + '</tbody>';
    $('#hist-table').innerHTML = rows.length ? head + body : '<tbody><tr><td style="padding:30px;text-align:center" class="muted">אין משחקים שמורים</td></tr></tbody>';
  }

  /* =====================================================================
     Admin login (FR-61, FR-62)
     ===================================================================== */
  let loginState = 'empty';
  function enterLogin(r) {
    loginState = r.state;
    if (r.state === 'empty') {
      $('#admin-user').value = '';
      $('#admin-pass').value = '';
      $('#login-error').innerHTML = '';
    } else {
      $('#admin-user').value = 'admin';
      $('#admin-pass').value = 'zebra2026';
      $('#login-error').innerHTML = '<div class="err-box">שם המשתמש או הסיסמה שגויים.<small>נותרו 2 ניסיונות לפני חסימה ל-60 שניות.</small></div>';
    }
  }
  function onLogin() {
    if (loginState === 'empty') go('s18-admin-error');
    else go('s19-questions');
  }

  /* =====================================================================
     Question wizard (FR-68 – FR-73)
     ===================================================================== */
  const QS = [
    { lv: 'easy', q: 'מה מייצג ה-M בתבנית MVC?', a: 'Model' },
    { lv: 'easy', q: 'מי קובע את סדרי העדיפויות ב-Scrum?', a: 'Product Owner' },
    { lv: 'easy', q: 'איזו בדיקה מוודאת שמה שעבד ממשיך לעבוד אחרי שינוי?', a: 'בדיקת רגרסיה' },
    { lv: 'med', q: 'איזו תבנית מעדכנת את ה-View כשה-Model משתנה?', a: 'Observer' },
    { lv: 'med', q: 'מה בודקים ב-Verification?', a: 'האם בונים נכון את המוצר' },
    { lv: 'med', q: 'בסקירת Inspection, מי מציג את החומר?', a: 'חבר צוות שאינו הכותב' },
    { lv: 'hard', q: 'איזו תבנית מתאימה להחלפת חוקי הקוביות לפי רמה?', a: 'Strategy' },
    { lv: 'hard', q: 'מתי עלות התיקון של תקלה היא הגבוהה ביותר?', a: 'אצל הלקוח, בזמן הפעלה' },
    { lv: 'hard', q: 'מה מבדיל בין חומרה 2 לחומרה 3 ב<bdi>-Mil-Std 498</bdi>?', a: 'האם יש פתרון עוקף' },
  ];
  const QCOUNT = { all: 33, easy: 12, med: 11, hard: 10 };
  let qFilter = 'all';
  function enterQuestions() { qFilter = 'all'; renderQuestions(); }
  function renderQuestions() {
    $('#q-chips').innerHTML = [['all', 'כל הרמות'], ['easy', 'קלה'], ['med', 'בינונית'], ['hard', 'קשה']]
      .map(([k, t]) => '<button type="button" class="chip" data-qfilter="' + k + '" aria-pressed="' + (qFilter === k) + '">' + t + ' (' + QCOUNT[k] + ')</button>').join('');
    const rows = QS.filter((r) => qFilter === 'all' || r.lv === qFilter);
    const shown = rows.length, total = QCOUNT[qFilter];
    const lvName = { easy: 'קלה', med: 'בינונית', hard: 'קשה' };
    $('#q-table').innerHTML = '<thead><tr><th>#</th><th>רמה</th><th>שאלה</th><th>תשובה נכונה</th><th>פעולות</th></tr></thead><tbody>' +
      rows.map((r, i) => '<tr><td class="num">' + (i + 1) + '</td><td><span class="lvl-dot ' + r.lv + '">' + lvName[r.lv] + '</span></td><td>' + r.q + '</td><td>' + r.a + '</td>' +
        '<td><div class="row-acts"><button type="button" class="btn" data-inactive="עריכת שאלה לא נכללת בתהליך שנבדק באב הטיפוס.">עריכה</button>' +
        (r.lv === 'hard'
          ? '<button type="button" class="btn" aria-disabled="true" data-inactive="אי אפשר למחוק: ברמה קשה יש 10 שאלות, וזה המינימום." title="ברמה קשה יש 10 שאלות – המינימום">מחיקה</button>'
          : '<button type="button" class="btn" data-inactive="מחיקה מבקשת אישור לפני שהשאלה נמחקת. לא פעיל באב הטיפוס.">מחיקה</button>') +
        '</div></td></tr>').join('') +
      '<tr><td colspan="5" class="muted" style="text-align:center;font-size:14px">מוצגות ' + shown + ' מתוך ' + total + ' שאלות (דוגמה).</td></tr></tbody>';
  }

  /* =====================================================================
     Add question (FR-69, FR-71)
     ===================================================================== */
  const AQ_START = { text: 'מה התפקיד של ה-Scrum Master?', answers: ['לוודא שהצוות עובד לפי Scrum', 'לקבוע את סדרי העדיפויות', 'לכתוב את רוב הקוד', 'לקבוע את סדרי העדיפויות'], right: -1 };
  let aq = null;
  function enterAddQ() {
    aq = JSON.parse(JSON.stringify(AQ_START));
    $('#aq-level').value = 'med';
    $('#aq-text').value = aq.text;
    $('#aq-answers').innerHTML = aq.answers.map((a, i) =>
      '<div class="ans-edit"><input type="radio" name="aq-right" id="aq-r' + i + '" value="' + i + '" aria-label="תשובה ' + (i + 1) + ' נכונה">' +
      '<div><input type="text" class="aq-in" data-i="' + i + '" value="' + esc(a) + '" aria-label="תשובה ' + (i + 1) + '" style="width:100%;height:46px;border:1px solid #C3CBD6;border-radius:9px;padding:0 12px;font:inherit;font-size:17px"><div class="err-slot"></div></div></div>').join('') +
      '<div class="err-slot" id="aq-right-err"></div>';
    updateAddQ();
  }
  function aqErrors() {
    const errs = { answers: [], text: '', right: '' };
    if (!aq.text.trim()) errs.text = 'יש לכתוב את השאלה.';
    aq.answers.forEach((a, i) => {
      const t = a.trim();
      if (!t) errs.answers[i] = 'תשובה ' + (i + 1) + ' ריקה.';
      else {
        const j = aq.answers.slice(0, i).findIndex((b) => b.trim() === t);
        if (j >= 0) errs.answers[i] = 'תשובה ' + (i + 1) + ' זהה לתשובה ' + (j + 1) + '. כל תשובה צריכה להיות שונה.';
      }
    });
    if (aq.right < 0) errs.right = 'סמנו תשובה נכונה אחת.';
    const n = (errs.text ? 1 : 0) + errs.answers.filter(Boolean).length + (errs.right ? 1 : 0);
    return { errs, n };
  }
  function updateAddQ() {
    const { errs, n } = aqErrors();
    $('#aq-text').classList.toggle('bad', !!errs.text);
    $$('.aq-in').forEach((inp) => {
      const i = +inp.dataset.i;
      inp.style.borderColor = errs.answers[i] ? 'var(--err)' : '';
      inp.style.background = errs.answers[i] ? 'var(--err-bg)' : '';
      inp.parentElement.querySelector('.err-slot').innerHTML = errs.answers[i] ? '<div class="err-msg">' + errs.answers[i] + '</div>' : '';
    });
    $('#aq-right-err').innerHTML = errs.right ? '<div class="err-msg">' + errs.right + '</div>' : '';
    $('#aq-summary').innerHTML = n
      ? '<div class="summary bad">אי אפשר לשמור: יש לתקן ' + (n === 1 ? 'דבר אחד' : n + ' דברים') + '.</div>'
      : '<div class="summary good">✓ השאלה תקינה. אפשר לשמור.</div>';
    $('#aq-save').setAttribute('aria-disabled', n ? 'true' : 'false');
  }

  /* =====================================================================
     Events
     ===================================================================== */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const inactive = t.closest('[data-inactive]');
    if (inactive) { e.preventDefault(); toast(inactive.dataset.inactive); return; }
    if (t.closest('[data-close]')) { closeModal(); if (gameState && gameState.modal && !$('#v-game').hidden) openModal(gameState.modal); return; }
    if (t.closest('#exit-btn')) { exitConfirm(); return; }

    const seg = t.closest('#count-seg button');
    if (seg) { setup.count = +seg.dataset.count; updateSetupUI(); return; }
    const lvl = t.closest('#levels .level');
    if (lvl) { setup.level = lvl.dataset.level; updateSetupUI(); return; }
    const sw = t.closest('.swatch');
    if (sw) { const i = +sw.closest('.prow').dataset.i; setup.players[i].color = sw.dataset.c; updateSetupUI(); return; }
    if (t.closest('#start-btn')) { onStart(); return; }

    const piece = t.closest('#board .piece');
    if (piece && gameState) { onPiece(piece); return; }

    const ans = t.closest('.ans[data-ans]');
    if (ans) {
      const i = +ans.dataset.ans;
      choice.ans = i;
      choice.ansRight = i === QUESTION.right;
      saveChoice();
      go(choice.ansRight ? 's10-answer-right' : 's09-answer-wrong');
      return;
    }
    const rival = t.closest('.rival');
    if (rival) {
      if (rival.getAttribute('aria-disabled') === 'true') { e.preventDefault(); toast(rival.dataset.why); return; }
      choice.rival = rival.dataset.rival;
      choice.rivalPiece = 0;
      saveChoice();
      return; // the link itself navigates
    }
    const hf = t.closest('[data-hfilter]');
    if (hf) { hist.filter = hf.dataset.hfilter; renderHistory(); return; }
    const hs = t.closest('[data-hsort]');
    if (hs) { const k = hs.dataset.hsort; hist.dir = hist.sort === k ? -hist.dir : 1; hist.sort = k; renderHistory(); return; }
    const qf = t.closest('[data-qfilter]');
    if (qf) { qFilter = qf.dataset.qfilter; renderQuestions(); return; }
    if (t.closest('#login-btn')) { onLogin(); return; }
    if (t.closest('#aq-save')) {
      if ($('#aq-save').getAttribute('aria-disabled') === 'true') { toast('קודם מתקנים את מה שמסומן באדום.'); return; }
      go('s19-questions');
      setTimeout(() => toast('השאלה נוספה למאגר ותופיע מהמשחק הבא.'), 50);
    }
  });

  function onPiece(piece) {
    const st = gameState;
    const color = piece.dataset.color;
    const where = piece.dataset.where;
    if (where === 'ghost') { toast('כאן הכלי עמד לפני התזוזה.'); return; }
    if (piece.classList.contains('pick')) {
      const idx = +piece.dataset.idx;
      if (st.pick.key === 's06') choice.s06 = idx; else choice.rivalPiece = idx;
      saveChoice();
      go(st.pick.next);
      return;
    }
    if (where === 'castle' && st.castleTip && st.castleTip[color]) { toast(st.castleTip[color]); return; }
    if (where === 'track' && st.trackTip && st.trackTip[color]) { toast(st.trackTip[color]); return; }
    if (st.pick) { toast('בחרו אחד מהכלים המסומנים בלוח (' + P[st.pick.color] + ').'); return; }
    if (color !== st.turn) { toast('זה כלי של ' + P[color] + '. עכשיו התור של ' + P[st.turn] + '.'); return; }
    toast('כדי להזיז כלי קודם מטילים.');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal-back').hidden && $('#modal [data-close]')) closeModal();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('pick')) { e.preventDefault(); onPiece(e.target); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id && t.id.indexOf('pname-') === 0) { setup.players[+t.id.split('-')[1]].name = t.value; updateSetupUI(); return; }
    if (t.id === 'aq-text') { aq.text = t.value; updateAddQ(); return; }
    if (t.classList.contains('aq-in')) { aq.answers[+t.dataset.i] = t.value; updateAddQ(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.name === 'aq-right') { aq.right = +e.target.value; updateAddQ(); }
  });

  /* ---------- start ---------- */
  buildBoard();
  window.addEventListener('hashchange', route);
  route();
})();
