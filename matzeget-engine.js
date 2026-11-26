/* מנוע "מצגת חיה" — מצגת אינטראקטיבית: חשיפה הדרגתית, פעילויות, חידונים, הקראה ושמירת מקום.
   הנתונים מגיעים מ-window.MATZEGET = { id, title, slides:[...] } */
(function () {
  'use strict';
  const D = window.MATZEGET;
  if (!D) return;
  const embed = /[?&]embed=1/.test(location.search);
  if (embed) document.body.classList.add('embed');
  const KEY = 'matzeget_' + D.id;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ICON = {
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg>',
    tts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/></svg>'
  };

  // ---------- הקראה ----------
  const TTS = (function () {
    const ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    let on = false, voice = null;
    try { on = localStorage.getItem('madrich_tts') === '1'; } catch (e) {}
    function pick() { if (!ok) return; const v = speechSynthesis.getVoices().filter((x) => /^(he|iw)/i.test(x.lang)); voice = v.find((x) => /google|natural|online/i.test(x.name)) || v[0] || null; }
    if (ok) { pick(); speechSynthesis.onvoiceschanged = pick; }
    function text(node) {
      const c = node.cloneNode(true);
      c.querySelectorAll('button:not(.card), .rv:not(.in), .no-read, .chip, svg, .spot').forEach((x) => x.remove());
      c.querySelectorAll('td, th, li, p, h4, div, b').forEach((x) => x.append('. '));
      return c.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}]/gu, ' ')
        .replace(/—|–/g, ', ').replace(/([.!?:,])\s*\./g, '$1').replace(/\s*\.\s*(\.\s*)+/g, '. ').replace(/\s+/g, ' ').trim();
    }
    function speak(t) {
      if (!ok || !t) return;
      const parts = t.match(/[^.!?:]+[.!?:]*/g) || [t]; let cur = ''; const out = [];
      parts.forEach((p) => { if ((cur + p).length > 180 && cur) { out.push(cur); cur = p; } else cur += p; });
      if (cur.trim()) out.push(cur);
      out.forEach((s) => { const u = new SpeechSynthesisUtterance(s.trim()); u.lang = 'he-IL'; if (voice) u.voice = voice; speechSynthesis.speak(u); });
    }
    return {
      ok, get on() { return on; },
      toggle() { on = !on; try { localStorage.setItem('madrich_tts', on ? '1' : '0'); } catch (e) {} if (!on) this.stop(); return on; },
      stop() { if (ok) speechSynthesis.cancel(); },
      read(node) { this.stop(); speak(text(node)); }
    };
  })();

  // ---------- עזרי בנייה ----------
  function head(s, wrap) {
    const h = el('div', 'mz-headwrap');
    if (s.kick) h.appendChild(el('div', 'mz-head', '<span class="k">' + s.kick + '</span>'));
    if (s.title) h.appendChild(el('h2', 'mz-title', s.title));
    wrap.appendChild(h);
    if (s.lead) wrap.appendChild(el('p', 'mz-lead', s.lead));
  }
  function img(src, alt) { const d = el('div', 'mz-img'); const i = el('img'); i.src = src; i.alt = alt || ''; i.loading = 'lazy'; d.appendChild(i); return d; }
  function note(s, wrap, reveal) { if (s.note) { const n = el('div', 'mz-note' + (reveal ? ' rv' : ''), s.note); wrap.appendChild(n); } }

  // ---------- סוגי שקפים ----------
  const R = {};

  R.cover = function (s, sl, inner) {
    sl.classList.add('cover');
    if (s.kick) inner.appendChild(el('div', 'kick', s.kick));
    inner.appendChild(el('h1', 'mz-title', s.title));
    if (s.lead) inner.appendChild(el('p', 'mz-lead', s.lead));
    const b = el('button', 'btn gold go no-read', 'מתחילים ←'); b.onclick = () => go(cur + 1); inner.appendChild(b);
    if (s.img) sl.appendChild(img(s.img, s.title));
  };

  R.points = function (s, sl, inner) {
    head(s, inner);
    const body = el('div', 'mz-body'); const col = el('div', 'mz-col');
    if (s.flow) col.appendChild(flowEl(s.flow, true));
    const ul = el('ul', 'pts');
    (s.items || []).forEach((t) => ul.appendChild(el('li', s.static ? '' : 'rv', '<span>' + t + '</span>')));
    col.appendChild(ul);
    note(s, col, !s.static);
    body.appendChild(col);
    if (s.img) body.appendChild(img(s.img, s.title));
    inner.appendChild(body);
  };

  function flowEl(f, play) {
    const w = el('div', 'flow');
    f.forEach((b, i) => {
      if (i) w.appendChild(el('span', 'ar', '←'));
      w.appendChild(el('div', 'box', '<b>' + b.h + '</b>' + (b.s ? '<span>' + b.s + '</span>' : '')));
    });
    if (play) {
      const boxes = () => $$('.box', w); let t = null;
      w.style.cursor = 'pointer'; w.title = 'לחצו להרצת הזרימה';
      w.onclick = () => { clearInterval(t); let i = 0; const bs = boxes(); const tick = () => { bs.forEach((b, j) => b.classList.toggle('hot', j === i)); i++; if (i > bs.length) { clearInterval(t); bs.forEach((b) => b.classList.remove('hot')); } }; tick(); t = setInterval(tick, 800); };
    }
    return w;
  }

  R.flow = function (s, sl, inner) {
    head(s, inner);
    const col = el('div', 'mz-col');
    const f = flowEl(s.boxes, true); col.appendChild(f);
    const c = el('div', 'ctl no-read'); const b = el('button', 'btn gold', '▶ הריצו את הזרימה'); b.onclick = () => f.click(); c.appendChild(b); col.appendChild(c);
    if (s.items) { const ul = el('ul', 'pts'); s.items.forEach((t) => ul.appendChild(el('li', 'rv', '<span>' + t + '</span>'))); col.appendChild(ul); }
    note(s, col, true);
    inner.appendChild(col);
  };

  R.cards = function (s, sl, inner) {
    head(s, inner);
    const n = s.cols || Math.min(s.cards.length, 3);
    const g = el('div', 'cards c' + n);
    s.cards.forEach((c) => {
      const open = !!c.more;
      const k = el(open ? 'button' : 'div', 'card' + (s.reveal ? ' rv' : ''));
      if (open) k.type = 'button';
      let h = '';
      if (c.img) h += '<div class="ph"><img src="' + c.img + '" alt="" loading="lazy"></div>';
      else if (c.ic) h += '<div class="ic">' + c.ic + '</div>';
      h += '<h4>' + c.h + '</h4>';
      if (c.t) h += '<p>' + c.t + '</p>';
      if (open) h += '<p class="more">' + c.more + '</p><span class="tap">לחצו לפרטים +</span>';
      k.innerHTML = h;
      if (open) k.onclick = () => { k.classList.toggle('open'); if (TTS.on && k.classList.contains('open')) TTS.read(k); };
      g.appendChild(k);
    });
    inner.appendChild(g);
    note(s, inner, !!s.reveal);
  };

  R.cycle = function (s, sl, inner) {
    head(s, inner);
    const g = el('div', 'cyc');
    const order = [0, 1, 3, 2]; // סידור ויזואלי עם כיוון השעון (RTL): ימין-עליון, שמאל-עליון, שמאל-תחתון, ימין-תחתון
    const st = s.steps.map((x, i) => el('div', 'st', '<span class="n">' + (i + 1) + '</span><h4>' + x.h + (x.en ? ' <small>' + x.en + '</small>' : '') + '</h4><p>' + x.t + '</p>'));
    order.forEach((i) => st[i] && g.appendChild(st[i]));
    inner.appendChild(g);
    const c = el('div', 'ctl no-read'); const play = el('button', 'btn gold', '▶ הפעילו מחזור'); const step = el('button', 'btn ghost', 'צעד אחד'); const cnt = el('span', 'counter', '');
    c.append(play, step, cnt); inner.appendChild(c);
    let i = -1, cycles = 0, t = null;
    function adv() { i = (i + 1) % st.length; if (i === 0 && cnt.dataset.started) cycles++; cnt.dataset.started = 1; st.forEach((e, j) => e.classList.toggle('hot', j === i)); cnt.textContent = 'שלב ' + (i + 1) + ' מתוך ' + st.length + (cycles ? ' · מחזורים שהושלמו: ' + cycles : ''); }
    step.onclick = () => { clearInterval(t); play.textContent = '▶ הפעילו מחזור'; adv(); };
    play.onclick = () => { if (t) { clearInterval(t); t = null; play.textContent = '▶ הפעילו מחזור'; return; } adv(); t = setInterval(adv, 1100); play.textContent = '⏸ עצרו'; };
    sl._leave = () => { clearInterval(t); t = null; play.textContent = '▶ הפעילו מחזור'; };
    note(s, inner, false);
  };

  R.hotspots = function (s, sl, inner) {
    head(s, inner);
    const body = el('div', 'mz-body');
    const hs = el('div', 'hs'); const box = el('div', 'hs-box'); box.innerHTML = SVG[s.svg] || ''; hs.appendChild(box);
    const panel = el('div', 'hs-panel');
    const card = el('div', 'box', '<h4>' + (s.startH || 'לחצו על הנקודות') + '</h4><p class="t">' + (s.startT || 'כל נקודה מסמנת רכיב. לחצו כדי לגלות מה הוא עושה.') + '</p>');
    const prog = el('div', 'counter', '');
    panel.append(card, prog);
    const seen = new Set();
    s.spots.forEach((p, i) => {
      const b = el('button', 'spot', String(i + 1)); b.style.right = p.x + '%'; b.style.top = p.y + '%'; b.setAttribute('aria-label', p.h);
      b.onclick = () => {
        $$('.spot', box).forEach((x) => x.classList.remove('act')); b.classList.add('act', 'seen'); seen.add(i);
        card.innerHTML = '<h4>' + (i + 1) + '. ' + p.h + '</h4><p class="t">' + p.t + '</p>';
        prog.textContent = 'גיליתם ' + seen.size + ' מתוך ' + s.spots.length + (seen.size === s.spots.length ? ' — כל הכבוד! 🎉' : '');
        if (TTS.on) TTS.read(card);
      };
      box.appendChild(b);
    });
    prog.textContent = 'גיליתם 0 מתוך ' + s.spots.length;
    body.append(hs, panel); inner.appendChild(body);
  };

  R.sort = function (s, sl, inner) {
    head(s, inner);
    const w = el('div', 'sort');
    const pool = el('div', 'pool'); const bins = el('div', 'bins'); bins.style.gridTemplateColumns = 'repeat(' + s.bins.length + ',1fr)';
    const fb = el('div', 'fb'); let sel = null, done = 0;
    const binEls = s.bins.map((b, i) => { const e = el('div', 'bin', '<h4>' + b + '</h4><div class="got"></div>'); e.onclick = () => drop(i); bins.appendChild(e); return e; });
    shuffle(s.items).forEach((it) => {
      const c = el('button', 'chip', it.t); c._it = it;
      c.onclick = () => { if (c.classList.contains('ok')) return; $$('.chip.sel', pool).forEach((x) => x.classList.remove('sel')); sel = c; c.classList.add('sel'); binEls.forEach((b) => b.classList.add('ready')); fb.textContent = ''; fb.className = 'fb'; };
      pool.appendChild(c);
    });
    function drop(i) {
      if (!sel) { fb.className = 'fb bad'; fb.textContent = 'קודם בחרו פריט, ואז את הקבוצה שלו.'; return; }
      const it = sel._it; binEls.forEach((b) => b.classList.remove('ready'));
      if (it.b === i) {
        sel.classList.remove('sel'); sel.classList.add('ok'); $('.got', binEls[i]).appendChild(sel); done++;
        fb.className = 'fb ok'; fb.innerHTML = '✓ נכון' + (it.why ? ' — ' + it.why : '');
        if (done === s.items.length) { fb.innerHTML = '🎉 מעולה! מיינתם את כל ' + done + ' הפריטים.' + (s.done ? ' ' + s.done : ''); }
      } else {
        const c = sel; c.classList.remove('sel'); c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 450);
        fb.className = 'fb bad'; fb.innerHTML = '✗ לא בדיוק' + (it.hint ? ' — ' + it.hint : '. נסו קבוצה אחרת.');
      }
      sel = null;
    }
    w.append(pool, bins, fb); inner.appendChild(w);
  };

  R.quiz = function (s, sl, inner) {
    if (s.title) head({ title: s.title, kick: s.kick || 'בדיקת הבנה' }, inner);
    const w = el('div', 'quiz'); w.appendChild(el('div', 'q', s.q));
    const o = el('div', 'opts'); const fb = el('div', 'fb');
    shuffle(s.options).forEach((op) => {
      const b = el('button', 'opt', op.t);
      b.onclick = () => {
        if (op.ok) { b.classList.add('ok'); $$('.opt', o).forEach((x) => x.disabled = true); fb.className = 'fb ok'; fb.innerHTML = '✓ ' + (op.fb || 'נכון!') + (s.why ? ' ' + s.why : ''); }
        else { b.classList.add('bad'); b.disabled = true; fb.className = 'fb bad'; fb.innerHTML = '✗ ' + (op.fb || 'לא בדיוק, נסו שוב.'); }
        if (TTS.on) TTS.read(fb);
      };
      o.appendChild(b);
    });
    w.append(o, fb); inner.appendChild(w);
  };

  R.order = function (s, sl, inner) {
    head(s, inner);
    const w = el('div', 'order');
    const slots = el('div', 'slots'); const pool = el('div', 'pool'); const fb = el('div', 'fb');
    const sEls = s.steps.map((x, i) => { const e = el('div', 'slot', '<span class="n">' + (i + 1) + '</span>'); slots.appendChild(e); return e; });
    let k = 0;
    shuffle(s.steps.map((x, i) => Object.assign({ i }, x))).forEach((x) => {
      const c = el('button', 'chip', x.h);
      c.onclick = () => {
        if (x.i === k) {
          sEls[k].classList.add('fill'); sEls[k].innerHTML = '<span class="n">' + (k + 1) + '</span><b>' + x.h + '</b>' + (x.s ? '<span>' + x.s + '</span>' : '');
          c.remove(); k++; fb.className = 'fb ok'; fb.textContent = k === s.steps.length ? '🎉 ' + (s.done || 'הסדר נכון!') : '✓ נכון. מה בא אחר כך?';
        } else { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 450); fb.className = 'fb bad'; fb.textContent = '✗ זה עוד לא השלב הזה. ' + (s.hint || 'חשבו מה חייב לקרות קודם.'); }
      };
      pool.appendChild(c);
    });
    w.append(slots, pool, fb); inner.appendChild(w);
  };

  R.compare = function (s, sl, inner) {
    head(s, inner);
    const t = el('table', 'cmp');
    let h = '<thead><tr><th></th>' + s.cols.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
    s.rows.forEach((r) => { h += '<tr><th>' + r.h + '</th>' + r.cells.map((c, i) => '<td class="col rv" data-g="' + i + '">' + c + '</td>').join('') + '</tr>'; });
    t.innerHTML = h + '</tbody>'; inner.appendChild(t);
    note(s, inner, false);
  };

  R.power = function (s, sl, inner) {
    head(s, inner);
    const w = el('div', 'pwr');
    const mk = (title, sub) => { const d = el('div', 'dev', '<h4>' + title + '</h4><p class="t">' + sub + '</p>'); const c = el('div', 'cells'); for (let i = 0; i < 8; i++) c.appendChild(el('div', 'cell', '—')); d.appendChild(c); return d; };
    const ram = mk('🧠 זיכרון RAM', 'מהיר מאוד · נדיף'); const ssd = mk('💾 כונן SSD', 'איטי יותר · קבוע');
    w.append(ram, ssd); inner.appendChild(w);
    const files = ['מסמך', 'דפדפן', 'שיר', 'משחק', 'תמונה', 'מצגת', 'קוד', 'וידאו'];
    let n = 0, on = true;
    const c = el('div', 'ctl no-read'); const open = el('button', 'btn gold', '📂 פתחו תוכנה'); const save = el('button', 'btn', '💾 שמרו לכונן'); const pw = el('button', 'btn ghost', '🔌 כבו את המחשב');
    const fb = el('div', 'fb');
    const cells = (d) => $$('.cell', d);
    open.onclick = () => { if (!on) { fb.className = 'fb bad'; fb.textContent = 'המחשב כבוי — הדליקו אותו קודם.'; return; } if (n >= 8) return; const cl = cells(ram)[n]; cl.textContent = files[n]; cl.classList.add('full'); n++; fb.className = 'fb ok'; fb.textContent = 'התוכנה נטענה ל-RAM — המעבד עובד מולה במהירות.'; };
    save.onclick = () => { if (!on) return; let k = 0; cells(ram).forEach((cl, i) => { if (cl.classList.contains('full')) { const d = cells(ssd)[i]; d.textContent = cl.textContent; d.classList.add('full'); k++; } }); fb.className = 'fb ok'; fb.textContent = k ? 'נשמר! מה שבכונן יישאר גם בלי חשמל.' : 'אין עדיין מה לשמור — פתחו קודם תוכנה.'; };
    pw.onclick = () => {
      on = !on; ram.classList.toggle('off', !on); ssd.classList.toggle('off', !on);
      if (!on) { cells(ram).forEach((cl) => { cl.textContent = '—'; cl.classList.remove('full'); }); n = 0; pw.textContent = '⚡ הדליקו מחדש'; fb.className = 'fb bad'; fb.textContent = 'החשמל כבה: ה-RAM התרוקן לגמרי (זיכרון נדיף), אבל מה שנשמר ב-SSD נשאר.'; }
      else { pw.textContent = '🔌 כבו את המחשב'; fb.className = 'fb ok'; fb.textContent = 'המחשב דלק. ה-RAM ריק ומתמלא מחדש כשפותחים תוכנות — מתוך הכונן.'; }
      if (TTS.on) TTS.read(fb);
    };
    c.append(open, save, pw); inner.append(c, fb);
    note(s, inner, false);
  };

  R.summary = function (s, sl, inner) {
    R.cards(Object.assign({}, s, { reveal: true }), sl, inner);
    if (s.links) {
      const c = el('div', 'ctl no-read');
      s.links.forEach((l) => { const a = el('a', 'btn ' + (l.gold ? 'gold' : 'ghost'), l.t); a.href = l.href; a.style.textDecoration = 'none'; if (embed) a.target = '_top'; c.appendChild(a); });
      inner.appendChild(c);
    }
  };

  // ---------- איורים ----------
  const SVG = {
    motherboard: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<rect x="4" y="4" width="392" height="292" rx="10" fill="#1f5a43" stroke="#0f3a2a" stroke-width="3"/>' +
      '<g stroke="#2d7a5a" stroke-width="1.2" fill="none" opacity=".8"><path d="M60 40h80v60M200 70h40v-40M180 160h120M60 150h50v80M250 230h80M150 230v40"/></g>' +
      // לוח פינות חיבור (I/O) בצד
      '<rect x="10" y="20" width="28" height="120" rx="3" fill="#9aa4ad"/><rect x="14" y="28" width="20" height="14" fill="#3a4450"/><rect x="14" y="50" width="20" height="14" fill="#3a4450"/><rect x="14" y="72" width="20" height="10" fill="#2a6fdb"/><rect x="14" y="88" width="20" height="10" fill="#2a6fdb"/><rect x="14" y="106" width="20" height="24" fill="#3a4450"/>' +
      // מעבד
      '<rect x="150" y="40" width="80" height="80" rx="6" fill="#c9ccd1" stroke="#7d848c" stroke-width="2"/><rect x="166" y="56" width="48" height="48" rx="4" fill="#5b636d"/><text x="190" y="85" text-anchor="middle" font-size="12" font-family="Heebo,sans-serif" font-weight="700" fill="#fff">CPU</text>' +
      // זיכרון
      '<g fill="#0f2f22" stroke="#d6b34a" stroke-width="1.5"><rect x="262" y="30" width="10" height="110" rx="2"/><rect x="278" y="30" width="10" height="110" rx="2"/><rect x="294" y="30" width="10" height="110" rx="2"/><rect x="310" y="30" width="10" height="110" rx="2"/></g>' +
      '<rect x="279" y="32" width="8" height="106" fill="#3fa36a"/><rect x="311" y="32" width="8" height="106" fill="#3fa36a"/>' +
      // חשמל 24 פין
      '<rect x="352" y="40" width="22" height="84" rx="3" fill="#e9e9e9" stroke="#999"/><g fill="#999"><rect x="356" y="46" width="5" height="5"/><rect x="365" y="46" width="5" height="5"/><rect x="356" y="56" width="5" height="5"/><rect x="365" y="56" width="5" height="5"/><rect x="356" y="66" width="5" height="5"/><rect x="365" y="66" width="5" height="5"/><rect x="356" y="76" width="5" height="5"/><rect x="365" y="76" width="5" height="5"/><rect x="356" y="86" width="5" height="5"/><rect x="365" y="86" width="5" height="5"/><rect x="356" y="96" width="5" height="5"/><rect x="365" y="96" width="5" height="5"/></g>' +
      // שבב גשר / chipset
      '<rect x="250" y="175" width="50" height="50" rx="4" fill="#5b636d"/><circle cx="275" cy="200" r="12" fill="#7d848c"/>' +
      // חריצי PCIe
      '<g fill="#14181d"><rect x="60" y="170" width="160" height="12" rx="2"/><rect x="60" y="205" width="160" height="12" rx="2"/><rect x="60" y="240" width="100" height="10" rx="2"/></g>' +
      // SATA
      '<g fill="#e05a2b"><rect x="335" y="180" width="18" height="12" rx="2"/><rect x="335" y="198" width="18" height="12" rx="2"/><rect x="358" y="180" width="18" height="12" rx="2"/><rect x="358" y="198" width="18" height="12" rx="2"/></g>' +
      // BIOS + סוללה
      '<rect x="200" y="250" width="26" height="18" rx="2" fill="#2b2f35"/><text x="213" y="263" text-anchor="middle" font-size="7" fill="#d6b34a" font-family="Heebo,sans-serif">BIOS</text><circle cx="260" cy="258" r="13" fill="#d7dade" stroke="#9aa"/>' +
      '</svg>'
  };

  // ---------- בנייה ----------
  const stage = $('#mzStage'); const dotsEl = $('#mzDots'); const countEl = $('#mzCount');
  const slides = D.slides.map((s, i) => {
    const sl = el('section', 'mz-slide'); sl.setAttribute('aria-roledescription', 'שקף'); sl.setAttribute('aria-label', (i + 1) + ' מתוך ' + D.slides.length);
    const inner = el('div', 'mz-inner'); sl.appendChild(inner);
    (R[s.type] || R.points)(s, sl, inner);
    // קבוצות חשיפה
    const groups = []; const map = {};
    $$('.rv', sl).forEach((e) => { const g = e.dataset.g; if (g != null) { if (!map[g]) { map[g] = []; groups.push(map[g]); } map[g].push(e); } else groups.push([e]); });
    sl._groups = groups; sl._shown = 0;
    stage.appendChild(sl);
    const d = el('button'); d.setAttribute('aria-label', 'שקף ' + (i + 1)); d.title = s.title || ''; d.onclick = () => go(i, true); dotsEl.appendChild(d);
    return sl;
  });

  let cur = 0;
  try { const v = Number(localStorage.getItem(KEY)); if (v > 0 && v < slides.length) cur = v; } catch (e) {}

  function showUpTo(sl, n, instant) {
    sl.classList.toggle('instant', !!instant);
    sl._groups.forEach((g, i) => g.forEach((e) => e.classList.toggle('in', i < n)));
    sl._shown = n;
  }
  function go(i, full) {
    if (i < 0 || i >= slides.length) return;
    const old = slides[cur]; if (old._leave) old._leave();
    const back = i < cur;
    slides.forEach((sl, j) => { sl.classList.toggle('on', j === i); sl.classList.toggle('prev', j < i); });
    cur = i;
    const sl = slides[i];
    if (back || full) showUpTo(sl, sl._groups.length, true); else if (sl._shown === 0) showUpTo(sl, 0);
    sl.querySelector('.mz-inner').scrollTop = 0;
    $$('button', dotsEl).forEach((d, j) => { d.className = j === i ? 'cur' : (j < i ? 'done' : ''); });
    countEl.textContent = (i + 1) + ' מתוך ' + slides.length;
    $('#mzPrev').disabled = i === 0;
    try { localStorage.setItem(KEY, String(i)); } catch (e) {}
    TTS.stop(); if (TTS.on) setTimeout(() => TTS.read(sl), 380);
  }
  function next() {
    const sl = slides[cur];
    if (sl._shown < sl._groups.length) { showUpTo(sl, sl._shown + 1); if (TTS.on) { TTS.stop(); TTS.read(el('div', '', sl._groups[sl._shown - 1].map((e) => e.outerHTML.replace(/class="[^"]*"/, '')).join(' '))); } return; }
    go(cur + 1);
  }
  function prev() { go(cur - 1); }

  $('#mzNext').innerHTML = ICON.next; $('#mzPrev').innerHTML = ICON.prev;
  $('#mzNext').onclick = next; $('#mzPrev').onclick = prev;
  const tb = $('#mzTts'); tb.innerHTML = ICON.tts;
  if (!TTS.ok) tb.style.display = 'none';
  tb.classList.toggle('on', TTS.on);
  tb.onclick = () => { const on = TTS.toggle(); tb.classList.toggle('on', on); tb.title = on ? 'הקראה פעילה — לחצו לכיבוי' : 'הקראת השקף'; if (on) TTS.read(slides[cur]); };
  const fs = $('#mzFull'); fs.innerHTML = ICON.full;
  fs.onclick = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => window.open(location.pathname, '_blank')); else window.open(location.pathname, '_blank'); };
  const rs = $('#mzRestart'); rs.innerHTML = ICON.restart; rs.onclick = () => { slides.forEach((s) => showUpTo(s, 0)); go(0); };

  document.addEventListener('keydown', (e) => {
    if (/input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft' || e.key === 'PageDown' || (e.key === ' ' && e.target.tagName !== 'BUTTON')) { e.preventDefault(); next(); }
    else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') go(0, true); else if (e.key === 'End') go(slides.length - 1, true);
  });
  let tx = null, ty = 0;
  stage.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (tx == null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx > 0) next(); else prev(); }
  });

  go(cur, cur > 0);
  window.MATZEGET_API = { go, next, prev, get cur() { return cur; }, count: slides.length };
})();
