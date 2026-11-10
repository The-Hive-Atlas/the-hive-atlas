/* The Hive Atlas: Honey Production map.
   Reads window.HIVE_HONEY (data/honey-production.js) and window.HIVE_SHAPES (data/state-shapes.js). */
(function () {
  var H = window.HIVE_HONEY, SH = window.HIVE_SHAPES, HEX = window.HIVE_HEX_LAYOUT;
  if (!H || !SH || !HEX) return;

  // Language helpers (js/i18n.js); English fallbacks if it is missing
  var I = window.I18N || { lang: 'en', T: function (s, v) { return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : s; },
    N: function (x, d) { d = d || 0; return Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); },
    PCT: function (x, d) { return Number(x).toFixed(d || 0) + '%'; }, NM: function (s) { return s; }, ISO: function (s) { return s; }, lower: function (s) { return s.toLowerCase(); }, sep: ', ' };
  var T = I.T, NUM = I.N, PCT = I.PCT, NM = I.NM, ISO = I.ISO, SEP = I.sep;
  var LOC = ({ fr: 'fr-FR', es: 'es-ES', ar: 'ar' })[I.lang] || 'en-US';
  // Dollar amounts: $3.05 in English and Arabic, 3,05 $ in French and Spanish
  function USD(txt) { return I.lang === 'fr' || I.lang === 'es' ? txt + '\u00a0$' : ISO('$' + txt); }
  var EN_NAMES = {}; for (var nk in H.names) { EN_NAMES[nk] = H.names[nk]; H.names[nk] = NM(H.names[nk]); }

  var NS = 'http://www.w3.org/2000/svg';
  var F = {}; H.fields.forEach(function (f, i) { F[f] = i; });
  var STATES = Object.keys(SH.states).sort(function (a, b) { return H.names[a] < H.names[b] ? -1 : 1; });
  var YEARS = H.years.slice(), OTHER = {}; H.otherYears.forEach(function (y) { OTHER[y] = true; });
  var BASE = H.source.cpiBaseYear;

  // field: which column to read; dollars: has an inflation-adjusted twin
  var MEASURES = [
    { id: 'yield', field: 'yield_lb', label: T('Honey per colony'), short: T('lb per colony'), unit: 'lb1', share: false },
    { id: 'production', field: 'production_lb', label: T('Honey produced'), short: T('lb of honey'), unit: 'lbbig', share: true },
    { id: 'colonies', field: 'colonies', label: T('Honey-producing colonies'), short: T('colonies'), unit: 'count', share: true },
    { id: 'price', field: 'price_usd_lb', dollars: true, label: T('Average price per pound'), short: T('per lb'), unit: 'price', share: false },
    { id: 'value', field: 'value_usd', dollars: true, label: T('Value of honey produced'), short: T('value'), unit: 'usd', share: true },
    { id: 'stocks', field: 'stocks_lb', label: T('Stocks held by producers, Dec. 15'), short: T('lb in stock'), unit: 'lbbig', share: true }
  ];
  var M = {}; MEASURES.forEach(function (m) { M[m.id] = m; });
  var TABLE_COLS = ['colonies', 'yield', 'production', 'price', 'value', 'stocks'];

  var latest = YEARS[YEARS.length - 1];
  var st = { style: 'hex', measure: 'yield', mode: 'year', key: latest, dollars: 'real', sel: 'US', sortKey: null, sortDir: -1, filter: '' };
  try { var saved = localStorage.getItem('hive-map-style'); if (saved === 'hex' || saved === 'shapes') st.style = saved; } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Values ---------- */
  function fieldOf(mid) { var m = M[mid]; return m.dollars && st.dollars === 'real' ? m.field + '_real' : m.field; }

  // Returns { v: number|null, status: 'ok'|'grouped'|'na'|'partial' }
  function valY(code, mid, y) {
    var row = H.values[code] && H.values[code][y];
    if (!row) return { v: null, status: (code !== 'US' && code !== 'OTH' && OTHER[y]) ? 'grouped' : 'na' };
    var v = row[F[fieldOf(mid)]];
    return v == null ? { v: null, status: 'na' } : { v: v, status: 'ok' };
  }

  // Multi-year windows end in the last year most states were still published separately
  var COMMON_END = (function () {
    var counts = YEARS.map(function (y) { return STATES.filter(function (c) { return H.values[c] && H.values[c][y]; }).length; });
    var top = Math.max.apply(null, counts), last = YEARS[0];
    YEARS.forEach(function (y, i) { if (counts[i] >= 0.6 * top) last = y; });
    return last;
  })();
  var MIN_SHARE = 0.8;
  function span(a, b) { return YEARS.filter(function (y) { return y >= a && y <= b; }); }
  var WINDOWS = {
    w5: { years: span(COMMON_END - 4, COMMON_END) },
    w10: { years: span(COMMON_END - 9, COMMON_END) },
    all: { years: span(YEARS[0], COMMON_END) },
    full: { years: YEARS.slice(), own: true }
  };
  WINDOWS.w5.label = T('5 years, {a}–{b}', { a: COMMON_END - 4, b: COMMON_END });
  WINDOWS.w10.label = T('10 years, {a}–{b}', { a: COMMON_END - 9, b: COMMON_END });
  WINDOWS.all.label = T('All years, {a}–{b}', { a: YEARS[0], b: COMMON_END });
  WINDOWS.full.label = T('Each state’s full record, {a}–{b}', { a: YEARS[0], b: latest });
  var WIN_ORDER = ['w5', 'w10', 'all', 'full'];

  function valA(code, mid, w) {
    var ys = WINDOWS[w].years, vals = ys.map(function (y) { return valY(code, mid, y); });
    var ok = vals.filter(function (r) { return r.status === 'ok'; });
    if (!ok.length) return { v: null, status: vals.every(function (r) { return r.status === 'grouped'; }) ? 'grouped' : 'na' };
    var need = WINDOWS[w].own ? 5 : Math.ceil(MIN_SHARE * ys.length);
    if (ok.length < need) return { v: null, status: 'partial', n: ok.length, of: ys.length };
    var s = 0; ok.forEach(function (r) { s += r.v; });
    return { v: s / ok.length, status: 'ok', n: ok.length, of: ys.length };
  }
  function val(code, mid, key) { return st.mode === 'avg' ? valA(code, mid, key) : valY(code, mid, key); }
  function keys() { return st.mode === 'avg' ? WIN_ORDER.slice() : YEARS.slice(); }

  /* ---------- Labels and formatting ---------- */
  function keyLabel(k) { return st.mode === 'avg' ? T('average of {w}', { w: WINDOWS[k].label }) : String(k); }
  function keyShort(k) { return st.mode === 'avg' ? WINDOWS[k].label : String(k); }
  function dollarNote() { return st.dollars === 'real' ? T('in {y} dollars', { y: BASE }) : T('as reported'); }
  function measureLabel(mid) {
    var m = M[mid], lab = m.label;
    if (m.dollars) lab += ' (' + dollarNote() + ')';
    return lab;
  }
  function millions(v) { return NUM(v / 1e6, v >= 1e8 ? 0 : 1); }
  // Full value for the panel and table
  function fmtV(mid, v) {
    var u = M[mid].unit;
    if (u === 'lb1') return T('{n} lb', { n: NUM(v, Math.round(v) === v ? 0 : 1) });
    if (u === 'lbbig') return v >= 1e6 ? T('{n} million lb', { n: millions(v) }) : T('{n} lb', { n: NUM(Math.round(v)) });
    if (u === 'count') return NUM(Math.round(v / 100) * 100);
    if (u === 'price') return USD(NUM(v, 2));
    if (u === 'usd') return v >= 1e6 ? T('${n} million', { n: millions(v) }) : USD(NUM(Math.round(v)));
    return NUM(v);
  }
  function fmt(mid, r) { return r && r.status === 'ok' ? fmtV(mid, r.v) : null; }
  // Short labels for legends and chart axes
  function compact(mid, v) {
    var u = M[mid].unit;
    if (u === 'lb1') return NUM(v);
    if (u === 'price') return USD(NUM(v, v < 10 ? 2 : 0));
    var cur = u === 'usd' ? USD : function (x) { return x; };
    if (v >= 1e6) return cur(T('{n}M', { n: NUM(Math.round(v / 1e5) / 10, (Math.round(v / 1e5) % 10) ? 1 : 0) }));
    if (v >= 1e3) return cur(T('{n}k', { n: NUM(Math.round(v / 1e3)) }));
    return cur(NUM(Math.round(v)));
  }
  function statusText(code, r) {
    if (r.status === 'grouped') return T('Included in Other States');
    if (r.status === 'partial') return T('Published for too few of these years');
    return T('Not published');
  }

  /* ---------- Color scale: same ranges for every period in a view ---------- */
  var breakCache = {};
  function niceRound(mid, v) {
    var u = M[mid].unit;
    if (u === 'price') return Math.round(v * 20) / 20;
    if (u === 'lb1') return Math.max(1, Math.round(v));
    var mag = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))) - 1);
    return Math.round(v / mag) * mag;
  }
  function breaks(mid) {
    var ck = mid + '|' + st.mode + '|' + (M[mid].dollars ? st.dollars : '');
    if (breakCache[ck]) return breakCache[ck];
    var all = [];
    keys().forEach(function (k) { STATES.forEach(function (c) { var r = val(c, mid, k); if (r.status === 'ok') all.push(r.v); }); });
    all.sort(function (a, b) { return a - b; });
    var out = [];
    [0.2, 0.4, 0.6, 0.8].forEach(function (q) {
      var b = niceRound(mid, all[Math.floor(q * (all.length - 1))]);
      if (!out.length || b > out[out.length - 1]) out.push(b);
    });
    return (breakCache[ck] = out);
  }
  function bin(mid, v) { var b = breaks(mid), i = 0; while (i < b.length && v >= b[i]) i++; return i; }
  function binColor(i) { return 'var(--c' + i + ')'; }

  /* ---------- Map ---------- */
  var svg = $('lx-map'), tip = $('lx-tip'), mapCard = $('lx-mapcard');
  var LABEL_NUDGE = { FL: [14, 6], MI: [10, 18], LA: [-8, 0], KY: [6, 2], VA: [6, 4], ID: [0, 16], MN: [-4, 6], CA: [-8, 0], WV: [-2, 4], MD: [0, -2], NY: [6, 2], HI: [6, 4], AK: [0, 0] };

  function drawMap() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var hex = st.style === 'hex';
    var defs = document.createElementNS(NS, 'defs');
    var ps = hex ? 5 : 8;
    defs.innerHTML = '<pattern id="lx-hatch" width="' + ps + '" height="' + ps + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="' + ps + '" height="' + ps + '" fill="var(--surface)"/><line x1="0" y1="0" x2="0" y2="' + ps + '" stroke="var(--line)" stroke-width="' + (ps / 2) + '"/></pattern>';
    svg.appendChild(defs);
    svg.setAttribute('class', 'lx-map ' + (hex ? 'is-hex' : 'is-shapes'));

    var geo = {};
    if (hex) {
      var r = 19, w = Math.sqrt(3) * r, vstep = 1.5 * r, pad = 4;
      svg.setAttribute('viewBox', '0 0 ' + (12 * w + w / 2 + pad * 2).toFixed(1) + ' ' + (7 * vstep + 2 * r + pad * 2).toFixed(1));
      HEX.forEach(function (s) {
        var cx = pad + w / 2 + s[2] * w + (s[1] % 2 ? w / 2 : 0), cy = pad + r + s[1] * vstep, pts = [];
        for (var k = 0; k < 6; k++) { var a = Math.PI / 180 * (60 * k - 90); pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); }
        geo[s[0]] = { poly: pts.join(' '), cx: cx, cy: cy };
      });
    } else {
      svg.setAttribute('viewBox', SH.viewBox.join(' '));
    }

    STATES.forEach(function (code) {
      var r = val(code, st.measure, st.key);
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'area' + (code === st.sel ? ' sel' : ''));
      g.setAttribute('data-code', code);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      var shown = fmt(st.measure, r);
      g.setAttribute('aria-label', H.names[code] + SEP + (shown ? shown : statusText(code, r)));
      var shape;
      var b = r.status === 'ok' ? bin(st.measure, r.v) : -1;
      var fill = b >= 0 ? binColor(b) : r.status === 'grouped' ? 'var(--nodata)' : 'url(#lx-hatch)';
      if (hex) {
        if (!geo[code]) return;
        shape = document.createElementNS(NS, 'polygon');
        shape.setAttribute('points', geo[code].poly);
      } else {
        shape = document.createElementNS(NS, 'path');
        shape.setAttribute('d', SH.states[code]);
      }
      shape.setAttribute('fill', fill);
      shape.setAttribute('class', 'shape');
      g.appendChild(shape);
      svg.appendChild(g);
      var t = null;
      if (hex) {
        t = document.createElementNS(NS, 'text');
        t.setAttribute('x', geo[code].cx.toFixed(1)); t.setAttribute('y', geo[code].cy.toFixed(1));
      } else {
        var bb = shape.getBBox();
        if (bb.width >= 30 && bb.height >= 18) {
          var n = LABEL_NUDGE[code] || [0, 0];
          t = document.createElementNS(NS, 'text');
          t.setAttribute('x', (bb.x + bb.width / 2 + n[0]).toFixed(1)); t.setAttribute('y', (bb.y + bb.height / 2 + n[1]).toFixed(1));
        }
      }
      if (t) {
        t.textContent = code;
        t.setAttribute('fill', b >= 3 ? 'var(--surface)' : 'var(--ink)');
        g.appendChild(t);
      }
      g.addEventListener('mouseenter', function (e) { showTip(code, e); });
      g.addEventListener('mousemove', function (e) { moveTip(e); });
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('focus', function () { showTip(code, null, g); });
      g.addEventListener('blur', hideTip);
      g.addEventListener('click', function () { select(code); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(code); } });
    });
    var selG = svg.querySelector('.area.sel');
    if (selG) svg.appendChild(selG);
    $('lx-maptitle').textContent = measureLabel(st.measure) + SEP + keyLabel(st.key);
    var usb = $('lx-us'), usv = fmt(st.measure, val('US', st.measure, st.key));
    usb.setAttribute('aria-pressed', String(st.sel === 'US'));
    usb.innerHTML = '<svg width="13" height="14" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10"/></svg>' + H.names.US + (usv ? '<b>' + usv + '</b>' : '');
    var notes = [];
    if (st.mode === 'avg') notes.push(T('<strong>Multi-year average:</strong> the average of each year’s value over {w}. A state needs most of those years published to get a value.', { w: WINDOWS[st.key].label }));
    if (M[st.measure].dollars) notes.push(st.dollars === 'real' ? T('<strong>Adjusted for inflation</strong> to {y} dollars with the Consumer Price Index (CPI-U), so years compare fairly.', { y: BASE }) : T('<strong>As reported:</strong> dollars of each year, not adjusted for inflation.'));
    if (st.measure === 'yield' && st.sel === 'US') notes.push(T('<strong>Colonies that make honey in two states count in both,</strong> so the U.S. figure reads a little low.'));
    $('lx-callout').innerHTML = notes.join(' ');
    $('lx-callout').hidden = !notes.length;
    drawLegend();
  }

  function showTip(code, e, el) {
    var r = val(code, st.measure, st.key), shown = fmt(st.measure, r);
    tip.innerHTML = '<strong>' + H.names[code] + '</strong><span>' + (shown ? shown + (M[st.measure].unit === 'lb1' ? ' ' + T('per colony') : M[st.measure].unit === 'price' ? ' ' + T('per lb') : M[st.measure].unit === 'count' ? ' ' + T('colonies') : '') : statusText(code, r)) + '</span>';
    tip.hidden = false;
    if (e) moveTip(e);
    else if (el) {
      var cr = mapCard.getBoundingClientRect(), er = el.getBoundingClientRect();
      place(er.left + er.width / 2 - cr.left, er.top - cr.top);
    }
  }
  function moveTip(e) { var cr = mapCard.getBoundingClientRect(); place(e.clientX - cr.left, e.clientY - cr.top - 8); }
  function place(x, y) {
    var w = tip.offsetWidth, cw = mapCard.clientWidth;
    tip.style.left = Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)) + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { tip.hidden = true; }

  function drawLegend() {
    var b = breaks(st.measure), items = [], mid = st.measure;
    var unit = M[mid].unit === 'lb1' ? ' ' + T('lb') : '';
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? T('Under {v}', { v: compact(mid, b[0]) + unit }) : i === b.length ? T('{v} or more', { v: compact(mid, b[i - 1]) + unit }) : ISO(compact(mid, b[i - 1]) + '–' + compact(mid, b[i]) + unit);
      items.push('<span><i style="background:' + binColor(i) + '"></i>' + lab + '</span>');
    }
    items.push('<span><i style="background:var(--nodata)"></i>' + T('In Other States') + '</span>');
    items.push('<span><i class="hatch"></i>' + T('Not available') + '</span>');
    $('lx-legend').innerHTML = items.join('');
  }

  /* ---------- Detail panel ---------- */
  function rankOf(code, mid, key) {
    var mine = val(code, mid, key);
    if (mine.status !== 'ok' || code === 'US' || code === 'OTH') return null;
    var n = 0, above = 0;
    STATES.forEach(function (c) { var r = val(c, mid, key); if (r.status === 'ok') { n++; if (r.v > mine.v) above++; } });
    return { rank: above + 1, of: n };
  }
  function compareLine(code, mid, key) {
    if (code === 'US') return '';
    var mine = val(code, mid, key), us = val('US', mid, key);
    if (mine.status !== 'ok' || us.status !== 'ok') return '';
    if (M[mid].share) return T('{p} of the U.S. total ({v})', { p: PCT(mine.v / us.v * 100, mine.v / us.v < 0.1 ? 1 : 0), v: fmt(mid, us) });
    var d = mine.v - us.v, vv = { who: T('the U.S. average'), v: fmt(mid, us) };
    if (M[mid].unit === 'price') {
      if (Math.abs(d) < 0.005) return T('About the same as {who} ({v})', vv);
      vv.a = USD(NUM(Math.abs(d), 2));
      return T(d > 0 ? '{a} above {who} ({v})' : '{a} below {who} ({v})', vv);
    }
    var a = Math.round(Math.abs(d) * 10) / 10;
    if (a < 0.5) return T('About the same as {who} ({v})', vv);
    vv.a = T('{n} lb', { n: NUM(a, a % 1 ? 1 : 0) });
    return T(d > 0 ? '{a} above {who} ({v})' : '{a} below {who} ({v})', vv);
  }

  function renderPanel() {
    var code = st.sel, key = st.key, panel = $('lx-panel');
    var useCode = code, notice = '';
    var isState = code !== 'US' && code !== 'OTH';
    if (isState && val(code, 'production', key).status === 'grouped') {
      useCode = 'OTH';
      notice = '<p class="lx-notice">' + T('NASS doesn’t publish {s} separately for {k}. Its honey is counted in <strong>Other States</strong>, shown below.', { s: H.names[code], k: keyLabel(key) }) + '</p>';
    }
    var html = [];
    html.push('<div class="lx-panel-head"><h2>' + H.names[code] + '</h2>' +
      (code !== 'US' ? '<button type="button" class="lx-link" id="lx-to-us">' + T('View {c}', { c: H.names.US }) + '</button>' : '') + '</div>');
    html.push('<p class="lx-sub">' + keyLabel(key).replace(/^./, function (c) { return c.toUpperCase(); }) + ' · ' + T('Operations with 5 or more colonies') + '</p>');
    html.push(notice);
    if (useCode === 'OTH' && notice) html.push('<h3 class="lx-h3">' + H.names.OTH + '</h3>');

    var heroR = val(useCode, st.measure, key), heroShown = fmt(st.measure, heroR);
    var rk = rankOf(useCode, st.measure, key), cmp = compareLine(useCode, st.measure, key);
    html.push('<div class="lx-hero"><p class="lx-k">' + measureLabel(st.measure) + '</p>' +
      '<p class="lx-big">' + (heroShown || '<span class="lx-na">' + statusText(useCode, heroR) + '</span>') + '</p>' +
      (cmp ? '<p class="lx-cmp">' + cmp + '</p>' : '') +
      (rk ? '<p class="lx-rank">' + T('Rank {r} of {of} published states (1 is the highest)', { r: rk.rank, of: rk.of }) + '</p>' : '') +
      (st.mode === 'avg' && heroR.status === 'ok' ? '<p class="lx-sample">' + T('Based on {n} of {of} years published.', { n: heroR.n, of: heroR.of }) + '</p>' : '') + '</div>');

    var tiles = MEASURES.map(function (m) { return m.id; }).filter(function (m) { return m !== st.measure; });
    html.push('<div class="lx-tiles four">' + tiles.map(function (m) {
      var r = val(useCode, m, key), s = fmt(m, r), k2 = rankOf(useCode, m, key);
      return '<button type="button" class="lx-tile" data-measure="' + m + '" title="' + T('Color the map by {m}', { m: I.lower(M[m].label) }) + '"><span class="lx-k">' + measureLabel(m) + '</span><span class="lx-v">' + (s || '<span class="lx-na">' + T('n/a') + '</span>') + '</span>' +
        (k2 ? '<span class="lx-rank">' + T('Rank {r} of {of}', { r: k2.rank, of: k2.of }) + '</span>' : '') + '<span class="lx-show">' + T('Show on map') + '</span></button>';
    }).join('') + '</div>');

    // Compared with the state's long-run average (single years only)
    if (st.mode === 'year') {
      var now = val(useCode, st.measure, key), avg = valA(useCode, st.measure, 'w10');
      var prev = YEARS.indexOf(key) > 0 ? valY(useCode, st.measure, YEARS[YEARS.indexOf(key) - 1]) : null;
      var parts = [];
      if (now.status === 'ok' && prev && prev.status === 'ok') parts.push(T('In {y}: <strong>{a}</strong>.', { y: key - 1, a: fmt(st.measure, prev) }));
      if (now.status === 'ok' && avg.status === 'ok') parts.push(T('Average for {w}: <strong>{a}</strong>.', { w: ISO((COMMON_END - 9) + '–' + COMMON_END), a: fmt(st.measure, avg) }));
      if (parts.length) html.push('<p class="lx-yoy">' + T('This year: <strong>{b}</strong>.', { b: fmt(st.measure, now) }) + ' ' + parts.join(' ') + '</p>');
    }

    // Trend chart
    var dash = useCode !== 'US' && !M[st.measure].share;
    html.push('<div class="lx-block"><h3 class="lx-h3">' + T('{m} by year', { m: M[st.measure].label }) + '</h3>' +
      '<div class="lx-trend" id="lx-trend"></div><p class="lx-small" id="lx-readout">' + T(st.mode === 'avg' ? (dash ? 'Darker bars are the years in this average, and the dashed line is the U.S.' : 'Darker bars are the years in this average.') : (dash ? 'The darker bar is the selected year, and the dashed line is the U.S.' : 'The darker bar is the selected year.')) + ' ' + T('Hover a bar to see its value, or click it to jump there.') + '</p></div>');

    // Download the clicked state's own years when it has any; Other States only if it was never published
    var dlCode = H.values[code] && Object.keys(H.values[code]).length ? code : useCode;
    html.push('<p class="lx-small"><button type="button" class="lx-link" id="lx-dl-state">' + T('Download {s} history (CSV)', { s: H.names[dlCode] }) + '</button></p>');

    panel.innerHTML = html.join('');
    var toUs = $('lx-to-us'); if (toUs) toUs.addEventListener('click', function () { select('US'); });
    panel.querySelectorAll('[data-measure]').forEach(function (el) {
      el.addEventListener('click', function () { setMeasure(el.getAttribute('data-measure')); });
    });
    $('lx-dl-state').addEventListener('click', function () { downloadState(dlCode); });
    drawTrend(useCode);
  }

  function drawTrend(code) {
    var box = $('lx-trend'), mid = st.measure;
    var inWin = st.mode === 'avg' ? WINDOWS[st.key].years : null;
    var W = 520, H2 = 190, ml = 48, mr = 8, mt = 10, mb = 26;
    var rows = YEARS.map(function (y) { return { k: y, r: valY(code, mid, y), us: valY('US', mid, y) }; });
    var showUS = code !== 'US' && !M[mid].share;
    var max = 0;
    rows.forEach(function (d) { if (d.r.status === 'ok') max = Math.max(max, d.r.v); if (showUS && d.us.status === 'ok') max = Math.max(max, d.us.v); });
    if (!max) { box.innerHTML = '<p class="lx-small">' + T('No values to chart for this selection.') + '</p>'; return; }
    var step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    var bw = (W - ml - mr) / rows.length, y = function (v) { return mt + (H2 - mt - mb) * (1 - v / top); };
    var s = ['<svg viewBox="0 0 ' + W + ' ' + H2 + '" role="img" aria-label="' + T('{m} over time for {s}', { m: M[mid].label, s: H.names[code] }) + '">'];
    for (var t = 0; t <= top + 1e-9; t += step) {
      s.push('<line class="grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '"/>');
      s.push('<text class="ytick" x="' + (ml - 6) + '" y="' + y(t).toFixed(1) + '">' + compact(mid, t) + '</text>');
    }
    rows.forEach(function (d, i) {
      var x = ml + i * bw;
      if (d.r.status === 'ok') {
        var h = Math.max(0.5, y(0) - y(d.r.v));
        s.push('<rect class="bar' + ((inWin ? inWin.indexOf(d.k) >= 0 : d.k === st.key) ? ' cur' : '') + '" x="' + (x + bw * 0.12).toFixed(1) + '" y="' + (y(0) - h).toFixed(1) + '" width="' + (bw * 0.76).toFixed(1) + '" height="' + h.toFixed(1) + '"/>');
      }
      if (d.k % 5 === 0) s.push('<text class="xtick" x="' + (x + bw / 2).toFixed(1) + '" y="' + (H2 - 8) + '">' + d.k + '</text>');
    });
    if (showUS) {
      var seg = [], segs = [];
      rows.forEach(function (d, i) {
        if (d.us.status === 'ok') seg.push((ml + i * bw + bw / 2).toFixed(1) + ',' + y(d.us.v).toFixed(1));
        else if (seg.length) { segs.push(seg); seg = []; }
      });
      if (seg.length) segs.push(seg);
      segs.forEach(function (sg) { s.push('<polyline class="usline" points="' + sg.join(' ') + '"/>'); });
    }
    s.push('<line class="axis" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>');
    rows.forEach(function (d, i) {
      s.push('<rect class="hit" data-i="' + i + '" x="' + (ml + i * bw).toFixed(1) + '" y="' + mt + '" width="' + bw.toFixed(1) + '" height="' + (H2 - mt - mb) + '"/>');
    });
    s.push('</svg>');
    box.innerHTML = s.join('');
    var readout = $('lx-readout'), base = readout.textContent;
    box.querySelectorAll('.hit').forEach(function (h) {
      var d = rows[+h.getAttribute('data-i')];
      h.addEventListener('mouseenter', function () {
        var a = fmt(mid, d.r), b = fmt(mid, d.us);
        readout.textContent = d.k + ': ' + (a || statusText(code, d.r)) + (showUS && b ? ' (' + H.names.US + ' ' + b + ')' : '');
      });
      h.addEventListener('mouseleave', function () { readout.textContent = base; });
      h.addEventListener('click', function () { if (st.mode === 'avg') setMode('year', d.k); else setKey(d.k); });
    });
  }
  function niceStep(x) {
    var p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  /* ---------- Table ---------- */
  var COL_LABEL = { colonies: T('Colonies'), yield: T('Lb per colony'), production: T('Honey produced'), price: T('Price per lb'), value: T('Value'), stocks: T('Stocks, Dec. 15') };
  function tableStates(key) {
    var states = STATES.filter(function (c) { return TABLE_COLS.some(function (m) { return val(c, m, key).status === 'ok'; }); });
    var f = st.filter.trim().toLowerCase();
    if (f) states = states.filter(function (c) { return H.names[c].toLowerCase().indexOf(f) >= 0 || c.toLowerCase() === f; });
    return states;
  }
  function renderTable() {
    var key = st.key, sk = st.sortKey || st.measure;
    var head = '<tr><th scope="col" data-k="name" class="' + (sk === 'name' ? 'sorted' : '') + '">' + T('State') + (sk === 'name' ? (st.sortDir < 0 ? ' ↓' : ' ↑') : '') + '</th>' +
      TABLE_COLS.map(function (m) {
        return '<th scope="col" class="num' + (sk === m ? ' sorted' : '') + '" data-k="' + m + '">' + COL_LABEL[m] + (sk === m ? (st.sortDir < 0 ? ' ↓' : ' ↑') : '') + '</th>';
      }).join('') + '</tr>';
    var states = tableStates(key), f = st.filter.trim();
    states.sort(function (a, b) {
      if (sk === 'name') return (H.names[a] < H.names[b] ? -1 : 1) * st.sortDir;
      var va = val(a, sk, key), vb = val(b, sk, key), xa = va.status === 'ok' ? va.v : -Infinity, xb = vb.status === 'ok' ? vb.v : -Infinity;
      if (xa === xb) return H.names[a] < H.names[b] ? -1 : 1;
      return (xa - xb) * st.sortDir;
    });
    function row(c, cls) {
      return '<tr class="' + cls + (c === st.sel ? ' on' : '') + '" data-code="' + c + '" tabindex="0"><th scope="row">' + H.names[c] + '</th>' +
        TABLE_COLS.map(function (m) { var s = fmt(m, val(c, m, key)); return '<td class="num">' + (s || '<span class="lx-na">–</span>') + '</td>'; }).join('') + '</tr>';
    }
    var body = row('US', 'pin') + states.map(function (c) { return row(c, ''); }).join('');
    if (!f && TABLE_COLS.some(function (m) { return val('OTH', m, key).status === 'ok'; })) body += row('OTH', 'pin pin-bottom');
    $('lx-table').innerHTML = '<thead>' + head + '</thead><tbody>' + body + '</tbody>';
    var nPub = STATES.filter(function (c) { return val(c, 'production', key).status === 'ok'; }).length;
    $('lx-tabletitle').textContent = T('All published states') + SEP + keyLabel(key);
    $('lx-tablenote').textContent = (nPub ? T(st.mode === 'avg' ? '{n} states have enough published years for this average.' : '{n} states are published separately for this year; Other States combines the rest.', { n: nPub }) + ' ' + T('Click a heading to sort, or a row to see that state.') : T('No state data was published for this period.')) +
      ' ' + T(st.dollars === 'real' ? 'Prices and values are in {y} dollars.' : 'Prices and values are as reported, not adjusted for inflation.', { y: BASE }) + (st.mode === 'avg' ? ' ' + T('Values are yearly averages.') : '');
    $('lx-table').querySelectorAll('th[data-k]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        if (k === sk) st.sortDir = -st.sortDir; else st.sortDir = k === 'name' ? 1 : -1;
        st.sortKey = k; renderTable();
      });
    });
    $('lx-table').querySelectorAll('tbody tr').forEach(function (tr) {
      var go = function () { select(tr.getAttribute('data-code')); var top = $('lx-mapcard').getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: top, behavior: reduceMotion() ? 'auto' : 'smooth' }); };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- Downloads (column names stay in English so files work in any spreadsheet) ---------- */
  var CITE = 'Source: USDA National Agricultural Statistics Service, Honey reports (Quick Stats). Compiled by The Hive Atlas, https://thehiveatlas.com/honey-production.html';
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function saveCSV(name, header, rows, notes) {
    var lines = notes.map(function (n) { return '# ' + n; });
    lines.push(header.map(csvCell).join(','));
    rows.forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function round(v, d) { if (v == null) return ''; var p = Math.pow(10, d); return Math.round(v * p) / p; }
  var DEC = { colonies: 0, yield: 1, production: 0, price: 2, value: 0, stocks: 0 };
  var DL_HEAD = ['colonies', 'yield_lb_per_colony', 'production_lb', 'price_usd_per_lb', 'value_usd', 'stocks_lb_dec15'];
  function dollarsHeader() { return st.dollars === 'real' ? 'dollars: ' + BASE + ' dollars (CPI-U adjusted)' : 'dollars: as reported (not adjusted for inflation)'; }
  function rowValues(c, key, getter) {
    return TABLE_COLS.map(function (m) { var r = getter(c, m, key); return r.status === 'ok' ? round(r.v, DEC[m]) : ''; });
  }
  function statusOf(c, key, getter) {
    var r = getter(c, 'production', key);
    return r.status === 'ok' ? 'published' : r.status === 'grouped' ? 'in Other States' : r.status === 'partial' ? 'too few years' : 'not published';
  }
  $('lx-dl-view').addEventListener('click', function () {
    var key = st.key, codes = ['US'].concat(tableStates(key)).concat(val('OTH', 'production', key).status === 'ok' ? ['OTH'] : []);
    var period = st.mode === 'avg' ? 'average ' + WINDOWS[key].years[0] + '-' + WINDOWS[key].years[WINDOWS[key].years.length - 1] : String(key);
    var rows = codes.map(function (c) { return [EN_NAMES[c], c, period].concat(rowValues(c, key, val)); });
    saveCSV('hive-atlas-honey-' + period.replace(/\s+/g, '-') + '-' + st.dollars + '.csv', ['state', 'state_abbr', 'period'].concat(DL_HEAD), rows,
      [CITE, dollarsHeader(), st.mode === 'avg' ? 'Values are averages of yearly values; ' + WINDOWS[key].label : 'One year of data; states not listed are in Other States']);
  });
  function downloadState(code) {
    var rows = YEARS.map(function (y) { return [EN_NAMES[code], code, y].concat(rowValues(code, y, valY)).concat([statusOf(code, y, valY)]); });
    saveCSV('hive-atlas-honey-' + code + '-' + st.dollars + '.csv', ['state', 'state_abbr', 'year'].concat(DL_HEAD).concat(['status']), rows, [CITE, dollarsHeader()]);
  }

  /* ---------- Controls ---------- */
  function select(code) { st.sel = code; drawMap(); renderPanel(); markTableRow(); }
  function setMeasure(mid) {
    if (mid === st.measure) return;
    st.measure = mid; msel.value = mid; st.sortKey = null; renderAll();
    var h = document.querySelector('.lx-hero');
    if (h) { h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); }
  }
  function markTableRow() { $('lx-table').querySelectorAll('tbody tr').forEach(function (tr) { tr.classList.toggle('on', tr.getAttribute('data-code') === st.sel); }); }
  function setKey(k) { st.key = k; $('lx-period').value = String(k); updateStepButtons(); renderAll(); }
  function renderAll() { drawMap(); renderPanel(); renderTable(); }

  function fillPeriods() {
    var sel = $('lx-period'), ks = st.mode === 'avg' ? keys() : keys().slice().reverse();
    sel.innerHTML = ks.map(function (k) { return '<option value="' + k + '">' + keyShort(k) + '</option>'; }).join('');
    sel.value = String(st.key);
    updateStepButtons();
  }
  function updateStepButtons() {
    var ks = keys(), i = ks.map(String).indexOf(String(st.key));
    $('lx-prev').disabled = i <= 0; $('lx-next').disabled = i >= ks.length - 1;
  }
  function step(dir) {
    var ks = keys(), i = ks.map(String).indexOf(String(st.key)) + dir;
    if (i >= 0 && i < ks.length) setKey(ks[i]);
  }
  function setSeg(group, value) {
    document.querySelectorAll('[data-seg="' + group + '"] button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === value));
    });
  }
  function setMode(mode, key) {
    if (mode === st.mode && key == null) return;
    if (key == null) key = mode === 'avg' ? 'w10' : latest;
    st.mode = mode; st.key = key; setSeg('mode', mode); fillPeriods(); renderAll();
  }

  $('lx-us').addEventListener('click', function () { select('US'); });
  svg.addEventListener('click', function (e) { if (!e.target.closest('.area')) select('US'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.sel !== 'US' && !e.target.closest('input, select, textarea')) select('US'); });

  var msel = $('lx-measure');
  msel.innerHTML = MEASURES.map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('');
  msel.value = st.measure;
  msel.addEventListener('change', function () { st.measure = msel.value; st.sortKey = null; renderAll(); });

  document.querySelectorAll('[data-seg="style"] button').forEach(function (b) {
    b.addEventListener('click', function () {
      st.style = b.getAttribute('data-v'); setSeg('style', st.style);
      try { localStorage.setItem('hive-map-style', st.style); } catch (e) {}
      drawMap();
    });
  });
  document.querySelectorAll('[data-seg="mode"] button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-v')); });
  });
  document.querySelectorAll('[data-seg="dollars"] button').forEach(function (b) {
    b.addEventListener('click', function () { st.dollars = b.getAttribute('data-v'); setSeg('dollars', st.dollars); renderAll(); });
  });
  $('lx-real-btn').textContent = T('In {y} dollars', { y: BASE });
  $('lx-period').addEventListener('change', function () { var v = $('lx-period').value; setKey(st.mode === 'year' ? +v : v); });
  $('lx-prev').addEventListener('click', function () { step(-1); });
  $('lx-next').addEventListener('click', function () { step(1); });

  var dl = $('lx-statelist');
  dl.innerHTML = ['US'].concat(STATES).map(function (c) { return '<option value="' + H.names[c] + '"></option>'; }).join('');
  function goTo() {
    var q = $('lx-goto').value.trim().toLowerCase(); if (!q) return;
    var hit = ['US'].concat(STATES).filter(function (c) { return H.names[c].toLowerCase() === q || c.toLowerCase() === q; })[0] ||
      ['US'].concat(STATES).filter(function (c) { return H.names[c].toLowerCase().indexOf(q) === 0; })[0];
    if (hit) { select(hit); $('lx-goto').value = ''; }
  }
  $('lx-goto').addEventListener('change', goTo);
  $('lx-goto').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goTo(); } });
  $('lx-filter').addEventListener('input', function () { st.filter = $('lx-filter').value; renderTable(); });

  /* ---------- Summary for the latest year ---------- */
  (function summary() {
    var y = latest, us = function (m) { return valY('US', m, y); };
    var keep = st.dollars; st.dollars = 'nominal';
    var pub = STATES.filter(function (c) { return valY(c, 'yield', y).status === 'ok'; });
    pub.sort(function (a, b) { return valY(b, 'yield', y).v - valY(a, 'yield', y).v; });
    var top = STATES.filter(function (c) { return valY(c, 'production', y).status === 'ok'; }).sort(function (a, b) { return valY(b, 'production', y).v - valY(a, 'production', y).v; })[0];
    var hi = pub[0], lo = pub[pub.length - 1];
    var prev = valY('US', 'production', y - 1);
    $('lx-summary').innerHTML = T('In {y}, U.S. beekeeping operations with five or more colonies produced <strong>{p}</strong> of honey from {c} colonies, about <strong>{yl}</strong> per colony, and were paid an average of <strong>{pr}</strong> a pound. {top} produced the most honey. Among the {k} states NASS published separately, honey per colony was highest in <strong>{hi}</strong> ({hv}) and lowest in <strong>{lo}</strong> ({lv}). Click any state on the map, or pick one from the table, to see its numbers.',
      { y: y, p: fmt('production', us('production')), c: fmtV('colonies', us('colonies').v), yl: fmt('yield', us('yield')), pr: fmt('price', us('price')), top: H.names[top], k: pub.length, hi: H.names[hi], hv: fmt('yield', valY(hi, 'yield', y)), lo: H.names[lo], lv: fmt('yield', valY(lo, 'yield', y)) });
    st.dollars = keep;
    var rel = H.source.release ? new Date(H.source.release + 'T12:00:00').toLocaleDateString(LOC, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    $('lx-note').textContent = T(rel ? 'NASS data for {a} through {b}. Latest report released {d}.' : 'NASS data for {a} through {b}.', { a: YEARS[0], b: latest, d: rel });
  })();

  document.querySelectorAll('.ab-common').forEach(function (el) { el.textContent = COMMON_END; });
  setSeg('style', st.style); setSeg('mode', st.mode); setSeg('dollars', st.dollars);
  fillPeriods();
  renderAll();

  /* ---------- Tabs: Map / About this map ---------- */
  var tabs = [$('tab-map'), $('tab-about')];
  function isAboutHash(h) { return h === 'about' || h.indexOf('ab-') === 0; }
  function showTab(name, scroll) {
    var about = name === 'about';
    $('about').hidden = !about;
    $('lx-view').hidden = about;
    $('tab-map').setAttribute('aria-selected', String(!about));
    $('tab-about').setAttribute('aria-selected', String(about));
    $('tab-map').tabIndex = about ? -1 : 0;
    $('tab-about').tabIndex = about ? 0 : -1;
    if (scroll) {
      var top = document.querySelector('.lx-tabs').getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'auto' });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      var name = i === 1 ? 'about' : 'map';
      showTab(name, false);
      try { history.replaceState(null, '', name === 'about' ? '#about' : location.pathname + location.search); } catch (e) {}
    });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = tabs[1 - i]; o.focus(); o.click(); }
    });
  });
  document.querySelectorAll('[data-open-about]').forEach(function (b) {
    b.addEventListener('click', function () {
      showTab('about', true);
      try { history.replaceState(null, '', '#about'); } catch (e) {}
    });
  });
  window.addEventListener('hashchange', function () { if (isAboutHash(location.hash.slice(1))) showTab('about', false); });
  var built = $('lx-built');
  if (built && H.source.built) built.textContent = T('Data last updated on this site {d}.', { d: new Date(H.source.built + 'T12:00:00').toLocaleDateString(LOC, { year: 'numeric', month: 'long', day: 'numeric' }) });
  showTab(isAboutHash(location.hash.slice(1)) ? 'about' : 'map', false);
  if (location.hash.slice(1).indexOf('ab-') === 0) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();
