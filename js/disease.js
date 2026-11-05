/* The Hive Atlas: Disease Surveillance map.
   Reads window.HIVE_DISEASE (data/disease.js), window.HIVE_SHAPES (data/state-shapes.js) and
   window.HIVE_DISEASE_SHAPES (data/disease-shapes.js, Natural Earth country outlines).
   Views, picked with the Continent and Country menus as on the Genetic Diversity page:
     the United States (state shapes, states or climate regions),
     another country (its outline with one dot per province or area),
     a continent or the whole world (each country colored by its pooled value). */
(function () {
  var D = window.HIVE_DISEASE, SH = window.HIVE_SHAPES, HEX = window.HIVE_HEX_LAYOUT;
  if (!D || !SH || !HEX) return;
  var WSH = window.HIVE_DISEASE_SHAPES || { land: [], countries: {} };
  var AREA_IDS = D.areas || D.states, POINTS = D.points || {};
  var COUNTRIES = D.countries || [{ key: 'USA', name: 'United States', cont: 'North America', areas: D.states }];
  var CONTS = D.continents || [];
  var BYKEY = {}; COUNTRIES.forEach(function (c) { BYKEY[c.key] = c; });
  function pool(key, name, cont) {
    return { key: key, name: name, cont: cont || null, pool: true, members: COUNTRIES.filter(function (c) { return !cont || c.cont === cont; }).map(function (c) { return c.key; }) };
  }
  var WORLD = pool('WORLD', 'Worldwide'); BYKEY.WORLD = WORLD;
  CONTS.forEach(function (ct) { BYKEY['CONT:' + ct] = pool('CONT:' + ct, ct, ct); });
  // The view picked in the Country menu
  var V = BYKEY.USA, IS_US = true, IS_POOL = false;

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
    var s = AREA_IDS[r[0]], y = r[1];
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
    { id: 'vil', label: 'Varroa: average mites per 100 bees', short: 'Mites per 100 bees', tile: 'Mites per 100 bees', unit: 'load', n: 6, sum: 7, sq: 14, group: 'Varroa mite' },
    { id: 'nos', label: 'Nosema: percent of samples positive', short: 'Nosema', tile: 'Nosema positive', unit: 'pct', n: 2, pos: 3, group: 'Nosema' },
    { id: 'ms', label: 'Nosema: average million spores per bee', short: 'Million spores per bee', tile: 'Spores per bee (millions)', unit: 'load', n: 8, sum: 9, sq: 15, group: 'Nosema' },
    { id: 'tm', label: 'Tracheal mite: percent of samples positive', short: 'Tracheal mite', tile: 'Tracheal mite positive', unit: 'pct', n: 4, pos: 5, group: 'Tracheal mite' },
    { id: 'afb', label: 'American foulbrood: percent of brood samples positive', short: 'American foulbrood', tile: 'American foulbrood', unit: 'pct', n: 10, pos: 11, brood: true, group: 'Foulbrood (brood samples)' },
    { id: 'efb', label: 'European foulbrood: percent of brood samples positive', short: 'European foulbrood', tile: 'European foulbrood', unit: 'pct', n: 10, pos: 12, brood: true, group: 'Foulbrood (brood samples)' },
    { id: 'samples', label: 'Adult samples tested', short: 'Adult samples', tile: 'Adult samples', unit: 'count', idx: 0, group: 'Samples' },
    { id: 'brood', label: 'Brood samples tested', short: 'Brood samples', tile: 'Brood samples', unit: 'count', idx: 11, brood: true, group: 'Samples' }
  ];
  var M = {}; MEASURES.forEach(function (m) { M[m.id] = m; });
  // first and last year each test was run
  // which years each test ran, anywhere in the data (CUBE keys include every country)
  MEASURES.forEach(function (m) {
    if (m.unit === 'count') { m.years = YEARS.filter(function (y) { return Object.keys(CUBE).some(function (s) { return (CUBE[s][y] || []).some(function (c) { return c[1][m.idx] > 0; }); }); }); return; }
    m.years = YEARS.filter(function (y) { return Object.keys(CUBE).some(function (s) { return (CUBE[s][y] || []).some(function (c) { return c[1][m.n + 1] > 0; }); }); });
  });
  function isCount(mid) { return M[mid].unit === 'count'; }
  function sampleKind(mid) { return M[mid].brood ? 'brood' : 'adult'; }
  function testedIn(mid, y0, y1) { return M[mid].years.some(function (y) { return y >= y0 && y <= y1; }); }

  // Opening view: climate regions, Varroa positive, the last three complete years pooled, so the map is filled in
  var st = { style: 'shapes', geo: 'region', measure: 'vd', mode: 'range', year: LATEST_FULL, from: Math.max(FIRST, LATEST_FULL - 2), to: LATEST_FULL, season: 'all', shade: 'rate', sel: 'ALL', sortKey: null, sortDir: -1, filter: '', country: 'USA', cont: '' };
  try { var savedC = localStorage.getItem('hive-disease-country'); if (savedC && BYKEY[savedC]) st.country = savedC; } catch (e) {}
  try { var savedK = localStorage.getItem('hive-disease-continent'); if (savedK && CONTS.indexOf(savedK) >= 0) st.cont = savedK; } catch (e) {}
  try {
    var qC = new URLSearchParams(location.search).get('country');
    if (qC) { var hitC = Object.keys(BYKEY).filter(function (k) { return k.toLowerCase() === qC.toLowerCase() || BYKEY[k].name.toLowerCase() === qC.toLowerCase(); })[0]; if (hitC) { st.country = hitC; st.cont = ''; } }
  } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Values ---------- */
  function span() { return st.mode === 'year' ? [st.year, st.year] : [Math.min(st.from, st.to), Math.max(st.from, st.to)]; }
  // leaf areas (U.S. states, provinces, country areas) behind an area of the current view
  function statesOf(area) {
    if (area === 'ALL') return IS_POOL ? [].concat.apply([], V.members.map(function (k) { return BYKEY[k].areas; })) : V.areas;
    if (area.indexOf('R:') === 0) return D.regions[area.slice(2)].states;
    if (BYKEY[area] && !BYKEY[area].pool) return BYKEY[area].areas;
    return [area];
  }
  // areas listed in the table, ranked, and drawn: states or regions, a country's areas, or a pool's countries
  function viewAreas() {
    if (IS_US) return st.geo === 'region' ? REGION_KEYS.map(function (k) { return 'R:' + k; }) : D.states.slice();
    return IS_POOL ? V.members.slice() : V.areas.slice();
  }
  var aggCache = {};
  function agg(area, y0, y1, months) {
    var ck = (area === 'ALL' ? V.key : area) + '|' + y0 + '|' + y1 + '|' + (months ? months.join(',') : '');
    if (aggCache[ck]) return aggCache[ck];
    var t = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    statesOf(area).forEach(function (s) {
      var cy = CUBE[s]; if (!cy) return;
      for (var y = y0; y <= y1; y++) {
        (cy[y] || []).forEach(function (c) {
          if (months && months.indexOf(c[0]) < 0) return;
          for (var i = 0; i < 16; i++) t[i] += c[1][i] || 0;
        });
      }
    });
    return (aggCache[ck] = t);
  }
  // { v, n, status: ok | none (no samples) | nottested }
  function valueFrom(t, mid) {
    var m = M[mid];
    var base = m.brood ? t[11] : t[0]; // adult or brood samples, whichever this measure uses
    if (!base) return { v: null, n: 0, status: 'none' };
    if (m.unit === 'count') return { v: base, n: base, status: 'ok' };
    var n = t[m.n + 1];
    if (!n) return { v: null, n: 0, status: 'nottested', samples: t[0] };
    return { v: m.unit === 'pct' ? 100 * t[m.pos + 1] / n : t[m.sum + 1] / n, n: n, pos: m.unit === 'pct' ? t[m.pos + 1] : null, status: 'ok' };
  }
  function valAt(area, mid, y0, y1, season) { return valueFrom(agg(area, y0, y1, SEASONS[season || 'all'].months), mid); }
  function val(area, mid) { var s = span(); return valAt(area, mid, s[0], s[1], st.season); }
  function valMonth(area, mid, month) { var s = span(); return valueFrom(agg(area, s[0], s[1], [month]), mid); }

  /* ---------- Seasonal expectation ----------
     Expected value for an area = what it would show if each of its samples matched the national BDDL
     result for the same calendar month, over a 5-year window centered on the sample's year. */
  var WIN = 2, MIN_BASE = 30;
  var NAT = {};
  D.states.forEach(function (s) { if (!CUBE[s]) return;
    Object.keys(CUBE[s]).forEach(function (y) {
      CUBE[s][y].forEach(function (c) {
        var row = ((NAT[y] = NAT[y] || {})[c[0]] = NAT[y][c[0]] || new Array(16).fill(0));
        for (var i = 0; i < 16; i++) row[i] += c[1][i] || 0;
      });
    });
  });
  var baseCache = {};
  function baseline(mid, y, mo) {
    var ck = mid + '|' + y + '|' + mo;
    if (baseCache[ck]) return baseCache[ck];
    var m = M[mid], ni = m.n + 1;
    function sum(months) {
      var t = { n: 0, a: 0, q: 0 };
      for (var yy = y - WIN; yy <= y + WIN; yy++) {
        var ny = NAT[yy]; if (!ny) continue;
        Object.keys(ny).forEach(function (k) {
          if (months && months.indexOf(+k) < 0) return;
          var r = ny[k]; t.n += r[ni];
          if (m.unit === 'pct') t.a += r[m.pos + 1]; else { t.a += r[m.sum + 1]; t.q += r[m.sq]; }
        });
      }
      return t;
    }
    var t = mo ? sum([mo]) : null;
    if (!t || t.n < MIN_BASE) t = sum(null); // too few samples that month nationally: use the whole window
    var out = { n: t.n };
    if (m.unit === 'pct') out.p = t.n ? t.a / t.n : null;
    else { out.mean = t.n ? t.a / t.n : null; out.vr = t.n ? Math.max(0, t.q / t.n - out.mean * out.mean) : null; }
    return (baseCache[ck] = out);
  }
  var expCache = {};
  function expAt(area, mid, y0, y1, season) {
    var months = SEASONS[season || 'all'].months, ck = [area === 'ALL' ? V.key : area, mid, y0, y1, season].join('|');
    if (expCache[ck]) return expCache[ck];
    var m = M[mid], ni = m.n + 1, N = 0, O = 0, E = 0, V = 0;
    statesOf(area).forEach(function (s) {
      var cy = CUBE[s]; if (!cy) return;
      for (var y = y0; y <= y1; y++) {
        (cy[y] || []).forEach(function (c) {
          if (months && months.indexOf(c[0]) < 0) return;
          var n = c[1][ni]; if (!n) return;
          var b = baseline(mid, y, c[0]);
          N += n;
          if (m.unit === 'pct') { if (b.p == null) return; O += c[1][m.pos + 1]; E += n * b.p; V += n * b.p * (1 - b.p); }
          else { if (b.mean == null) return; O += c[1][m.sum + 1]; E += n * b.mean; V += n * b.vr; }
        });
      }
    });
    var r = { n: N, o: O, e: E };
    if (!N) r.status = 'none';
    else {
      r.status = 'ok';
      r.obs = m.unit === 'pct' ? 100 * O / N : O / N;
      r.exp = m.unit === 'pct' ? 100 * E / N : E / N;
      r.diff = r.obs - r.exp;                                  // points (percent) or load units
      r.ratio = E > 0 ? O / E : (O > 0 ? Infinity : 1);
      r.z = V > 0 ? (O - E) / Math.sqrt(V) : (O === E ? 0 : (O > E ? 9 : -9));
    }
    return (expCache[ck] = r);
  }
  function expVal(area, mid) { var s = span(); return expAt(area, mid, s[0], s[1], st.season); }
  // -2 much lower, -1 lower, 0 within expected range, 1 higher, 2 much higher
  function expClass(mid, e) {
    if (!e || e.status !== 'ok') return null;
    if (Math.abs(e.z) < 1.96) return 0;
    var strong = M[mid].unit === 'pct' ? Math.abs(e.diff) >= 15 : (e.ratio >= 2 || e.ratio <= 0.5);
    return (e.z > 0 ? 1 : -1) * (strong ? 2 : 1);
  }
  var EXP_COLOR = { '-2': 'var(--dv-lo2)', '-1': 'var(--dv-lo1)', '0': 'var(--dv-mid)', '1': 'var(--dv-hi1)', '2': 'var(--dv-hi2)' };
  function expText(mid, e, short) {
    if (!e || e.status !== 'ok') return '';
    var u = M[mid].unit;
    var amt = u === 'pct' ? Math.abs(e.diff).toFixed(1) + ' points ' + (e.diff >= 0 ? 'above' : 'below')
      : (e.ratio === Infinity ? 'above' : (e.ratio > 0 && e.ratio < 0.05 ? 'under 0.1 times' : e.ratio.toFixed(1) + ' times'));
    var expS = u === 'pct' ? e.exp.toFixed(1) + '%' : e.exp.toFixed(1);
    if (short) return u === 'pct' ? (e.diff >= 0 ? '+' : '−') + Math.abs(e.diff).toFixed(1) + ' pts vs. expected ' + expS : (e.ratio === Infinity ? 'above' : e.ratio.toFixed(1) + '×') + ' expected ' + expS;
    if (u === 'pct') return amt + ' the seasonal expectation (' + expS + ')';
    return amt + ' the seasonal expectation (' + expS + ')' + (e.ratio >= 2 && e.ratio !== Infinity ? ', at least double' : e.ratio <= 0.5 ? ', less than half' : '');
  }
  var EXP_WORD = { '-2': 'much lower than expected', '-1': 'lower than expected', '0': 'within the expected range', '1': 'higher than expected', '2': 'much higher than expected' };
  function shadeExp() { return IS_US && st.shade === 'expect' && !isCount(st.measure); }

  /* ---------- Labels and formatting ---------- */
  function timeLabel() {
    var s = span(), y = s[0] === s[1] ? String(s[0]) : s[0] + '–' + s[1];
    if (s[1] === LAST && LAST_MONTH[LAST] < 12) y += ' (' + (s[0] === s[1] ? 'through ' : 'through ') + MONTHS[LAST_MONTH[LAST]] + ' ' + LAST + ')';
    return y + (st.season !== 'all' ? ', ' + SEASONS[st.season].label.toLowerCase() : '');
  }
  function areaName(a) {
    if (a === 'ALL') return V.pool && V.cont ? 'All countries in ' + V.name : V.name;
    if (a.indexOf('R:') === 0) return D.regions[a.slice(2)].name + (D.regions[a.slice(2)].states.length > 1 ? ' region' : '');
    if (BYKEY[a]) return BYKEY[a].name;
    return NAMES[a] || a;
  }
  // the total the current view compares against
  function who() { return IS_US ? 'the U.S.' : IS_POOL ? (V.cont ? 'the ' + V.name + ' total' : 'the worldwide total') : V.name; }
  function areaWord(pl) { return IS_US ? (st.geo === 'region' ? (pl ? 'regions' : 'region') : (pl ? 'states' : 'state')) : IS_POOL ? (pl ? 'countries' : 'country') : (V.key === 'CAN' ? (pl ? 'provinces' : 'province') : (pl ? 'areas' : 'area')); }
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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
    if (M[mid].unit === 'count' || M[mid].brood || !ys.length) return '';
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
  // color ranges come from U.S. states (or regions) in every view, so a color means the same thing everywhere
  function breakAreas(geo) { return geo === 'region' ? REGION_KEYS.map(function (k) { return 'R:' + k; }) : D.states.filter(function (s) { return SH.states[s]; }); }
  function breaks(mid) {
    var geo = IS_US ? st.geo : 'state', ck = mid + '|' + geo;
    if (breakCache[ck]) return breakCache[ck];
    var all = [];
    breakAreas(geo).forEach(function (a) {
      YEARS.forEach(function (y) { var r = valueFrom(aggUS(a, y), mid); if (r.status === 'ok' && r.n >= SMALL_N) all.push(r.v); });
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
  function aggUS(a, y) {
    var t = new Array(16).fill(0);
    (a.indexOf('R:') === 0 ? D.regions[a.slice(2)].states : [a]).forEach(function (s) { ((CUBE[s] || {})[y] || []).forEach(function (c) { for (var i = 0; i < 16; i++) t[i] += c[1][i] || 0; }); });
    return t;
  }
  function bin(mid, v) { var b = breaks(mid), i = 0; while (i < b.length && v >= b[i]) i++; return i; }
  function binColor(i) { return 'var(--c' + i + ')'; }

  /* ---------- Map ---------- */
  var svg = $('dx-map'), tip = $('dx-tip'), mapCard = $('dx-mapcard');
  var LABEL_NUDGE = { FL: [14, 6], MI: [10, 18], LA: [-8, 0], KY: [6, 2], VA: [6, 4], ID: [0, 16], MN: [-4, 6], CA: [-8, 0], WV: [-2, 4], MD: [0, -2], NY: [6, 2], HI: [6, 4], AK: [0, 0] };
  function tileArea(code) { return IS_US && st.geo === 'region' ? (REGION_OF[code] ? 'R:' + REGION_OF[code] : null) : code; }

  function drawMap() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    hideTip();
    var defs = document.createElementNS(NS, 'defs'), ps = IS_POOL ? 3 : 8;
    defs.innerHTML = '<pattern id="dx-hatch" width="' + ps + '" height="' + ps + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="' + ps + '" height="' + ps + '" fill="var(--surface)"/><line x1="0" y1="0" x2="0" y2="' + ps + '" stroke="var(--line)" stroke-width="' + (ps / 2) + '"/></pattern>';
    svg.appendChild(defs);
    if (IS_US) drawUS(); else if (IS_POOL) drawGlobe(); else drawCountry();
    $('dx-maptitle').textContent = M[st.measure].label + (shadeExp() ? ', compared with seasonal expectation' : '') + (IS_US ? '' : ', ' + areaName('ALL')) + ', ' + timeLabel();
    var usb = $('dx-us'), usv = fmt(st.measure, val('ALL', st.measure));
    usb.setAttribute('aria-pressed', String(st.sel === 'ALL'));
    usb.innerHTML = '<svg width="13" height="14" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10"/></svg>' + esc(V.name) + (usv ? '<b>' + usv + '</b>' : '');
    var s = span(), notes = [];
    if (!testedIn(st.measure, s[0], s[1])) notes.push('<strong>No ' + (st.measure === 'vil' || st.measure === 'ms' ? 'counts' : 'tests') + ' in this period.</strong> ' + testedNote(st.measure));
    else if (s[0] < M[st.measure].years[0]) notes.push('<strong>Partial range:</strong> ' + testedNote(st.measure) + ' Earlier years in the range add samples but no results for this measure.');
    if (st.measure === 'tm' && testedIn('tm', s[0], s[1]) && s[1] > 2015) notes.push(testedNote('tm'));
    if (!IS_US && (st.measure === 'vil' || st.measure === 'ms')) notes.push('<strong>U.S. only:</strong> mite and spore counts are recorded for U.S. samples from ' + M[st.measure].years[0] + ' on; samples from other countries date from ' + D.source.bookLast + ' or earlier.');
    if (!IS_US && !viewSamples(s[0], s[1])) notes.push('<strong>No samples from ' + esc(areaName('ALL')) + ' in this period.</strong> Samples from outside the United States run from ' + FIRST + ' to ' + D.source.bookLast + '. Pick a range in those years.');
    if (shadeExp()) notes.push('<strong>Compared with the seasonal expectation:</strong> each area’s result next to what the lab’s samples from the same months showed nationally, over a five-year window around each year. Neutral means within the expected range for that many samples.');
    $('dx-callout').innerHTML = notes.join(' ');
    $('dx-callout').hidden = !notes.length;
    drawLegend();
    var cn = $('dx-colornote');
    if (cn) cn.textContent = (shadeExp() ? 'Colors compare each area with the seasonal expectation for the same period. Areas with fewer than ' + SMALL_N + ' samples are outlined.' : 'Color ranges stay the same for every year and every country, so you can compare across years and places.') + ' ' + MAPNOTE;
  }
  var MAPNOTE = '';
  function viewSamples(y0, y1) { var t = agg('ALL', y0, y1, null); return t[0] + t[11]; }
  // fill, bin and status for one area: { r, fill, b, few }
  function paint(area) {
    var r = area ? val(area, st.measure) : { status: 'none' };
    var few = r.status === 'ok' && r.n < SMALL_N && !isCount(st.measure);
    var b = r.status === 'ok' ? bin(st.measure, r.v) : -1;
    var fill = b >= 0 ? binColor(b) : r.status === 'none' ? 'var(--nodata)' : 'url(#dx-hatch)';
    if (shadeExp() && r.status === 'ok') {
      var ec = expClass(st.measure, expVal(area, st.measure));
      fill = ec == null ? 'url(#dx-hatch)' : EXP_COLOR[ec];
      b = ec != null && Math.abs(ec) === 2 ? 3 : 0; // light text on the two strongest colors
    }
    return { r: r, fill: fill, b: b, few: few };
  }
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
  function ariaFor(code, area, p) {
    var shown = fmt(st.measure, p.r);
    return (IS_US && st.geo === 'region' && area ? NAMES[code] + ', ' + areaName(area) : areaName(code)) + ', ' + (shown ? shown + unitWord(st.measure) : statusText(p.r, st.measure)) + (p.few ? ', small sample' : '');
  }

  function drawUS() {
    svg.setAttribute('class', 'lx-map is-shapes' + (st.geo === 'region' ? ' is-region' : ''));
    svg.setAttribute('aria-label', 'Map of U.S. states');
    svg.setAttribute('viewBox', SH.viewBox.join(' '));
    var selected = [];
    MAP_STATES.forEach(function (code) {
      var area = tileArea(code), p = paint(area);
      var g = document.createElementNS(NS, 'g');
      var isSel = area && area === st.sel;
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (p.few ? ' few' : ''));
      g.setAttribute('data-code', code);
      g.setAttribute('aria-label', ariaFor(code, area, p));
      var shape = document.createElementNS(NS, 'path'); shape.setAttribute('d', SH.states[code]);
      shape.setAttribute('fill', p.fill); shape.setAttribute('class', 'shape');
      g.appendChild(shape); svg.appendChild(g);
      var bb = shape.getBBox();
      if (bb.width >= 30 && bb.height >= 18) {
        var n = LABEL_NUDGE[code] || [0, 0], t = document.createElementNS(NS, 'text');
        t.setAttribute('x', (bb.x + bb.width / 2 + n[0]).toFixed(1)); t.setAttribute('y', (bb.y + bb.height / 2 + n[1]).toFixed(1));
        t.textContent = code; t.setAttribute('fill', p.b >= 3 ? 'var(--surface)' : 'var(--ink)'); g.appendChild(t);
      }
      if (isSel) selected.push(g);
      wire(g, code, area);
    });
    selected.forEach(function (g) { svg.appendChild(g); });
    var s = span(), off = D.states.filter(function (c) { return !SH.states[c] && (valAt(c, 'samples', s[0], s[1]).v || valAt(c, 'brood', s[0], s[1]).v); });
    MAPNOTE = off.length ? off.map(function (c) { return NAMES[c]; }).join(' and ') + (off.length > 1 ? ' are' : ' is') + ' in the table and the U.S. totals but not on the map.' : '';
  }

  function bboxOf(pts) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    pts.forEach(function (p) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; });
    return b;
  }
  function sampleSize(area) { var s = span(), t = agg(area, s[0], s[1], SEASONS[st.season].months); return M[st.measure].brood ? t[11] : t[0]; }

  // Another country: its outline, with one dot per province or area
  function drawCountry() {
    svg.setAttribute('class', 'lx-map is-dots');
    svg.setAttribute('aria-label', 'Map of ' + V.name + ' with one dot per ' + areaWord(false));
    var placed = V.areas.filter(function (a) { return POINTS[a]; });
    var pts = placed.map(function (a) { return POINTS[a]; });
    var polys = WSH.countries[V.key] || [], pb = pts.length ? bboxOf(pts) : null;
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
    var padPx = 34, sc = Math.min((W - 2 * padPx) / gw, (H - 2 * padPx) / gh);
    var ox = (W - gw * sc) / 2, oy = (H - gh * sc) / 2;
    function proj(p) { return [ox + (p[0] - bb[0]) * kx * sc, oy + (bb[3] - p[1]) * sc]; }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    if (polys.length) {
      var d = polys.map(function (p) { return p.map(function (r) { return 'M' + r.map(function (q) { var xy = proj(q); return xy[0].toFixed(1) + ',' + xy[1].toFixed(1); }).join('L') + 'Z'; }).join(''); }).join('');
      var land = document.createElementNS(NS, 'path'); land.setAttribute('d', d); land.setAttribute('class', 'land'); land.setAttribute('fill-rule', 'evenodd'); svg.appendChild(land);
    }
    // dot size: samples ever received from the area, so dots don't jump around between years
    var ever = {}, maxN = 1;
    placed.forEach(function (a) { var t = agg(a, FIRST, LAST, null); ever[a] = t[0] + t[11]; if (ever[a] > maxN) maxN = ever[a]; });
    var selected = [];
    placed.slice().sort(function (a, b) { return ever[b] - ever[a]; }).forEach(function (a) {
      var p = paint(a), xy = proj(POINTS[a]), isSel = a === st.sel;
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (p.few ? ' few' : ''));
      g.setAttribute('data-code', a);
      g.setAttribute('aria-label', ariaFor(a, a, p));
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', xy[0].toFixed(1)); c.setAttribute('cy', xy[1].toFixed(1));
      c.setAttribute('r', (6 + 16 * Math.sqrt(ever[a] / maxN)).toFixed(1));
      c.setAttribute('fill', p.fill); c.setAttribute('class', 'shape');
      g.appendChild(c); svg.appendChild(g);
      if (isSel) selected.push(g);
      wire(g, a, a);
    });
    selected.forEach(function (g) { svg.appendChild(g); });
    var s = span(), unplaced = V.areas.filter(function (a) { return !POINTS[a] && viewSamplesOf(a, s); });
    MAPNOTE = (placed.length > 1 ? 'Each dot is a ' + areaWord(false) + ', placed at its reference point; bigger dots mean more samples over all years. ' : 'The dot stands for the whole country; samples from ' + V.name + ' were not recorded by area. ') +
      (unplaced.length ? unplaced.map(function (a) { return areaName(a); }).join(' and ') + ' (samples with no ' + areaWord(false) + ' recorded) ' + (unplaced.length > 1 ? 'are' : 'is') + ' in the table and the ' + V.name + ' totals but not on the map. ' : '') +
      (polys.length ? 'Country outline: Natural Earth.' : '');
  }
  function viewSamplesOf(a, s) { var t = agg(a, s[0], s[1], null); return t[0] + t[11]; }

  // A continent or the whole world: each country colored by its pooled value
  function drawGlobe() {
    svg.setAttribute('aria-label', V.cont ? 'Map of ' + V.name + ' with the countries that sent samples' : 'World map with the countries that sent samples');
    var W = 1000, LAT0 = 76, LAT1 = -56, k = W / 360, H = Math.round((LAT0 - LAT1) * k);
    function proj(p) { return [(p[0] + 180) * k, (LAT0 - p[1]) * k]; }
    var vb = [0, 0, W, H], sf = 1;
    if (V.cont) {
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      var ext = function (lon, lat) { if (lon < b[0]) b[0] = lon; if (lon > b[2]) b[2] = lon; if (lat < b[1]) b[1] = lat; if (lat > b[3]) b[3] = lat; };
      V.members.forEach(function (key) {
        var c = BYKEY[key];
        if (c.lat != null) ext(c.lon, c.lat);
        c.areas.forEach(function (a) { var q = POINTS[a]; if (q && c.lat != null && Math.abs(q[0] - c.lon) < 35 && Math.abs(q[1] - c.lat) < 25) ext(q[0], q[1]); });
      });
      if (b[0] <= b[2]) {
        var pb = b.slice(), pad = 8;
        V.members.forEach(function (key) {
          (WSH.countries[key] || []).forEach(function (pl) {
            var q = bboxOf(pl[0]), mx = (q[0] + q[2]) / 2, my = (q[1] + q[3]) / 2;
            if (q[2] - q[0] < 60 && mx >= pb[0] - pad && mx <= pb[2] + pad && my >= pb[1] - pad && my <= pb[3] + pad) { ext(q[0], q[1]); ext(q[2], q[3]); }
          });
        });
        var p0 = proj([b[0] - 4, Math.min(LAT0, b[3] + 4)]), p1 = proj([b[2] + 4, Math.max(LAT1, b[1] - 4)]);
        var x0 = p0[0], y0 = p0[1], cw = p1[0] - p0[0], ch = p1[1] - p0[1], ar = 1.6;
        if (cw / ch < ar) { var nw = ch * ar; x0 -= (nw - cw) / 2; cw = nw; } else { var nh = cw / ar; y0 -= (nh - ch) / 2; ch = nh; }
        vb = [x0, y0, cw, ch]; sf = cw / W;
      }
    }
    svg.setAttribute('class', 'lx-map is-globe' + (sf < 1 ? ' is-zoom' : ''));
    svg.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(1); }).join(' '));
    function pathOf(polys) { return polys.map(function (pl) { return pl.map(function (r) { return 'M' + r.map(function (q) { var xy = proj(q); return xy[0].toFixed(1) + ',' + xy[1].toFixed(1); }).join('L') + 'Z'; }).join(''); }).join(''); }
    var others = WSH.land.slice();
    COUNTRIES.forEach(function (c) { if (V.members.indexOf(c.key) < 0) others = others.concat(WSH.countries[c.key] || []); });
    var bg = document.createElementNS(NS, 'path'); bg.setAttribute('d', pathOf(others)); bg.setAttribute('class', 'land'); svg.appendChild(bg);
    var selected = [], dots = [];
    V.members.forEach(function (key) {
      var c = BYKEY[key], p = paint(key), isSel = key === st.sel;
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'area' + (isSel ? ' sel' : '') + (p.few ? ' few' : ''));
      g.setAttribute('data-code', key);
      g.setAttribute('aria-label', ariaFor(key, key, p));
      var polys = WSH.countries[key] || [];
      if (polys.length) {
        var sh = document.createElementNS(NS, 'path'); sh.setAttribute('d', pathOf(polys)); sh.setAttribute('fill', p.fill);
        sh.setAttribute('fill-rule', 'evenodd'); sh.setAttribute('class', 'shape'); g.appendChild(sh);
      }
      svg.appendChild(g);
      // countries too small to see get a dot as well
      var bb = polys.length ? g.getBBox() : { width: 0, height: 0 };
      if (Math.max(bb.width, bb.height) < 9 * sf && c.lat != null) {
        var xy = proj([c.lon, c.lat]), dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', xy[0].toFixed(2)); dot.setAttribute('cy', xy[1].toFixed(2)); dot.setAttribute('r', (5 * Math.max(sf, 0.35)).toFixed(2));
        dot.setAttribute('fill', p.fill); dot.setAttribute('class', 'shape dot'); g.appendChild(dot); dots.push(g);
      }
      if (isSel) selected.push(g);
      wire(g, key, key);
    });
    dots.forEach(function (g) { svg.appendChild(g); });
    selected.forEach(function (g) { svg.appendChild(g); });
    MAPNOTE = 'Each country that sent samples is colored by its pooled value; small countries also get a dot. Pick a country in the Country menu, or use the button in the side panel, to see its provinces or areas. Outlines: Natural Earth.';
  }

  function showTip(code, e, el) {
    var area = tileArea(code), r = area ? val(area, st.measure) : { status: 'none' }, shown = fmt(st.measure, r);
    var head = IS_US && st.geo === 'region' && area ? areaName(area) : areaName(code);
    var extra = r.status === 'ok' && !isCount(st.measure) ? ' · ' + r.n.toLocaleString('en-US') + ' tested' : '';
    if (shadeExp() && r.status === 'ok') extra = ' · ' + expText(st.measure, expVal(area, st.measure), true);
    tip.innerHTML = '<strong>' + esc(head) + '</strong><span>' + (shown ? shown + (isCount(st.measure) ? ' samples' : unitWord(st.measure) || ' ' + M[st.measure].short.toLowerCase()) + extra : statusText(r, st.measure)) + '</span>';
    tip.hidden = false;
    if (e) moveTip(e);
    else if (el) { var cr = mapCard.getBoundingClientRect(), er = el.getBoundingClientRect(); place(er.left + er.width / 2 - cr.left, er.top - cr.top); }
  }
  function moveTip(e) { var cr = mapCard.getBoundingClientRect(); place(e.clientX - cr.left, e.clientY - cr.top - 8); }
  function place(x, y) { var w = tip.offsetWidth, cw = mapCard.clientWidth; tip.style.left = Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)) + 'px'; tip.style.top = y + 'px'; }
  function hideTip() { tip.hidden = true; }

  function drawLegend() {
    var b = breaks(st.measure), items = [], mid = st.measure;
    if (shadeExp()) {
      var pct = M[mid].unit === 'pct';
      [['-2', pct ? '15+ points lower' : 'Under half'], ['-1', 'Lower'], ['0', 'Within expected range'], ['1', 'Higher'], ['2', pct ? '15+ points higher' : 'Twice or more']].forEach(function (x) {
        items.push('<span><i style="background:' + EXP_COLOR[x[0]] + '"></i>' + x[1] + '</span>');
      });
      items.push('<span><i class="few"></i>Fewer than ' + SMALL_N + ' samples</span>');
      items.push('<span><i style="background:var(--nodata)"></i>No samples</span>');
      items.push('<span><i class="hatch"></i>Not tested</span>');
      $('dx-legend').innerHTML = items.join('');
      return;
    }
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? 'Under ' + compact(mid, b[0]) : i === b.length ? compact(mid, b[i - 1]) + ' or more' : compact(mid, b[i - 1]) + '–' + compact(mid, b[i]);
      items.push('<span><i style="background:' + binColor(i) + '"></i>' + lab + '</span>');
    }
    if (!isCount(mid)) items.push('<span><i class="few"></i>Fewer than ' + SMALL_N + ' samples</span>');
    items.push('<span><i style="background:var(--nodata)"></i>No samples</span>');
    items.push('<span><i class="hatch"></i>Not tested</span>');
    $('dx-legend').innerHTML = items.join('');
  }

  /* ---------- Detail panel ---------- */
  function rankOf(area, mid) {
    var mine = val(area, mid);
    if (mine.status !== 'ok' || area === 'ALL' || mine.n < SMALL_N) return null;
    var useExp = shadeExp() && mid === st.measure;
    var score = function (a) { if (!useExp) return val(a, mid).v; var e = expVal(a, mid); return M[mid].unit === 'pct' ? e.diff : Math.log(Math.max(e.ratio, 1e-6)); };
    var my = score(area), n = 0, above = 0;
    viewAreas().forEach(function (a) { if (!IS_US || st.geo === 'region' || SH.states[a]) { var r = val(a, mid); if (r.status === 'ok' && r.n >= SMALL_N) { n++; if (score(a) > my) above++; } } });
    return n > 1 ? { rank: above + 1, of: n, exp: useExp } : null;
  }
  function compareLine(area, mid) {
    if (area === 'ALL') return '';
    var mine = val(area, mid), us = val('ALL', mid), w = who();
    if (mine.status !== 'ok' || us.status !== 'ok') return '';
    if (isCount(mid)) return (mine.v / us.v * 100).toFixed(1) + '% of all ' + sampleKind(mid) + ' samples in ' + (IS_US ? 'the U.S.' : IS_POOL ? (V.cont ? V.name : 'this view') : V.name) + ' (' + fmt(mid, us) + ')';
    var d = mine.v - us.v, amt = Math.abs(d).toFixed(1);
    if (Number(amt) === 0) return 'About the same as ' + w + ' (' + fmt(mid, us) + ')';
    if (M[mid].unit === 'pct') return amt + (amt === '1.0' ? ' point ' : ' points ') + (d > 0 ? 'above' : 'below') + ' ' + w + ' (' + fmt(mid, us) + ')';
    return amt + ' ' + (d > 0 ? 'above' : 'below') + ' ' + w + ' (' + fmt(mid, us) + ')';
  }
  function expLine(area, mid, r) {
    if (isCount(mid) || r.status !== 'ok' || !IS_US) return '';
    if (area === 'ALL') return shadeExp() ? '<p class="dx-exp">The U.S. is the reference for the seasonal expectation, so it isn\u2019t compared with itself.</p>' : '';
    var e = expVal(area, mid), c = expClass(mid, e);
    if (c == null) return '';
    return '<p class="dx-exp"><i style="background:' + EXP_COLOR[c] + '"></i>' + expText(mid, e) + ': <strong>' + EXP_WORD[c] + '</strong>' + (e.n < SMALL_N ? ' (but based on very few samples)' : '') + '.</p>';
  }
  function basisLine(area, mid, r) {
    var kind = sampleKind(mid), all = val(area, kind === 'brood' ? 'brood' : 'samples');
    if (!all.v) return '';
    if (isCount(mid)) return '<p class="lx-sample">' + (kind === 'brood' ? 'Brood (comb or smear) samples' : 'Adult bee samples') + ' the lab received and tested' + (st.season !== 'all' ? ' in these months' : '') + '.</p>';
    if (r.status !== 'ok') return '<p class="lx-sample">' + all.v.toLocaleString('en-US') + ' ' + kind + ' samples were received in this period. ' + testedNote(mid) + '</p>';
    var small = r.n < SMALL_N;
    var txt = M[mid].unit === 'pct' ? '<b>' + r.pos.toLocaleString('en-US') + '</b> of <b>' + r.n.toLocaleString('en-US') + '</b> ' + kind + ' samples tested positive.'
      : 'Average of <b>' + r.n.toLocaleString('en-US') + '</b> samples with a count, including those with none found.';
    return '<p class="lx-sample">' + (small ? '<span class="lx-smallchip">Small sample</span> ' : '') + txt + (small ? ' With this few samples, one or two colonies can swing the result a lot.' : '') + '</p>';
  }

  function renderPanel() {
    var area = st.sel, panel = $('dx-panel'), html = [];
    var all = val(area, 'samples'), br = val(area, 'brood');
    var cnt = function (r, w) { return (r.v || 0).toLocaleString('en-US') + ' ' + w + ' sample' + (r.v === 1 ? '' : 's'); };
    html.push('<div class="lx-panel-head"><h2>' + esc(areaName(area)) + '</h2>' + (area !== 'ALL' ? '<button type="button" class="lx-link" id="dx-to-us">View ' + esc(V.name) + '</button>' : '') + '</div>');
    html.push('<p class="lx-sub">' + (area !== 'ALL' && !IS_US && !IS_POOL ? esc(V.name) + ' · ' : '') + timeLabel() + ' · ' + (all.v || br.v ? cnt(all, 'adult') + ', ' + cnt(br, 'brood') : 'No samples') + '</p>');
    if (IS_POOL && area !== 'ALL') html.push('<p><button type="button" class="btn" id="dx-open-country" data-key="' + esc(area) + '">Open the ' + esc(areaName(area)) + ' map →</button></p>');
    if (area === 'ALL' && IS_POOL) html.push('<p class="lx-small">' + V.members.map(function (k) { return BYKEY[k].name; }).join(', ') + '.</p>');
    if (area.indexOf('R:') === 0 && D.regions[area.slice(2)].states.length > 1) html.push('<p class="lx-small">' + D.regions[area.slice(2)].states.map(function (s) { return NAMES[s]; }).join(', ') + '.</p>');
    var r = val(area, st.measure), shown = fmt(st.measure, r), rk = rankOf(area, st.measure), cmp = compareLine(area, st.measure);
    html.push('<div class="lx-hero"><p class="lx-k">' + M[st.measure].label + '</p>' +
      '<p class="lx-big">' + (shown ? shown + (M[st.measure].unit === 'load' ? '<span class="dx-unit">' + unitWord(st.measure) + '</span>' : '') : '<span class="lx-na">' + statusText(r, st.measure) + '</span>') + '</p>' +
      (cmp ? '<p class="lx-cmp">' + cmp + '</p>' : '') +
      (rk ? '<p class="lx-rank">Rank ' + rk.rank + ' of ' + rk.of + ' ' + areaWord(true) + ' with ' + SMALL_N + ' or more samples' + (rk.exp ? ', by difference from the seasonal expectation' : '') + ' (1 is the highest)</p>' : '') +
      expLine(area, st.measure, r) +
      basisLine(area, st.measure, r) + '</div>');

    var tiles = MEASURES.filter(function (m) { return m.id !== st.measure; });
    html.push('<div class="lx-tiles">' + tiles.map(function (m) {
      var tr = val(area, m.id), s = fmt(m.id, tr), few = tr.status === 'ok' && tr.n < SMALL_N && !isCount(m.id);
      return '<button type="button" class="lx-tile" data-measure="' + m.id + '" title="Color the map by ' + m.label.toLowerCase() + '"><span class="lx-k">' + m.tile + '</span><span class="lx-v">' + (s || '<span class="lx-na">' + (tr.status === 'nottested' ? (m.unit === 'load' ? 'not counted' : 'not tested') : 'n/a') + '</span>') + '</span>' +
        (tr.status === 'ok' && !isCount(m.id) ? '<span class="lx-rank">' + tr.n.toLocaleString('en-US') + ' tested' + (few ? ' <span class="lx-fewmark" aria-label="small sample">!</span>' : '') + '</span>' : '') + '<span class="lx-show">Show on map</span></button>';
    }).join('') + '</div>');

    // By month
    var s = span();
    if (testedIn(st.measure, s[0], s[1])) {
      var rows = [], max = 0, us = [], anyM = false;
      for (var mo = 1; mo <= 12; mo++) {
        var a = valMonth(area, st.measure, mo), u = valMonth('ALL', st.measure, mo);
        rows.push(a); us.push(u);
        if (a.status === 'ok') anyM = true;
        if (a.status === 'ok' && (a.n >= SMALL_N || isCount(st.measure))) max = Math.max(max, a.v);
        if (u.status === 'ok') max = Math.max(max, u.v);
      }
      if (anyM && !max) max = isCount(st.measure) ? 10 : 1;
      if (max) {
        var stp = niceStep(max / 4), top = Math.ceil(max / stp) * stp;
        var inSeason = SEASONS[st.season].months;
        html.push('<div class="lx-block"><h3 class="lx-h3">By month</h3><p class="lx-small">' + M[st.measure].short + ' by the month samples were ' + (isCount(st.measure) ? 'received' : 'collected') + ', ' + (s[0] === s[1] ? 'in ' + s[0] : s[0] + ' to ' + s[1]) + '.' +
          (area !== 'ALL' && !isCount(st.measure) ? ' The dark tick marks the value for ' + who().replace(/^the /, 'the ') + '.' : '') + ' Bars run from 0 to ' + compact(st.measure, top) + '. Lighter bars have fewer than ' + SMALL_N + ' samples. The last column is the number of samples tested each month.</p><ul class="lx-stress lx-seasons dx-months' + (isCount(st.measure) ? '' : ' has-n') + '">' +
          (isCount(st.measure) ? '' : '<li class="dx-mhead" aria-hidden="true"><span></span><span></span><span class="lx-sval">' + (M[st.measure].unit === 'pct' ? 'Positive' : 'Average') + '</span><span class="dx-n">Samples</span></li>') +
          rows.map(function (x, i) {
            var u = us[i], ok = x.status === 'ok', few = ok && x.n < SMALL_N && !isCount(st.measure);
            var mark = area !== 'ALL' && !isCount(st.measure) && u.status === 'ok' ? '<b class="lx-usmark" style="left:' + Math.min(100, u.v / top * 100).toFixed(1) + '%" title="' + esc(areaName('ALL')) + ' ' + fmt(st.measure, u) + '"></b>' : '';
            var dim = inSeason && inSeason.indexOf(i + 1) < 0 ? ' dx-dim' : '';
            return '<li class="' + dim + '"><span class="lx-sname">' + MONTHS[i + 1] + '</span><span class="lx-track"><span class="lx-fill' + (few ? ' dx-few' : '') + '" style="width:' + (ok ? Math.max(0.6, Math.min(100, x.v / top * 100)) : 0).toFixed(1) + '%"></span>' + mark + '</span>' +
              '<span class="lx-sval" title="' + (ok ? x.n + ' samples' : '') + '">' + (ok ? fmt(st.measure, x) : x.status === 'none' ? '–' : 'n/a') + '</span>' +
              (isCount(st.measure) ? '' : '<span class="dx-n' + (few ? ' few' : '') + '" aria-label="' + (ok ? x.n : 0) + ' samples">' + (ok ? x.n.toLocaleString('en-US') : '0') + '</span>') + '</li>';
          }).join('') + '</ul></div>');
      }
    }

    // Year-ago comparison
    if (st.mode === 'year' && st.year > FIRST) {
      var now = r, then = valAt(area, st.measure, st.year - 1, st.year - 1, st.season);
      if (now.status === 'ok' && then.status === 'ok') html.push('<p class="lx-yoy">In ' + (st.year - 1) + ': <strong>' + fmt(st.measure, then) + '</strong>, compared with <strong>' + fmt(st.measure, now) + '</strong> in ' + st.year + '.</p>');
    }

    html.push('<div class="lx-block"><h3 class="lx-h3">' + M[st.measure].short + ' by year</h3><div class="lx-trend" id="dx-trend"></div><p class="lx-small" id="dx-readout">' +
      (st.mode === 'year' ? 'The darker bar is the selected year' : 'Darker bars are the years in this range') + (area !== 'ALL' && !isCount(st.measure) ? ', and the dashed line is ' + who() + '.' : '.') + ' Lighter bars have fewer than ' + SMALL_N + ' samples. Hover a bar to see its value, or click it to jump there.</p></div>');
    panel.innerHTML = html.join('');
    var toUs = $('dx-to-us'); if (toUs) toUs.addEventListener('click', function () { select('ALL'); });
    var openC = $('dx-open-country'); if (openC) openC.addEventListener('click', function () { setCountry(openC.getAttribute('data-key')); window.scrollTo({ top: $('dx-view').getBoundingClientRect().top + window.scrollY - 90, behavior: reduceMotion() ? 'auto' : 'smooth' }); });
    panel.querySelectorAll('[data-measure]').forEach(function (el) { el.addEventListener('click', function () { setMeasure(el.getAttribute('data-measure')); }); });
    drawTrend(area);
  }

  function drawTrend(area) {
    var box = $('dx-trend'), mid = st.measure, s = span();
    var W = 520, H = 190, ml = 44, mr = 8, mt = 10, mb = 26;
    var rows = YEARS.map(function (y) { return { y: y, r: valAt(area, mid, y, y, st.season), us: valAt('ALL', mid, y, y, st.season) }; });
    var max = 0, any = false;
    rows.forEach(function (d) { if (d.r.status === 'ok') { any = true; max = Math.max(max, d.r.v); } if (area !== 'ALL' && !isCount(mid) && d.us.status === 'ok') max = Math.max(max, d.us.v); });
    if (!any) { box.innerHTML = '<p class="lx-small">No values to chart for this selection.</p>'; return; }
    if (!max) max = isCount(mid) ? 10 : 1;
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
        var h = Math.max(0.5, y(0) - y(d.r.v)), cur = d.y >= s[0] && d.y <= s[1], few = !isCount(mid) && d.r.n < SMALL_N;
        o.push('<rect class="bar' + (cur ? ' cur' : '') + (few ? ' dx-fewbar' : '') + '" x="' + (x + bw * 0.12).toFixed(1) + '" y="' + (y(0) - h).toFixed(1) + '" width="' + (bw * 0.76).toFixed(1) + '" height="' + h.toFixed(1) + '"/>');
      }
      if (d.y % 5 === 0) o.push('<text class="xtick" x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 8) + '">' + d.y + '</text>');
    });
    if (area !== 'ALL' && !isCount(mid)) {
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
        readout.textContent = d.y + ': ' + (a ? a + unitWord(mid) + (!isCount(mid) ? ' (' + d.r.n + ' tested)' : ' samples') : statusText(d.r, mid)) + (area !== 'ALL' && !isCount(mid) && b ? '; ' + areaName('ALL') + ' ' + b : '');
      });
      h.addEventListener('mouseleave', function () { readout.textContent = base; });
      h.addEventListener('click', function () { setMode('year', d.y); });
    });
  }
  function niceStep(x) { var p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

  /* ---------- Table ---------- */
  var TABLE_COLS = ['samples', 'vd', 'vil', 'nos', 'ms', 'tm', 'brood', 'afb', 'efb'];
  var COL_LABEL = { samples: 'Adult samples', vd: 'Varroa %', vil: 'Mites / 100 bees', nos: 'Nosema %', ms: 'Spores (M / bee)', tm: 'Tracheal %', brood: 'Brood samples', afb: 'AFB %', efb: 'EFB %' };
  function renderTable() {
    var ex = shadeExp();
    var sk = st.sortKey || (ex ? 'exp' : st.measure);
    var arrow = function (k) { return sk === k ? (st.sortDir < 0 ? ' ↓' : ' ↑') : ''; };
    var word = areaWord(false), head = '<tr><th scope="col" data-k="name" class="' + (sk === 'name' ? 'sorted' : '') + '">' + word.charAt(0).toUpperCase() + word.slice(1) + arrow('name') + '</th>' +
      (ex ? '<th scope="col" class="num' + (sk === 'exp' ? ' sorted' : '') + '" data-k="exp" title="' + M[st.measure].short + ' compared with the seasonal expectation">' + M[st.measure].short + ' vs. expected' + arrow('exp') + '</th>' : '') +
      TABLE_COLS.map(function (m) { return '<th scope="col" class="num' + (sk === m ? ' sorted' : '') + '" data-k="' + m + '">' + COL_LABEL[m] + arrow(m) + '</th>'; }).join('') + '</tr>';
    var expScore = function (a) { var e = expVal(a, st.measure); if (!e || e.status !== 'ok' || val(a, st.measure).status !== 'ok') return -Infinity; return M[st.measure].unit === 'pct' ? e.diff : Math.log(Math.max(e.ratio, 1e-6)); };
    var areas = viewAreas().filter(function (a) { return val(a, 'samples').v || val(a, 'brood').v; });
    var f = st.filter.trim().toLowerCase();
    if (f) areas = areas.filter(function (a) { return areaName(a).toLowerCase().indexOf(f) >= 0 || a.toLowerCase() === f; });
    areas.sort(function (a, b) {
      if (sk === 'name') return (areaName(a) < areaName(b) ? -1 : 1) * st.sortDir;
      var xa, xb;
      if (sk === 'exp') { xa = expScore(a); xb = expScore(b); }
      else { var va = val(a, sk), vb = val(b, sk); xa = va.status === 'ok' ? va.v : -Infinity; xb = vb.status === 'ok' ? vb.v : -Infinity; }
      if (xa === xb) return areaName(a) < areaName(b) ? -1 : 1;
      return (xa - xb) * st.sortDir;
    });
    function row(a, cls) {
      var expCell = '';
      if (ex && a === 'ALL') {
        expCell = '<td class="num dx-expcell lx-na" title="The U.S. is the reference">reference</td>';
      } else if (ex) {
        var e = expVal(a, st.measure), c = val(a, st.measure).status === 'ok' ? expClass(st.measure, e) : null;
        expCell = '<td class="num dx-expcell" title="' + (c != null ? EXP_WORD[c] : '') + '">' + (c != null ? '<i style="background:' + EXP_COLOR[c] + '"></i>' + expText(st.measure, e, true).replace(/ vs\. expected .*| expected .*/, '') : '<span class="lx-na">–</span>') + '</td>';
      }
      return '<tr class="' + cls + (a === st.sel ? ' on' : '') + '" data-code="' + esc(a) + '" tabindex="0"><th scope="row">' + esc(areaName(a)) + '</th>' + expCell +
        TABLE_COLS.map(function (m) {
          var r = val(a, m), s = fmt(m, r), few = isCount(m) && r.status === 'ok' && r.v < SMALL_N;
          return '<td class="num' + (few ? ' lx-few' : '') + '"' + (r.status === 'ok' && !isCount(m) ? ' title="' + r.n + ' tested"' : '') + '>' + (s || '<span class="lx-na">–</span>') + (few ? ' <span class="lx-fewmark" aria-label="small sample">!</span>' : '') + '</td>';
        }).join('') + '</tr>';
    }
    $('dx-table').innerHTML = '<thead>' + head + '</thead><tbody>' + row('ALL', 'pin') + areas.map(function (a) { return row(a, ''); }).join('') + '</tbody>';
    $('dx-tabletitle').textContent = (IS_US ? (st.geo === 'region' ? 'Climate regions, ' : 'States with samples, ') : IS_POOL ? 'Countries with samples' + (V.cont ? ' in ' + V.name : '') + ', ' : V.name + ': ' + areaWord(true) + ' with samples, ') + timeLabel();
    $('dx-filter').placeholder = 'Filter ' + areaWord(true); $('dx-filter').setAttribute('aria-label', $('dx-filter').placeholder);
    $('dx-tablenote').textContent = areas.length + ' ' + (IS_US ? (st.geo === 'region' ? 'regions' : 'states and territories') : areas.length === 1 ? areaWord(false) : areaWord(true)) + ' sent samples in this period. Percents are the share of tested samples that were positive; loads are averages over samples with a count. A ! means fewer than ' + SMALL_N + ' samples.' + (ex ? ' "vs. expected" compares each area with the national result for the same months, over a five-year window; the color shows whether the difference is outside the expected range.' : '') + ' Click a heading to sort, or a row to see it on the map.';
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
  function renderAll() { if (typeof syncShade === 'function') syncShade(); drawMap(); renderPanel(); renderTable(); }
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
    if (st.sel !== 'ALL') st.sel = g === 'region' ? (REGION_OF[st.sel] ? 'R:' + REGION_OF[st.sel] : 'ALL') : 'ALL';
    st.sortKey = null; renderAll();
  }

  $('dx-us').addEventListener('click', function () { select('ALL'); });
  svg.addEventListener('click', function (e) { if (!e.target.closest('.area')) select('ALL'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.sel !== 'ALL' && !e.target.closest('input, select, textarea')) select('ALL'); });

  var msel = $('dx-measure'), groups = {};
  MEASURES.forEach(function (m) { (groups[m.group] = groups[m.group] || []).push(m); });
  msel.innerHTML = Object.keys(groups).map(function (g) { return '<optgroup label="' + g + '">' + groups[g].map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</optgroup>'; }).join('');
  msel.value = st.measure;
  msel.addEventListener('change', function () { st.measure = msel.value; st.sortKey = null; renderAll(); });

  /* ---------- Continent and Country menus (as on the Genetic Diversity page) ---------- */
  var csel = $('dx-country'), contSel = $('dx-continent');
  function samplesIn(key) { var keep = V, keepU = IS_US, keepP = IS_POOL; V = BYKEY[key]; IS_US = key === 'USA'; IS_POOL = !!V.pool; var t = agg('ALL', FIRST, LAST, null); V = keep; IS_US = keepU; IS_POOL = keepP; return t[0] + t[11]; }
  function menuFor(cont) {
    if (!cont) return [BYKEY.USA, WORLD].concat(COUNTRIES.slice(1));
    return [BYKEY['CONT:' + cont]].concat(COUNTRIES.filter(function (c) { return c.cont === cont; }));
  }
  function fillCountries() {
    csel.innerHTML = menuFor(st.cont).map(function (c) {
      return '<option value="' + esc(c.key) + '">' + esc(c.cont && c.pool ? 'All countries in ' + c.name : c.name) + ' (' + samplesIn(c.key).toLocaleString('en-US') + ')</option>';
    }).join('');
  }
  if (contSel) contSel.innerHTML = '<option value="">All continents (' + samplesIn('WORLD').toLocaleString('en-US') + ')</option>' + CONTS.map(function (ct) {
    return '<option value="' + esc(ct) + '">' + esc(ct) + ' (' + samplesIn('CONT:' + ct).toLocaleString('en-US') + ')</option>';
  }).join('');
  function setCountry(key, keepTime) {
    if (!BYKEY[key]) key = 'USA';
    var K = BYKEY[key];
    if (K.cont && K.pool) st.cont = K.cont;
    else if (st.cont && (K.pool || K.cont !== st.cont)) st.cont = '';
    if (contSel) contSel.value = st.cont;
    fillCountries();
    st.country = key; V = K; IS_US = key === 'USA'; IS_POOL = !!K.pool;
    csel.value = key;
    try { localStorage.setItem('hive-disease-country', key); localStorage.setItem('hive-disease-continent', st.cont); } catch (e) {}
    st.sel = 'ALL'; st.sortKey = null; st.filter = ''; $('dx-filter').value = '';
    if (!IS_US) { st.geo = 'state'; setSeg('geo', 'state'); if (st.shade === 'expect') { st.shade = 'rate'; } }
    $('dx-geo-ctl').hidden = !IS_US;
    // Samples from outside the U.S. end earlier: open a view with no samples in the period on all its years
    if (!keepTime) {
      var s = span();
      if (!viewSamples(s[0], s[1])) {
        var ys = YEARS.filter(function (y) { return viewSamples(y, y); });
        if (ys.length) { st.mode = 'range'; st.from = ys[0]; st.to = ys[ys.length - 1]; st.year = ys[ys.length - 1]; syncTime(); }
      }
    }
    $('dx-goto-lab').textContent = IS_US ? 'Go to a state' : IS_POOL ? 'Go to a country' : 'Go to a ' + areaWord(false);
    $('dx-goto').placeholder = IS_US ? 'e.g. Maryland or MD' : 'e.g. ' + areaName(viewAreas()[0] || 'ALL');
    fillGoto();
    $('dx-maphelp').textContent = IS_US ? 'Click a state to see its numbers, or the button to go back to the whole country.' : IS_POOL ? 'Click a country to see its numbers, or the button to go back to the ' + (V.cont ? V.name : 'worldwide') + ' total.' : 'Click a dot to see that ' + areaWord(false) + '’s numbers, or the button to go back to the whole country.';
    summary();
    renderAll();
  }
  if (contSel) contSel.addEventListener('change', function () {
    st.cont = contSel.value;
    setCountry(st.cont ? 'CONT:' + st.cont : (V.pool ? 'WORLD' : V.key));
  });
  csel.addEventListener('change', function () { setCountry(csel.value); });
  document.querySelectorAll('[data-seg="geo"] button').forEach(function (b) { b.addEventListener('click', function () { setGeo(b.getAttribute('data-v')); }); });
  document.querySelectorAll('[data-seg="shade"] button').forEach(function (b) {
    b.addEventListener('click', function () { if (b.disabled) return; st.shade = b.getAttribute('data-v'); st.sortKey = null; setSeg('shade', st.shade); renderAll(); });
  });
  function syncShade() {
    var cnt = isCount(st.measure), off = cnt || !IS_US;
    document.querySelectorAll('[data-seg="shade"] button[data-v="expect"]').forEach(function (b) { b.disabled = off; b.title = cnt ? 'Not available for sample counts' : !IS_US ? 'Available for the United States only' : ''; });
    setSeg('shade', off ? 'rate' : st.shade);
  }
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
  function gotoList() { return ['ALL'].concat(IS_US ? D.states : viewAreas()); }
  function fillGoto() { dl.innerHTML = gotoList().map(function (c) { return '<option value="' + esc(areaName(c)) + '"></option>'; }).join(''); }
  function goTo() {
    var q = $('dx-goto').value.trim().toLowerCase(); if (!q) return;
    var list = gotoList(), nm = function (c) { return areaName(c).toLowerCase(); }, code = function (c) { return c.split('.').pop().toLowerCase(); };
    var hit = list.filter(function (c) { return nm(c) === q || code(c) === q; })[0] || list.filter(function (c) { return nm(c).indexOf(q) === 0; })[0];
    if (hit) { if (IS_US && st.geo === 'region' && hit !== 'ALL') setGeo('state'); select(hit); $('dx-goto').value = ''; }
  }
  $('dx-goto').addEventListener('change', goTo);
  $('dx-goto').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goTo(); } });
  $('dx-filter').addEventListener('input', function () { st.filter = $('dx-filter').value; renderTable(); });

  /* ---------- Summary line ---------- */
  var OPEN_FROM = st.from, OPEN_TO = st.to, TOTAL_A = 0, TOTAL_B = 0;
  Object.keys(CUBE).forEach(function (s) { Object.keys(CUBE[s]).forEach(function (y) { CUBE[s][y].forEach(function (c) { TOTAL_A += c[1][0]; TOTAL_B += c[1][11]; }); }); });
  function summary() {
    var nC = COUNTRIES.length, ys, y0, y1;
    if (IS_US) { y0 = OPEN_FROM; y1 = OPEN_TO; }
    else { ys = YEARS.filter(function (y) { return viewSamples(y, y); }); y0 = ys[0]; y1 = ys[ys.length - 1]; }
    var g = function (m) { return valAt('ALL', m, y0, y1); };
    var parts = [];
    if (IS_US) {
      var nStates = D.states.filter(function (s) { return valAt(s, 'samples', y0, y1).v || valAt(s, 'brood', y0, y1).v; }).length;
      var regs = REGION_KEYS.map(function (k) { return { k: k, r: valAt('R:' + k, 'vd', y0, y1) }; })
        .filter(function (x) { return x.r.status === 'ok' && x.r.n >= SMALL_N; })
        .sort(function (a, b) { return b.r.v - a.r.v; });
      var hi = regs[0], lo = regs[regs.length - 1], rn = function (x) { return D.regions[x.k].name; };
      parts.push('From ' + y0 + ' to ' + y1 + ', the Bee Disease Diagnostic Laboratory tested <strong>' + fmt('samples', g('samples')) + '</strong> adult bee samples and <strong>' + fmt('brood', g('brood')) + '</strong> brood samples from ' + nStates + ' U.S. states and territories. <strong>' +
        fmt('vd', g('vd')) + '</strong> of adult samples carried Varroa mites' + (g('vil').status === 'ok' ? ', averaging ' + fmt('vil', g('vil')) + ' mites per 100 bees,' : '') + ' and <strong>' + fmt('nos', g('nos')) + '</strong> carried Nosema.' +
        (hi && lo && hi !== lo ? ' Varroa turned up most often in the <strong>' + rn(hi) + '</strong> (' + fmt('vd', hi.r) + ') and least often in the <strong>' + rn(lo) + '</strong> (' + fmt('vd', lo.r) + ').' : ''));
    } else if (y0 != null) {
      var n = IS_POOL ? V.members.length : 0;
      parts.push('From ' + y0 + ' to ' + y1 + ', the lab tested <strong>' + fmt('samples', g('samples')) + '</strong> adult bee samples and <strong>' + fmt('brood', g('brood')) + '</strong> brood samples from <strong>' + esc(IS_POOL ? (V.cont ? n + (n === 1 ? ' country in ' : ' countries in ') + V.name : n + ' countries') : V.name) + '</strong>.' +
        (g('vd').status === 'ok' ? ' <strong>' + fmt('vd', g('vd')) + '</strong> of adult samples tested for Varroa carried it' + (g('nos').status === 'ok' ? ', and <strong>' + fmt('nos', g('nos')) + '</strong> carried Nosema.' : '.') : g('nos').status === 'ok' ? ' <strong>' + fmt('nos', g('nos')) + '</strong> of adult samples carried Nosema.' : ''));
    }
    if (g('afb').status === 'ok') parts.push('In brood samples, <strong>' + fmt('afb', g('afb')) + '</strong> had American foulbrood and <strong>' + fmt('efb', g('efb')) + '</strong> had European foulbrood.');
    parts.push('Samples come from colonies that looked sick or weak, so these rates are higher than in the average colony. ' + (IS_POOL ? 'Click any country to see its numbers.' : IS_US ? 'Click any region or state to see its numbers.' : 'Click any ' + areaWord(false) + ' to see its numbers.'));
    $('dx-summary').innerHTML = parts.join(' ');
    $('dx-note').textContent = TOTAL_A.toLocaleString('en-US') + ' adult and ' + TOTAL_B.toLocaleString('en-US') + ' brood samples from ' + nC + ' countries, ' + FIRST + ' through ' + MONTHS[LAST_MONTH[LAST]] + ' ' + LAST + '.';
  }

  if (st.cont && BYKEY[st.country] && !(BYKEY[st.country].pool && BYKEY[st.country].cont === st.cont) && BYKEY[st.country].cont !== st.cont) st.country = 'CONT:' + st.cont;
  if (st.cont && BYKEY[st.country] === WORLD) st.country = 'CONT:' + st.cont;
  setSeg('geo', st.geo); syncTime();
  setCountry(st.country);

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
