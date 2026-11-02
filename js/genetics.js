/* The Hive Atlas: Genetic Diversity map.
   Reads window.HIVE_GENETICS (data/genetics.js, built by pipeline/build_genetics.py)
   and window.HIVE_SHAPES (data/state-shapes.js). Counts only; no colony-level records.
   The United States is drawn with state shapes. Other countries are drawn as a country outline
   (window.HIVE_COUNTRY_SHAPES, data/country-shapes.js, from Natural Earth) with one dot per area. */
(function () {
  var G = window.HIVE_GENETICS, SH = window.HIVE_SHAPES;
  if (!G || !SH || !G.countries) return;

  var NS = 'http://www.w3.org/2000/svg';
  var SMALL_N = 10; // fewer colonies than this gets a "small sample" flag
  var CSHAPES = window.HIVE_COUNTRY_SHAPES || {};
  var US_NAMES = G.us.names, US_REGIONS = G.us.regions, REGION_KEYS = Object.keys(US_REGIONS), REGION_OF = {};
  REGION_KEYS.forEach(function (k) { US_REGIONS[k].states.forEach(function (s) { REGION_OF[s] = k; }); });
  var US_MAP_STATES = Object.keys(SH.states).sort(function (a, b) { return US_NAMES[a] < US_NAMES[b] ? -1 : 1; });
  var ci = {}; G.cols.forEach(function (c, i) { ci[c] = i; });
  var BYKEY = {}; G.countries.forEach(function (c) { BYKEY[c.key] = c; });
  var WSH = window.HIVE_WORLD_SHAPES || { land: [], sampled: {} };
  /* "Worldwide": every country pooled, one row per country. Each country's dot point is the
     colony-weighted middle of its areas (used for small countries and for the tooltip position). */
  var WORLD = { key: 'WORLD', name: 'Worldwide', iso: [], areas: [], rows: [] };
  G.countries.forEach(function (c, i) {
    var w = 0, la = 0, lo = 0, nAt = {};
    c.rows.forEach(function (r) { nAt[r[0]] = (nAt[r[0]] || 0) + r[2]; });
    c.areas.forEach(function (a, j) { if (a.lat != null && nAt[j]) { w += nAt[j]; la += a.lat * nAt[j]; lo += a.lon * nAt[j]; } });
    WORLD.areas.push({ id: c.key, name: c.name, lat: w ? la / w : null, lon: w ? lo / w : null });
    c.rows.forEach(function (r) { WORLD.rows.push([i].concat(r.slice(1))); });
  });
  BYKEY.WORLD = WORLD;
  var MENU = [G.countries[0], WORLD].concat(G.countries.slice(1));

  /* ---------- Totals for the selected country. T = { n, lin: [C, M, A], nl, nh, haps: {index: count} } ---------- */
  var C, V, AREAS, AREA_BY_ID, YEAR_LABEL, IS_US, IS_WORLD;
  function blank() { return { n: 0, lin: [0, 0, 0], nl: 0, nh: 0, haps: {} }; }
  function addInto(t, s) {
    t.n += s.n; t.nl += s.nl; t.nh += s.nh;
    for (var i = 0; i < 3; i++) t.lin[i] += s.lin[i];
    for (var h in s.haps) t.haps[h] = (t.haps[h] || 0) + s.haps[h];
  }
  function loadCountry(key) {
    C = BYKEY[key] || G.countries[0]; IS_US = C.key === 'USA'; IS_WORLD = C.key === 'WORLD';
    V = {}; AREAS = C.areas; AREA_BY_ID = {}; aggCache = {};
    AREAS.forEach(function (a) { AREA_BY_ID[a.id] = a; });
    var years = {}, noYear = 0;
    C.rows.forEach(function (r) {
      var a = AREAS[r[ci.area]].id, v = V[a] = V[a] || blank();
      v.n += r[ci.samples];
      var l = [r[ci.lin_C], r[ci.lin_M], r[ci.lin_A]];
      for (var i = 0; i < 3; i++) { v.lin[i] += l[i]; v.nl += l[i]; }
      var p = r[ci.haps];
      for (var j = 0; j < p.length; j += 2) { v.haps[p[j]] = (v.haps[p[j]] || 0) + p[j + 1]; v.nh += p[j + 1]; }
      v.years = v.years || {}; v.years[r[ci.year]] = 1;
      if (r[ci.year]) years[r[ci.year]] = 1; else noYear += r[ci.samples];
    });
    var ys = Object.keys(years).map(Number).sort();
    YEAR_LABEL = ys.length ? (ys.length > 1 ? ys[0] + '–' + ys[ys.length - 1] : String(ys[0])) : 'year not recorded';
    YEAR_NOTE = ys.length && noYear ? plural(noYear, 'colony') + ' without a sampling year' : '';
  }
  var YEAR_NOTE = '', aggCache = {};
  // Years behind one area (or region): "2010–2012", "2019", or "year not recorded"
  function yearsOf(area) {
    if (area === 'ALL') return YEAR_LABEL;
    var ys = {}; idsOf(area).forEach(function (id) { for (var y in V[id].years) if (+y) ys[y] = 1; });
    var l = Object.keys(ys).map(Number).sort();
    return l.length ? (l.length > 1 ? l[0] + '–' + l[l.length - 1] : String(l[0])) : 'year not recorded';
  }

  var US_BREAKS = { ma: [1, 4, 8, 15], c: [80, 90, 95, 98], m: [1, 4, 8, 12], a: [1, 3, 6, 10], hd: [0.5, 0.6, 0.7, 0.8], samples: [15, 20, 24, 30], hap: [5, 10, 25, 50] };
  var WORLD_BREAKS = { ma: [20, 40, 60, 80], c: [20, 40, 60, 80], m: [20, 40, 60, 80], a: [20, 40, 60, 80], hd: [0.2, 0.4, 0.6, 0.8], samples: [10, 25, 50, 100], hap: [5, 10, 25, 50] };
  var MEASURES = [
    { id: 'c', label: 'C lineage: percent of colonies', short: 'C lineage', tile: 'C lineage', unit: 'pct', group: 'Lineage', pos: function (t) { return t.lin[0]; } },
    { id: 'm', label: 'M lineage: percent of colonies', short: 'M lineage', tile: 'M lineage', unit: 'pct', group: 'Lineage', pos: function (t) { return t.lin[1]; } },
    { id: 'a', label: 'A lineage: percent of colonies', short: 'A lineage', tile: 'A lineage', unit: 'pct', group: 'Lineage', pos: function (t) { return t.lin[2]; } },
    { id: 'hd', label: 'Haplotype diversity (0 to 1)', short: 'Haplotype diversity', tile: 'Haplotype diversity', unit: 'index', group: 'Diversity' },
    { id: 'samples', label: 'Colonies genotyped', short: 'Colonies genotyped', tile: 'Colonies genotyped', unit: 'count', group: 'Samples' }
  ];
  var M = {}; MEASURES.forEach(function (m) { M[m.id] = m; });
  // Picked from the Haplotype menu: share of colonies (with a recorded haplotype) carrying one haplotype
  M.hap = { id: 'hap', unit: 'pct', group: 'Haplotype', get label() { return 'Haplotype ' + G.haplotypes[st.hap] + ': percent of colonies'; },
    get short() { return 'Haplotype ' + G.haplotypes[st.hap]; }, get tile() { return this.short; } };
  function isCount(mid) { return M[mid].unit === 'count'; }
  function breaks(mid) { return (IS_US ? US_BREAKS : WORLD_BREAKS)[mid]; }

  var st = { country: 'USA', geo: 'state', measure: 'c', hap: null, sel: 'ALL', sortKey: null, sortDir: -1, filter: '' };
  try { var savedC = localStorage.getItem('hive-genetics-country'); if (savedC && BYKEY[savedC]) st.country = savedC; } catch (e) {}
  try { var qC = new URLSearchParams(location.search).get('country'); if (qC) { var hitC = MENU.filter(function (c) { return c.key.toLowerCase() === qC.toLowerCase() || c.name.toLowerCase() === qC.toLowerCase(); })[0]; if (hitC) st.country = hitC.key; } } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('gx-map'), tip = $('gx-tip'), mapCard = $('gx-mapcard');
  var LABEL_NUDGE = { FL: [14, 6], MI: [10, 18], LA: [-8, 0], KY: [6, 2], VA: [6, 4], ID: [0, 16], MN: [-4, 6], CA: [-8, 0], WV: [-2, 4], MD: [0, -2], NY: [6, 2], HI: [6, 4], AK: [0, 0] };

  /* ---------- Values ---------- */
  function areaIds() { return AREAS.map(function (a) { return a.id; }).filter(function (id) { return V[id]; }); }
  function idsOf(area) {
    if (area === 'ALL') return areaIds();
    if (area.indexOf('R:') === 0) return US_REGIONS[area.slice(2)].states.filter(function (s) { return V[s]; });
    return V[area] ? [area] : [];
  }
  function agg(area) {
    if (aggCache[area]) return aggCache[area];
    var t = blank(); idsOf(area).forEach(function (s) { addInto(t, V[s]); });
    return (aggCache[area] = t);
  }
  // Nei's unbiased haplotype diversity: n/(n-1) * (1 - sum of squared frequencies)
  function diversity(t) {
    var n = t.nh; if (n < 2) return null;
    var sq = 0; for (var h in t.haps) { var p = t.haps[h] / n; sq += p * p; }
    return n / (n - 1) * (1 - sq);
  }
  // { v, n, status: ok | none }; n is the number of colonies the value is based on
  function val(area, mid) {
    var t = agg(area), m = M[mid];
    if (!t.n) return { v: null, n: 0, status: 'none' };
    if (m.unit === 'count') return { v: t.n, n: t.n, status: 'ok' };
    if (mid === 'hap') { if (!t.nh || st.hap == null) return { v: null, n: 0, status: 'none' }; var hp = t.haps[st.hap] || 0; return { v: 100 * hp / t.nh, n: t.nh, pos: hp, status: 'ok', hap: true }; }
    if (m.unit === 'index') { var d = diversity(t); return d == null ? { v: null, n: t.nh, status: 'none' } : { v: d, n: t.nh, status: 'ok' }; }
    if (!t.nl) return { v: null, n: 0, status: 'none' };
    var pos = m.pos(t);
    return { v: 100 * pos / t.nl, n: t.nl, pos: pos, status: 'ok' };
  }

  /* ---------- Text ---------- */
  function areaName(a) { return a === 'ALL' ? C.name : a.indexOf('R:') === 0 ? US_REGIONS[a.slice(2)].name + ' region' : AREA_BY_ID[a] ? AREA_BY_ID[a].name : a; }
  function areaWord(pl) { return IS_US ? (st.geo === 'region' ? (pl ? 'regions' : 'region') : (pl ? 'states' : 'state')) : IS_WORLD ? (pl ? 'countries' : 'country') : (pl ? 'areas' : 'area'); }
  function fmt(mid, r) {
    if (!r || r.status !== 'ok') return '';
    var u = M[mid].unit;
    return u === 'pct' ? r.v.toFixed(1) + '%' : u === 'index' ? r.v.toFixed(2) : r.v.toLocaleString('en-US');
  }
  function compact(mid, v) { var u = M[mid].unit; return u === 'pct' ? v + '%' : u === 'index' ? v.toFixed(1) : String(v); }
  function unitWord(mid) { return isCount(mid) ? ' colonies' : ''; }
  function plural(n, w) { return n.toLocaleString('en-US') + ' ' + (n === 1 ? w : /y$/.test(w) && !/ay$|ey$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Map ---------- */
  function areasForGeo() { return IS_US && st.geo === 'region' ? REGION_KEYS.map(function (k) { return 'R:' + k; }) : areaIds(); }
  function tileArea(code) { return IS_US && st.geo === 'region' ? (REGION_OF[code] ? 'R:' + REGION_OF[code] : null) : code; }
  function bin(mid, v) { var b = breaks(mid), i = 0; while (i < b.length && v >= b[i]) i++; return i; }
  function binColor(i) { return 'var(--c' + i + ')'; }

  function wire(g, code, area) {
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.addEventListener('mouseenter', function (e) { showTip(code, e); });
    g.addEventListener('mousemove', moveTip);
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('focus', function () { showTip(code, null, g); });
    g.addEventListener('blur', hideTip);
    g.addEventListener('click', function () { if (area) select(area); });
    g.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && area) { e.preventDefault(); select(area); } });
  }
  function ariaFor(code, area, r, few) {
    var shown = fmt(st.measure, r);
    return (IS_US && st.geo === 'region' && area ? areaName(code) + ', ' + areaName(area) : areaName(code)) + ', ' +
      (shown ? shown + unitWord(st.measure) + ' (' + M[st.measure].short + ')' : 'no colonies genotyped') + (few ? ', small sample' : '');
  }

  function drawMap() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    hideTip();
    if (IS_US) drawUS(); else if (IS_WORLD) drawGlobe(); else drawWorld();
    $('gx-maptitle').textContent = M[st.measure].label + ', ' + C.name + ', ' + YEAR_LABEL;
    var usb = $('gx-us'), usv = fmt(st.measure, val('ALL', st.measure));
    usb.setAttribute('aria-pressed', String(st.sel === 'ALL'));
    usb.innerHTML = '<svg width="13" height="14" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10"/></svg>' + esc(C.name) + (usv ? '<b>' + usv + '</b>' : '');
    drawLegend();
  }

  function drawUS() {
    svg.setAttribute('class', 'lx-map is-shapes' + (st.geo === 'region' ? ' is-region' : ''));
    svg.setAttribute('aria-label', 'Map of U.S. states');
    svg.setAttribute('viewBox', SH.viewBox.join(' '));
    var selected = [];
    US_MAP_STATES.forEach(function (code) {
      var area = tileArea(code), r = area ? val(area, st.measure) : { status: 'none' };
      var g = document.createElementNS(NS, 'g');
      var isSel = area && area === st.sel;
      var few = r.status === 'ok' && r.n < SMALL_N && !isCount(st.measure);
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (few ? ' few' : ''));
      g.setAttribute('data-code', code);
      g.setAttribute('aria-label', ariaFor(code, area, r, few));
      var b = r.status === 'ok' ? bin(st.measure, r.v) : -1;
      var shape = document.createElementNS(NS, 'path'); shape.setAttribute('d', SH.states[code]);
      shape.setAttribute('fill', b >= 0 ? binColor(b) : 'var(--nodata)'); shape.setAttribute('class', 'shape');
      g.appendChild(shape); svg.appendChild(g);
      var bb = shape.getBBox();
      if (bb.width >= 30 && bb.height >= 18) {
        var n = LABEL_NUDGE[code] || [0, 0], t = document.createElementNS(NS, 'text');
        t.setAttribute('x', (bb.x + bb.width / 2 + n[0]).toFixed(1)); t.setAttribute('y', (bb.y + bb.height / 2 + n[1]).toFixed(1));
        t.textContent = code; t.setAttribute('fill', b >= 3 ? 'var(--surface)' : 'var(--ink)'); g.appendChild(t);
      }
      if (isSel) selected.push(g);
      wire(g, code, area);
    });
    selected.forEach(function (g) { svg.appendChild(g); });
    var off = areaIds().filter(function (s) { return !SH.states[s]; });
    $('gx-mapnote').textContent = 'Color ranges are fixed for each measure. Gray states have no genotyped colonies.' +
      (off.length ? ' ' + off.map(function (s) { return areaName(s) + ' (' + V[s].n + ' colonies)'; }).join(' and ') + (off.length > 1 ? ' are' : ' is') + ' in the table and the U.S. totals but not on the map.' : '');
  }

  function bboxOf(pts) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    pts.forEach(function (p) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; });
    return b;
  }

  function drawWorld() {
    svg.setAttribute('class', 'lx-map is-dots');
    svg.setAttribute('aria-label', 'Map of ' + C.name + ' with one dot per area');
    var placed = AREAS.filter(function (a) { return V[a.id] && a.lat != null && a.lon != null; });
    var pts = placed.map(function (a) { return [a.lon, a.lat]; });
    // Keep only the outline parts near the sampled areas (drops far-off territories)
    var polys = CSHAPES[C.key] || [], pb = pts.length ? bboxOf(pts) : null;
    if (pb) {
      var pad = 6;
      var near = polys.filter(function (p) { var b = bboxOf(p[0]); return b[2] >= pb[0] - pad && b[0] <= pb[2] + pad && b[3] >= pb[1] - pad && b[1] <= pb[3] + pad; });
      if (near.length) polys = near;
    }
    var all = pts.slice(); polys.forEach(function (p) { all = all.concat(p[0]); });
    var W = 800, H, bb = all.length ? bboxOf(all) : [-10, -10, 10, 10];
    if (bb[2] - bb[0] < 2) { bb[0] -= 1.5; bb[2] += 1.5; }
    if (bb[3] - bb[1] < 2) { bb[1] -= 1.5; bb[3] += 1.5; }
    var kx = Math.cos((bb[1] + bb[3]) / 2 * Math.PI / 180), gw = (bb[2] - bb[0]) * kx, gh = bb[3] - bb[1];
    H = Math.round(Math.max(320, Math.min(620, W * gh / gw)));
    var padPx = 34, s = Math.min((W - 2 * padPx) / gw, (H - 2 * padPx) / gh);
    var ox = (W - gw * s) / 2, oy = (H - gh * s) / 2;
    function proj(p) { return [ox + (p[0] - bb[0]) * kx * s, oy + (bb[3] - p[1]) * s]; }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    if (polys.length) {
      var d = polys.map(function (p) { return p.map(function (r) { return 'M' + r.map(function (q) { var xy = proj(q); return xy[0].toFixed(1) + ',' + xy[1].toFixed(1); }).join('L') + 'Z'; }).join(''); }).join('');
      var land = document.createElementNS(NS, 'path'); land.setAttribute('d', d); land.setAttribute('class', 'land'); land.setAttribute('fill-rule', 'evenodd'); svg.appendChild(land);
    }

    var maxN = 1; placed.forEach(function (a) { if (V[a.id].n > maxN) maxN = V[a.id].n; });
    var selected = [];
    placed.slice().sort(function (a, b) { return V[b.id].n - V[a.id].n; }).forEach(function (a) {
      var r = val(a.id, st.measure), xy = proj([a.lon, a.lat]);
      var few = r.status === 'ok' && r.n < SMALL_N && !isCount(st.measure), isSel = a.id === st.sel;
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (few ? ' few' : ''));
      g.setAttribute('data-code', a.id);
      g.setAttribute('aria-label', ariaFor(a.id, a.id, r, few));
      var b = r.status === 'ok' ? bin(st.measure, r.v) : -1;
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', xy[0].toFixed(1)); c.setAttribute('cy', xy[1].toFixed(1));
      c.setAttribute('r', (6 + 16 * Math.sqrt(V[a.id].n / maxN)).toFixed(1));
      c.setAttribute('fill', b >= 0 ? binColor(b) : 'var(--nodata)'); c.setAttribute('class', 'shape');
      g.appendChild(c); svg.appendChild(g);
      if (isSel) selected.push(g);
      wire(g, a.id, a.id);
    });
    selected.forEach(function (g) { svg.appendChild(g); });

    var unplaced = areaIds().filter(function (id) { var a = AREA_BY_ID[id]; return a.lat == null || a.lon == null; });
    var nUn = unplaced.reduce(function (s, id) { return s + V[id].n; }, 0);
    $('gx-mapnote').textContent = 'Each dot is an area named in the source data, placed at the area’s reference point (often its capital); bigger dots mean more colonies. ' +
      (unplaced.length ? plural(nUn, 'colony') + ' with no recorded location ' + (nUn === 1 ? 'is' : 'are') + ' in the table and the ' + C.name + ' totals but not on the map. ' : '') +
      (polys.length ? 'Country outline: Natural Earth.' : '');
  }

  function drawGlobe() {
    svg.setAttribute('class', 'lx-map is-globe');
    svg.setAttribute('aria-label', 'World map with the countries that have genotyped colonies');
    var W = 1000, LAT0 = 76, LAT1 = -56, k = W / 360, H = Math.round((LAT0 - LAT1) * k);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function proj(p) { return [(p[0] + 180) * k, (LAT0 - p[1]) * k]; }
    function pathOf(polys) { return polys.map(function (pl) { return pl.map(function (r) { return 'M' + r.map(function (q) { var xy = proj(q); return xy[0].toFixed(1) + ',' + xy[1].toFixed(1); }).join('L') + 'Z'; }).join(''); }).join(''); }
    var bg = document.createElementNS(NS, 'path'); bg.setAttribute('d', pathOf(WSH.land)); bg.setAttribute('class', 'land'); svg.appendChild(bg);
    var selected = [], dots = [];
    AREAS.forEach(function (a) {
      if (!V[a.id]) return;
      var r = val(a.id, st.measure), few = r.status === 'ok' && r.n < SMALL_N && !isCount(st.measure), isSel = a.id === st.sel;
      var b = r.status === 'ok' ? bin(st.measure, r.v) : -1, fill = b >= 0 ? binColor(b) : 'var(--nodata)';
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (few ? ' few' : ''));
      g.setAttribute('data-code', a.id);
      g.setAttribute('aria-label', ariaFor(a.id, a.id, r, few));
      var polys = WSH.sampled[a.id] || [];
      if (polys.length) {
        var sh = document.createElementNS(NS, 'path'); sh.setAttribute('d', pathOf(polys)); sh.setAttribute('fill', fill);
        sh.setAttribute('fill-rule', 'evenodd'); sh.setAttribute('class', 'shape'); g.appendChild(sh);
      }
      svg.appendChild(g);
      // Countries too small to see get a dot as well
      var bb = polys.length ? g.getBBox() : { width: 0, height: 0 };
      if (Math.max(bb.width, bb.height) < 9 && a.lat != null) {
        var xy = proj([a.lon, a.lat]), c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', xy[0].toFixed(1)); c.setAttribute('cy', xy[1].toFixed(1)); c.setAttribute('r', '5');
        c.setAttribute('fill', fill); c.setAttribute('class', 'shape dot'); g.appendChild(c); dots.push(g);
      }
      if (isSel) selected.push(g);
      wire(g, a.id, a.id);
    });
    dots.forEach(function (g) { svg.appendChild(g); });
    selected.forEach(function (g) { svg.appendChild(g); });
    $('gx-mapnote').textContent = 'Each country with genotyped colonies is colored by the whole country’s value; small countries also get a dot. Gray land has no colonies in the database. Pick a country in the Country menu, or use the link in the side panel, to see its areas. Outlines: Natural Earth.';
  }

  function showTip(code, e, el) {
    var area = tileArea(code), r = area ? val(area, st.measure) : { status: 'none' }, shown = fmt(st.measure, r);
    var head = IS_US && st.geo === 'region' && area ? areaName(area) : areaName(code);
    var extra = r.status === 'ok' && !isCount(st.measure) ? ' · ' + plural(r.n, 'colony') : '';
    tip.innerHTML = '<strong>' + esc(head) + '</strong><span>' + (shown ? shown + (isCount(st.measure) ? ' colonies' : ' ' + M[st.measure].short.toLowerCase()) + extra : 'No colonies genotyped') + '</span>';
    tip.hidden = false;
    if (e) moveTip(e);
    else if (el) { var cr = mapCard.getBoundingClientRect(), er = el.getBoundingClientRect(); place(er.left + er.width / 2 - cr.left, er.top - cr.top); }
  }
  function moveTip(e) { var cr = mapCard.getBoundingClientRect(); place(e.clientX - cr.left, e.clientY - cr.top - 8); }
  function place(x, y) { var w = tip.offsetWidth, cw = mapCard.clientWidth; tip.style.left = Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)) + 'px'; tip.style.top = y + 'px'; }
  function hideTip() { tip.hidden = true; }

  function drawLegend() {
    var b = breaks(st.measure), mid = st.measure, items = [];
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? 'Under ' + compact(mid, b[0]) : i === b.length ? compact(mid, b[i - 1]) + ' or more' : compact(mid, b[i - 1]) + '–' + compact(mid, b[i]);
      items.push('<span><i style="background:' + binColor(i) + '"></i>' + lab + '</span>');
    }
    if (!isCount(mid)) items.push('<span><i class="few"></i>Fewer than ' + SMALL_N + ' colonies</span>');
    items.push('<span><i style="background:var(--nodata)"></i>' + (IS_US || IS_WORLD ? 'No colonies genotyped' : 'No value') + '</span>');
    $('gx-legend').innerHTML = items.join('');
  }

  /* ---------- Side panel ---------- */
  function rankOf(area, mid) {
    var mine = val(area, mid);
    if (mine.status !== 'ok' || area === 'ALL' || mine.n < SMALL_N || isCount(mid)) return null;
    var n = 0, above = 0, tied = 0, key = function (x) { return x.toFixed(3); };
    areasForGeo().forEach(function (a) { var r = val(a, mid); if (r.status === 'ok' && r.n >= SMALL_N) { n++; if (key(r.v) === key(mine.v)) tied++; else if (r.v > mine.v) above++; } });
    return n > 1 ? { rank: above + 1, of: n, tied: tied - 1 } : null;
  }
  function compareLine(area, mid) {
    if (area === 'ALL' || isCount(mid)) return '';
    var mine = val(area, mid), all = val('ALL', mid);
    if (mine.status !== 'ok' || all.status !== 'ok') return '';
    var d = mine.v - all.v, u = M[mid].unit, amt = Math.abs(d).toFixed(u === 'index' ? 2 : 1), who = IS_US ? 'the U.S.' : IS_WORLD ? 'the worldwide total' : C.name;
    if (Number(amt) === 0) return 'About the same as ' + who + ' (' + fmt(mid, all) + ')';
    return amt + (u === 'pct' ? (amt === '1.0' ? ' point ' : ' points ') : ' ') + (d > 0 ? 'above' : 'below') + ' ' + who + ' (' + fmt(mid, all) + ')';
  }
  function renderPanel() {
    var area = st.sel, panel = $('gx-panel'), html = [], t = agg(area), n = t.n;
    html.push('<div class="lx-panel-head"><h2>' + esc(areaName(area)) + '</h2>' + (area !== 'ALL' ? '<button type="button" class="lx-link" id="gx-to-us">View ' + esc(C.name) + '</button>' : '') + '</div>');
    html.push('<p class="lx-sub">' + (area !== 'ALL' && !IS_US && !IS_WORLD ? esc(C.name) + ' · ' : '') + yearsOf(area) + ' · ' + (n ? plural(n, 'colony') + ' genotyped' : 'No colonies genotyped') + '</p>');
    if (IS_WORLD && area !== 'ALL') html.push('<p><button type="button" class="btn" id="gx-open-country" data-key="' + esc(area) + '">Open the ' + esc(areaName(area)) + ' map →</button></p>');
    if (area === 'ALL' && YEAR_NOTE) html.push('<p class="lx-small">Includes ' + YEAR_NOTE + '.</p>');
    if (area.indexOf('R:') === 0 && US_REGIONS[area.slice(2)].states.length > 1) {
      var inReg = US_REGIONS[area.slice(2)].states, have = inReg.filter(function (s) { return V[s]; });
      html.push('<p class="lx-small">' + have.map(function (s) { return areaName(s); }).join(', ') + '.' +
        (have.length < inReg.length ? ' No colonies from ' + inReg.filter(function (s) { return !V[s]; }).map(function (s) { return US_NAMES[s]; }).join(', ') + '.' : '') + '</p>');
    }
    var r = val(area, st.measure), shown = fmt(st.measure, r), rk = rankOf(area, st.measure), cmp = compareLine(area, st.measure);
    html.push('<div class="lx-hero"><p class="lx-k">' + M[st.measure].label + '</p>' +
      '<p class="lx-big">' + (shown || '<span class="lx-na">' + (n ? 'Not recorded' : 'No colonies genotyped') + '</span>') + '</p>' +
      (cmp ? '<p class="lx-cmp">' + esc(cmp) + '</p>' : '') +
      (rk ? '<p class="lx-rank">Rank ' + rk.rank + ' of ' + rk.of + ' ' + areaWord(true) + ' with ' + SMALL_N + ' or more colonies (1 is the highest)' + (rk.tied > 0 ? '; tied with ' + rk.tied + ' other' + (rk.tied === 1 ? '' : 's') : '') + '</p>' : '') +
      (r.status === 'ok' && r.n < SMALL_N && !isCount(st.measure) ? '<p class="lx-small"><strong>Small sample.</strong> Fewer than ' + SMALL_N + ' colonies, so one colony moves this number a lot.</p>' : '') +
      (r.status === 'ok' && r.pos != null ? '<p class="lx-small">' + r.pos.toLocaleString('en-US') + ' of ' + plural(r.n, 'colony') + ' with a recorded ' + (r.hap ? 'haplotype' : 'lineage') + '.</p>' : '') +
      (r.status === 'ok' && M[st.measure].unit === 'index' ? '<p class="lx-small">From ' + plural(r.n, 'colony') + ' with a recorded haplotype.</p>' : '') + '</div>');

    var tiles = MEASURES.filter(function (m) { return m.id !== st.measure; });
    html.push('<div class="lx-tiles">' + tiles.map(function (m) {
      var tr = val(area, m.id), s = fmt(m.id, tr);
      return '<button type="button" class="lx-tile" data-measure="' + m.id + '" title="Color the map by ' + m.label.toLowerCase() + '"><span class="lx-k">' + m.tile + '</span><span class="lx-v">' +
        (s || '<span class="lx-na">–</span>') + '</span><span class="lx-show">Show on map</span></button>';
    }).join('') + '</div>');

    if (t.nl) {
      var segs = [['C', t.lin[0], 'var(--lin-c)'], ['M', t.lin[1], 'var(--lin-m)'], ['A', t.lin[2], 'var(--lin-a)']].filter(function (x) { return x[1] > 0; });
      html.push('<div class="lx-block"><h3 class="lx-h3">Lineage makeup</h3>' +
        '<div class="gx-stack" role="img" aria-label="' + segs.map(function (x) { return x[0] + ' lineage ' + (100 * x[1] / t.nl).toFixed(1) + ' percent'; }).join(', ') + '">' +
        segs.map(function (x) { return '<span style="width:' + (100 * x[1] / t.nl).toFixed(2) + '%;background:' + x[2] + '"></span>'; }).join('') + '</div>' +
        '<ul class="gx-keys">' + segs.map(function (x) { return '<li><i style="background:' + x[2] + '"></i>' + x[0] + ' lineage <b>' + (100 * x[1] / t.nl).toFixed(1) + '%</b> <span>(' + x[1].toLocaleString('en-US') + ')</span></li>'; }).join('') + '</ul>' +
        (t.nl < n ? '<p class="lx-small">' + plural(n - t.nl, 'colony') + ' with no recorded lineage ' + (n - t.nl === 1 ? 'is' : 'are') + ' left out of these shares.</p>' : '') + '</div>');
    }
    if (t.nh) {
      var haps = Object.keys(t.haps).map(function (h) { return { h: G.haplotypes[h], c: t.haps[h] }; })
        .sort(function (a, b) { return b.c - a.c || (a.h < b.h ? -1 : 1); });
      var top = haps.slice(0, 8), max = top.length ? top[0].c : 1;
      html.push('<div class="lx-block"><h3 class="lx-h3">Most common haplotypes</h3><p class="lx-small">Share of colonies with a recorded haplotype carrying each one' +
        (haps.length > top.length ? ', top ' + top.length + ' of ' + haps.length : '') + '.</p><ul class="lx-stress gx-haps">' +
        top.map(function (x) {
          return '<li><span class="lx-sname" title="' + esc(hapNote(x.h)) + '">' + esc(x.h) + '</span><span class="lx-track"><span class="lx-fill" style="width:' + Math.max(1, 100 * x.c / max).toFixed(1) + '%"></span></span>' +
            '<span class="lx-sval" title="' + x.c + ' colonies">' + (100 * x.c / t.nh).toFixed(1) + '%</span></li>';
        }).join('') + '</ul>' +
        (IS_US ? '<p class="lx-small">C1, C2, and C3 are the common lineages of <em>ligustica</em>, <em>carnica</em>, and Buckfast bees. Names ending in “-USA” are haplotypes first described in the U.S. data.</p>' : '') + '</div>');
    }
    panel.innerHTML = html.join('');
    var toUs = $('gx-to-us'); if (toUs) toUs.addEventListener('click', function () { select('ALL'); });
    var openC = $('gx-open-country'); if (openC) openC.addEventListener('click', function () { setCountry(openC.getAttribute('data-key')); window.scrollTo({ top: $('gx-view').getBoundingClientRect().top + window.scrollY - 90, behavior: reduceMotion() ? 'auto' : 'smooth' }); });
    panel.querySelectorAll('[data-measure]').forEach(function (el) { el.addEventListener('click', function () { setMeasure(el.getAttribute('data-measure')); }); });
  }
  function hapNote(h) { return h === 'C1' ? 'C1 (A. m. ligustica)' : h === 'C2' ? 'C2 (A. m. carnica)' : h === 'C3' ? 'C3 (Buckfast)' : h; }

  /* ---------- Table ---------- */
  var BASE_COLS = ['samples', 'c', 'm', 'a', 'hd'];
  var COL_LABEL = { samples: 'Colonies', c: 'C %', m: 'M %', a: 'A %', hd: 'Diversity' };
  function renderTable() {
    var TABLE_COLS = BASE_COLS.concat(st.hap != null ? ['hap'] : []);
    COL_LABEL.hap = st.hap != null ? G.haplotypes[st.hap] + ' %' : '';
    var sk = st.sortKey || st.measure;
    var arrow = function (k) { return sk === k ? (st.sortDir < 0 ? ' ↓' : ' ↑') : ''; };
    var word = IS_US ? (st.geo === 'region' ? 'Region' : 'State') : IS_WORLD ? 'Country' : 'Area';
    var head = '<tr><th scope="col" data-k="name" class="' + (sk === 'name' ? 'sorted' : '') + '">' + word + arrow('name') + '</th>' +
      TABLE_COLS.map(function (m) { return '<th scope="col" class="num' + (sk === m ? ' sorted' : '') + '" data-k="' + m + '">' + COL_LABEL[m] + arrow(m) + '</th>'; }).join('') + '</tr>';
    var areas = areasForGeo().filter(function (a) { return val(a, 'samples').v; });
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
      return '<tr class="' + cls + (a === st.sel ? ' on' : '') + '" data-code="' + esc(a) + '" tabindex="0"><th scope="row">' + esc(areaName(a)) + '</th>' +
        TABLE_COLS.map(function (m) {
          var r = val(a, m), s = fmt(m, r), flag = m === 'samples' && few;
          return '<td class="num' + (flag ? ' lx-few' : '') + '">' + (s || '<span class="lx-na">–</span>') +
            (flag ? ' <span class="lx-fewmark" aria-label="small sample" title="Fewer than ' + SMALL_N + ' colonies">!</span>' : '') + '</td>';
        }).join('') + '</tr>';
    }
    $('gx-table').innerHTML = '<thead>' + head + '</thead><tbody>' + row('ALL', 'pin') + areas.map(function (a) { return row(a, ''); }).join('') + '</tbody>';
    $('gx-tabletitle').textContent = (IS_US ? (st.geo === 'region' ? 'Climate regions' : 'States and territories with colonies genotyped') : IS_WORLD ? 'Countries with colonies genotyped' : C.name + ': areas with colonies genotyped') + ', ' + YEAR_LABEL;
    $('gx-tablenote').textContent = areas.length + ' ' + (IS_US ? (st.geo === 'region' ? 'regions' : 'states and territories') : IS_WORLD ? 'countries' : (areas.length === 1 ? 'area' : 'areas')) + '. Percents are shares of colonies with a recorded lineage. Diversity is the chance that two colonies carry different haplotypes. A ! marks fewer than ' + SMALL_N + ' colonies.';
    $('gx-filter').placeholder = 'Filter ' + (IS_US ? 'states' : IS_WORLD ? 'countries' : 'areas');
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
    st.measure = mid; hapOption(false); msel.value = mid; st.hap = null; hsel.value = ''; st.sortKey = null; renderAll();
    var h = document.querySelector('#gx-panel .lx-hero'); if (h) { h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); }
  }
  function renderAll() { drawMap(); renderPanel(); renderTable(); }
  function setSeg(group, value) { document.querySelectorAll('[data-seg="' + group + '"] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === value)); }); }
  function setGeo(g) {
    if (g === st.geo) return;
    st.geo = g; setSeg('geo', g);
    if (st.sel !== 'ALL') st.sel = g === 'region' ? (REGION_OF[st.sel] ? 'R:' + REGION_OF[st.sel] : 'ALL') : 'ALL';
    st.sortKey = null; renderAll();
  }
  function setCountry(key) {
    st.country = key; loadCountry(key);
    st.sel = 'ALL'; st.geo = 'state'; setSeg('geo', 'state'); st.sortKey = null; st.filter = ''; $('gx-filter').value = '';
    st.hap = null; if (st.measure === 'hap') { st.measure = 'c'; msel.value = 'c'; } hapOption(false); fillHaps();
    csel.value = C.key;
    $('gx-geo-ctl').hidden = !IS_US;
    $('gx-goto-lab').textContent = IS_US ? 'Go to a state' : IS_WORLD ? 'Go to a country' : 'Go to an area';
    $('gx-goto').placeholder = IS_US ? 'e.g. Maryland or MD' : 'e.g. ' + ((AREAS.filter(function (a) { return V[a.id]; })[0] || { name: '' }).name);
    $('gx-statelist').innerHTML = ['ALL'].concat(areaIds()).map(function (c) { return '<option value="' + esc(areaName(c)) + '"></option>'; }).join('');
    $('gx-maphelp').textContent = IS_US ? 'Click a state to see its numbers, or the button to go back to the whole country.' : IS_WORLD ? 'Click a country to see its numbers, or the button to go back to the worldwide total.' : 'Click a dot to see that area’s numbers, or the button to go back to the whole country.';
    try { localStorage.setItem('hive-genetics-country', key); } catch (e) {}
    summary(); renderAll();
  }

  var csel = $('gx-country');
  csel.innerHTML = MENU.map(function (c) {
    var n = c.rows.reduce(function (s, r) { return s + r[ci.samples]; }, 0);
    return '<option value="' + esc(c.key) + '">' + esc(c.name) + ' (' + n.toLocaleString('en-US') + ')</option>';
  }).join('');
  csel.addEventListener('change', function () { setCountry(csel.value); });

  $('gx-us').addEventListener('click', function () { select('ALL'); });
  svg.addEventListener('click', function (e) { if (!e.target.closest('.area')) select('ALL'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.sel !== 'ALL' && !e.target.closest('input, select, textarea')) select('ALL'); });

  var msel = $('gx-measure'), groups = {};
  MEASURES.forEach(function (m) { (groups[m.group] = groups[m.group] || []).push(m); });
  msel.innerHTML = Object.keys(groups).map(function (g) { return '<optgroup label="' + g + '">' + groups[g].map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</optgroup>'; }).join('');
  // "Selected haplotype" is in this menu only while a haplotype is picked (Safari shows hidden options)
  function hapOption(on) {
    var o = msel.querySelector('option[value="hap"]');
    if (on && !o) msel.insertAdjacentHTML('beforeend', '<option value="hap">Selected haplotype (see Haplotype menu)</option>');
    if (!on && o) o.remove();
  }
  msel.value = st.measure;
  msel.addEventListener('change', function () { st.measure = msel.value; if (st.measure !== 'hap') hapOption(false); st.hap = null; hsel.value = ''; st.sortKey = null; renderAll(); });

  /* Haplotype menu: lists the haplotypes found in the selected country, most common first */
  var hsel = $('gx-hap');
  function fillHaps() {
    var t = agg('ALL'), list = Object.keys(t.haps).map(Number).sort(function (a, b) { return t.haps[b] - t.haps[a] || (G.haplotypes[a] < G.haplotypes[b] ? -1 : 1); });
    hsel.innerHTML = '<option value="">All haplotypes</option>' + list.map(function (h) {
      return '<option value="' + h + '">' + esc(G.haplotypes[h]) + ' (' + t.haps[h].toLocaleString('en-US') + ')</option>';
    }).join('');
    hsel.disabled = !list.length;
  }
  hsel.addEventListener('change', function () {
    if (hsel.value === '') { st.hap = null; if (st.measure === 'hap') { st.measure = 'c'; msel.value = 'c'; } hapOption(false); }
    else { st.hap = Number(hsel.value); st.measure = 'hap'; hapOption(true); msel.value = 'hap'; }
    st.sortKey = null; renderAll();
  });
  document.querySelectorAll('[data-seg="geo"] button').forEach(function (b) { b.addEventListener('click', function () { setGeo(b.getAttribute('data-v')); }); });

  function goTo() {
    var q = $('gx-goto').value.trim().toLowerCase(); if (!q) return;
    var list = ['ALL'].concat(areaIds());
    var hit = list.filter(function (c) { return areaName(c).toLowerCase() === q || c.toLowerCase() === q; })[0] || list.filter(function (c) { return areaName(c).toLowerCase().indexOf(q) === 0; })[0];
    if (hit) { if (st.geo === 'region' && hit !== 'ALL') setGeo('state'); select(hit); $('gx-goto').value = ''; }
  }
  $('gx-goto').addEventListener('change', goTo);
  $('gx-goto').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goTo(); } });
  $('gx-filter').addEventListener('input', function () { st.filter = $('gx-filter').value; renderTable(); });

  /* ---------- Summary line ---------- */
  function summary() {
    var all = agg('ALL'), c = val('ALL', 'c'), m = val('ALL', 'm'), a = val('ALL', 'a'), hd = val('ALL', 'hd');
    var nAreas = areaIds().length;
    var parts = [['C', c, 'eastern European'], ['M', m, 'western and northern European'], ['A', a, 'African']].filter(function (x) { return x[1].status === 'ok'; })
      .sort(function (x, y) { return y[1].v - x[1].v; });
    var lead = parts[0];
    $('gx-summary').innerHTML = 'Mitochondrial DNA from <strong>' + G.source.samples.toLocaleString('en-US') + '</strong> honey bee colonies in <strong>' + G.countries.length + '</strong> countries. ' +
      (IS_WORLD ? 'For <strong>all countries together</strong>' : 'For <strong>' + esc(C.name) + '</strong>') + ': ' + plural(all.n, 'colony') + ' (' + YEAR_LABEL + ') from ' + plural(nAreas, IS_US ? 'state or territory' : IS_WORLD ? 'country' : 'area').replace('state or territories', 'states and territories') + '. ' +
      (lead ? 'Most carry the <strong>' + lead[0] + '</strong> lineage (' + lead[2] + '), <strong>' + fmt(lead[0].toLowerCase(), lead[1]) + '</strong>' +
        (parts.length > 1 ? '; ' + parts.slice(1).map(function (x) { return x[0] + ' ' + fmt(x[0].toLowerCase(), x[1]); }).join(', ') : '') + '. ' : '') +
      (hd.status === 'ok' ? 'Haplotype diversity is <strong>' + fmt('hd', hd) + '</strong> on a scale of 0 to 1. ' : '') +
      (IS_WORLD ? 'Click any country to see its numbers.' : 'Pick a country, then click any area to see its numbers.');
    $('gx-note').textContent = G.source.samples.toLocaleString('en-US') + ' colonies genotyped · ' + G.countries.length + ' countries · ' + C.name + ': ' + all.n.toLocaleString('en-US') + ' colonies, ' + YEAR_LABEL;
  }

  setCountry(st.country);

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
