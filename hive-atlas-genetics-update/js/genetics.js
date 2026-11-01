/* The Hive Atlas: Genetic Diversity map.
   Reads window.HIVE_GENETICS (data/genetics.js, built by pipeline/build_genetics.py)
   and window.HIVE_SHAPES (data/state-shapes.js). Counts only; no colony-level records. */
(function () {
  var G = window.HIVE_GENETICS, SH = window.HIVE_SHAPES, HEX = window.HIVE_HEX_LAYOUT;
  if (!G || !SH || !HEX) return;

  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = G.names;
  var SMALL_N = 10; // fewer colonies than this gets a "small sample" flag
  var MAP_STATES = Object.keys(SH.states).sort(function (a, b) { return NAMES[a] < NAMES[b] ? -1 : 1; });
  var REGION_OF = {}, REGION_KEYS = Object.keys(G.regions);
  REGION_KEYS.forEach(function (k) { G.regions[k].states.forEach(function (s) { REGION_OF[s] = k; }); });
  var YEARS = G.source.years, YEAR_LABEL = YEARS.length > 1 ? YEARS[0] + '–' + YEARS[YEARS.length - 1] : String(YEARS[0]);

  /* ---------- Totals per state. V[state] = [colonies, C, M, A, O, novel, ...haplotype counts, ...NCBI match counts] ---------- */
  var ci = {}; G.cols.forEach(function (c, i) { ci[c] = i; });
  var NHAP = G.haplotypes.length, NNCBI = G.ncbi.length;
  var HAP0 = ci['hap_' + G.haplotypes[0]], NCBI0 = ci['ncbi_' + G.ncbi[0]];
  var V = {};
  G.rows.forEach(function (r) {
    var s = G.states[r[0]], v = V[s] = V[s] || new Array(6 + NHAP + NNCBI).fill(0);
    v[0] += r[ci.samples];
    v[1] += r[ci.lin_C]; v[2] += r[ci.lin_M]; v[3] += r[ci.lin_A]; v[4] += r[ci.lin_O];
    v[5] += r[ci.novel];
    for (var i = 0; i < NHAP; i++) v[6 + i] += r[HAP0 + i];
    for (var j = 0; j < NNCBI; j++) v[6 + NHAP + j] += r[NCBI0 + j];
  });
  var STATES = Object.keys(V).sort();

  var MEASURES = [
    { id: 'ma', label: 'M or A lineage: percent of colonies', short: 'M or A lineage', tile: 'M or A lineage', unit: 'pct', group: 'Lineage',
      pos: function (t) { return t[2] + t[3]; }, breaks: [1, 4, 8, 15] },
    { id: 'c', label: 'C lineage: percent of colonies', short: 'C lineage', tile: 'C lineage', unit: 'pct', group: 'Lineage',
      pos: function (t) { return t[1]; }, breaks: [80, 90, 95, 98] },
    { id: 'm', label: 'M lineage: percent of colonies', short: 'M lineage', tile: 'M lineage', unit: 'pct', group: 'Lineage',
      pos: function (t) { return t[2]; }, breaks: [1, 4, 8, 12] },
    { id: 'a', label: 'A lineage: percent of colonies', short: 'A lineage', tile: 'A lineage', unit: 'pct', group: 'Lineage',
      pos: function (t) { return t[3]; }, breaks: [1, 3, 6, 10] },
    { id: 'hd', label: 'Haplotype diversity (0 to 1)', short: 'Haplotype diversity', tile: 'Haplotype diversity', unit: 'index', group: 'Diversity',
      breaks: [0.5, 0.6, 0.7, 0.8] },
    { id: 'novel', label: 'Novel haplotypes: percent of colonies', short: 'Novel haplotypes', tile: 'Novel haplotypes', unit: 'pct', group: 'Diversity',
      pos: function (t) { return t[5]; }, breaks: [1, 4, 8, 12] },
    { id: 'samples', label: 'Colonies genotyped', short: 'Colonies genotyped', tile: 'Colonies genotyped', unit: 'count', group: 'Samples',
      breaks: [15, 20, 24, 30] }
  ];
  var M = {}; MEASURES.forEach(function (m) { M[m.id] = m; });
  function isCount(mid) { return M[mid].unit === 'count'; }

  var st = { style: 'hex', geo: 'state', measure: 'ma', sel: 'US', sortKey: null, sortDir: -1, filter: '' };
  try { var saved = localStorage.getItem('hive-genetics-map-style'); if (saved === 'hex' || saved === 'shapes') st.style = saved; } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('gx-map'), tip = $('gx-tip'), mapCard = $('gx-mapcard');
  var LABEL_NUDGE = { FL: [14, 6], MI: [10, 18], LA: [-8, 0], KY: [6, 2], VA: [6, 4], ID: [0, 16], MN: [-4, 6], CA: [-8, 0], WV: [-2, 4], MD: [0, -2], NY: [6, 2], HI: [6, 4], AK: [0, 0] };

  /* ---------- Values ---------- */
  function statesOf(area) {
    if (area === 'US') return STATES;
    if (area.indexOf('R:') === 0) return G.regions[area.slice(2)].states.filter(function (s) { return V[s]; });
    return V[area] ? [area] : [];
  }
  var aggCache = {};
  function agg(area) {
    if (aggCache[area]) return aggCache[area];
    var t = new Array(6 + NHAP + NNCBI).fill(0);
    statesOf(area).forEach(function (s) { for (var i = 0; i < t.length; i++) t[i] += V[s][i]; });
    return (aggCache[area] = t);
  }
  // Nei's unbiased haplotype diversity: n/(n-1) * (1 - sum of squared frequencies)
  function diversity(t) {
    var n = t[0]; if (n < 2) return null;
    var sq = 0; for (var j = 0; j < NNCBI; j++) { var p = t[6 + NHAP + j] / n; sq += p * p; }
    return n / (n - 1) * (1 - sq);
  }
  // { v, n, status: ok | none }
  function val(area, mid) {
    var t = agg(area), n = t[0], m = M[mid];
    if (!n) return { v: null, n: 0, status: 'none' };
    if (m.unit === 'count') return { v: n, n: n, status: 'ok' };
    if (m.unit === 'index') { var d = diversity(t); return d == null ? { v: null, n: n, status: 'none' } : { v: d, n: n, status: 'ok' }; }
    var pos = m.pos(t);
    return { v: 100 * pos / n, n: n, pos: pos, status: 'ok' };
  }

  /* ---------- Text ---------- */
  function areaName(a) { return a === 'US' ? 'United States' : a.indexOf('R:') === 0 ? G.regions[a.slice(2)].name + ' region' : NAMES[a]; }
  function fmt(mid, r) {
    if (!r || r.status !== 'ok') return '';
    var u = M[mid].unit;
    return u === 'pct' ? r.v.toFixed(1) + '%' : u === 'index' ? r.v.toFixed(2) : r.v.toLocaleString('en-US');
  }
  function compact(mid, v) { var u = M[mid].unit; return u === 'pct' ? v + '%' : u === 'index' ? v.toFixed(1) : String(v); }
  function unitWord(mid) { return isCount(mid) ? ' colonies' : ''; }
  function plural(n, w) { return n.toLocaleString('en-US') + ' ' + w + (n === 1 ? '' : 's'); }

  /* ---------- Map ---------- */
  function areasForGeo() { return st.geo === 'region' ? REGION_KEYS.map(function (k) { return 'R:' + k; }) : STATES.slice(); }
  function tileArea(code) { return st.geo === 'region' ? (REGION_OF[code] ? 'R:' + REGION_OF[code] : null) : code; }
  function bin(mid, v) { var b = M[mid].breaks, i = 0; while (i < b.length && v >= b[i]) i++; return i; }
  function binColor(i) { return 'var(--c' + i + ')'; }

  function drawMap() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var hex = st.style === 'hex';
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
      var few = r.status === 'ok' && r.n < SMALL_N && !isCount(st.measure);
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (few ? ' few' : ''));
      g.setAttribute('data-code', code);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      var shown = fmt(st.measure, r);
      g.setAttribute('aria-label', (st.geo === 'region' && area ? NAMES[code] + ', ' + areaName(area) : NAMES[code]) + ', ' +
        (shown ? shown + unitWord(st.measure) + ' (' + M[st.measure].short + ')' : 'no colonies genotyped') + (few ? ', small sample' : ''));
      var b = r.status === 'ok' ? bin(st.measure, r.v) : -1;
      var fill = b >= 0 ? binColor(b) : 'var(--nodata)';
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
    $('gx-maptitle').textContent = M[st.measure].label + ', ' + YEAR_LABEL;
    var usb = $('gx-us'), usv = fmt(st.measure, val('US', st.measure));
    usb.setAttribute('aria-pressed', String(st.sel === 'US'));
    usb.innerHTML = '<svg width="13" height="14" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10"/></svg>United States' + (usv ? '<b>' + usv + '</b>' : '');
    drawLegend();
  }
  function showTip(code, e, el) {
    var area = tileArea(code), r = area ? val(area, st.measure) : { status: 'none' }, shown = fmt(st.measure, r);
    var head = st.geo === 'region' && area ? areaName(area) : NAMES[code];
    var extra = r.status === 'ok' && !isCount(st.measure) ? ' · ' + plural(r.n, 'colony').replace('colonys', 'colonies') + ' genotyped' : '';
    tip.innerHTML = '<strong>' + head + '</strong><span>' + (shown ? shown + (isCount(st.measure) ? ' colonies' : ' ' + M[st.measure].short.toLowerCase()) + extra : 'No colonies genotyped') + '</span>';
    tip.hidden = false;
    if (e) moveTip(e);
    else if (el) { var cr = mapCard.getBoundingClientRect(), er = el.getBoundingClientRect(); place(er.left + er.width / 2 - cr.left, er.top - cr.top); }
  }
  function moveTip(e) { var cr = mapCard.getBoundingClientRect(); place(e.clientX - cr.left, e.clientY - cr.top - 8); }
  function place(x, y) { var w = tip.offsetWidth, cw = mapCard.clientWidth; tip.style.left = Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)) + 'px'; tip.style.top = y + 'px'; }
  function hideTip() { tip.hidden = true; }

  function drawLegend() {
    var b = M[st.measure].breaks, mid = st.measure, items = [];
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? 'Under ' + compact(mid, b[0]) : i === b.length ? compact(mid, b[i - 1]) + ' or more' : compact(mid, b[i - 1]) + '–' + compact(mid, b[i]);
      items.push('<span><i style="background:' + binColor(i) + '"></i>' + lab + '</span>');
    }
    if (!isCount(mid)) items.push('<span><i class="few"></i>Fewer than ' + SMALL_N + ' colonies</span>');
    items.push('<span><i style="background:var(--nodata)"></i>No colonies genotyped</span>');
    $('gx-legend').innerHTML = items.join('');
  }

  /* ---------- Side panel ---------- */
  function rankOf(area, mid) {
    var mine = val(area, mid);
    if (mine.status !== 'ok' || area === 'US' || mine.n < SMALL_N || isCount(mid)) return null;
    var n = 0, above = 0, tied = 0, key = function (x) { return x.toFixed(3); };
    areasForGeo().forEach(function (a) { var r = val(a, mid); if (r.status === 'ok' && r.n >= SMALL_N) { n++; if (key(r.v) === key(mine.v)) tied++; else if (r.v > mine.v) above++; } });
    return { rank: above + 1, of: n, tied: tied - 1 };
  }
  function compareLine(area, mid) {
    if (area === 'US' || isCount(mid)) return '';
    var mine = val(area, mid), us = val('US', mid);
    if (mine.status !== 'ok' || us.status !== 'ok') return '';
    var d = mine.v - us.v, u = M[mid].unit, amt = Math.abs(d).toFixed(u === 'index' ? 2 : 1);
    if (Number(amt) === 0) return 'About the same as the U.S. (' + fmt(mid, us) + ')';
    return amt + (u === 'pct' ? (amt === '1.0' ? ' point ' : ' points ') : ' ') + (d > 0 ? 'above' : 'below') + ' the U.S. (' + fmt(mid, us) + ')';
  }
  function renderPanel() {
    var area = st.sel, panel = $('gx-panel'), html = [], t = agg(area), n = t[0];
    html.push('<div class="lx-panel-head"><h2>' + areaName(area) + '</h2>' + (area !== 'US' ? '<button type="button" class="lx-link" id="gx-to-us">View United States</button>' : '') + '</div>');
    html.push('<p class="lx-sub">' + YEAR_LABEL + ' · ' + (n ? plural(n, 'colony').replace('colonys', 'colonies') + ' genotyped' : 'No colonies genotyped') + '</p>');
    if (area.indexOf('R:') === 0 && G.regions[area.slice(2)].states.length > 1) {
      var inReg = G.regions[area.slice(2)].states, have = inReg.filter(function (s) { return V[s]; });
      html.push('<p class="lx-small">' + have.map(function (s) { return NAMES[s]; }).join(', ') + '.' +
        (have.length < inReg.length ? ' No colonies from ' + inReg.filter(function (s) { return !V[s]; }).map(function (s) { return NAMES[s]; }).join(', ') + '.' : '') + '</p>');
    }
    var r = val(area, st.measure), shown = fmt(st.measure, r), rk = rankOf(area, st.measure), cmp = compareLine(area, st.measure);
    html.push('<div class="lx-hero"><p class="lx-k">' + M[st.measure].label + '</p>' +
      '<p class="lx-big">' + (shown || '<span class="lx-na">No colonies genotyped</span>') + '</p>' +
      (cmp ? '<p class="lx-cmp">' + cmp + '</p>' : '') +
      (rk ? '<p class="lx-rank">Rank ' + rk.rank + ' of ' + rk.of + ' ' + (st.geo === 'region' ? 'regions' : 'states') + ' with ' + SMALL_N + ' or more colonies (1 is the highest)' + (rk.tied > 0 ? '; tied with ' + rk.tied + ' other' + (rk.tied === 1 ? '' : 's') : '') + '</p>' : '') +
      (r.status === 'ok' && r.n < SMALL_N && !isCount(st.measure) ? '<p class="lx-small"><strong>Small sample.</strong> Fewer than ' + SMALL_N + ' colonies, so one colony moves this number a lot.</p>' : '') +
      (r.status === 'ok' && M[st.measure].pos ? '<p class="lx-small">' + r.pos.toLocaleString('en-US') + ' of ' + r.n.toLocaleString('en-US') + ' genotyped colonies.</p>' : '') + '</div>');

    var tiles = MEASURES.filter(function (m) { return m.id !== st.measure && m.id !== 'ma'; });
    html.push('<div class="lx-tiles">' + tiles.map(function (m) {
      var tr = val(area, m.id), s = fmt(m.id, tr);
      return '<button type="button" class="lx-tile" data-measure="' + m.id + '" title="Color the map by ' + m.label.toLowerCase() + '"><span class="lx-k">' + m.tile + '</span><span class="lx-v">' +
        (s || '<span class="lx-na">–</span>') + '</span><span class="lx-show">Show on map</span></button>';
    }).join('') + '</div>');

    if (n) {
      // Lineage makeup as a stacked bar
      var segs = [['C', t[1], 'var(--lin-c)'], ['M', t[2], 'var(--lin-m)'], ['A', t[3], 'var(--lin-a)'], ['O', t[4], 'var(--lin-o)']].filter(function (x) { return x[1] > 0; });
      html.push('<div class="lx-block"><h3 class="lx-h3">Lineage makeup</h3>' +
        '<div class="gx-stack" role="img" aria-label="' + segs.map(function (x) { return x[0] + ' lineage ' + (100 * x[1] / n).toFixed(1) + ' percent'; }).join(', ') + '">' +
        segs.map(function (x) { return '<span style="width:' + (100 * x[1] / n).toFixed(2) + '%;background:' + x[2] + '"></span>'; }).join('') + '</div>' +
        '<ul class="gx-keys">' + segs.map(function (x) { return '<li><i style="background:' + x[2] + '"></i>' + x[0] + ' lineage <b>' + (100 * x[1] / n).toFixed(1) + '%</b> <span>(' + x[1].toLocaleString('en-US') + ')</span></li>'; }).join('') + '</ul></div>');

      // Most common haplotypes
      var haps = G.haplotypes.map(function (h, i) { return { h: h, c: t[6 + i] }; }).filter(function (x) { return x.c > 0; })
        .sort(function (a, b) { return b.c - a.c || (a.h < b.h ? -1 : 1); });
      var top = haps.slice(0, 8), max = top.length ? top[0].c : 1;
      html.push('<div class="lx-block"><h3 class="lx-h3">Most common haplotypes</h3><p class="lx-small">Share of genotyped colonies carrying each haplotype' +
        (haps.length > top.length ? ', top ' + top.length + ' of ' + haps.length : '') + '.</p><ul class="lx-stress gx-haps">' +
        top.map(function (x) {
          return '<li><span class="lx-sname" title="' + hapNote(x.h) + '">' + x.h + '</span><span class="lx-track"><span class="lx-fill" style="width:' + Math.max(1, 100 * x.c / max).toFixed(1) + '%"></span></span>' +
            '<span class="lx-sval" title="' + x.c + ' colonies">' + (100 * x.c / n).toFixed(1) + '%</span></li>';
        }).join('') + '</ul>' +
        '<p class="lx-small">C1, C2, and C3 are the common lineages of <em>ligustica</em>, <em>carnica</em>, and Buckfast bees. Names ending in “-USA” are haplotypes first described in this dataset.</p></div>');
    }
    panel.innerHTML = html.join('');
    var toUs = $('gx-to-us'); if (toUs) toUs.addEventListener('click', function () { select('US'); });
    panel.querySelectorAll('[data-measure]').forEach(function (el) { el.addEventListener('click', function () { setMeasure(el.getAttribute('data-measure')); }); });
  }
  function hapNote(h) { return h === 'C1' ? 'C1 (A. m. ligustica)' : h === 'C2' ? 'C2 (A. m. carnica)' : h === 'C3' ? 'C3 (Buckfast)' : h; }

  /* ---------- Table ---------- */
  var TABLE_COLS = ['samples', 'ma', 'c', 'm', 'a', 'hd', 'novel'];
  var COL_LABEL = { samples: 'Colonies', ma: 'M or A %', c: 'C %', m: 'M %', a: 'A %', hd: 'Diversity', novel: 'Novel %' };
  function renderTable() {
    var sk = st.sortKey || st.measure;
    var arrow = function (k) { return sk === k ? (st.sortDir < 0 ? ' ↓' : ' ↑') : ''; };
    var head = '<tr><th scope="col" data-k="name" class="' + (sk === 'name' ? 'sorted' : '') + '">' + (st.geo === 'region' ? 'Region' : 'State') + arrow('name') + '</th>' +
      TABLE_COLS.map(function (m) { return '<th scope="col" class="num' + (sk === m ? ' sorted' : '') + '" data-k="' + m + '">' + COL_LABEL[m] + arrow(m) + '</th>'; }).join('') + '</tr>';
    var areas = (st.geo === 'region' ? REGION_KEYS.map(function (k) { return 'R:' + k; }) : STATES.slice()).filter(function (a) { return val(a, 'samples').v; });
    var f = st.filter.trim().toLowerCase();
    if (f) areas = areas.filter(function (a) { return areaName(a).toLowerCase().indexOf(f) >= 0 || a.toLowerCase() === f; });
    areas.sort(function (a, b) {
      if (sk === 'name') return (areaName(a) < areaName(b) ? -1 : 1) * st.sortDir;
      var va = val(a, sk), vb = val(b, sk), xa = va.status === 'ok' ? va.v : -Infinity, xb = vb.status === 'ok' ? vb.v : -Infinity;
      if (xa === xb) return areaName(a) < areaName(b) ? -1 : 1;
      return (xa - xb) * st.sortDir;
    });
    function row(a, cls) {
      var few = val(a, 'samples').v < SMALL_N;
      return '<tr class="' + cls + (a === st.sel ? ' on' : '') + '" data-code="' + a + '" tabindex="0"><th scope="row">' + areaName(a) + '</th>' +
        TABLE_COLS.map(function (m) {
          var r = val(a, m), s = fmt(m, r), flag = m === 'samples' && few;
          return '<td class="num' + (flag ? ' lx-few' : '') + '">' + (s || '<span class="lx-na">–</span>') +
            (flag ? ' <span class="lx-fewmark" aria-label="small sample" title="Fewer than ' + SMALL_N + ' colonies">!</span>' : '') + '</td>';
        }).join('') + '</tr>';
    }
    $('gx-table').innerHTML = '<thead>' + head + '</thead><tbody>' + row('US', 'pin') + areas.map(function (a) { return row(a, ''); }).join('') + '</tbody>';
    $('gx-tabletitle').textContent = (st.geo === 'region' ? 'Climate regions, ' : 'States and territories with colonies genotyped, ') + YEAR_LABEL;
    $('gx-tablenote').textContent = areas.length + (st.geo === 'region' ? ' regions' : ' states and territories') + '. Percents are shares of genotyped colonies. Diversity is the chance that two colonies carry different haplotypes. A ! marks fewer than ' + SMALL_N + ' colonies.';
    $('gx-table').querySelectorAll('th[data-k]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        if (k === sk) st.sortDir = -st.sortDir; else st.sortDir = k === 'name' ? 1 : -1;
        st.sortKey = k; renderTable();
      });
    });
    $('gx-table').querySelectorAll('tbody tr').forEach(function (tr) {
      var go = function () { select(tr.getAttribute('data-code')); var top = mapCard.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: top, behavior: reduceMotion() ? 'auto' : 'smooth' }); };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- Controls ---------- */
  function select(a) { st.sel = a; drawMap(); renderPanel(); markTableRow(); }
  function markTableRow() { $('gx-table').querySelectorAll('tbody tr').forEach(function (tr) { tr.classList.toggle('on', tr.getAttribute('data-code') === st.sel); }); }
  function setMeasure(mid) {
    if (mid === st.measure) return;
    st.measure = mid; msel.value = mid; st.sortKey = null; renderAll();
    var h = document.querySelector('#gx-panel .lx-hero'); if (h) { h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); }
  }
  function renderAll() { drawMap(); renderPanel(); renderTable(); }
  function setSeg(group, value) { document.querySelectorAll('[data-seg="' + group + '"] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === value)); }); }
  function setGeo(g) {
    if (g === st.geo) return;
    st.geo = g; setSeg('geo', g);
    if (st.sel !== 'US') st.sel = g === 'region' ? (REGION_OF[st.sel] ? 'R:' + REGION_OF[st.sel] : 'US') : 'US';
    st.sortKey = null; renderAll();
  }

  $('gx-us').addEventListener('click', function () { select('US'); });
  svg.addEventListener('click', function (e) { if (!e.target.closest('.area')) select('US'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.sel !== 'US' && !e.target.closest('input, select, textarea')) select('US'); });

  var msel = $('gx-measure'), groups = {};
  MEASURES.forEach(function (m) { (groups[m.group] = groups[m.group] || []).push(m); });
  msel.innerHTML = Object.keys(groups).map(function (g) { return '<optgroup label="' + g + '">' + groups[g].map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</optgroup>'; }).join('');
  msel.value = st.measure;
  msel.addEventListener('change', function () { st.measure = msel.value; st.sortKey = null; renderAll(); });

  document.querySelectorAll('[data-seg="style"] button').forEach(function (b) {
    b.addEventListener('click', function () { st.style = b.getAttribute('data-v'); setSeg('style', st.style); try { localStorage.setItem('hive-genetics-map-style', st.style); } catch (e) {} drawMap(); });
  });
  document.querySelectorAll('[data-seg="geo"] button').forEach(function (b) { b.addEventListener('click', function () { setGeo(b.getAttribute('data-v')); }); });

  var dl = $('gx-statelist');
  dl.innerHTML = ['US'].concat(STATES).map(function (c) { return '<option value="' + NAMES[c] + '"></option>'; }).join('');
  function goTo() {
    var q = $('gx-goto').value.trim().toLowerCase(); if (!q) return;
    var list = ['US'].concat(STATES);
    var hit = list.filter(function (c) { return NAMES[c].toLowerCase() === q || c.toLowerCase() === q; })[0] || list.filter(function (c) { return NAMES[c].toLowerCase().indexOf(q) === 0; })[0];
    if (hit) { if (st.geo === 'region' && hit !== 'US') setGeo('state'); select(hit); $('gx-goto').value = ''; }
  }
  $('gx-goto').addEventListener('change', goTo);
  $('gx-goto').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goTo(); } });
  $('gx-filter').addEventListener('input', function () { st.filter = $('gx-filter').value; renderTable(); });

  /* ---------- Summary line ---------- */
  (function summary() {
    var us = agg('US'), nMap = STATES.filter(function (s) { return SH.states[s]; }).length;
    var ma = val('US', 'ma'), c = val('US', 'c'), hd = val('US', 'hd');
    var regs = REGION_KEYS.map(function (k) { return { k: k, r: val('R:' + k, 'ma') }; }).filter(function (x) { return x.r.status === 'ok' && x.r.n >= SMALL_N; }).sort(function (a, b) { return b.r.v - a.r.v; });
    var hi = regs[0];
    $('gx-summary').innerHTML = 'Mitochondrial DNA from <strong>' + us[0].toLocaleString('en-US') + '</strong> honey bee colonies sampled in ' + YEAR_LABEL + ' across <strong>' + STATES.length + '</strong> states and territories. ' +
      'Most colonies, <strong>' + fmt('c', c) + '</strong>, carry the C lineage (eastern European), the ancestry of the common managed breeds. ' +
      '<strong>' + fmt('ma', ma) + '</strong> carry the M (western and northern European) or A (African) lineage' + (hi ? ', most often in <strong>' + (G.regions[hi.k].states.length === 1 ? NAMES[G.regions[hi.k].states[0]] : 'the ' + G.regions[hi.k].name + ' region') + '</strong> (' + fmt('ma', hi.r) + ')' : '') + '. ' +
      'Haplotype diversity for the whole data set is <strong>' + fmt('hd', hd) + '</strong> on a scale of 0 to 1. Click any state to see its numbers.';
    $('gx-note').textContent = us[0].toLocaleString('en-US') + ' colonies genotyped · ' + YEAR_LABEL + ' · ' + nMap + ' map areas with data';
  })();

  setSeg('style', st.style); setSeg('geo', st.geo);
  renderAll();

  /* ---------- Tabs ---------- */
  var tabs = [$('tab-map'), $('tab-about')];
  function isAboutHash(h) { return h === 'about' || h.indexOf('ab-') === 0; }
  function showTab(name, scroll) {
    var about = name === 'about';
    $('about').hidden = !about; $('gx-view').hidden = about;
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
  showTab(isAboutHash(location.hash.slice(1)) ? 'about' : 'map', false);
  if (location.hash.slice(1).indexOf('ab-') === 0) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();
