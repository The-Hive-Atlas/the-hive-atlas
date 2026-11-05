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
  // Language helpers (js/i18n.js); English fallbacks if it is missing
  var I = window.I18N || { lang: 'en', T: function (s, v) { return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : s; },
    N: function (x, d) { d = d || 0; return Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); },
    PCT: function (x, d) { return Number(x).toFixed(d || 0) + '%'; }, NM: function (s) { return s; }, ISO: function (s) { return s; }, lower: function (s) { return s.toLowerCase(); }, sep: ', ' };
  var T = I.T, NUM = I.N, PCT = I.PCT, NM = I.NM, ISO = I.ISO, SEP = I.sep;
  function low(x) { return I.lower(x); }
  var AREA_IDS = D.areas || D.states, POINTS = D.points || {};
  var COUNTRIES = D.countries || [{ key: 'USA', name: 'United States', cont: 'North America', areas: D.states }];
  COUNTRIES.forEach(function (c) { c.en = c.name; c.name = NM(c.name); });
  var CONTS = D.continents || [];
  var BYKEY = {}; COUNTRIES.forEach(function (c) { BYKEY[c.key] = c; });
  function pool(key, name, cont) {
    return { key: key, name: name, cont: cont || null, pool: true, members: COUNTRIES.filter(function (c) { return !cont || c.cont === cont; }).map(function (c) { return c.key; }) };
  }
  var WORLD = pool('WORLD', NM('Worldwide')); BYKEY.WORLD = WORLD;
  CONTS.forEach(function (ct) { BYKEY['CONT:' + ct] = pool('CONT:' + ct, NM(ct), ct); });
  // The view picked in the Country menu
  var V = BYKEY.USA, IS_US = true, IS_POOL = false;

  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = D.names, EN_NAMES = {};
  for (var nk in NAMES) { EN_NAMES[nk] = NAMES[nk]; NAMES[nk] = NM(NAMES[nk]); }
  Object.keys(D.regions).forEach(function (k) { D.regions[k].name = NM(D.regions[k].name); });
  var MAP_STATES = Object.keys(SH.states).sort(function (a, b) { return NAMES[a] < NAMES[b] ? -1 : 1; });
  var REGION_OF = {}, REGION_KEYS = Object.keys(D.regions);
  REGION_KEYS.forEach(function (k) { D.regions[k].states.forEach(function (s) { REGION_OF[s] = k; }); });
  var SMALL_N = 10; // fewer samples tested than this gets a "small sample" flag
  var MONTHS = ['', T('Jan'), T('Feb'), T('Mar'), T('Apr'), T('May'), T('Jun'), T('Jul'), T('Aug'), T('Sep'), T('Oct'), T('Nov'), T('Dec')];
  var SEASONS = {
    all: { label: T('All months'), months: null },
    win: { label: T('Winter (Dec–Feb)'), months: [12, 1, 2] },
    spr: { label: T('Spring (Mar–May)'), months: [3, 4, 5] },
    sum: { label: T('Summer (Jun–Aug)'), months: [6, 7, 8] },
    fal: { label: T('Fall (Sep–Nov)'), months: [9, 10, 11] }
  };

  /* ---------- Cube: CUBE[state][year] = [[month, 11 counts], ...] ---------- */
  var CUBE = {}, YEARS = [], LAST_MONTH = {}, NC = D.cols.length - 3; // counts per row
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
  // adult and brood samples end before the antibiotic tests do: open on the samples' last years
  var SAMPLE_LAST = D.source.bookLast || LAST;
  if (SAMPLE_LAST < LATEST_FULL) LATEST_FULL = SAMPLE_LAST;

  var MEASURES = [
    { id: 'vd', label: T('Varroa: percent of samples positive'), short: T('Varroa'), tile: T('Varroa positive'), unit: 'pct', n: 0, pos: 1, from: D.source.varroaFrom, group: 'Varroa mite' },
    { id: 'vil', label: T('Varroa: average mites per 100 bees'), short: T('Mites per 100 bees'), tile: T('Mites per 100 bees'), unit: 'load', n: 6, sum: 7, sq: 14, group: 'Varroa mite' },
    { id: 'nos', label: T('Nosema: percent of samples positive'), short: T('Nosema'), tile: T('Nosema positive'), unit: 'pct', n: 2, pos: 3, group: 'Nosema' },
    { id: 'ms', label: T('Nosema: average million spores per bee'), short: T('Million spores per bee'), tile: T('Spores per bee (millions)'), unit: 'load', n: 8, sum: 9, sq: 15, group: 'Nosema' },
    { id: 'tm', label: T('Tracheal mite: percent of samples positive'), short: T('Tracheal mite'), tile: T('Tracheal mite positive'), unit: 'pct', n: 4, pos: 5, group: 'Tracheal mite' },
    { id: 'afb', label: T('American foulbrood: percent of brood samples positive'), short: T('American foulbrood'), tile: T('American foulbrood'), unit: 'pct', n: 10, pos: 11, brood: true, group: 'Foulbrood (brood samples)' },
    { id: 'efb', label: T('European foulbrood: percent of brood samples positive'), short: T('European foulbrood'), tile: T('European foulbrood'), unit: 'pct', n: 10, pos: 12, brood: true, group: 'Foulbrood (brood samples)' },
    { id: 'te', label: T('Tetracycline: average AFB resistance (%)'), short: T('Tetracycline resistance'), tile: T('Tetracycline resistance'), unit: 'res', n: 15, sum: 16, sq: 18, brood: true, abx: true, group: 'AFB antibiotic resistance' },
    { id: 'ty', label: T('Tylosin: average AFB resistance (%)'), short: T('Tylosin resistance'), tile: T('Tylosin resistance'), unit: 'res', n: 18, sum: 19, sq: 21, brood: true, abx: true, group: 'AFB antibiotic resistance' },
    { id: 'samples', label: T('Adult samples tested'), short: T('Adult samples'), tile: T('Adult samples'), unit: 'count', idx: 0, group: 'Samples' },
    { id: 'brood', label: T('Brood samples tested'), short: T('Brood samples'), tile: T('Brood samples'), unit: 'count', idx: 11, brood: true, group: 'Samples' }
  ];
  var M = {}; MEASURES.forEach(function (m) { M[m.id] = m; });
  // first and last year each test was run
  // which years each test ran, anywhere in the data (CUBE keys include every country)
  MEASURES.forEach(function (m) {
    if (m.unit === 'count') { m.years = YEARS.filter(function (y) { return Object.keys(CUBE).some(function (s) { return (CUBE[s][y] || []).some(function (c) { return c[1][m.idx] > 0; }); }); }); return; }
    m.years = YEARS.filter(function (y) { return Object.keys(CUBE).some(function (s) { return (CUBE[s][y] || []).some(function (c) { return c[1][m.n + 1] > 0; }); }); });
  });
  // measures with no data in any year (mite and spore counts start after 2015) are left out of the page
  MEASURES = MEASURES.filter(function (m) { return m.years.length; });
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
    var t = new Array(NC).fill(0);
    statesOf(area).forEach(function (s) {
      var cy = CUBE[s]; if (!cy) return;
      for (var y = y0; y <= y1; y++) {
        (cy[y] || []).forEach(function (c) {
          if (months && months.indexOf(c[0]) < 0) return;
          for (var i = 0; i < NC; i++) t[i] += c[1][i] || 0;
        });
      }
    });
    return (aggCache[ck] = t);
  }
  // { v, n, status: ok | none (no samples) | nottested }
  function valueFrom(t, mid) {
    var m = M[mid];
    var base = m.brood ? t[11] : t[0]; // adult or brood samples, whichever this measure uses
    if (m.abx) base += t[m.n + 1];      // antibiotic tests are recorded separately from brood samples
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
        var row = ((NAT[y] = NAT[y] || {})[c[0]] = NAT[y][c[0]] || new Array(NC).fill(0));
        for (var i = 0; i < NC; i++) row[i] += c[1][i] || 0;
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
    var expS = u === 'pct' || u === 'res' ? PCT(e.exp, 1) : NUM(e.exp, 1), a = NUM(Math.abs(e.diff), 1), x = NUM(e.ratio === Infinity ? 0 : e.ratio, 1);
    if (short === 'cell') return u === 'pct' ? (e.diff >= 0 ? '+' : '−') + a : e.ratio === Infinity ? '>' : T('{x}×', { x: x });
    if (short) return u === 'pct' ? T(e.diff >= 0 ? '+{a} pts vs. expected {e}' : '−{a} pts vs. expected {e}', { a: a, e: expS }) : e.ratio === Infinity ? T('above expected {e}', { e: expS }) : T('{x}× expected {e}', { x: x, e: expS });
    if (u === 'pct') return T(e.diff >= 0 ? '{a} points above the seasonal expectation ({e})' : '{a} points below the seasonal expectation ({e})', { a: a, e: expS });
    var base = e.ratio === Infinity ? T('Above the seasonal expectation ({e})', { e: expS }) : e.ratio > 0 && e.ratio < 0.05 ? T('Under 0.1 times the seasonal expectation ({e})', { e: expS }) : T('{x} times the seasonal expectation ({e})', { x: x, e: expS });
    return base + (e.ratio >= 2 && e.ratio !== Infinity ? T(', at least double') : e.ratio <= 0.5 ? T(', less than half') : '');
  }
  var EXP_WORD = { '-2': T('much lower than expected'), '-1': T('lower than expected'), '0': T('within the expected range'), '1': T('higher than expected'), '2': T('much higher than expected') };
  function shadeExp() { return IS_US && st.shade === 'expect' && !isCount(st.measure); }

  /* ---------- Labels and formatting ---------- */
  function timeLabel() {
    var s = span(), y = ISO(s[0] === s[1] ? String(s[0]) : s[0] + '–' + s[1]);
    if (s[1] === LAST && LAST_MONTH[LAST] < 12) y += ' ' + T('(through {m} {y})', { m: MONTHS[LAST_MONTH[LAST]], y: LAST });
    return y + (st.season !== 'all' ? SEP + low(SEASONS[st.season].label) : '');
  }
  function areaName(a) {
    if (a === 'ALL') return V.pool && V.cont ? T('All countries in {c}', { c: V.name }) : V.name;
    if (a.indexOf('R:') === 0) return D.regions[a.slice(2)].states.length > 1 ? T('{r} region', { r: D.regions[a.slice(2)].name }) : D.regions[a.slice(2)].name;
    if (BYKEY[a]) return BYKEY[a].name;
    return NAMES[a] || a;
  }
  // the total the current view compares against
  function who() { return IS_US ? T('the U.S.') : IS_POOL ? (V.cont ? T('the {c} total', { c: V.name }) : T('the worldwide total')) : V.name; }
  // the kind of area in the current view: state, region, province, area or country (English key, see WORDS)
  function areaKind() { return IS_US ? (st.geo === 'region' ? 'region' : 'state') : IS_POOL ? 'country' : (V.key === 'CAN' ? 'province' : 'area'); }
  var WORDS = {
    state: [T('state'), T('states'), T('State'), T('Go to a state'), T('Filter states')],
    region: [T('region'), T('regions'), T('Region'), T('Go to a state'), T('Filter regions')],
    province: [T('province'), T('provinces'), T('Province'), T('Go to a province'), T('Filter provinces')],
    area: [T('area'), T('areas'), T('Area'), T('Go to an area'), T('Filter areas')],
    country: [T('country'), T('countries'), T('Country'), T('Go to a country'), T('Filter countries')]
  };
  function areaWord(pl) { return WORDS[areaKind()][pl ? 1 : 0]; }
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(mid, r) {
    if (!r || r.status !== 'ok') return null;
    var u = M[mid].unit, v = r.v;
    if (u === 'count') return NUM(Math.round(v));
    if (u === 'pct' || u === 'res') return PCT(v, 1);
    if (v > 0 && v < 0.05) return '<' + NUM(0.1, 1);
    return NUM(v, 1);
  }
  function unitWord(mid) { return mid === 'vil' ? ' ' + T('mites per 100 bees') : mid === 'ms' ? ' ' + T('million spores per bee') : ''; }
  function compact(mid, v) {
    var u = M[mid].unit;
    if (u === 'pct' || u === 'res') return PCT(Math.round(v * 10) / 10, v % 1 ? 1 : 0);
    if (u === 'count') return v >= 1e3 ? T('{n}k', { n: NUM(Math.round(v / 100) / 10, (Math.round(v / 100) % 10) ? 1 : 0) }) : NUM(Math.round(v));
    return NUM(Math.round(v * 10) / 10, (Math.round(v * 10) % 10) ? 1 : 0);
  }
  function statusText(r, mid) {
    if (r.status === 'none') return T('No samples');
    if (r.status === 'nottested') return mid === 'vil' || mid === 'ms' ? T('Not counted in this period') : T('Not tested in this period');
    return '';
  }
  function testedNote(mid) {
    var m = M[mid], ys = m.years;
    if (M[mid].unit === 'count' || (M[mid].brood && !M[mid].abx) || !ys.length) return '';
    if (mid === 'tm' && ys.some(function (y) { return y > 2015; })) return T('The lab examined samples for tracheal mites through 2015 and in some years since ({y}).', { y: ys.filter(function (y) { return y > 2015; }).join(SEP) });
    return T(mid === 'vil' || mid === 'ms' ? 'Counts start in {y}.' : 'Tests start in {y}.', { y: ys[0] });
  }

  /* ---------- Color scale: same ranges for every period ---------- */
  var breakCache = {};
  function niceVal(mid, v) {
    var u = M[mid].unit;
    if (u === 'count') { var mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(v, 1))) - 1)); return Math.max(1, Math.round(v / mag) * mag); }
    if (u === 'pct' || u === 'res') return Math.max(1, Math.round(v));
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
    var t = new Array(NC).fill(0);
    (a.indexOf('R:') === 0 ? D.regions[a.slice(2)].states : [a]).forEach(function (s) { ((CUBE[s] || {})[y] || []).forEach(function (c) { for (var i = 0; i < NC; i++) t[i] += c[1][i] || 0; }); });
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
    $('dx-maptitle').textContent = M[st.measure].label + (shadeExp() ? SEP + T('compared with seasonal expectation') : '') + (IS_US ? '' : SEP + areaName('ALL')) + SEP + timeLabel();
    var usb = $('dx-us'), usv = fmt(st.measure, val('ALL', st.measure));
    usb.setAttribute('aria-pressed', String(st.sel === 'ALL'));
    usb.innerHTML = '<svg width="13" height="14" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10"/></svg>' + esc(V.name) + (usv ? '<b>' + usv + '</b>' : '');
    var s = span(), notes = [];
    var afterSamples = s[0] > SAMPLE_LAST && !M[st.measure].abx;
    if (!testedIn(st.measure, s[0], s[1]) && !afterSamples) notes.push('<strong>' + T(st.measure === 'vil' || st.measure === 'ms' ? 'No counts in this period.' : 'No tests in this period.') + '</strong> ' + testedNote(st.measure));
    else if (s[0] < M[st.measure].years[0]) notes.push('<strong>' + T('Partial range:') + '</strong> ' + testedNote(st.measure) + ' ' + T('Earlier years in the range add samples but no results for this measure.'));
    if (st.measure === 'tm' && testedIn('tm', s[0], s[1]) && s[1] > 2015) notes.push(testedNote('tm'));
    if (!IS_US && (st.measure === 'vil' || st.measure === 'ms')) notes.push(T('<strong>U.S. only:</strong> mite and spore counts are recorded for U.S. samples from {y} on; samples from other countries date from {z} or earlier.', { y: M[st.measure].years[0], z: D.source.bookLast }));
    if (s[1] > SAMPLE_LAST && !M[st.measure].abx) notes.push(T('<strong>Samples end in {y}.</strong> Adult and brood samples run from {a} to {y}; later years have AFB antibiotic resistance tests only.', { a: FIRST, y: SAMPLE_LAST }));
    if (!IS_US && !viewSamples(s[0], s[1])) notes.push(T('<strong>No samples from {c} in this period.</strong> Samples from outside the United States run from {a} to {b}. Pick a range in those years.', { c: esc(areaName('ALL')), a: FIRST, b: D.source.bookLast }));
    if (shadeExp()) notes.push(T('<strong>Compared with the seasonal expectation:</strong> each area’s result next to what the lab’s samples from the same months showed nationally, over a five-year window around each year. Neutral means within the expected range for that many samples.'));
    $('dx-callout').innerHTML = notes.join(' ');
    $('dx-callout').hidden = !notes.length;
    drawLegend();
    var cn = $('dx-colornote');
    if (cn) cn.textContent = (shadeExp() ? T('Colors compare each area with the seasonal expectation for the same period. Areas with fewer than {k} samples are outlined.', { k: SMALL_N }) : T('Color ranges stay the same for every year and every country, so you can compare across years and places.')) + ' ' + MAPNOTE;
  }
  var MAPNOTE = '';
  function sampleCount(y0, y1) { var t = agg('ALL', y0, y1, null); return t[0] + t[11]; } // adult and brood samples only
  function viewSamples(y0, y1) { var t = agg('ALL', y0, y1, null); return t[0] + t[11] + (t[16] || 0) + (t[19] || 0); }
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
    return (IS_US && st.geo === 'region' && area ? NAMES[code] + SEP + areaName(area) : areaName(code)) + SEP + (shown ? shown + unitWord(st.measure) : statusText(p.r, st.measure)) + (p.few ? T(', small sample') : '');
  }

  function drawUS() {
    svg.setAttribute('class', 'lx-map is-shapes' + (st.geo === 'region' ? ' is-region' : ''));
    svg.setAttribute('aria-label', T('Map of U.S. states'));
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
    MAPNOTE = off.length ? T(off.length > 1 ? '{list} are in the table and the U.S. totals but not on the map.' : '{list} is in the table and the U.S. totals but not on the map.', { list: off.map(function (c) { return NAMES[c]; }).join(T(' and ')) }) : '';
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
    svg.setAttribute('aria-label', T('Map of {c} with one dot per {a}', { c: V.name, a: areaWord(false) }));
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
    MAPNOTE = (placed.length > 1 ? T(V.key === 'CAN' ? 'Each dot is a province, placed at its reference point; bigger dots mean more samples over all years.' : 'Each dot is an area, placed at its reference point; bigger dots mean more samples over all years.') + ' ' : T('The dot stands for the whole country; samples from {c} were not recorded by area.', { c: V.name }) + ' ') +
      (unplaced.length ? T('{list} is in the table and the {c} totals but not on the map.', { list: unplaced.map(function (a) { return areaName(a); }).join(T(' and ')), c: V.name }) + ' ' : '') +
      (polys.length ? T('Country outline: Natural Earth.') : '');
  }
  function viewSamplesOf(a, s) { var t = agg(a, s[0], s[1], null); return t[0] + t[11]; }

  // A continent or the whole world: each country colored by its pooled value
  function drawGlobe() {
    svg.setAttribute('aria-label', V.cont ? T('Map of {c} with the countries that sent samples', { c: V.name }) : T('World map with the countries that sent samples'));
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
    MAPNOTE = T('Each country that sent samples is colored by its pooled value; small countries also get a dot. Pick a country in the Country menu, or use the button in the side panel, to see its provinces or areas. Outlines: Natural Earth.');
  }

  function showTip(code, e, el) {
    var area = tileArea(code), r = area ? val(area, st.measure) : { status: 'none' }, shown = fmt(st.measure, r);
    var head = IS_US && st.geo === 'region' && area ? areaName(area) : areaName(code);
    var extra = r.status === 'ok' && !isCount(st.measure) ? ' · ' + T('{n} tested', { n: NUM(r.n) }) : '';
    if (shadeExp() && r.status === 'ok') extra = ' · ' + expText(st.measure, expVal(area, st.measure), true);
    tip.innerHTML = '<strong>' + esc(head) + '</strong><span>' + (shown ? (isCount(st.measure) ? T('{v} samples', { v: shown }) : shown + (unitWord(st.measure) || ' ' + low(M[st.measure].short))) + extra : statusText(r, st.measure)) + '</span>';
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
      [['-2', T(pct ? '15+ points lower' : 'Under half')], ['-1', T('Lower')], ['0', T('Within expected range')], ['1', T('Higher')], ['2', T(pct ? '15+ points higher' : 'Twice or more')]].forEach(function (x) {
        items.push('<span><i style="background:' + EXP_COLOR[x[0]] + '"></i>' + x[1] + '</span>');
      });
      items.push('<span><i class="few"></i>' + T('Fewer than {k} samples', { k: SMALL_N }) + '</span>');
      items.push('<span><i style="background:var(--nodata)"></i>' + T('No samples') + '</span>');
      items.push('<span><i class="hatch"></i>' + T('Not tested') + '</span>');
      $('dx-legend').innerHTML = items.join('');
      return;
    }
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? T('Under {v}', { v: compact(mid, b[0]) }) : i === b.length ? T('{v} or more', { v: compact(mid, b[i - 1]) }) : ISO(compact(mid, b[i - 1]) + '–' + compact(mid, b[i]));
      items.push('<span><i style="background:' + binColor(i) + '"></i>' + lab + '</span>');
    }
    if (!isCount(mid)) items.push('<span><i class="few"></i>' + T('Fewer than {k} samples', { k: SMALL_N }) + '</span>');
    items.push('<span><i style="background:var(--nodata)"></i>' + T('No samples') + '</span>');
    items.push('<span><i class="hatch"></i>' + T('Not tested') + '</span>');
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
    var where = IS_US ? T('the U.S.') : IS_POOL ? (V.cont ? V.name : T('this view')) : V.name;
    if (isCount(mid)) return T(sampleKind(mid) === 'brood' ? '{p} of all brood samples in {w} ({v})' : '{p} of all adult samples in {w} ({v})', { p: PCT(mine.v / us.v * 100, 1), w: where, v: fmt(mid, us) });
    var d = mine.v - us.v, amt = Math.abs(d).toFixed(1), vv = { a: NUM(Math.abs(d), 1), who: w, v: fmt(mid, us) };
    if (Number(amt) === 0) return T('About the same as {who} ({v})', vv);
    if (M[mid].unit === 'pct' || M[mid].unit === 'res') return T(amt === '1.0' ? (d > 0 ? '{a} point above {who} ({v})' : '{a} point below {who} ({v})') : (d > 0 ? '{a} points above {who} ({v})' : '{a} points below {who} ({v})'), vv);
    return T(d > 0 ? '{a} above {who} ({v})' : '{a} below {who} ({v})', vv);
  }
  function expLine(area, mid, r) {
    if (isCount(mid) || r.status !== 'ok' || !IS_US) return '';
    if (area === 'ALL') return shadeExp() ? '<p class="dx-exp">' + T('The U.S. is the reference for the seasonal expectation, so it isn’t compared with itself.') + '</p>' : '';
    var e = expVal(area, mid), c = expClass(mid, e);
    if (c == null) return '';
    return '<p class="dx-exp"><i style="background:' + EXP_COLOR[c] + '"></i>' + expText(mid, e) + ': <strong>' + EXP_WORD[c] + '</strong>' + (e.n < SMALL_N ? T(' (but based on very few samples)') : '') + '.</p>';
  }
  function basisLine(area, mid, r) {
    var kind = sampleKind(mid), all = val(area, kind === 'brood' ? 'brood' : 'samples');
    if (!all.v) return '';
    if (isCount(mid)) return '<p class="lx-sample">' + T(kind === 'brood' ? (st.season !== 'all' ? 'Brood (comb or smear) samples the lab received and tested in these months.' : 'Brood (comb or smear) samples the lab received and tested.') : (st.season !== 'all' ? 'Adult bee samples the lab received and tested in these months.' : 'Adult bee samples the lab received and tested.')) + '</p>';
    if (r.status !== 'ok') return '<p class="lx-sample">' + T(kind === 'brood' ? '{n} brood samples were received in this period.' : '{n} adult samples were received in this period.', { n: NUM(all.v) }) + ' ' + testedNote(mid) + '</p>';
    var small = r.n < SMALL_N;
    var txt = M[mid].abx ? T('Average resistance of <b>{n}</b> American foulbrood cultures tested in the lab (agar disc diffusion).', { n: NUM(r.n) }) : M[mid].unit === 'pct' ? T(kind === 'brood' ? '<b>{p}</b> of <b>{n}</b> brood samples tested positive.' : '<b>{p}</b> of <b>{n}</b> adult samples tested positive.', { p: NUM(r.pos), n: NUM(r.n) })
      : T('Average of <b>{n}</b> samples with a count, including those with none found.', { n: NUM(r.n) });
    return '<p class="lx-sample">' + (small ? '<span class="lx-smallchip">' + T('Small sample') + '</span> ' : '') + txt + (small ? ' ' + T('With this few samples, one or two colonies can swing the result a lot.') : '') + '</p>';
  }

  function renderPanel() {
    var area = st.sel, panel = $('dx-panel'), html = [];
    var all = val(area, 'samples'), br = val(area, 'brood');
    var cnt = function (r, w) { var n = r.v || 0; return T(w === 'brood' ? (n === 1 ? '{n} brood sample' : '{n} brood samples') : (n === 1 ? '{n} adult sample' : '{n} adult samples'), { n: NUM(n) }); };
    html.push('<div class="lx-panel-head"><h2>' + esc(areaName(area)) + '</h2>' + (area !== 'ALL' ? '<button type="button" class="lx-link" id="dx-to-us">' + esc(T('View {c}', { c: V.name })) + '</button>' : '') + '</div>');
    html.push('<p class="lx-sub">' + (area !== 'ALL' && !IS_US && !IS_POOL ? esc(V.name) + ' · ' : '') + timeLabel() + ' · ' + (all.v || br.v ? cnt(all, 'adult') + SEP + cnt(br, 'brood') : T('No samples')) + '</p>');
    if (IS_POOL && area !== 'ALL') html.push('<p><button type="button" class="btn" id="dx-open-country" data-key="' + esc(area) + '">' + esc(T('Open the {a} map →', { a: areaName(area) })) + '</button></p>');
    if (area === 'ALL' && IS_POOL) html.push('<p class="lx-small">' + V.members.map(function (k) { return BYKEY[k].name; }).join(SEP) + '.</p>');
    if (area.indexOf('R:') === 0 && D.regions[area.slice(2)].states.length > 1) html.push('<p class="lx-small">' + D.regions[area.slice(2)].states.map(function (s) { return NAMES[s]; }).join(SEP) + '.</p>');
    var r = val(area, st.measure), shown = fmt(st.measure, r), rk = rankOf(area, st.measure), cmp = compareLine(area, st.measure);
    html.push('<div class="lx-hero"><p class="lx-k">' + M[st.measure].label + '</p>' +
      '<p class="lx-big">' + (shown ? shown + (M[st.measure].unit === 'load' ? '<span class="dx-unit">' + unitWord(st.measure) + '</span>' : '') : '<span class="lx-na">' + statusText(r, st.measure) + '</span>') + '</p>' +
      (cmp ? '<p class="lx-cmp">' + cmp + '</p>' : '') +
      (rk ? '<p class="lx-rank">' + T(rk.exp ? 'Rank {r} of {of} {w} with {k} or more samples, by difference from the seasonal expectation (1 is the highest)' : 'Rank {r} of {of} {w} with {k} or more samples (1 is the highest)', { r: rk.rank, of: rk.of, w: areaWord(true), k: SMALL_N }) + '</p>' : '') +
      expLine(area, st.measure, r) +
      basisLine(area, st.measure, r) + '</div>');

    var tiles = MEASURES.filter(function (m) { return m.id !== st.measure; });
    html.push('<div class="lx-tiles">' + tiles.map(function (m) {
      var tr = val(area, m.id), s = fmt(m.id, tr), few = tr.status === 'ok' && tr.n < SMALL_N && !isCount(m.id);
      return '<button type="button" class="lx-tile" data-measure="' + m.id + '" title="' + esc(T('Color the map by {m}', { m: low(m.label) })) + '"><span class="lx-k">' + m.tile + '</span><span class="lx-v">' + (s || '<span class="lx-na">' + (tr.status === 'nottested' ? T(m.unit === 'load' ? 'not counted' : 'not tested') : T('n/a')) + '</span>') + '</span>' +
        (tr.status === 'ok' && !isCount(m.id) ? '<span class="lx-rank">' + T('{n} tested', { n: NUM(tr.n) }) + (few ? ' <span class="lx-fewmark" aria-label="' + T('small sample') + '">!</span>' : '') + '</span>' : '') + '<span class="lx-show">' + T('Show on map') + '</span></button>';
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
        var yrs = s[0] === s[1] ? T('in {y}', { y: s[0] }) : T('{a} to {b}', { a: s[0], b: s[1] });
        html.push('<div class="lx-block"><h3 class="lx-h3">' + T('By month') + '</h3><p class="lx-small">' + T(isCount(st.measure) ? '{m} by the month samples were received, {y}.' : '{m} by the month samples were collected, {y}.', { m: M[st.measure].short, y: yrs }) +
          (area !== 'ALL' && !isCount(st.measure) ? ' ' + T('The dark tick marks the value for {who}.', { who: who() }) : '') + ' ' + T('Bars run from 0 to {t}. Lighter bars have fewer than {k} samples. The last column is the number of samples tested each month.', { t: compact(st.measure, top), k: SMALL_N }) + '</p><ul class="lx-stress lx-seasons dx-months' + (isCount(st.measure) ? '' : ' has-n') + '">' +
          (isCount(st.measure) ? '' : '<li class="dx-mhead" aria-hidden="true"><span></span><span></span><span class="lx-sval">' + T(M[st.measure].unit === 'pct' ? 'Positive' : 'Average') + '</span><span class="dx-n">' + T('Samples') + '</span></li>') +
          rows.map(function (x, i) {
            var u = us[i], ok = x.status === 'ok', few = ok && x.n < SMALL_N && !isCount(st.measure);
            var mark = area !== 'ALL' && !isCount(st.measure) && u.status === 'ok' ? '<b class="lx-usmark" style="left:' + Math.min(100, u.v / top * 100).toFixed(1) + '%" title="' + esc(areaName('ALL')) + ' ' + fmt(st.measure, u) + '"></b>' : '';
            var dim = inSeason && inSeason.indexOf(i + 1) < 0 ? ' dx-dim' : '';
            return '<li class="' + dim + '"><span class="lx-sname">' + MONTHS[i + 1] + '</span><span class="lx-track"><span class="lx-fill' + (few ? ' dx-few' : '') + '" style="width:' + (ok ? Math.max(0.6, Math.min(100, x.v / top * 100)) : 0).toFixed(1) + '%"></span>' + mark + '</span>' +
              '<span class="lx-sval" title="' + (ok ? T('{v} samples', { v: NUM(x.n) }) : '') + '">' + (ok ? fmt(st.measure, x) : x.status === 'none' ? '–' : T('n/a')) + '</span>' +
              (isCount(st.measure) ? '' : '<span class="dx-n' + (few ? ' few' : '') + '" aria-label="' + T('{v} samples', { v: NUM(ok ? x.n : 0) }) + '">' + (ok ? NUM(x.n) : NUM(0)) + '</span>') + '</li>';
          }).join('') + '</ul></div>');
      }
    }

    // Year-ago comparison
    if (st.mode === 'year' && st.year > FIRST) {
      var now = r, then = valAt(area, st.measure, st.year - 1, st.year - 1, st.season);
      if (now.status === 'ok' && then.status === 'ok') html.push('<p class="lx-yoy">' + T('In {y0}: <strong>{a}</strong>, compared with <strong>{b}</strong> in {y1}.', { y0: st.year - 1, a: fmt(st.measure, then), b: fmt(st.measure, now), y1: st.year }) + '</p>');
    }

    var dash = area !== 'ALL' && !isCount(st.measure);
    html.push('<div class="lx-block"><h3 class="lx-h3">' + T('{m} by year', { m: M[st.measure].short }) + '</h3><div class="lx-trend" id="dx-trend"></div><p class="lx-small" id="dx-readout">' +
      T(st.mode === 'year' ? (dash ? 'The darker bar is the selected year, and the dashed line is {who}.' : 'The darker bar is the selected year.') : (dash ? 'Darker bars are the years in this range, and the dashed line is {who}.' : 'Darker bars are the years in this range.'), { who: who() }) + ' ' +
      T('Lighter bars have fewer than {k} samples. Hover a bar to see its value, or click it to jump there.', { k: SMALL_N }) + '</p></div>');
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
    if (!any) { box.innerHTML = '<p class="lx-small">' + T('No values to chart for this selection.') + '</p>'; return; }
    if (!max) max = isCount(mid) ? 10 : 1;
    var stp = niceStep(max / 4), top = Math.ceil(max / stp) * stp;
    var bw = (W - ml - mr) / rows.length, y = function (v) { return mt + (H - mt - mb) * (1 - v / top); };
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(T('{m} by year for {a}', { m: M[mid].short, a: areaName(area) })) + '">'];
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
        readout.textContent = d.y + ': ' + (a ? (isCount(mid) ? T('{v} samples', { v: a }) : a + unitWord(mid) + ' (' + T('{n} tested', { n: NUM(d.r.n) }) + ')') : statusText(d.r, mid)) + (area !== 'ALL' && !isCount(mid) && b ? '; ' + areaName('ALL') + ' ' + b : '');
      });
      h.addEventListener('mouseleave', function () { readout.textContent = base; });
      h.addEventListener('click', function () { setMode('year', d.y); });
    });
  }
  function niceStep(x) { var p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

  /* ---------- Table ---------- */
  var TABLE_COLS = ['samples', 'vd', 'vil', 'nos', 'ms', 'tm', 'brood', 'afb', 'efb', 'te', 'ty'].filter(function (k) { return M[k].years.length; });
  var COL_LABEL = { te: T('Tetracycline res. %'), ty: T('Tylosin res. %'), samples: T('Adult samples'), vd: T('Varroa %'), vil: T('Mites / 100 bees'), nos: T('Nosema %'), ms: T('Spores (M / bee)'), tm: T('Tracheal %'), brood: T('Brood samples'), afb: T('AFB %'), efb: T('EFB %') };
  function renderTable() {
    var ex = shadeExp();
    var sk = st.sortKey || (ex ? 'exp' : st.measure);
    var arrow = function (k) { return sk === k ? (st.sortDir < 0 ? ' ↓' : ' ↑') : ''; };
    var word = areaWord(false), head = '<tr><th scope="col" data-k="name" class="' + (sk === 'name' ? 'sorted' : '') + '">' + WORDS[areaKind()][2] + arrow('name') + '</th>' +
      (ex ? '<th scope="col" class="num' + (sk === 'exp' ? ' sorted' : '') + '" data-k="exp" title="' + esc(T('{m} compared with the seasonal expectation', { m: M[st.measure].short })) + '">' + T('{m} vs. expected', { m: M[st.measure].short }) + arrow('exp') + '</th>' : '') +
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
        expCell = '<td class="num dx-expcell lx-na" title="' + T('The U.S. is the reference') + '">' + T('reference') + '</td>';
      } else if (ex) {
        var e = expVal(a, st.measure), c = val(a, st.measure).status === 'ok' ? expClass(st.measure, e) : null;
        expCell = '<td class="num dx-expcell" title="' + (c != null ? EXP_WORD[c] : '') + '">' + (c != null ? '<i style="background:' + EXP_COLOR[c] + '"></i>' + expText(st.measure, e, 'cell') : '<span class="lx-na">–</span>') + '</td>';
      }
      return '<tr class="' + cls + (a === st.sel ? ' on' : '') + '" data-code="' + esc(a) + '" tabindex="0"><th scope="row">' + esc(areaName(a)) + '</th>' + expCell +
        TABLE_COLS.map(function (m) {
          var r = val(a, m), s = fmt(m, r), few = isCount(m) && r.status === 'ok' && r.v < SMALL_N;
          return '<td class="num' + (few ? ' lx-few' : '') + '"' + (r.status === 'ok' && !isCount(m) ? ' title="' + T('{n} tested', { n: NUM(r.n) }) + '"' : '') + '>' + (s || '<span class="lx-na">–</span>') + (few ? ' <span class="lx-fewmark" aria-label="' + T('small sample') + '">!</span>' : '') + '</td>';
        }).join('') + '</tr>';
    }
    $('dx-table').innerHTML = '<thead>' + head + '</thead><tbody>' + row('ALL', 'pin') + areas.map(function (a) { return row(a, ''); }).join('') + '</tbody>';
    $('dx-tabletitle').textContent = (IS_US ? T(st.geo === 'region' ? 'Climate regions' : 'States with samples') : IS_POOL ? (V.cont ? T('Countries with samples in {c}', { c: V.name }) : T('Countries with samples')) : T('{c}: {w} with samples', { c: V.name, w: areaWord(true) })) + SEP + timeLabel();
    $('dx-filter').placeholder = WORDS[areaKind()][4]; $('dx-filter').setAttribute('aria-label', $('dx-filter').placeholder);
    var nWord = IS_US && st.geo !== 'region' ? (areas.length === 1 ? T('state or territory') : T('states and territories')) : areaWord(areas.length !== 1);
    $('dx-tablenote').textContent = T('{n} {w} sent samples in this period.', { n: NUM(areas.length), w: nWord }) + ' ' + T('Percents are the share of tested samples that were positive; loads are averages over samples with a count. A ! means fewer than {k} samples.', { k: SMALL_N }) + (ex ? ' ' + T('"vs. expected" compares each area with the national result for the same months, over a five-year window; the color shows whether the difference is outside the expected range.') : '') + ' ' + T('Click a heading to sort, or a row to see it on the map.');
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

  /* ---------- References under the map ---------- */
  var RD = window.HIVE_DISEASE_REFS || { refs: [], rows: [] };
  function renderRefs() {
    var box = $('dx-refs'), s = span(), months = SEASONS[st.season].months, tally = {}, leaf = {};
    statesOf('ALL').forEach(function (a) { leaf[D.areas.indexOf(a)] = 1; });
    RD.rows.forEach(function (r) {
      if (!leaf[r[0]] || r[1] < s[0] || r[1] > s[1] || (months && months.indexOf(r[2]) < 0)) return;
      tally[r[3]] = (tally[r[3]] || 0) + r[4];
    });
    var rank = function (k) { return k === 'study' ? 0 : k === 'unpublished' ? 1 : 2; };
    var ids = Object.keys(tally).map(Number).sort(function (a, b) { return rank(RD.refs[a].kind) - rank(RD.refs[b].kind) || tally[b] - tally[a]; });
    var head = '<h3 class="lx-h3">' + T('Reference') + '</h3>';
    if (!ids.length) { box.innerHTML = head + '<p class="lx-small">' + T('No samples in this period.') + '</p>'; return; }
    var items = ids.map(function (i) {
      var r = RD.refs[i], d = r.doi, count = I.P ? I.P(tally[i], 'sample') : NUM(tally[i]) + ' samples';
      var text = r.kind === 'unpublished' ? T('Unpublished data') : r.kind === 'none' ? T('No reference recorded') : esc(r.t);
      return '<li dir="auto">' + text + '<span class="gx-refmeta">' +
        (d ? 'DOI: <a href="https://doi.org/' + esc(encodeURI(d)) + '" target="_blank" rel="noopener" dir="ltr">' + esc(d) + '</a> · ' : r.kind === 'study' ? T('No DOI recorded · ') : '') +
        count + '</span></li>';
    }).join('');
    var note = !IS_POOL ? T('Sources of the {c} data for this period, most samples first.', { c: esc(NM(V.name)) })
      : V.cont ? T('Sources of the {c} data for this period. Pick a country to see just its references.', { c: esc(V.name) })
      : T('Sources of the worldwide data for this period. Pick a country to see just its references.');
    box.innerHTML = head + '<p class="lx-small">' + note + '</p><ol>' + items + '</ol>';
  }

  /* ---------- Controls ---------- */
  function select(a) { st.sel = a; drawMap(); renderPanel(); markTableRow(); }
  function markTableRow() { $('dx-table').querySelectorAll('tbody tr').forEach(function (tr) { tr.classList.toggle('on', tr.getAttribute('data-code') === st.sel); }); }
  function setMeasure(mid) {
    if (mid === st.measure) return;
    st.measure = mid; msel.value = mid; st.sortKey = null; renderAll();
    var h = document.querySelector('#dx-panel .lx-hero'); if (h) { h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); }
  }
  function renderAll() { if (typeof syncShade === 'function') syncShade(); drawMap(); renderPanel(); renderTable(); renderRefs(); }
  function setSeg(group, value) { document.querySelectorAll('[data-seg="' + group + '"] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === value)); }); }
  function yearOptions(sel, v) { sel.innerHTML = YEARS.slice().reverse().map(function (y) { return '<option value="' + y + '">' + y + (y === LAST && LAST_MONTH[LAST] < 12 ? ' ' + T('(through {m})', { m: MONTHS[LAST_MONTH[LAST]] }) : '') + '</option>'; }).join(''); sel.value = String(v); }
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
  msel.innerHTML = Object.keys(groups).map(function (g) { return '<optgroup label="' + esc(T(g)) + '">' + groups[g].map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</optgroup>'; }).join('');
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
      return '<option value="' + esc(c.key) + '">' + esc(c.cont && c.pool ? T('All countries in {c}', { c: c.name }) : c.name) + ' (' + NUM(samplesIn(c.key)) + ')</option>';
    }).join('');
  }
  if (contSel) contSel.innerHTML = '<option value="">' + T('All continents') + ' (' + NUM(samplesIn('WORLD')) + ')</option>' + CONTS.map(function (ct) {
    return '<option value="' + esc(ct) + '">' + esc(NM(ct)) + ' (' + NUM(samplesIn('CONT:' + ct)) + ')</option>';
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
        var ys = YEARS.filter(function (y) { return sampleCount(y, y); });
        if (ys.length) { st.mode = 'range'; st.from = ys[0]; st.to = ys[ys.length - 1]; st.year = ys[ys.length - 1]; syncTime(); }
      }
    }
    $('dx-goto-lab').textContent = IS_US ? T('Go to a state') : WORDS[areaKind()][3];
    $('dx-goto').placeholder = IS_US ? T('e.g. Maryland or MD') : T('e.g. {x}', { x: areaName(viewAreas()[0] || 'ALL') });
    fillGoto();
    $('dx-maphelp').textContent = IS_US ? T('Click a state to see its numbers, or the button to go back to the whole country.') : IS_POOL ? (V.cont ? T('Click a country to see its numbers, or the button to go back to the {c} total.', { c: V.name }) : T('Click a country to see its numbers, or the button to go back to the worldwide total.')) : T('Click a dot to see its numbers, or the button to go back to the whole country.');
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
    document.querySelectorAll('[data-seg="shade"] button[data-v="expect"]').forEach(function (b) { b.disabled = off; b.title = cnt ? T('Not available for sample counts') : !IS_US ? T('Available for the United States only') : ''; });
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
    else { ys = YEARS.filter(function (y) { return sampleCount(y, y); }); y0 = ys[0]; y1 = ys[ys.length - 1]; }
    var g = function (m) { return valAt('ALL', m, y0, y1); };
    var parts = [];
    if (IS_US) {
      var nStates = D.states.filter(function (s) { return valAt(s, 'samples', y0, y1).v || valAt(s, 'brood', y0, y1).v; }).length;
      var regs = REGION_KEYS.map(function (k) { return { k: k, r: valAt('R:' + k, 'vd', y0, y1) }; })
        .filter(function (x) { return x.r.status === 'ok' && x.r.n >= SMALL_N; })
        .sort(function (a, b) { return b.r.v - a.r.v; });
      var hi = regs[0], lo = regs[regs.length - 1], rn = function (x) { return D.regions[x.k].name; };
      var vv = { a: fmt('samples', g('samples')), b: fmt('brood', g('brood')), y0: y0, y1: y1, n: NUM(nStates), vd: fmt('vd', g('vd')), vil: fmt('vil', g('vil')), nos: fmt('nos', g('nos')) };
      parts.push(T('From {y0} to {y1}, the Bee Disease Diagnostic Laboratory tested <strong>{a}</strong> adult bee samples and <strong>{b}</strong> brood samples from {n} U.S. states and territories.', vv) + ' ' +
        T(g('vil').status === 'ok' ? '<strong>{vd}</strong> of adult samples carried Varroa mites, averaging {vil} mites per 100 bees, and <strong>{nos}</strong> carried Nosema.' : '<strong>{vd}</strong> of adult samples carried Varroa mites, and <strong>{nos}</strong> carried Nosema.', vv) +
        (hi && lo && hi !== lo ? ' ' + T('Varroa turned up most often in the <strong>{hi}</strong> ({hv}) and least often in the <strong>{lo}</strong> ({lv}).', { hi: rn(hi), hv: fmt('vd', hi.r), lo: rn(lo), lv: fmt('vd', lo.r) }) : ''));
    } else if (y0 != null) {
      var n = IS_POOL ? V.members.length : 0;
      var from = IS_POOL ? (V.cont ? T(n === 1 ? '{n} country in {c}' : '{n} countries in {c}', { n: NUM(n), c: V.name }) : T('{n} countries', { n: NUM(n) })) : V.name;
      var w = { a: fmt('samples', g('samples')), b: fmt('brood', g('brood')), y0: y0, y1: y1, c: esc(from), vd: fmt('vd', g('vd')), nos: fmt('nos', g('nos')) };
      parts.push(T('From {y0} to {y1}, the lab tested <strong>{a}</strong> adult bee samples and <strong>{b}</strong> brood samples from <strong>{c}</strong>.', w) +
        (g('vd').status === 'ok' ? ' ' + T(g('nos').status === 'ok' ? '<strong>{vd}</strong> of adult samples tested for Varroa carried it, and <strong>{nos}</strong> carried Nosema.' : '<strong>{vd}</strong> of adult samples tested for Varroa carried it.', w) : g('nos').status === 'ok' ? ' ' + T('<strong>{nos}</strong> of adult samples carried Nosema.', w) : ''));
    }
    if (g('afb').status === 'ok') parts.push(T('In brood samples, <strong>{afb}</strong> had American foulbrood and <strong>{efb}</strong> had European foulbrood.', { afb: fmt('afb', g('afb')), efb: fmt('efb', g('efb')) }));
    parts.push(T('Samples come from colonies that looked sick or weak, so these rates are higher than in the average colony.') + ' ' + T(IS_POOL ? 'Click any country to see its numbers.' : IS_US ? 'Click any region or state to see its numbers.' : V.key === 'CAN' ? 'Click any province to see its numbers.' : 'Click any area to see its numbers.'));
    $('dx-summary').innerHTML = parts.join(' ');
    $('dx-note').textContent = T('{a} adult and {b} brood samples from {n} countries, {y0} to {y1}.', { a: NUM(TOTAL_A), b: NUM(TOTAL_B), n: nC, y0: FIRST, y1: SAMPLE_LAST }) +
      (M.te.years.length ? ' ' + T(LAST_MONTH[LAST] < 12 ? 'AFB antibiotic tests through {m} {y}.' : 'AFB antibiotic tests through {y}.', { m: MONTHS[LAST_MONTH[LAST]], y: LAST }) : '');
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
  if (built && D.source.built) built.textContent = T('Data last updated on this site {d}.', { d: new Date(D.source.built + 'T12:00:00').toLocaleDateString(({ fr: 'fr-FR', es: 'es-ES', ar: 'ar' })[I.lang] || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) });
  showTab(isAboutHash(location.hash.slice(1)) ? 'about' : 'map', false);
  if (location.hash.slice(1).indexOf('ab-') === 0) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();
