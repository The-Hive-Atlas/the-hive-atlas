/* The Hive Atlas: Disease Surveillance map.
   Reads window.HIVE_DISEASE (data/disease.js) and window.HIVE_SHAPES (data/state-shapes.js). */
(function () {
  var D = window.HIVE_DISEASE, SH = window.HIVE_SHAPES, HEX = window.HIVE_HEX_LAYOUT;
  if (!D || !SH || !HEX) return;

  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = D.names;
  var MAP_STATES = Object.keys(SH.states).sort(function (a, b) { return NAMES[a] < NAMES[b] ? -1 : 1; });
  var REGION_OF = {}, REGION_KEYS = Object.keys(D.regions);
  REGION_KEYS.forEach(function (k) { D.regions[k].states.forEach(function (s) { REGION_OF[s] = k; }); });
  var SMALL_N = 10; // fewer samples tested than this gets a "small sample" flag
  var MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SEASONS = {
    all: { label: 'All months', months: null },
    win: { label: 'Winter (Dec–Feb)', months: [12, 1, 2] },
    spr: { label: 'Spring (Mar–May)', months: [3, 4, 5] },
    sum: { label: 'Summer (Jun–Aug)', months: [6, 7, 8] },
    fal: { label: 'Fall (Sep–Nov)', months: [9, 10, 11] }
  };

  /* ---------- Cube: CUBE[state][year] = [[month, 11 counts], ...] ---------- */
  var CUBE = {}, YEARS = [], LAST_MONTH = {};
  D.rows.forEach(function (r) {
    var s = D.states[r[0]], y = r[1];
    ((CUBE[s] = CUBE[s] || {})[y] = CUBE[s][y] || []).push([r[2], r.slice(3)]);
    if (YEARS.indexOf(y) < 0) YEARS.push(y);
    LAST_MONTH[y] = Math.max(LAST_MONTH[y] || 0, r[2]);
  });
  YEARS.sort(function (a, b) { return a - b; });
  var FIRST = YEARS[0], LAST = YEARS[YEARS.length - 1];
  // newest year with data through at least November counts as the latest complete year
  var LATEST_FULL = LAST_MONTH[LAST] >= 11 ? LAST : LAST - 1;

  var MEASURES = [
    { id: 'vd', label: 'Varroa: percent of samples positive', short: 'Varroa', tile: 'Varroa positive', unit: 'pct', n: 0, pos: 1, from: D.source.varroaFrom, group: 'Varroa mite' },
    { id: 'vil', label: 'Varroa: average mites per 100 bees', short: 'Mites per 100 bees', tile: 'Mites per 100 bees', unit: 'load', n: 6, sum: 7, group: 'Varroa mite' },
    { id: 'nos', label: 'Nosema: percent of samples positive', short: 'Nosema', tile: 'Nosema positive', unit: 'pct', n: 2, pos: 3, group: 'Nosema' },
    { id: 'ms', label: 'Nosema: average million spores per bee', short: 'Million spores per bee', tile: 'Spores per bee (millions)', unit: 'load', n: 8, sum: 9, group: 'Nosema' },
    { id: 'tm', label: 'Tracheal mite: percent of samples positive', short: 'Tracheal mite', tile: 'Tracheal mite positive', unit: 'pct', n: 4, pos: 5, group: 'Tracheal mite' },
    { id: 'samples', label: 'Samples tested', short: 'Samples', tile: 'Samples tested', unit: 'count', group: 'Samples' }
  ];
  var M = {}; MEASURES.forEach(function (m) { M[m.id] = m; });
  // first and last year each test was run
  MEASURES.forEach(function (m) {
    if (m.id === 'samples') { m.years = YEARS.slice(); return; }
    m.years = YEARS.filter(function (y) { return Object.keys(CUBE).some(function (s) { return (CUBE[s][y] || []).some(function (c) { return c[1][m.n + 1] > 0; }); }); });
  });
  function testedIn(mid, y0, y1) { return M[mid].years.some(function (y) { return y >= y0 && y <= y1; }); }

  // Opening view: climate regions, Varroa positive, the last three complete years pooled, so the map is filled in
  var st = { style: 'hex', geo: 'region', measure: 'vd', mode: 'range', year: LATEST_FULL, from: Math.max(FIRST, LATEST_FULL - 2), to: LATEST_FULL, season: 'all', sel: 'US', sortKey: null, sortDir: -1, filter: '' };
  try { var saved = localStorage.getItem('hive-map-style'); if (saved === 'hex' || saved === 'shapes') st.style = saved; } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Values ---------- */
  function span() { return st.mode === 'year' ? [st.year, st.year] : [Math.min(st.from, st.to), Math.max(st.from, st.to)]; }
  function statesOf(area) {
    if (area === 'US') return D.states;
    if (area.indexOf('R:') === 0) return D.regions[area.slice(2)].states;
    return [area];
  }
  var aggCache = {};
  function agg(area, y0, y1, months) {
    var ck = area + '|' + y0 + '|' + y1 + '|' + (months ? months.join(',') : '');
    if (aggCache[ck]) return aggCache[ck];
    var t = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    statesOf(area).forEach(function (s) {
      var cy = CUBE[s]; if (!cy) return;
      for (var y = y0; y <= y1; y++) {
        (cy[y] || []).forEach(function (c) {
          if (months && months.indexOf(c[0]) < 0) return;
          for (var i = 0; i < 11; i++) t[i] += c[1][i];
        });
      }
    });
    return (aggCache[ck] = t);
  }
  // { v, n, status: ok | none (no samples) | nottested }
  function valueFrom(t, mid) {
    var m = M[mid];
    if (!t[0]) return { v: null, n: 0, status: 'none' };
    if (mid === 'samples') return { v: t[0], n: t[0], status: 'ok' };
    var n = t[m.n + 1];
    if (!n) return { v: null, n: 0, status: 'nottested', samples: t[0] };
    return { v: m.unit === 'pct' ? 100 * t[m.pos + 1] / n : t[m.sum + 1] / n, n: n, pos: m.unit === 'pct' ? t[m.pos + 1] : null, status: 'ok' };
  }
  function valAt(area, mid, y0, y1, season) { return valueFrom(agg(area, y0, y1, SEASONS[season || 'all'].months), mid); }
  function val(area, mid) { var s = span(); return valAt(area, mid, s[0], s[1], st.season); }
  function valMonth(area, mid, month) { var s = span(); return valueFrom(agg(area, s[0], s[1], [month]), mid); }

  /* ---------- Labels and formatting ---------- */
  function timeLabel() {
    var s = span(), y = s[0] === s[1] ? String(s[0]) : s[0] + '–' + s[1];
    if (s[1] === LAST && LAST_MONTH[LAST] < 12) y += ' (' + (s[0] === s[1] ? 'through ' : 'through ') + MONTHS[LAST_MONTH[LAST]] + ' ' + LAST + ')';
    return y + (st.season !== 'all' ? ', ' + SEASONS[st.season].label.toLowerCase() : '');
  }
  function areaName(a) { return a === 'US' ? 'United States' : a.indexOf('R:') === 0 ? D.regions[a.slice(2)].name + (D.regions[a.slice(2)].states.length > 1 ? ' region' : '') : NAMES[a]; }
  function fmt(mid, r) {
    if (!r || r.status !== 'ok') return null;
    var u = M[mid].unit, v = r.v;
    if (u === 'count') return Math.round(v).toLocaleString('en-US');
    if (u === 'pct') return v.toFixed(1) + '%';
    if (v > 0 && v < 0.05) return '<0.1';
    return v.toFixed(1);
  }
  function unitWord(mid) { return mid === 'vil' ? ' mites per 100 bees' : mid === 'ms' ? ' million spores per bee' : ''; }
  function compact(mid, v) {
    var u = M[mid].unit;
    if (u === 'pct') return (Math.round(v * 10) / 10) + '%';
    if (u === 'count') return v >= 1e3 ? (Math.round(v / 100) / 10) + 'k' : String(Math.round(v));
    return String(Math.round(v * 10) / 10);
  }
  function statusText(r, mid) {
    if (r.status === 'none') return 'No samples';
    if (r.status === 'nottested') return mid === 'vil' || mid === 'ms' ? 'Not counted in this period' : 'Not tested in this period';
    return '';
  }
  function testedNote(mid) {
    var m = M[mid], ys = m.years;
    if (mid === 'samples' || !ys.length) return '';
    if (mid === 'tm') return 'The lab examined samples for tracheal mites through 2015 and in some years since (' + ys.filter(function (y) { return y > 2015; }).join(', ') + ').';
    return (mid === 'vil' || mid === 'ms' ? 'Counts' : 'Tests') + ' start in ' + ys[0] + '.';
  }

  /* ---------- Color scale: same ranges for every period ---------- */
  var breakCache = {};
  function niceVal(mid, v) {
    var u = M[mid].unit;
    if (u === 'count') { var mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(v, 1))) - 1)); return Math.max(1, Math.round(v / mag) * mag); }
    if (u === 'pct') return Math.max(1, Math.round(v));
    return v < 1 ? Math.max(0.1, Math.round(v * 10) / 10) : v < 10 ? Math.round(v * 2) / 2 : Math.round(v);
  }
  function areasForGeo() { return st.geo === 'region' ? REGION_KEYS.map(function (k) { return 'R:' + k; }) : D.states.filter(function (s) { return s !== 'PR'; }); }
  function breaks(mid) {
    var ck = mid + '|' + st.geo;
    if (breakCache[ck]) return breakCache[ck];
    var all = [];
    areasForGeo().forEach(function (a) {
      YEARS.forEach(function (y) { var r = valAt(a, mid, y, y); if (r.status === 'ok' && r.n >= SMALL_N) all.push(r.v); });
    });
    all.sort(function (a, b) { return a - b; });
    var out = [];
    [0.2, 0.4, 0.6, 0.8].forEach(function (q) {
      if (!all.length) return;
      var b = niceVal(mid, all[Math.floor(q * (all.length - 1))]);
      if (!out.length || b > out[out.length - 1]) out.push(b);
    });
    return (breakCache[ck] = out);
  }
  function bin(mid, v) { var b = breaks(mid), i = 0; while (i < b.length && v >= b[i]) i++; return i; }
  function binColor(i) { return 'var(--c' + i + ')'; }

  /* ---------- Map ---------- */
  var svg = $('dx-map'), tip = $('dx-tip'), mapCard = $('dx-mapcard');
  var LABEL_NUDGE = { FL: [14, 6], MI: [10, 18], LA: [-8, 0], KY: [6, 2], VA: [6, 4], ID: [0, 16], MN: [-4, 6], CA: [-8, 0], WV: [-2, 4], MD: [0, -2], NY: [6, 2], HI: [6, 4], AK: [0, 0] };
  function tileArea(code) { return st.geo === 'region' ? (REGION_OF[code] ? 'R:' + REGION_OF[code] : null) : code; }

  function drawMap() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var hex = st.style === 'hex';
    var defs = document.createElementNS(NS, 'defs'), ps = hex ? 5 : 8;
    defs.innerHTML = '<pattern id="dx-hatch" width="' + ps + '" height="' + ps + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="' + ps + '" height="' + ps + '" fill="var(--surface)"/><line x1="0" y1="0" x2="0" y2="' + ps + '" stroke="var(--line)" stroke-width="' + (ps / 2) + '"/></pattern>';
    svg.appendChild(defs);
    svg.setAttribute('class', 'lx-map ' + (hex ? 'is-hex' : 'is-shapes') + (st.geo === 'region' ? ' is-region' : ''));
    var geo = {};
    if (hex) {
      var r = 19, w = Math.sqrt(3) * r, vstep = 1.5 * r, pad = 4;
      svg.setAttribute('viewBox', '0 0 ' + (12 * w + w / 2 + pad * 2).toFixed(1) + ' ' + (7 * vstep + 2 * r + pad * 2).toFixed(1));
      HEX.forEach(function (s) {
        var cx = pad + w / 2 + s[2] * w + (s[1] % 2 ? w / 2 : 0), cy = pad + r + s[1] * vstep, pts = [];
        for (var k = 0; k < 6; k++) { var a = Math.PI / 180 * (60 * k - 90); pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); }
        geo[s[0]] = { poly: pts.join(' '), cx: cx, cy: cy };
      });
    } else svg.setAttribute('viewBox', SH.viewBox.join(' '));

    var selected = [];
    MAP_STATES.forEach(function (code) {
      var area = tileArea(code), r = area ? val(area, st.measure) : { status: 'none' };
      var g = document.createElementNS(NS, 'g');
      var isSel = area && area === st.sel;
      var few = r.status === 'ok' && r.n < SMALL_N && st.measure !== 'samples';
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (few ? ' few' : ''));
      g.setAttribute('data-code', code);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      var shown = fmt(st.measure, r);
      g.setAttribute('aria-label', (st.geo === 'region' && area ? NAMES[code] + ', ' + areaName(area) : NAMES[code]) + ', ' + (shown ? shown + unitWord(st.measure) : statusText(r, st.measure)) + (few ? ', small sample' : ''));
      var b = r.status === 'ok' ? bin(st.measure, r.v) : -1;
      var fill = b >= 0 ? binColor(b) : r.status === 'none' ? 'var(--nodata)' : 'url(#dx-hatch)';
      var shape;
      if (hex) {
        if (!geo[code]) return;
        shape = document.createElementNS(NS, 'polygon'); shape.setAttribute('points', geo[code].poly);
      } else { shape = document.createElementNS(NS, 'path'); shape.setAttribute('d', SH.states[code]); }
      shape.setAttribute('fill', fill); shape.setAttribute('class', 'shape');
      g.appendChild(shape); svg.appendChild(g);
      var t = null;
      if (hex) { t = document.createElementNS(NS, 'text'); t.setAttribute('x', geo[code].cx.toFixed(1)); t.setAttribute('y', geo[code].cy.toFixed(1)); }
      else {
        var bb = shape.getBBox();
        if (bb.width >= 30 && bb.height >= 18) {
          var n = LABEL_NUDGE[code] || [0, 0];
          t = document.createElementNS(NS, 'text'); t.setAttribute('x', (bb.x + bb.width / 2 + n[0]).toFixed(1)); t.setAttribute('y', (bb.y + bb.height / 2 + n[1]).toFixed(1));
        }
      }
      if (t) { t.textContent = code; t.setAttribute('fill', b >= 3 ? 'var(--surface)' : 'var(--ink)'); g.appendChild(t); }
      if (isSel) selected.push(g);
      g.addEventListener('mouseenter', function (e) { showTip(code, e); });
      g.addEventListener('mousemove', moveTip);
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('focus', function () { showTip(code, null, g); });
      g.addEventListener('blur', hideTip);
      g.addEventListener('click', function () { if (area) select(area); });
      g.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && area) { e.preventDefault(); select(area); } });
    });
    selected.forEach(function (g) { svg.appendChild(g); });
    $('dx-maptitle').textContent = M[st.measure].label + ', ' + timeLabel();
    var usb = $('dx-us'), usv = fmt(st.measure, val('US', st.measure));
    usb.setAttribute('aria-pressed', String(st.sel === 'US'));
    usb.innerHTML = '<svg width="13" height="14" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10"/></svg>United States' + (usv ? '<b>' + usv + '</b>' : '');
    var s = span(), notes = [];
    if (!testedIn(st.measure, s[0], s[1])) notes.push('<strong>No ' + (st.measure === 'vil' || st.measure === 'ms' ? 'counts' : 'tests') + ' in this period.</strong> ' + testedNote(st.measure));
    else if (s[0] < M[st.measure].years[0]) notes.push('<strong>Partial range:</strong> ' + testedNote(st.measure) + ' Earlier years in the range add samples but no results for this measure.');
    if (st.measure === 'tm' && testedIn('tm', s[0], s[1]) && s[1] > 2015) notes.push(testedNote('tm'));
    $('dx-callout').innerHTML = notes.join(' ');
    $('dx-callout').hidden = !notes.length;
    drawLegend();
  }

  function showTip(code, e, el) {
    var area = tileArea(code), r = area ? val(area, st.measure) : { status: 'none' }, shown = fmt(st.measure, r);
    var head = st.geo === 'region' && area ? areaName(area) : NAMES[code];
    var extra = r.status === 'ok' && st.measure !== 'samples' ? ' · ' + r.n.toLocaleString('en-US') + ' tested' : '';
    tip.innerHTML = '<strong>' + head + '</strong><span>' + (shown ? shown + (st.measure === 'samples' ? ' samples' : unitWord(st.measure) || ' ' + M[st.measure].short.toLowerCase()) + extra : statusText(r, st.measure)) + '</span>';
    tip.hidden = false;
    if (e) moveTip(e);
    else if (el) { var cr = mapCard.getBoundingClientRect(), er = el.getBoundingClientRect(); place(er.left + er.width / 2 - cr.left, er.top - cr.top); }
  }
  function moveTip(e) { var cr = mapCard.getBoundingClientRect(); place(e.clientX - cr.left, e.clientY - cr.top - 8); }
  function place(x, y) { var w = tip.offsetWidth, cw = mapCard.clientWidth; tip.style.left = Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)) + 'px'; tip.style.top = y + 'px'; }
  function hideTip() { tip.hidden = true; }

  function drawLegend() {
    var b = breaks(st.measure), items = [], mid = st.measure;
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? 'Under ' + compact(mid, b[0]) : i === b.length ? compact(mid, b[i - 1]) + ' or more' : compact(mid, b[i - 1]) + '–' + compact(mid, b[i]);
      items.push('<span><i style="background:' + binColor(i) + '"></i>' + lab + '</span>');
    }
    if (mid !== 'samples') items.push('<span><i class="few"></i>Fewer than ' + SMALL_N + ' samples</span>');
    items.push('<span><i style="background:var(--nodata)"></i>No samples</span>');
    items.push('<span><i class="hatch"></i>Not tested</span>');
    $('dx-legend').innerHTML = items.join('');
  }

  /* ---------- Detail panel ---------- */
  function rankOf(area, mid) {
    var mine = val(area, mid);
    if (mine.status !== 'ok' || area === 'US' || mine.n < SMALL_N) return null;
    var n = 0, above = 0;
    areasForGeo().forEach(function (a) { var r = val(a, mid); if (r.status === 'ok' && r.n >= SMALL_N) { n++; if (r.v > mine.v) above++; } });
    return { rank: above + 1, of: n };
  }
  function compareLine(area, mid) {
    if (area === 'US') return '';
    var mine = val(area, mid), us = val('US', mid);
    if (mine.status !== 'ok' || us.status !== 'ok') return '';
    if (mid === 'samples') return (mine.v / us.v * 100).toFixed(1) + '% of all U.S. samples (' + fmt(mid, us) + ')';
    var d = mine.v - us.v, amt = Math.abs(d).toFixed(1);
    if (Number(amt) === 0) return 'About the same as the U.S. (' + fmt(mid, us) + ')';
    if (M[mid].unit === 'pct') return amt + (amt === '1.0' ? ' point ' : ' points ') + (d > 0 ? 'above' : 'below') + ' the U.S. (' + fmt(mid, us) + ')';
    return amt + ' ' + (d > 0 ? 'above' : 'below') + ' the U.S. (' + fmt(mid, us) + ')';
  }
  function basisLine(area, mid, r) {
    var all = val(area, 'samples');
    if (!all.v) return '';
    if (mid === 'samples') return '<p class="lx-sample">Adult bee samples the lab received and tested' + (st.season !== 'all' ? ' in these months' : '') + '.</p>';
    if (r.status !== 'ok') return '<p class="lx-sample">' + all.v.toLocaleString('en-US') + ' samples were received in this period. ' + testedNote(mid) + '</p>';
    var small = r.n < SMALL_N;
    var txt = M[mid].unit === 'pct' ? '<b>' + r.pos.toLocaleString('en-US') + '</b> of <b>' + r.n.toLocaleString('en-US') + '</b> samples tested positive.'
      : 'Average of <b>' + r.n.toLocaleString('en-US') + '</b> samples with a count, including those with none found.';
    return '<p class="lx-sample">' + (small ? '<span class="lx-smallchip">Small sample</span> ' : '') + txt + (small ? ' With this few samples, one or two colonies can swing the result a lot.' : '') + '</p>';
  }

  function renderPanel() {
    var area = st.sel, panel = $('dx-panel'), html = [];
    var all = val(area, 'samples');
    html.push('<div class="lx-panel-head"><h2>' + areaName(area) + '</h2>' + (area !== 'US' ? '<button type="button" class="lx-link" id="dx-to-us">View United States</button>' : '') + '</div>');
    html.push('<p class="lx-sub">' + timeLabel() + ' · ' + (all.v ? all.v.toLocaleString('en-US') + ' sample' + (all.v === 1 ? '' : 's') : 'No samples') + '</p>');
    if (area.indexOf('R:') === 0 && D.regions[area.slice(2)].states.length > 1) html.push('<p class="lx-small">' + D.regions[area.slice(2)].states.map(function (s) { return NAMES[s]; }).join(', ') + '.</p>');
    var r = val(area, st.measure), shown = fmt(st.measure, r), rk = rankOf(area, st.measure), cmp = compareLine(area, st.measure);
    html.push('<div class="lx-hero"><p class="lx-k">' + M[st.measure].label + '</p>' +
      '<p class="lx-big">' + (shown ? shown + (M[st.measure].unit === 'load' ? '<span class="dx-unit">' + unitWord(st.measure) + '</span>' : '') : '<span class="lx-na">' + statusText(r, st.measure) + '</span>') + '</p>' +
      (cmp ? '<p class="lx-cmp">' + cmp + '</p>' : '') +
      (rk ? '<p class="lx-rank">Rank ' + rk.rank + ' of ' + rk.of + ' ' + (st.geo === 'region' ? 'regions' : 'states') + ' with ' + SMALL_N + ' or more samples (1 is the highest)</p>' : '') +
      basisLine(area, st.measure, r) + '</div>');

    var tiles = MEASURES.filter(function (m) { return m.id !== st.measure; });
    html.push('<div class="lx-tiles">' + tiles.map(function (m) {
      var tr = val(area, m.id), s = fmt(m.id, tr), few = tr.status === 'ok' && tr.n < SMALL_N && m.id !== 'samples';
      return '<button type="button" class="lx-tile" data-measure="' + m.id + '" title="Color the map by ' + m.label.toLowerCase() + '"><span class="lx-k">' + m.tile + '</span><span class="lx-v">' + (s || '<span class="lx-na">' + (tr.status === 'nottested' ? (m.unit === 'load' ? 'not counted' : 'not tested') : 'n/a') + '</span>') + '</span>' +
        (tr.status === 'ok' && m.id !== 'samples' ? '<span class="lx-rank">' + tr.n.toLocaleString('en-US') + ' tested' + (few ? ' <span class="lx-fewmark" aria-label="small sample">!</span>' : '') + '</span>' : '') + '<span class="lx-show">Show on map</span></button>';
    }).join('') + '</div>');

    // By month
    var s = span();
    if (testedIn(st.measure, s[0], s[1])) {
      var rows = [], max = 0, us = [];
      for (var mo = 1; mo <= 12; mo++) {
        var a = valMonth(area, st.measure, mo), u = valMonth('US', st.measure, mo);
        rows.push(a); us.push(u);
        if (a.status === 'ok' && (a.n >= SMALL_N || st.measure === 'samples')) max = Math.max(max, a.v);
        if (u.status === 'ok') max = Math.max(max, u.v);
      }
      if (max) {
        var stp = niceStep(max / 4), top = Math.ceil(max / stp) * stp;
        var inSeason = SEASONS[st.season].months;
        html.push('<div class="lx-block"><h3 class="lx-h3">By month</h3><p class="lx-small">' + M[st.measure].short + ' by the month samples were ' + (st.measure === 'samples' ? 'received' : 'collected') + ', ' + (s[0] === s[1] ? 'in ' + s[0] : s[0] + ' to ' + s[1]) + '.' +
          (area !== 'US' && st.measure !== 'samples' ? ' The dark tick marks the U.S.' : '') + ' Bars run from 0 to ' + compact(st.measure, top) + '. Lighter bars have fewer than ' + SMALL_N + ' samples.</p><ul class="lx-stress lx-seasons dx-months">' +
          rows.map(function (x, i) {
            var u = us[i], ok = x.status === 'ok', few = ok && x.n < SMALL_N && st.measure !== 'samples';
            var mark = area !== 'US' && st.measure !== 'samples' && u.status === 'ok' ? '<b class="lx-usmark" style="left:' + Math.min(100, u.v / top * 100).toFixed(1) + '%" title="U.S. ' + fmt(st.measure, u) + '"></b>' : '';
            var dim = inSeason && inSeason.indexOf(i + 1) < 0 ? ' dx-dim' : '';
            return '<li class="' + dim + '"><span class="lx-sname">' + MONTHS[i + 1] + '</span><span class="lx-track"><span class="lx-fill' + (few ? ' dx-few' : '') + '" style="width:' + (ok ? Math.max(0.6, Math.min(100, x.v / top * 100)) : 0).toFixed(1) + '%"></span>' + mark + '</span>' +
              '<span class="lx-sval" title="' + (ok ? x.n + ' samples' : '') + '">' + (ok ? fmt(st.measure, x) : x.status === 'none' ? '–' : 'n/a') + '</span></li>';
          }).join('') + '</ul></div>');
      }
    }

    // Year-ago comparison
    if (st.mode === 'year' && st.year > FIRST) {
      var now = r, then = valAt(area, st.measure, st.year - 1, st.year - 1, st.season);
      if (now.status === 'ok' && then.status === 'ok') html.push('<p class="lx-yoy">In ' + (st.year - 1) + ': <strong>' + fmt(st.measure, then) + '</strong>, compared with <strong>' + fmt(st.measure, now) + '</strong> in ' + st.year + '.</p>');
    }

    html.push('<div class="lx-block"><h3 class="lx-h3">' + M[st.measure].short + ' by year</h3><div class="lx-trend" id="dx-trend"></div><p class="lx-small" id="dx-readout">' +
      (st.mode === 'year' ? 'The darker bar is the selected year' : 'Darker bars are the years in this range') + (area !== 'US' && st.measure !== 'samples' ? ', and the dashed line is the U.S.' : '.') + ' Lighter bars have fewer than ' + SMALL_N + ' samples. Hover a bar to see its value, or click it to jump there.</p></div>');
    panel.innerHTML = html.join('');
    var toUs = $('dx-to-us'); if (toUs) toUs.addEventListener('click', function () { select('US'); });
    panel.querySelectorAll('[data-measure]').forEach(function (el) { el.addEventListener('click', function () { setMeasure(el.getAttribute('data-measure')); }); });
    drawTrend(area);
  }

  function drawTrend(area) {
    var box = $('dx-trend'), mid = st.measure, s = span();
    var W = 520, H = 190, ml = 44, mr = 8, mt = 10, mb = 26;
    var rows = YEARS.map(function (y) { return { y: y, r: valAt(area, mid, y, y, st.season), us: valAt('US', mid, y, y, st.season) }; });
    var max = 0;
    rows.forEach(function (d) { if (d.r.status === 'ok') max = Math.max(max, d.r.v); if (area !== 'US' && mid !== 'samples' && d.us.status === 'ok') max = Math.max(max, d.us.v); });
    if (!max) { box.innerHTML = '<p class="lx-small">No values to chart for this selection.</p>'; return; }
    var stp = niceStep(max / 4), top = Math.ceil(max / stp) * stp;
    var bw = (W - ml - mr) / rows.length, y = function (v) { return mt + (H - mt - mb) * (1 - v / top); };
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + M[mid].short + ' by year for ' + areaName(area) + '">'];
    for (var t = 0; t <= top + 1e-9; t += stp) {
      o.push('<line class="grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '"/>');
      o.push('<text class="ytick" x="' + (ml - 6) + '" y="' + y(t).toFixed(1) + '">' + compact(mid, t) + '</text>');
    }
    rows.forEach(function (d, i) {
      var x = ml + i * bw;
      if (d.r.status === 'ok') {
        var h = Math.max(0.5, y(0) - y(d.r.v)), cur = d.y >= s[0] && d.y <= s[1], few = mid !== 'samples' && d.r.n < SMALL_N;
        o.push('<rect class="bar' + (cur ? ' cur' : '') + (few ? ' dx-fewbar' : '') + '" x="' + (x + bw * 0.12).toFixed(1) + '" y="' + (y(0) - h).toFixed(1) + '" width="' + (bw * 0.76).toFixed(1) + '" height="' + h.toFixed(1) + '"/>');
      }
      if (d.y % 5 === 0) o.push('<text class="xtick" x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 8) + '">' + d.y + '</text>');
    });
    if (area !== 'US' && mid !== 'samples') {
      var seg = [], segs = [];
      rows.forEach(function (d, i) {
        if (d.us.status === 'ok') seg.push((ml + i * bw + bw / 2).toFixed(1) + ',' + y(d.us.v).toFixed(1));
        else if (seg.length) { segs.push(seg); seg = []; }
      });
      if (seg.length) segs.push(seg);
      segs.forEach(function (sg) { if (sg.length > 1) o.push('<polyline class="usline" points="' + sg.join(' ') + '"/>'); });
    }
    o.push('<line class="axis" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>');
    rows.forEach(function (d, i) { o.push('<rect class="hit" data-i="' + i + '" x="' + (ml + i * bw).toFixed(1) + '" y="' + mt + '" width="' + bw.toFixed(1) + '" height="' + (H - mt - mb) + '"/>'); });
    o.push('</svg>');
    box.innerHTML = o.join('');
    var readout = $('dx-readout'), base = readout.textContent;
    box.querySelectorAll('.hit').forEach(function (h) {
      var d = rows[+h.getAttribute('data-i')];
      h.addEventListener('mouseenter', function () {
        var a = fmt(mid, d.r), b = fmt(mid, d.us);
        readout.textContent = d.y + ': ' + (a ? a + unitWord(mid) + (mid !== 'samples' ? ' (' + d.r.n + ' tested)' : ' samples') : statusText(d.r, mid)) + (area !== 'US' && mid !== 'samples' && b ? '; U.S. ' + b : '');
      });
      h.addEventListener('mouseleave', function () { readout.textContent = base; });
      h.addEventListener('click', function () { setMode('year', d.y); });
    });
  }
  function niceStep(x) { var p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

  /* ---------- Table ---------- */
  var TABLE_COLS = ['samples', 'vd', 'vil', 'nos', 'ms', 'tm'];
  var COL_LABEL = { samples: 'Samples', vd: 'Varroa %', vil: 'Mites / 100 bees', nos: 'Nosema %', ms: 'Spores (M / bee)', tm: 'Tracheal %' };
  function renderTable() {
    var sk = st.sortKey || st.measure;
    var head = '<tr><th scope="col" data-k="name" class="' + (sk === 'name' ? 'sorted' : '') + '">' + (st.geo === 'region' ? 'Region' : 'State') + (sk === 'name' ? (st.sortDir < 0 ? ' ↓' : ' ↑') : '') + '</th>' +
      TABLE_COLS.map(function (m) { return '<th scope="col" class="num' + (sk === m ? ' sorted' : '') + '" data-k="' + m + '">' + COL_LABEL[m] + (sk === m ? (st.sortDir < 0 ? ' ↓' : ' ↑') : '') + '</th>'; }).join('') + '</tr>';
    var areas = (st.geo === 'region' ? REGION_KEYS.map(function (k) { return 'R:' + k; }) : D.states.slice()).filter(function (a) { return val(a, 'samples').v; });
    var f = st.filter.trim().toLowerCase();
    if (f) areas = areas.filter(function (a) { return areaName(a).toLowerCase().indexOf(f) >= 0 || a.toLowerCase() === f; });
    areas.sort(function (a, b) {
      if (sk === 'name') return (areaName(a) < areaName(b) ? -1 : 1) * st.sortDir;
      var va = val(a, sk), vb = val(b, sk), xa = va.status === 'ok' ? va.v : -Infinity, xb = vb.status === 'ok' ? vb.v : -Infinity;
      if (xa === xb) return areaName(a) < areaName(b) ? -1 : 1;
      return (xa - xb) * st.sortDir;
    });
    function row(a, cls) {
      return '<tr class="' + cls + (a === st.sel ? ' on' : '') + '" data-code="' + a + '" tabindex="0"><th scope="row">' + areaName(a) + '</th>' +
        TABLE_COLS.map(function (m) {
          var r = val(a, m), s = fmt(m, r), few = m === 'samples' && r.status === 'ok' && r.v < SMALL_N;
          return '<td class="num' + (few ? ' lx-few' : '') + '"' + (r.status === 'ok' && m !== 'samples' ? ' title="' + r.n + ' tested"' : '') + '>' + (s || '<span class="lx-na">–</span>') + (few ? ' <span class="lx-fewmark" aria-label="small sample">!</span>' : '') + '</td>';
        }).join('') + '</tr>';
    }
    $('dx-table').innerHTML = '<thead>' + head + '</thead><tbody>' + row('US', 'pin') + areas.map(function (a) { return row(a, ''); }).join('') + '</tbody>';
    $('dx-tabletitle').textContent = (st.geo === 'region' ? 'Climate regions, ' : 'States with samples, ') + timeLabel();
    $('dx-tablenote').textContent = areas.length + (st.geo === 'region' ? ' regions' : ' states and territories') + ' sent samples in this period. Percents are the share of tested samples that were positive; loads are averages over samples with a count. A ! means fewer than ' + SMALL_N + ' samples. Click a heading to sort, or a row to see it on the map.';
    $('dx-table').querySelectorAll('th[data-k]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        if (k === sk) st.sortDir = -st.sortDir; else st.sortDir = k === 'name' ? 1 : -1;
        st.sortKey = k; renderTable();
      });
    });
    $('dx-table').querySelectorAll('tbody tr').forEach(function (tr) {
      var go = function () { select(tr.getAttribute('data-code')); var top = mapCard.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: top, behavior: reduceMotion() ? 'auto' : 'smooth' }); };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- Controls ---------- */
  function select(a) { st.sel = a; drawMap(); renderPanel(); markTableRow(); }
  function markTableRow() { $('dx-table').querySelectorAll('tbody tr').forEach(function (tr) { tr.classList.toggle('on', tr.getAttribute('data-code') === st.sel); }); }
  function setMeasure(mid) {
    if (mid === st.measure) return;
    st.measure = mid; msel.value = mid; st.sortKey = null; renderAll();
    var h = document.querySelector('#dx-panel .lx-hero'); if (h) { h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); }
  }
  function renderAll() { drawMap(); renderPanel(); renderTable(); }
  function setSeg(group, value) { document.querySelectorAll('[data-seg="' + group + '"] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === value)); }); }
  function yearOptions(sel, v) { sel.innerHTML = YEARS.slice().reverse().map(function (y) { return '<option value="' + y + '">' + y + (y === LAST && LAST_MONTH[LAST] < 12 ? ' (through ' + MONTHS[LAST_MONTH[LAST]] + ')' : '') + '</option>'; }).join(''); sel.value = String(v); }
  function syncTime() {
    $('dx-yearbox').hidden = st.mode !== 'year'; $('dx-rangebox').hidden = st.mode !== 'range';
    $('dx-year').value = String(st.year); $('dx-from').value = String(st.from); $('dx-to').value = String(st.to);
    $('dx-prev').disabled = st.year <= FIRST; $('dx-next').disabled = st.year >= LAST;
    setSeg('mode', st.mode);
  }
  function setMode(mode, year) {
    st.mode = mode; if (year != null) st.year = year;
    syncTime(); renderAll();
  }
  function setGeo(g) {
    if (g === st.geo) return;
    st.geo = g; setSeg('geo', g);
    if (st.sel !== 'US') st.sel = g === 'region' ? (REGION_OF[st.sel] ? 'R:' + REGION_OF[st.sel] : 'US') : 'US';
    st.sortKey = null; renderAll();
  }

  $('dx-us').addEventListener('click', function () { select('US'); });
  svg.addEventListener('click', function (e) { if (!e.target.closest('.area')) select('US'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.sel !== 'US' && !e.target.closest('input, select, textarea')) select('US'); });

  var msel = $('dx-measure'), groups = {};
  MEASURES.forEach(function (m) { (groups[m.group] = groups[m.group] || []).push(m); });
  msel.innerHTML = Object.keys(groups).map(function (g) { return '<optgroup label="' + g + '">' + groups[g].map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</optgroup>'; }).join('');
  msel.value = st.measure;
  msel.addEventListener('change', function () { st.measure = msel.value; st.sortKey = null; renderAll(); });

  document.querySelectorAll('[data-seg="style"] button').forEach(function (b) {
    b.addEventListener('click', function () { st.style = b.getAttribute('data-v'); setSeg('style', st.style); try { localStorage.setItem('hive-map-style', st.style); } catch (e) {} drawMap(); });
  });
  document.querySelectorAll('[data-seg="geo"] button').forEach(function (b) { b.addEventListener('click', function () { setGeo(b.getAttribute('data-v')); }); });
  document.querySelectorAll('[data-seg="mode"] button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-v')); }); });
  yearOptions($('dx-year'), st.year); yearOptions($('dx-from'), st.from); yearOptions($('dx-to'), st.to);
  $('dx-year').addEventListener('change', function () { st.year = +$('dx-year').value; syncTime(); renderAll(); });
  $('dx-from').addEventListener('change', function () { st.from = +$('dx-from').value; renderAll(); });
  $('dx-to').addEventListener('change', function () { st.to = +$('dx-to').value; renderAll(); });
  $('dx-prev').addEventListener('click', function () { if (st.year > FIRST) { st.year--; syncTime(); renderAll(); } });
  $('dx-next').addEventListener('click', function () { if (st.year < LAST) { st.year++; syncTime(); renderAll(); } });
  var ssel = $('dx-season');
  ssel.innerHTML = Object.keys(SEASONS).map(function (k) { return '<option value="' + k + '">' + SEASONS[k].label + '</option>'; }).join('');
  ssel.addEventListener('change', function () { st.season = ssel.value; renderAll(); });

  var dl = $('dx-statelist');
  dl.innerHTML = ['US'].concat(D.states).map(function (c) { return '<option value="' + NAMES[c] + '"></option>'; }).join('');
  function goTo() {
    var q = $('dx-goto').value.trim().toLowerCase(); if (!q) return;
    var list = ['US'].concat(D.states);
    var hit = list.filter(function (c) { return NAMES[c].toLowerCase() === q || c.toLowerCase() === q; })[0] || list.filter(function (c) { return NAMES[c].toLowerCase().indexOf(q) === 0; })[0];
    if (hit) { if (st.geo === 'region' && hit !== 'US') setGeo('state'); select(hit); $('dx-goto').value = ''; }
  }
  $('dx-goto').addEventListener('change', goTo);
  $('dx-goto').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goTo(); } });
  $('dx-filter').addEventListener('input', function () { st.filter = $('dx-filter').value; renderTable(); });

  /* ---------- Summary for the latest complete year ---------- */
  (function summary() {
    // Describes the opening view: the last three complete years, pooled
    var y0 = st.from, y1 = st.to, g = function (m) { return valAt('US', m, y0, y1); };
    var nStates = D.states.filter(function (s) { return valAt(s, 'samples', y0, y1).v; }).length;
    var total = valAt('US', 'samples', FIRST, LAST).v;
    var regs = REGION_KEYS.map(function (k) { return { k: k, r: valAt('R:' + k, 'vd', y0, y1) }; })
      .filter(function (x) { return x.r.status === 'ok' && x.r.n >= SMALL_N; })
      .sort(function (a, b) { return b.r.v - a.r.v; });
    var hi = regs[0], lo = regs[regs.length - 1];
    var rn = function (x) { return D.regions[x.k].name; };
    $('dx-summary').innerHTML = 'From ' + y0 + ' to ' + y1 + ', the Bee Disease Diagnostic Laboratory tested <strong>' + fmt('samples', g('samples')) + '</strong> adult bee samples from ' + nStates + ' states and territories. <strong>' +
      fmt('vd', g('vd')) + '</strong> carried Varroa mites, averaging ' + fmt('vil', g('vil')) + ' mites per 100 bees, and <strong>' + fmt('nos', g('nos')) + '</strong> carried Nosema.' +
      (hi && lo && hi !== lo ? ' Varroa turned up most often in the <strong>' + rn(hi) + '</strong> (' + fmt('vd', hi.r) + ') and least often in the <strong>' + rn(lo) + '</strong> (' + fmt('vd', lo.r) + ').' : '') +
      ' Samples come from colonies that looked sick or weak, so these rates are higher than in the average colony. Click any region or state to see its numbers.';
    $('dx-note').textContent = total.toLocaleString('en-US') + ' samples from ' + FIRST + ' through ' + MONTHS[LAST_MONTH[LAST]] + ' ' + LAST + '.';
  })();

  setSeg('style', st.style); setSeg('geo', st.geo); syncTime();
  renderAll();

  /* ---------- Tabs ---------- */
  var tabs = [$('tab-map'), $('tab-about')];
  function isAboutHash(h) { return h === 'about' || h.indexOf('ab-') === 0; }
  function showTab(name, scroll) {
    var about = name === 'about';
    $('about').hidden = !about; $('dx-view').hidden = about;
    $('tab-map').setAttribute('aria-selected', String(!about)); $('tab-about').setAttribute('aria-selected', String(about));
    $('tab-map').tabIndex = about ? -1 : 0; $('tab-about').tabIndex = about ? 0 : -1;
    if (scroll) { var top = document.querySelector('.lx-tabs').getBoundingClientRect().top + window.scrollY - 90; if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'auto' }); }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { var name = i === 1 ? 'about' : 'map'; showTab(name, false); try { history.replaceState(null, '', name === 'about' ? '#about' : location.pathname + location.search); } catch (e) {} });
    t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = tabs[1 - i]; o.focus(); o.click(); } });
  });
  document.querySelectorAll('[data-open-about]').forEach(function (b) { b.addEventListener('click', function () { showTab('about', true); try { history.replaceState(null, '', '#about'); } catch (e) {} }); });
  window.addEventListener('hashchange', function () { if (isAboutHash(location.hash.slice(1))) showTab('about', false); });
  var built = $('dx-built');
  if (built && D.source.built) built.textContent = 'Data last updated on this site ' + new Date(D.source.built + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '.';
  showTab(isAboutHash(location.hash.slice(1)) ? 'about' : 'map', false);
  if (location.hash.slice(1).indexOf('ab-') === 0) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();
