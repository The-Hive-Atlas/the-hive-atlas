/* The Hive Atlas: Colony Losses map.
   Reads window.HIVE_LOSSES (data/colony-losses.js) and window.HIVE_SHAPES (data/state-shapes.js). */
(function () {
  var L = window.HIVE_LOSSES, SH = window.HIVE_SHAPES, HEX = window.HIVE_HEX_LAYOUT;
  if (!L || !SH || !HEX) return;

  var NS = 'http://www.w3.org/2000/svg';
  var F = {}; L.fields.forEach(function (f, i) { F[f] = i; });
  var STATES = Object.keys(SH.states).sort(function (a, b) { return L.names[a] < L.names[b] ? -1 : 1; });
  var SURVEYED = L.periods.filter(function (p) { return p.survey; });
  var PBY = {}; L.periods.forEach(function (p) { PBY[p.id] = p; });
  var YEARS = [];
  SURVEYED.forEach(function (p) { if (YEARS.indexOf(p.year) < 0) YEARS.push(p.year); });
  var QPERYEAR = {}; SURVEYED.forEach(function (p) { (QPERYEAR[p.year] = QPERYEAR[p.year] || []).push(p); });
  var QSHORT = ['', 'Jan', 'Apr', 'Jul', 'Oct'], QEND = ['', 'Mar', 'Jun', 'Sep', 'Dec'];

  var MEASURES = [
    { id: 'pct_lost', label: 'Percent of colonies lost', yearLabel: 'Average quarterly loss (not annual)', short: '% lost', unit: 'pct', agg: 'mean', group: 'Losses' },
    { id: 'colonies_lost', label: 'Colonies lost', yearLabel: 'Colonies lost in the year', short: 'Colonies lost', unit: 'count', agg: 'sum', group: 'Losses' },
    { id: 'pct_renovated', label: 'Percent of colonies renovated', yearLabel: 'Average quarterly renovation', short: '% renovated', unit: 'pct', agg: 'mean', group: 'Losses' },
    { id: 'colonies_start', label: 'Colonies at start of quarter', yearLabel: 'Colonies on January 1', short: 'Colonies', unit: 'count', agg: 'first', group: 'Losses' },
    { id: 'varroa', label: 'Colonies affected by Varroa mites', short: 'Varroa', unit: 'pct1', agg: 'mean', group: 'Stressors' },
    { id: 'other_pests', label: 'Colonies affected by other pests and parasites', short: 'Other pests', unit: 'pct1', agg: 'mean', group: 'Stressors' },
    { id: 'diseases', label: 'Colonies affected by diseases', short: 'Diseases', unit: 'pct1', agg: 'mean', group: 'Stressors' },
    { id: 'pesticides', label: 'Colonies affected by pesticides', short: 'Pesticides', unit: 'pct1', agg: 'mean', group: 'Stressors' },
    { id: 'other', label: 'Colonies affected by other causes', short: 'Other causes', unit: 'pct1', agg: 'mean', group: 'Stressors' },
    { id: 'unknown', label: 'Colonies affected by unknown causes', short: 'Unknown', unit: 'pct1', agg: 'mean', group: 'Stressors' }
  ];
  var M = {}; MEASURES.forEach(function (m) { M[m.id] = m; });
  var STRESSORS = ['varroa', 'other_pests', 'diseases', 'pesticides', 'other', 'unknown'];
  var TABLE_COLS = ['colonies_start', 'colonies_lost', 'pct_lost', 'pct_renovated', 'varroa', 'diseases', 'pesticides'];

  var latest = SURVEYED[SURVEYED.length - 1];
  var st = { style: 'hex', measure: 'pct_lost', mode: 'quarter', key: latest.id, sel: 'US', sortKey: null, sortDir: -1, filter: '' };
  try { var saved = localStorage.getItem('hive-map-style'); if (saved === 'hex' || saved === 'shapes') st.style = saved; } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Values ---------- */
  function rawRow(code, pid) { return L.values[code] ? L.values[code][pid] : undefined; }

  // Returns { v: number|null, status: 'ok'|'grouped'|'na'|'nosurvey'|'partial' }
  function valQ(code, mid, pid) {
    var p = PBY[pid];
    if (!p.survey) return { v: null, status: 'nosurvey' };
    var row = rawRow(code, pid);
    if (row === undefined) return { v: null, status: 'grouped' };
    var v = row[F[mid]];
    if (v === null || v === undefined) return { v: null, status: 'na' };
    var cor = L.corrections && L.corrections[pid] && L.corrections[pid][code] && L.corrections[pid][code][mid];
    return { v: v === -1 ? 0.25 : v, lt: v === -1, status: 'ok', corrected: cor || null };
  }
  function valY(code, mid, year) {
    var qs = QPERYEAR[year] || [], m = M[mid];
    if (m.agg === 'first') {
      if (qs[0].q !== 1) return { v: null, status: 'na' };
      return valQ(code, mid, qs[0].id);
    }
    var vals = qs.map(function (p) { return valQ(code, mid, p.id); });
    var ok = vals.filter(function (r) { return r.status === 'ok'; });
    if (ok.length === vals.length && ok.length) {
      var s = 0; ok.forEach(function (r) { s += r.v; });
      return { v: m.agg === 'sum' ? s : s / ok.length, status: 'ok' };
    }
    if (vals.every(function (r) { return r.status === 'grouped'; })) return { v: null, status: 'grouped' };
    return { v: null, status: 'partial' };
  }
  /* Whole survey: average each season (Jan-Mar, Apr-Jun, ...) across the window, then average the four seasons,
     so a state missing some winter quarters isn't made to look better. Needs MIN_PER_SEASON quarters per season. */
  var MIN_PER_SEASON = 3;
  var COMMON_END = (function () {
    // last quarter in which most states were still published separately
    var counts = SURVEYED.map(function (p) { return STATES.filter(function (c) { return L.values[c] && L.values[c][p.id]; }).length; });
    var top = Math.max.apply(null, counts), last = SURVEYED[0];
    SURVEYED.forEach(function (p, i) { if (counts[i] >= 0.8 * top) last = p; });
    return last;
  })();
  var WINDOWS = {
    common: { label: SURVEYED[0].short + ' to ' + COMMON_END.short, long: SURVEYED[0].label + ' to ' + COMMON_END.label + ', when most states were published',
      periods: SURVEYED.filter(function (p) { return p.year * 10 + p.q <= COMMON_END.year * 10 + COMMON_END.q; }) },
    full: { label: 'Each state\u2019s full record', long: 'every quarter each state was published, ' + SURVEYED[0].short + ' to ' + SURVEYED[SURVEYED.length - 1].short, periods: SURVEYED }
  };
  function seasons(code, mid, win) {
    var out = [];
    for (var q = 1; q <= 4; q++) {
      var vals = WINDOWS[win].periods.filter(function (p) { return p.q === q; }).map(function (p) { return valQ(code, mid, p.id); });
      var ok = vals.filter(function (r) { return r.status === 'ok'; }), s = 0;
      ok.forEach(function (r) { s += r.v; });
      out.push({ q: q, v: ok.length ? s / ok.length : null, n: ok.length, of: vals.length, grouped: vals.every(function (r) { return r.status === 'grouped'; }) });
    }
    return out;
  }
  // One bar scale per measure and window, shared by every state, so bar lengths compare across panels
  var scaleCache = {};
  function seasonScale(mid, win) {
    var ck = mid + '|' + win;
    if (scaleCache[ck]) return scaleCache[ck];
    var max = 0;
    STATES.concat(['US', 'OTH']).forEach(function (c) {
      seasons(c, mid, win).forEach(function (x) { if (x.v != null && x.n >= MIN_PER_SEASON) max = Math.max(max, x.v); });
    });
    if (!max) return (scaleCache[ck] = 0);
    var step = niceStep(max / 4);
    return (scaleCache[ck] = Math.ceil(max / step) * step);
  }
  function valS(code, mid, win) {
    var ss = seasons(code, mid, win);
    if (ss.every(function (x) { return x.grouped; })) return { v: null, status: 'grouped' };
    if (ss.some(function (x) { return x.n < MIN_PER_SEASON; })) return { v: null, status: 'partial' };
    var s = 0; ss.forEach(function (x) { s += x.v; });
    return { v: s / 4, status: 'ok', nq: ss.reduce(function (a, x) { return a + x.n; }, 0) };
  }
  function val(code, mid, key) { return st.mode === 'year' ? valY(code, mid, key) : st.mode === 'survey' ? valS(code, mid, key) : valQ(code, mid, key); }
  function keys() { return st.mode === 'year' ? YEARS.slice() : st.mode === 'survey' ? ['common', 'full'] : L.periods.map(function (p) { return p.id; }); }

  /* ---------- Sample sizes (NASS quality reports, 2019 onward) ---------- */
  var QD = window.HIVE_QUALITY || { periods: {} };
  var SMALL_N = 20; // fewer responding operations than this gets a caution flag
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; }
  function qualityFor(code, key) {
    var pids = st.mode === 'quarter' ? [key] : st.mode === 'year' ? (QPERYEAR[key] || []).map(function (p) { return p.id; }) : WINDOWS[key].periods.map(function (p) { return p.id; });
    var rows = pids.map(function (pid) { return QD.periods[pid] && QD.periods[pid][code]; }).filter(function (r) { return r && r[0] != null; });
    if (!rows.length) return null;
    var resp = rows.filter(function (r) { return r[1] != null; }).map(function (r) { return r[0] * r[1] / 100; });
    return { sample: Math.round(median(rows.map(function (r) { return r[0]; }))), respondents: resp.length ? Math.round(median(resp)) : null,
      rate: rows.length === 1 ? rows[0][1] : null, nq: rows.length, of: pids.length, single: st.mode === 'quarter' };
  }
  function qualityLine(code, key) {
    var q = qualityFor(code, key);
    if (!q) {
      var lastQ = Object.keys(QD.periods).sort().pop() || '';
      var first = String(st.mode === 'quarter' ? key : st.mode === 'year' ? key + '-Q1' : 'x');
      return '<p class="lx-sample">' + (first > lastQ ? 'NASS hasn\u2019t released sample sizes for this period yet. They come out in its yearly quality report.' : 'NASS didn\u2019t publish sample sizes for this period. They start in 2019.') + '</p>';
    }
    var small = q.respondents != null && q.respondents < SMALL_N;
    var txt = q.single ? 'Based on <b>' + q.sample.toLocaleString('en-US') + '</b> operations sampled' + (q.respondents != null ? '; about <b>' + q.respondents.toLocaleString('en-US') + '</b> responded.' : '.')
      : 'Typically <b>' + q.sample.toLocaleString('en-US') + '</b> operations sampled per quarter' + (q.respondents != null ? ', about <b>' + q.respondents.toLocaleString('en-US') + '</b> responding' : '') +
        ' (' + q.nq + ' of ' + q.of + ' quarters have published sample sizes).';
    return '<p class="lx-sample">' + (small ? '<span class="lx-smallchip">Small sample</span> ' : '') + txt + (small ? ' Estimates from this few operations can swing a lot, and a few large operations can drive the result.' : '') + '</p>';
  }

  /* ---------- Labels and formatting ---------- */
  function yearLabel(y) {
    var qs = QPERYEAR[y];
    if (qs.length === 4) return String(y);
    if (qs[0].q === 1 && qs[qs.length - 1].q === qs.length) return y + ' (' + QSHORT[1] + '–' + QEND[qs.length] + ')';
    return y + ' (' + qs.length + ' quarters)';
  }
  function keyLabel(k) { return typeof k === 'number' ? yearLabel(k) : WINDOWS[k] ? 'whole survey, ' + WINDOWS[k].label : PBY[k].label; }
  function keyShort(k) { return typeof k === 'number' ? yearLabel(k) : WINDOWS[k] ? WINDOWS[k].label : PBY[k].short; }
  var SURVEY_LABEL = { pct_lost: 'Average quarterly loss (not annual)', colonies_lost: 'Average colonies lost per quarter', pct_renovated: 'Average quarterly renovation', colonies_start: 'Average colonies at start of quarter' };
  function measureLabel(mid) {
    var m = M[mid];
    if (st.mode === 'survey') return SURVEY_LABEL[mid] || m.label + ' (average)';
    return st.mode === 'year' && m.yearLabel ? m.yearLabel : m.label;
  }

  function fmt(mid, r) {
    if (!r || r.status !== 'ok') return null;
    var v = r.v, u = M[mid].unit;
    if (u === 'count') return Math.round(v).toLocaleString('en-US');
    if (r.corrected) return v.toFixed(1) + '%\u2020';
    if (r.lt || (v > 0 && v < 0.5)) return '<0.5%';
    var dec = (u === 'pct1' || st.mode !== 'quarter') ? 1 : 0;
    return v.toFixed(dec) + '%';
  }
  function compact(mid, v) {
    if (M[mid].unit !== 'count') return (Math.round(v * 10) / 10) + '%';
    if (v >= 1e6) return (Math.round(v / 1e5) / 10) + 'M';
    if (v >= 1e3) return Math.round(v / 1e3) + 'k';
    return String(Math.round(v));
  }
  function statusText(code, r, key) {
    if (r.status === 'grouped') return 'Included in Other States';
    if (r.status === 'nosurvey') return 'No survey this quarter';
    if (r.status === 'partial') return st.mode === 'survey' ? 'Too few quarters published' : 'Not published for every quarter of ' + key;
    return 'Not published';
  }

  /* ---------- Color scale: same ranges for every period in a view ---------- */
  var breakCache = {};
  function nice(mid, v) {
    if (M[mid].unit !== 'count') return Math.max(1, Math.round(v));
    var mag = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))) - 1);
    return Math.round(v / mag) * mag;
  }
  function breaks(mid) {
    var ck = mid + '|' + st.mode;
    if (breakCache[ck]) return breakCache[ck];
    var all = [];
    keys().forEach(function (k) {
      STATES.forEach(function (c) { var r = val(c, mid, k); if (r.status === 'ok') all.push(r.v); });
    });
    all.sort(function (a, b) { return a - b; });
    var out = [];
    [0.2, 0.4, 0.6, 0.8].forEach(function (q) {
      var b = nice(mid, all[Math.floor(q * (all.length - 1))]);
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
      g.setAttribute('aria-label', L.names[code] + ', ' + (shown ? shown : statusText(code, r, st.key)));
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
    $('lx-maptitle').textContent = measureLabel(st.measure) + ', ' + keyLabel(st.key);
    var usb = $('lx-us'), usv = fmt(st.measure, val('US', st.measure, st.key));
    usb.setAttribute('aria-pressed', String(st.sel === 'US'));
    usb.innerHTML = '<svg width="13" height="14" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10"/></svg>United States' + (usv ? '<b>' + usv + '</b>' : '');
    var notes = [];
    if (st.mode === 'survey') notes.push('<strong>Whole survey:</strong> each season is averaged across ' + (st.key === 'common' ? WINDOWS.common.label : 'the state\u2019s published years') + ', then the four seasons are averaged, so missing quarters don\u2019t tilt the result. ' + (M[st.measure].unit === 'count' ? 'Values are per quarter.' : 'Not an annual rate.'));
    if (st.mode === 'year' && M[st.measure].agg === 'mean') notes.push('<strong>Average of the year\u2019s quarters,</strong> not an annual ' + (st.measure === 'pct_lost' ? 'loss ' : '') + 'rate.');
    if (M[st.measure].group === 'Stressors') notes.push('<strong>Self-reported:</strong> beekeepers report colonies affected by each stressor. Not lab-confirmed, and \u201caffected\u201d doesn\u2019t mean lost.');
    $('lx-callout').innerHTML = notes.join(' ');
    $('lx-callout').hidden = !notes.length;
    drawLegend();
  }

  function showTip(code, e, el) {
    var r = val(code, st.measure, st.key), shown = fmt(st.measure, r);
    tip.innerHTML = '<strong>' + L.names[code] + '</strong><span>' + (shown ? shown + ' · ' + M[st.measure].short : statusText(code, r, st.key)) + '</span>';
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
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? 'Under ' + compact(mid, b[0]) : i === b.length ? compact(mid, b[i - 1]) + ' or more' : compact(mid, b[i - 1]) + '–' + compact(mid, b[i]);
      items.push('<span><i style="background:' + binColor(i) + '"></i>' + lab + '</span>');
    }
    items.push('<span><i style="background:var(--nodata)"></i>In Other States</span>');
    items.push('<span><i class="hatch"></i>Not available</span>');
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
    if (M[mid].unit === 'count') {
      if (mid === 'colonies_start' || mid === 'colonies_lost') return (mine.v / us.v * 100).toFixed(1) + '% of the U.S. total (' + fmt(mid, us) + ')';
      return '';
    }
    var d = mine.v - us.v, dec = (M[mid].unit === 'pct1' || st.mode !== 'quarter') ? 1 : 0;
    var amt = Math.abs(d).toFixed(dec);
    if (Number(amt) === 0) return 'About the same as the U.S. (' + fmt(mid, us) + ')';
    return amt + (Number(amt) === 1 ? ' point ' : ' points ') + (d > 0 ? 'above' : 'below') + ' the U.S. (' + fmt(mid, us) + ')';
  }

  function previousKey(key) {
    if (st.mode === 'survey') return null;
    if (st.mode === 'year') { var i = YEARS.indexOf(key); return i > 0 ? YEARS[i - 1] : null; }
    var p = PBY[key], id = (p.year - 1) + '-Q' + p.q;
    return PBY[id] ? id : null;
  }

  function renderPanel() {
    var code = st.sel, key = st.key, panel = $('lx-panel');
    var probe = val(code, 'colonies_start', key), probeLoss = val(code, 'pct_lost', key);
    var useCode = code, notice = '';
    var isState = code !== 'US' && code !== 'OTH';
    if (isState && probe.status === 'grouped' && probeLoss.status === 'grouped') {
      useCode = 'OTH';
      notice = '<p class="lx-notice">NASS doesn’t publish ' + L.names[code] + ' separately for ' + keyLabel(key) + '. Its colonies are counted in <strong>Other States</strong>, shown below.</p>';
    }
    var html = [];
    html.push('<div class="lx-panel-head"><h2>' + L.names[code] + '</h2>' +
      (code !== 'US' ? '<button type="button" class="lx-link" id="lx-to-us">View United States</button>' : '') + '</div>');
    html.push('<p class="lx-sub">' + keyLabel(key).replace(/^./, function (c) { return c.toUpperCase(); }) + ' · Operations with 5 or more colonies</p>');
    html.push(notice);
    // Corrected values shown in this quarter's panel
    if (st.mode === 'quarter') {
      var cors = ['pct_lost', 'pct_renovated'].map(function (m) { return val(useCode, m, key).corrected; }).filter(Boolean);
      cors.forEach(function (c) { html.push('<p class="lx-notice lx-corr"><strong>\u2020 Corrected value.</strong> ' + c.reason + ' NASS has not corrected it as of the latest release.</p>'); });
    }
    if (useCode === 'OTH' && notice) html.push('<h3 class="lx-h3">Other States</h3>');

    var heroR = val(useCode, st.measure, key), heroShown = fmt(st.measure, heroR);
    var rk = rankOf(useCode, st.measure, key);
    html.push('<div class="lx-hero"><p class="lx-k">' + measureLabel(st.measure) + '</p>' +
      '<p class="lx-big">' + (heroShown || '<span class="lx-na">' + statusText(useCode, heroR, key) + '</span>') + '</p>' +
      (compareLine(useCode, st.measure, key) ? '<p class="lx-cmp">' + compareLine(useCode, st.measure, key) + '</p>' : '') +
      (rk ? '<p class="lx-rank">Rank ' + rk.rank + ' of ' + rk.of + ' published states (1 is the highest)</p>' : '') + qualityLine(useCode, key) +
      (useCode !== 'US' && M[st.measure].unit !== 'count' && compareLine(useCode, st.measure, key) ? '<p class="lx-foot">State percents divide by the state\u2019s peak colony count; the U.S. divides by colonies at the start of the quarter, so states tend to read a little lower.</p>' : '') + '</div>');

    var tiles = ['pct_lost', 'colonies_lost', 'pct_renovated', 'colonies_start'].filter(function (m) { return m !== st.measure; });
    html.push('<div class="lx-tiles' + (tiles.length === 4 ? ' four' : '') + '">' + tiles.map(function (m) {
      var r = val(useCode, m, key), s = fmt(m, r), k2 = rankOf(useCode, m, key);
      return '<button type="button" class="lx-tile" data-measure="' + m + '" title="Color the map by ' + measureLabel(m).toLowerCase() + '"><span class="lx-k">' + measureLabel(m) + '</span><span class="lx-v">' + (s || '<span class="lx-na">n/a</span>') + '</span>' +
        (k2 ? '<span class="lx-rank">Rank ' + k2.rank + ' of ' + k2.of + '</span>' : '') + '<span class="lx-show">Show on map</span></button>';
    }).join('') + '</div>');

    // By season
    var win = st.mode === 'survey' ? st.key : 'common';
    // Use the state's own seasons when it has them in this window, even if this quarter falls in Other States
    var own = seasons(code, st.measure, win), sc = own.some(function (x) { return x.n >= MIN_PER_SEASON; }) ? code : useCode;
    var ssn = sc === code ? own : seasons(useCode, st.measure, win), ssu = seasons('US', st.measure, win);
    var smax = seasonScale(st.measure, win);
    if (smax) {
      var SNAME = ['', 'Jan\u2013Mar', 'Apr\u2013Jun', 'Jul\u2013Sep', 'Oct\u2013Dec'];
      var fmtS = function (x) { if (x.v == null) return null; var keep = st.mode; st.mode = 'survey'; var t = fmt(st.measure, { v: x.v, status: 'ok' }); st.mode = keep; return t; };
      html.push('<div class="lx-block"><h3 class="lx-h3">By season' + (sc !== useCode ? ': ' + L.names[sc] : '') + '</h3><p class="lx-small">Typical ' + M[st.measure].short.replace(/^%/, 'percent').toLowerCase() + ' in each quarter of the year, averaged over ' +
        (win === 'common' ? WINDOWS.common.label : 'every published year') + '.' + (sc !== 'US' && M[st.measure].unit !== 'count' ? ' The dark tick marks the U.S.' : '') +
        ' Bars use the same scale for every state, 0 to ' + compact(st.measure, smax) + '.</p><ul class="lx-stress lx-seasons">' +
        ssn.map(function (x, i) {
          var u = ssu[i], mark = (sc !== 'US' && M[st.measure].unit !== 'count' && u.v != null) ? '<b class="lx-usmark" style="left:' + (u.v / smax * 100).toFixed(1) + '%" title="U.S. ' + fmtS(u) + '"></b>' : '';
          var ok = x.v != null && x.n >= MIN_PER_SEASON;
          return '<li><span class="lx-sname">' + SNAME[x.q] + '</span><span class="lx-track"><span class="lx-fill" style="width:' + (ok ? Math.max(0.6, x.v / smax * 100) : 0).toFixed(1) + '%"></span>' + mark + '</span>' +
            '<span class="lx-sval" title="' + x.n + ' of ' + x.of + ' quarters published">' + (ok ? fmtS(x) : 'few') + '</span></li>';
        }).join('') + '</ul></div>');
    }

    // Stressors
    var srows = STRESSORS.map(function (m) {
      var r = val(useCode, m, key), us = val('US', m, key), s = fmt(m, r);
      var w = r.status === 'ok' ? Math.max(0.6, Math.min(100, r.v)) : 0;
      var mark = (useCode !== 'US' && us.status === 'ok') ? '<b class="lx-usmark" style="left:' + Math.min(100, us.v) + '%" title="U.S. ' + fmt(m, us) + '"></b>' : '';
      return '<li class="lx-pick' + (m === st.measure ? ' on' : '') + '" data-measure="' + m + '" role="button" tabindex="0" aria-pressed="' + (m === st.measure) + '" title="Color the map by ' + M[m].label.toLowerCase() + '"><span class="lx-sname">' + M[m].short + '</span>' +
        '<span class="lx-track"><span class="lx-fill" style="width:' + w + '%"></span>' + mark + '</span>' +
        '<span class="lx-sval">' + (s || 'n/a') + '</span></li>';
    }).join('');
    html.push('<div class="lx-block"><h3 class="lx-h3">Colony health stressors</h3>' +
      '<p class="lx-small"><strong class="lx-tag">Self-reported</strong> Percent of colonies beekeepers reported as affected' + (st.mode === 'year' ? ', averaged across quarters' : st.mode === 'survey' ? ', averaged by season' : '') + '. Affected doesn\u2019t mean lost, and a colony can have more than one stressor, so these don\u2019t add up to 100%.' +
      (useCode !== 'US' ? ' The dark tick marks the U.S.' : '') + ' Click a stressor to map it.</p><ul class="lx-stress">' + srows + '</ul></div>');

    // Year-ago comparison
    var pk = previousKey(key);
    if (pk !== null) {
      var now = val(useCode, st.measure, key), then = val(useCode, st.measure, pk);
      if (now.status === 'ok' && then.status === 'ok') {
        html.push('<p class="lx-yoy">' + (st.mode === 'year' ? 'In ' + yearLabel(pk) : 'A year earlier, in ' + keyLabel(pk)) + ': <strong>' + fmt(st.measure, then) + '</strong>, compared with <strong>' + fmt(st.measure, now) + '</strong> now.</p>');
      }
    }

    // Trend chart
    html.push('<div class="lx-block"><h3 class="lx-h3">' + M[st.measure].short.replace(/^%/, 'Percent') + ' by ' + (st.mode === 'year' ? 'year' : 'quarter') + '</h3>' +
      '<div class="lx-trend" id="lx-trend"></div><p class="lx-small" id="lx-readout">' + (st.mode === 'survey' ? 'Darker bars are the quarters in this average' : 'The darker bar is the selected ' + (st.mode === 'year' ? 'year' : 'quarter')) + (useCode !== 'US' ? ', and the dashed line is the U.S.' : '.') + ' Hover a bar to see its value, or click it to jump there.</p></div>');

    panel.innerHTML = html.join('');
    var toUs = $('lx-to-us'); if (toUs) toUs.addEventListener('click', function () { select('US'); });
    panel.querySelectorAll('[data-measure]').forEach(function (el) {
      el.addEventListener('click', function () { setMeasure(el.getAttribute('data-measure')); });
      el.addEventListener('keydown', function (e) { if (el.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setMeasure(el.getAttribute('data-measure')); } });
    });
    drawTrend(useCode);
  }

  function drawTrend(code) {
    var box = $('lx-trend'), mid = st.measure, tm = st.mode === 'survey' ? 'quarter' : st.mode;
    var ks = tm === 'year' ? YEARS.slice() : L.periods.map(function (p) { return p.id; });
    var inWin = st.mode === 'survey' ? WINDOWS[st.key].periods.map(function (p) { return p.id; }) : null;
    var val = function (c, m, k) { return tm === 'year' ? valY(c, m, k) : valQ(c, m, k); };
    var W = 520, H = 190, ml = 44, mr = 8, mt = 10, mb = 26;
    var rows = ks.map(function (k) { return { k: k, r: val(code, mid, k), us: val('US', mid, k) }; });
    var max = 0;
    rows.forEach(function (d) { if (d.r.status === 'ok') max = Math.max(max, d.r.v); if (code !== 'US' && d.us.status === 'ok' && M[mid].unit !== 'count') max = Math.max(max, d.us.v); });
    if (!max) { box.innerHTML = '<p class="lx-small">No values to chart for this selection.</p>'; return; }
    var step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    var bw = (W - ml - mr) / ks.length, y = function (v) { return mt + (H - mt - mb) * (1 - v / top); };
    var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + M[mid].short + ' over time for ' + L.names[code] + '">'];
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
      var showLab = tm === 'year' ? true : (PBY[d.k].q === 1 && PBY[d.k].year % 2 === 1);
      if (showLab) {
        var lx = tm === 'year' ? x + bw / 2 : x;
        s.push('<text class="xtick" x="' + lx.toFixed(1) + '" y="' + (H - 8) + '"' + (tm === 'year' ? '' : ' style="text-anchor:start"') + '>' + (tm === 'year' ? "'" + String(d.k).slice(2) : PBY[d.k].year) + '</text>');
      }
    });
    if (code !== 'US' && !(M[mid].unit === 'count')) {
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
      s.push('<rect class="hit" data-i="' + i + '" x="' + (ml + i * bw).toFixed(1) + '" y="' + mt + '" width="' + bw.toFixed(1) + '" height="' + (H - mt - mb) + '"/>');
    });
    s.push('</svg>');
    box.innerHTML = s.join('');
    var readout = $('lx-readout'), base = readout.textContent;
    box.querySelectorAll('.hit').forEach(function (h) {
      var d = rows[+h.getAttribute('data-i')];
      h.addEventListener('mouseenter', function () {
        var a = fmt(mid, d.r), b = fmt(mid, d.us);
        readout.textContent = keyLabel(d.k) + ': ' + (a || statusText(code, d.r, d.k)) + (code !== 'US' && b ? ' (U.S. ' + b + ')' : '');
      });
      h.addEventListener('mouseleave', function () { readout.textContent = base; });
      h.addEventListener('click', function () { if (st.mode === 'survey') setMode('quarter', d.k); else setKey(d.k); });
    });
  }
  function niceStep(x) {
    var p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  /* ---------- Table ---------- */
  function renderTable() {
    var key = st.key, sk = st.sortKey || (TABLE_COLS.indexOf(st.measure) >= 0 ? st.measure : 'pct_lost');
    var head = '<tr><th scope="col" data-k="name" class="' + (sk === 'name' ? 'sorted' : '') + '">State' + (sk === 'name' ? (st.sortDir < 0 ? ' ↓' : ' ↑') : '') + '</th>' +
      TABLE_COLS.map(function (m) {
        var sv = st.mode === 'survey', yr = st.mode === 'year';
        var lab = { colonies_start: yr ? 'Colonies Jan 1' : sv ? 'Avg. colonies at start' : 'Colonies at start', colonies_lost: sv ? 'Avg. colonies lost' : 'Colonies lost', pct_lost: yr || sv ? 'Avg. % lost' : '% lost', pct_renovated: yr || sv ? 'Avg. % renovated' : '% renovated', varroa: 'Varroa', diseases: 'Diseases', pesticides: 'Pesticides' }[m];
        return '<th scope="col" class="num' + (sk === m ? ' sorted' : '') + '" data-k="' + m + '">' + lab + (sk === m ? (st.sortDir < 0 ? ' ↓' : ' ↑') : '') + '</th>';
      }).join('') + '<th scope="col" class="num' + (sk === 'sampled' ? ' sorted' : '') + '" data-k="sampled" title="Operations NASS sampled' + (st.mode === 'quarter' ? '' : ', typical per quarter') + '">' + (st.mode === 'quarter' ? 'Sampled' : 'Sampled / qtr') + (sk === 'sampled' ? (st.sortDir < 0 ? ' ↓' : ' ↑') : '') + '</th></tr>';
    var states = STATES.filter(function (c) {
      return TABLE_COLS.some(function (m) { return val(c, m, key).status === 'ok'; });
    });
    var f = st.filter.trim().toLowerCase();
    if (f) states = states.filter(function (c) { return L.names[c].toLowerCase().indexOf(f) >= 0 || c.toLowerCase() === f; });
    states.sort(function (a, b) {
      if (sk === 'name') return (L.names[a] < L.names[b] ? -1 : 1) * st.sortDir;
      var xa, xb;
      if (sk === 'sampled') { var qa = qualityFor(a, key), qb = qualityFor(b, key); xa = qa ? qa.sample : -Infinity; xb = qb ? qb.sample : -Infinity; }
      else { var va = val(a, sk, key), vb = val(b, sk, key); xa = va.status === 'ok' ? va.v : -Infinity; xb = vb.status === 'ok' ? vb.v : -Infinity; }
      if (xa === xb) return L.names[a] < L.names[b] ? -1 : 1;
      return (xa - xb) * st.sortDir;
    });
    function row(c, cls) {
      return '<tr class="' + cls + (c === st.sel ? ' on' : '') + '" data-code="' + c + '" tabindex="0"><th scope="row">' + L.names[c] + '</th>' +
        TABLE_COLS.map(function (m) { var s = fmt(m, val(c, m, key)); return '<td class="num">' + (s || '<span class="lx-na">–</span>') + '</td>'; }).join('') +
        (function () { var q = qualityFor(c, key); if (!q) return '<td class="num"><span class="lx-na">–</span></td>';
          var small = q.respondents != null && q.respondents < SMALL_N;
          return '<td class="num' + (small ? ' lx-few' : '') + '"' + (small ? ' title="About ' + q.respondents + ' operations responded"' : '') + '>' + q.sample.toLocaleString('en-US') + (small ? ' <span class="lx-fewmark" aria-label="small sample">!</span>' : '') + '</td>'; })() + '</tr>';
    }
    var body = row('US', 'pin') + states.map(function (c) { return row(c, ''); }).join('');
    if (!f && TABLE_COLS.some(function (m) { return val('OTH', m, key).status === 'ok'; })) body += row('OTH', 'pin pin-bottom');
    $('lx-table').innerHTML = '<thead>' + head + '</thead><tbody>' + body + '</tbody>';
    var nPub = STATES.filter(function (c) { return val(c, 'colonies_start', key).status === 'ok' || val(c, 'pct_lost', key).status === 'ok'; }).length;
    $('lx-tabletitle').textContent = 'All published states, ' + keyLabel(key);
    $('lx-tablenote').textContent = (nPub ? nPub + (st.mode === 'survey' ? ' states have enough published quarters for a whole-survey average.' : ' states are published separately for this period; Other States combines the rest.') + ' Click a heading to sort, or a row to see that state.' : 'No state data was published for this period.') +
      ' U.S. percents use colonies at the start of the quarter; state percents use each state\u2019s peak.' + (st.mode === 'year' ? ' Year percents are averages of the quarters.' : st.mode === 'survey' ? ' Whole-survey values are season-balanced averages per quarter.' : '') + ' Stressors are self-reported. A ! in the Sampled column means fewer than ' + SMALL_N + ' operations responded.' +
      (st.mode === 'quarter' && L.corrections[key] ? ' \u2020 marks a percent recalculated from NASS\u2019s own counts because the published value contradicts them; open that state for details.' : '');
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
    var sel = $('lx-period'), ks = st.mode === 'survey' ? keys() : keys().slice().reverse();
    sel.innerHTML = ks.map(function (k) {
      var lab = st.mode === 'year' ? yearLabel(k) : st.mode === 'survey' ? WINDOWS[k].label : PBY[k].label + (PBY[k].survey ? '' : ' (no survey)');
      return '<option value="' + k + '">' + lab + '</option>';
    }).join('');
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

  $('lx-us').addEventListener('click', function () { select('US'); });
  svg.addEventListener('click', function (e) { if (!e.target.closest('.area')) select('US'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.sel !== 'US' && !e.target.closest('input, select, textarea')) select('US'); });

  var msel = $('lx-measure');
  var groups = {};
  MEASURES.forEach(function (m) { (groups[m.group] = groups[m.group] || []).push(m); });
  msel.innerHTML = Object.keys(groups).map(function (g) {
    return '<optgroup label="' + g + '">' + groups[g].map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</optgroup>';
  }).join('');
  msel.value = st.measure;
  msel.addEventListener('change', function () { st.measure = msel.value; st.sortKey = null; renderAll(); });

  document.querySelectorAll('[data-seg="style"] button').forEach(function (b) {
    b.addEventListener('click', function () {
      st.style = b.getAttribute('data-v'); setSeg('style', st.style);
      try { localStorage.setItem('hive-map-style', st.style); } catch (e) {}
      drawMap();
    });
  });
  function setMode(mode, key) {
    if (mode === st.mode && key == null) return;
    if (key == null) {
      if (mode === 'survey') key = 'common';
      else if (mode === 'year') key = st.mode === 'quarter' ? PBY[st.key].year : YEARS[YEARS.length - 1];
      else if (st.mode === 'year') { var qs = QPERYEAR[st.key]; key = qs[qs.length - 1].id; }
      else key = latest.id;
    }
    st.mode = mode; st.key = key; setSeg('mode', mode); fillPeriods(); renderAll();
  }
  document.querySelectorAll('[data-seg="mode"] button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-v')); });
  });
  $('lx-period').addEventListener('change', function () { var v = $('lx-period').value; setKey(st.mode === 'year' ? +v : v); });
  $('lx-prev').addEventListener('click', function () { step(-1); });
  $('lx-next').addEventListener('click', function () { step(1); });

  var dl = $('lx-statelist');
  dl.innerHTML = ['US'].concat(STATES).map(function (c) { return '<option value="' + L.names[c] + '"></option>'; }).join('');
  function goTo() {
    var q = $('lx-goto').value.trim().toLowerCase(); if (!q) return;
    var hit = ['US'].concat(STATES).filter(function (c) { return L.names[c].toLowerCase() === q || c.toLowerCase() === q; })[0] ||
      ['US'].concat(STATES).filter(function (c) { return L.names[c].toLowerCase().indexOf(q) === 0; })[0];
    if (hit) { select(hit); $('lx-goto').value = ''; }
  }
  $('lx-goto').addEventListener('change', goTo);
  $('lx-goto').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goTo(); } });
  $('lx-filter').addEventListener('input', function () { st.filter = $('lx-filter').value; renderTable(); });

  /* ---------- Summary for the latest quarter ---------- */
  (function summary() {
    var k = latest.id, us = function (m) { return valQ('US', m, k); };
    var pub = STATES.filter(function (c) { return valQ(c, 'pct_lost', k).status === 'ok'; });
    pub.sort(function (a, b) { return valQ(b, 'pct_lost', k).v - valQ(a, 'pct_lost', k).v; });
    var hi = pub[0], lo = pub[pub.length - 1];
    var topS = STRESSORS.slice().sort(function (a, b) { return us(b).v - us(a).v; })[0];
    var fmtQ = function (m, r) { var keep = st.mode; st.mode = 'quarter'; var s = fmt(m, r); st.mode = keep; return s; };
    $('lx-summary').innerHTML = 'In ' + latest.label + ', U.S. beekeeping operations with five or more colonies lost <strong>' + fmtQ('pct_lost', us('pct_lost')) +
      '</strong> of their colonies, about <strong>' + fmtQ('colonies_lost', us('colonies_lost')) + '</strong>. Among the ' + pub.length + ' states NASS published separately, losses were highest in <strong>' +
      L.names[hi] + '</strong> (' + fmtQ('pct_lost', valQ(hi, 'pct_lost', k)) + ') and lowest in <strong>' + L.names[lo] + '</strong> (' + fmtQ('pct_lost', valQ(lo, 'pct_lost', k)) +
      '). ' + M[topS].short + ' was the most common stressor, affecting <strong>' + fmtQ(topS, us(topS)) + '</strong> of colonies. Click any state on the map, or pick one from the table, to see its numbers.';
    var rel = L.source.release ? new Date(L.source.release + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    $('lx-note').textContent = 'NASS data from ' + SURVEYED[0].label + ' through ' + latest.label + (rel ? '. Latest report released ' + rel + '.' : '.');
  })();

  document.querySelectorAll('.ab-window').forEach(function (el) { el.textContent = COMMON_END.label; });
  setSeg('style', st.style); setSeg('mode', st.mode);
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
  if (built && L.source.built) built.textContent = 'Data last updated on this site ' + new Date(L.source.built + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '.';
  showTab(isAboutHash(location.hash.slice(1)) ? 'about' : 'map', false);
  if (location.hash.slice(1).indexOf('ab-') === 0) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();
