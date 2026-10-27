/* The Hive Atlas: Colony Monitoring page.
   Reads window.HIVE_MONITOR (data/monitoring-demo.js, currently SIMULATED data),
   window.HIVE_SHAPES (data/state-shapes.js) and window.HIVE_HEX_LAYOUT (js/site.js).
   Uploaded files are read in the browser only; nothing is sent anywhere. */
(function () {
  'use strict';
  var D = window.HIVE_MONITOR, SH = window.HIVE_SHAPES, HEX = window.HIVE_HEX_LAYOUT;
  if (!D || !SH || !HEX) return;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- Reference data ---------- */
  var NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
  var REGION_OF = {};
  Object.keys(D.regions).forEach(function (k) { D.regions[k].states.forEach(function (s) { REGION_OF[s] = k; }); });
  var REGION_KEYS = Object.keys(D.regions);
  var TYPES = ['Hobbyist', 'Sideline', 'Commercial'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MIN_N = 20;        // fewest inspections for a regional value
  var MIN_PEERS = 5;     // fewest operations for a peer comparison

  var epoch = new Date(D.epoch + 'T00:00:00');
  function decodeRef(r) {
    var op = D.ops[r[0]], d = new Date(epoch.getTime() + r[3] * 86400000);
    var rec = { op: op.id, type: op.type, sub: op.submitted_by, state: op.state, region: REGION_OF[op.state],
      apiary: r[1], colony: r[2], date: d, y: d.getFullYear(), m: d.getMonth() + 1, alive: r[4] === 1 };
    if (!rec.alive) return rec;
    rec.fob = r[5]; rec.brood = r[6]; rec.pat = r[7]; rec.queen = D.queenCodes[r[8]];
    rec.v = r[9] / D.beesSampled * 100;
    D.flags.forEach(function (f, i) { rec[f] = !!(r[10] & (1 << i)); });
    rec.treat = D.treatCodes[r[11]]; rec.fed = D.fedCodes[r[12]]; rec.req = r[13] === 1;
    return rec;
  }
  var REF = D.rows.map(decodeRef);
  var REF_BY_OP = {};
  REF.forEach(function (r) { (REF_BY_OP[r.op] = REF_BY_OP[r.op] || { id: r.op, type: r.type, region: r.region, state: r.state, recs: [] }).recs.push(r); });
  var YEARS = []; REF.forEach(function (r) { if (YEARS.indexOf(r.y) < 0) YEARS.push(r.y); }); YEARS.sort();

  /* ---------- Metrics ---------- */
  function share(test) { return function (r) { var t = test(r); return t === null ? null : t ? 1 : 0; }; }
  var BROOD_DISEASE = ['afb', 'efb', 'chalkbrood', 'sacbrood'];
  var METRICS = [
    { id: 'varroa', label: 'Varroa mites per 100 bees', short: 'Mites per 100 bees', unit: 'per100', better: 'lower', group: 'Varroa', val: function (r) { return r.v == null ? null : r.v; } },
    { id: 'over3', label: 'Washes at or above 3 mites per 100 bees', short: 'Washes ≥ 3 mites', unit: 'pct', better: 'lower', group: 'Varroa', val: share(function (r) { return r.v == null ? null : r.v >= 3; }) },
    { id: 'fob', label: 'Frames of bees', short: 'Frames of bees', unit: 'frames', better: 'higher', group: 'Colony strength', val: function (r) { return r.fob == null ? null : r.fob; } },
    { id: 'brood', label: 'Frames of brood', short: 'Frames of brood', unit: 'frames', better: 'higher', group: 'Colony strength', val: function (r) { return r.brood == null ? null : r.brood; } },
    { id: 'pattern', label: 'Solid brood pattern (score 4 or 5)', short: 'Solid brood pattern', unit: 'pct', better: 'higher', group: 'Colony strength', val: share(function (r) { return r.pat == null ? null : r.pat >= 4; }) },
    { id: 'queenright', label: 'Queenright colonies', short: 'Queenright', unit: 'pct', better: 'higher', group: 'Queens', val: share(function (r) { return r.queen ? (r.queen === 'seen' || r.queen === 'eggs_only' || r.queen === 'virgin') : null; }) },
    { id: 'disease', label: 'Signs of any brood disease', short: 'Brood disease signs', unit: 'pct', better: 'lower', group: 'Disease signs', val: share(function (r) { return BROOD_DISEASE.some(function (f) { return r[f]; }); }) },
    { id: 'chalkbrood', label: 'Signs of chalkbrood', short: 'Chalkbrood', unit: 'pct', better: 'lower', group: 'Disease signs', val: share(function (r) { return r.chalkbrood; }) },
    { id: 'efb', label: 'Signs of European foulbrood', short: 'EFB signs', unit: 'pct', better: 'lower', group: 'Disease signs', val: share(function (r) { return r.efb; }) },
    { id: 'afb', label: 'Signs of American foulbrood', short: 'AFB signs', unit: 'pct', better: 'lower', group: 'Disease signs', val: share(function (r) { return r.afb; }) },
    { id: 'deformed_wings', label: 'Bees with deformed wings seen', short: 'Deformed wings', unit: 'pct', better: 'lower', group: 'Disease signs', val: share(function (r) { return r.deformed_wings; }) },
    { id: 'small_hive_beetle', label: 'Small hive beetles seen', short: 'Small hive beetle', unit: 'pct', better: 'lower', group: 'Disease signs', val: share(function (r) { return r.small_hive_beetle; }) },
    { id: 'treated', label: 'Inspections with a Varroa treatment', short: 'Treated', unit: 'pct', better: null, group: 'Management', val: share(function (r) { return r.treat ? r.treat !== 'none' : null; }) },
    { id: 'fed', label: 'Inspections with feeding', short: 'Fed', unit: 'pct', better: null, group: 'Management', val: share(function (r) { return r.fed ? r.fed !== 'none' : null; }) },
    { id: 'winter', label: 'Winter colony loss', short: 'Winter loss', unit: 'pct', better: 'lower', group: 'Survival', winter: true }
  ];
  var MET = {}; METRICS.forEach(function (m) { MET[m.id] = m; });

  var PERIODS = [
    { id: 'all', label: 'Whole year', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { id: 'spring', label: 'Spring (Mar–May)', months: [3, 4, 5] },
    { id: 'summer', label: 'Summer (Jun–Aug)', months: [6, 7, 8] },
    { id: 'fall', label: 'Fall (Sep–Nov)', months: [9, 10, 11] },
    { id: 'winter', label: 'Winter (Dec–Feb)', months: [12, 1, 2] }
  ].concat(MONTHS_LONG.map(function (n, i) { return { id: 'm' + (i + 1), label: n, months: [i + 1] }; }));
  var PER = {}; PERIODS.forEach(function (p) { PER[p.id] = p; });

  function fmt(mid, v) {
    if (v == null || isNaN(v)) return '–';
    var u = MET[mid].unit;
    if (u === 'pct') { var p = v * 100; return (p > 0 && p < 0.5 ? '<0.5' : p < 10 && p % 1 ? p.toFixed(1) : Math.round(p)) + '%'; }
    return v.toFixed(1);
  }
  function unitWord(mid) { var u = MET[mid].unit; return u === 'per100' ? 'mites per 100 bees' : u === 'frames' ? 'frames' : ''; }

  // Average a metric over records (alive inspections only)
  function agg(recs, mid) {
    var m = MET[mid];
    if (m.winter) return winterLoss(recs);
    var s = 0, n = 0;
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i]; if (!r.alive) continue;
      var v = m.val(r); if (v == null) continue;
      s += v; n++;
    }
    return { v: n ? s / n : null, n: n };
  }
  // Winter loss: colonies alive in Sep-Dec that are found dead at their first inspection the next Jan-May
  function winterLoss(recs) {
    var byCol = {};
    recs.forEach(function (r) { var k = r.op + '|' + r.apiary + '|' + r.colony; (byCol[k] = byCol[k] || []).push(r); });
    var lost = 0, total = 0;
    Object.keys(byCol).forEach(function (k) {
      var list = byCol[k].slice().sort(function (a, b) { return a.date - b.date; });
      YEARS.forEach(function (y) {
        var fall = list.filter(function (r) { return r.y === y && r.m >= 9 && r.alive; });
        if (!fall.length) return;
        var next = list.filter(function (r) { return r.y === y + 1 && r.m <= 5; })[0];
        if (!next) return;
        total++; if (!next.alive) lost++;
      });
    });
    return { v: total ? lost / total : null, n: total };
  }
  function filterRecs(recs, f) {
    var months = f.period ? PER[f.period].months : null;
    return recs.filter(function (r) {
      if (f.region && f.region !== 'US' && r.region !== f.region) return false;
      if (f.type && f.type !== 'all' && r.type !== f.type) return false;
      if (f.year && f.year !== 'all' && !(f.winterYear ? true : r.y === +f.year)) return false;
      if (months && months.indexOf(r.m) < 0) return false;
      return true;
    });
  }
  // Winter loss ignores month filters (it spans fall and the next spring)
  function regionValue(region, mid, f) {
    var m = MET[mid];
    var recs = filterRecs(REF, { region: region, type: f.type, year: m.winter ? 'all' : f.year, period: m.winter ? null : f.period });
    return agg(recs, mid);
  }

  /* ---------- Shared bits ---------- */
  function niceStep(x) { var p = Math.pow(10, Math.floor(Math.log10(x))), q = x / p; return (q <= 1 ? 1 : q <= 2 ? 2 : q <= 5 ? 5 : 10) * p; }
  function setSeg(group, value) {
    document.querySelectorAll('[data-seg="' + group + '"] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(value))); });
  }
  function metricOptions(sel, ids) {
    var groups = {};
    METRICS.forEach(function (m) { if (!ids || ids.indexOf(m.id) >= 0) (groups[m.group] = groups[m.group] || []).push(m); });
    sel.innerHTML = Object.keys(groups).map(function (g) {
      return '<optgroup label="' + g + '">' + groups[g].map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  }
  function periodOptions(sel) {
    sel.innerHTML = '<optgroup label="Seasons">' + PERIODS.slice(0, 5).map(function (p) { return '<option value="' + p.id + '">' + p.label + '</option>'; }).join('') +
      '</optgroup><optgroup label="Months">' + PERIODS.slice(5).map(function (p) { return '<option value="' + p.id + '">' + p.label + '</option>'; }).join('') + '</optgroup>';
  }

  /* Month line chart. series: [{values: [12], cls, label}], band: {lo:[12], hi:[12]} */
  function monthChart(box, mid, series, opts) {
    opts = opts || {};
    var W = Math.max(320, Math.min(1100, box.clientWidth || 560)), H = Math.round(Math.min(280, Math.max(200, W * 0.42))), ml = 44, mr = 12, mt = 12, mb = 28;
    var max = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) max = Math.max(max, v); }); });
    if (opts.band) opts.band.hi.forEach(function (v) { if (v != null) max = Math.max(max, v); });
    if (opts.threshold) max = Math.max(max, opts.threshold * 1.15);
    if (!max) { box.innerHTML = '<p class="lx-small">No data for this selection.</p>'; return; }
    var pct = MET[mid].unit === 'pct';
    var step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    var x = function (i) { return ml + (i + 0.5) * (W - ml - mr) / 12; };
    var y = function (v) { return mt + (H - mt - mb) * (1 - v / top); };
    var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || 'Seasonal chart') + '">'];
    for (var t = 0; t <= top + 1e-9; t += step) {
      s.push('<line class="grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '"/>');
      s.push('<text class="ytick" x="' + (ml - 6) + '" y="' + y(t).toFixed(1) + '">' + (pct ? Math.round(t * 100) + '%' : (Math.round(t * 10) / 10)) + '</text>');
    }
    MONTHS.forEach(function (mn, i) { s.push('<text class="xtick" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '">' + mn[0] + (i % 3 === 0 ? mn.slice(1) : '') + '</text>'); });
    if (opts.band) {
      var segs = [], cur = [];
      for (var i = 0; i < 12; i++) {
        if (opts.band.lo[i] != null && opts.band.hi[i] != null) cur.push(i); else if (cur.length) { segs.push(cur); cur = []; }
      }
      if (cur.length) segs.push(cur);
      segs.forEach(function (sg) {
        var up = sg.map(function (i) { return x(i).toFixed(1) + ',' + y(opts.band.hi[i]).toFixed(1); });
        var dn = sg.slice().reverse().map(function (i) { return x(i).toFixed(1) + ',' + y(opts.band.lo[i]).toFixed(1); });
        s.push('<polygon class="band" points="' + up.concat(dn).join(' ') + '"/>');
      });
    }
    if (opts.threshold) {
      s.push('<line class="thresh" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(opts.threshold).toFixed(1) + '" y2="' + y(opts.threshold).toFixed(1) + '"/>');
      s.push('<text class="threshlab" x="' + (W - mr - 4) + '" y="' + (y(opts.threshold) - 6).toFixed(1) + '">' + esc(opts.thresholdLabel || '') + '</text>');
    }
    series.forEach(function (se) {
      var segs = [], cur = [];
      se.values.forEach(function (v, i) { if (v != null) cur.push(x(i).toFixed(1) + ',' + y(v).toFixed(1)); else if (cur.length) { segs.push(cur); cur = []; } });
      if (cur.length) segs.push(cur);
      segs.forEach(function (sg) { s.push('<polyline class="ln ' + se.cls + '" points="' + sg.join(' ') + '"/>'); });
      if (se.dots) se.values.forEach(function (v, i) { if (v != null) s.push('<circle class="dot ' + se.cls + '" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.5"/>'); });
    });
    s.push('<line class="axis" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>');
    for (var j = 0; j < 12; j++) s.push('<rect class="hit" data-i="' + j + '" x="' + (ml + j * (W - ml - mr) / 12).toFixed(1) + '" y="' + mt + '" width="' + ((W - ml - mr) / 12).toFixed(1) + '" height="' + (H - mt - mb) + '"/>');
    s.push('</svg>');
    box.innerHTML = s.join('');
    if (opts.readout) {
      var ro = opts.readout, base = ro.innerHTML;
      box.querySelectorAll('.hit').forEach(function (h) {
        var i = +h.getAttribute('data-i');
        h.addEventListener('mouseenter', function () { ro.innerHTML = opts.describe(i); });
        h.addEventListener('mouseleave', function () { ro.innerHTML = base; });
      });
    }
  }

  /* =====================================================================
     REGIONAL VIEW
     ===================================================================== */
  var rs = { metric: 'varroa', period: 'fall', year: 'all', type: 'all', style: 'hex', sel: 'US' };
  try { var sv = localStorage.getItem('hive-map-style'); if (sv === 'hex' || sv === 'shapes') rs.style = sv; } catch (e) {}
  var svg = $('mx-map'), tip = $('mx-tip'), mapCard = $('mx-mapcard');

  var breakCache = {};
  function breaks(mid) {
    var ck = [mid, rs.year, rs.type].join('|');
    if (breakCache[ck]) return breakCache[ck];
    var vals = [];
    var periods = MET[mid].winter ? ['all'] : PERIODS.slice(5).map(function (p) { return p.id; });
    REGION_KEYS.forEach(function (rk) {
      periods.forEach(function (pid) {
        var r = regionValue(rk, mid, { type: rs.type, year: rs.year, period: pid });
        if (r.v != null && r.n >= MIN_N) vals.push(r.v);
      });
    });
    vals.sort(function (a, b) { return a - b; });
    var out = [];
    if (vals.length) [0.2, 0.4, 0.6, 0.8].forEach(function (q) {
      var v = vals[Math.floor(q * (vals.length - 1))];
      v = MET[mid].unit === 'pct' ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
      if (!out.length || v > out[out.length - 1]) out.push(v);
    });
    return (breakCache[ck] = out);
  }
  function bin(mid, v) { var b = breaks(mid), i = 0; while (i < b.length && v >= b[i]) i++; return i; }
  function legendLabel(mid, v) { return MET[mid].unit === 'pct' ? Math.round(v * 100) + '%' : v.toFixed(1); }

  function regionName(k) { return k === 'US' ? 'All regions' : D.regions[k].name; }

  function drawMap() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var hex = rs.style === 'hex', ps = hex ? 5 : 8;
    var defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = '<pattern id="mx-hatch" width="' + ps + '" height="' + ps + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="' + ps + '" height="' + ps + '" fill="var(--surface)"/><line x1="0" y1="0" x2="0" y2="' + ps + '" stroke="var(--line)" stroke-width="' + ps / 2 + '"/></pattern>';
    svg.appendChild(defs);
    svg.setAttribute('class', 'lx-map ' + (hex ? 'is-hex' : 'is-shapes'));
    var geo = {};
    if (hex) {
      var r = 19, w = Math.sqrt(3) * r, vs = 1.5 * r, pad = 4;
      svg.setAttribute('viewBox', '0 0 ' + (12 * w + w / 2 + pad * 2).toFixed(1) + ' ' + (7 * vs + 2 * r + pad * 2).toFixed(1));
      HEX.forEach(function (s) {
        var cx = pad + w / 2 + s[2] * w + (s[1] % 2 ? w / 2 : 0), cy = pad + r + s[1] * vs, pts = [];
        for (var k = 0; k < 6; k++) { var a = Math.PI / 180 * (60 * k - 90); pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); }
        geo[s[0]] = { poly: pts.join(' '), cx: cx, cy: cy };
      });
    } else svg.setAttribute('viewBox', SH.viewBox.join(' '));
    var vals = {};
    REGION_KEYS.forEach(function (k) { vals[k] = regionValue(k, rs.metric, rs); });
    Object.keys(SH.states).forEach(function (code) {
      var rk = REGION_OF[code], rv = vals[rk];
      var ok = rv && rv.v != null && rv.n >= MIN_N;
      var b = ok ? bin(rs.metric, rv.v) : -1;
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'area' + (rs.sel === rk ? ' sel' : ''));
      g.setAttribute('data-code', code);
      g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.setAttribute('aria-label', NAMES[code] + ', ' + regionName(rk) + ' region: ' + (ok ? fmt(rs.metric, rv.v) : rv && rv.n ? 'too few inspections' : 'no monitoring data'));
      var shape = document.createElementNS(NS, hex ? 'polygon' : 'path');
      if (hex) { if (!geo[code]) return; shape.setAttribute('points', geo[code].poly); } else shape.setAttribute('d', SH.states[code]);
      shape.setAttribute('class', 'shape');
      shape.setAttribute('fill', ok ? 'var(--c' + b + ')' : rv && rv.n ? 'url(#mx-hatch)' : 'var(--nodata)');
      g.appendChild(shape); svg.appendChild(g);
      var t = null;
      if (hex) { t = document.createElementNS(NS, 'text'); t.setAttribute('x', geo[code].cx.toFixed(1)); t.setAttribute('y', geo[code].cy.toFixed(1)); }
      else { var bb = shape.getBBox(); if (bb.width >= 30 && bb.height >= 18) { t = document.createElementNS(NS, 'text'); t.setAttribute('x', (bb.x + bb.width / 2).toFixed(1)); t.setAttribute('y', (bb.y + bb.height / 2).toFixed(1)); } }
      if (t) { t.textContent = code; t.setAttribute('fill', b >= 3 ? 'var(--surface)' : 'var(--ink)'); g.appendChild(t); }
      g.addEventListener('mouseenter', function (e) { showTip(code, e); });
      g.addEventListener('mousemove', moveTip);
      g.addEventListener('mouseleave', function () { tip.hidden = true; });
      g.addEventListener('focus', function () { showTip(code, null, g); });
      g.addEventListener('blur', function () { tip.hidden = true; });
      g.addEventListener('click', function () { selectRegion(rk); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRegion(rk); } });
    });
    svg.querySelectorAll('.area.sel').forEach(function (n) { svg.appendChild(n); });
    var m = MET[rs.metric];
    $('mx-maptitle').textContent = m.label + ' · ' + (m.winter ? 'Fall to spring' : PER[rs.period].label);
    var b = breaks(rs.metric), items = [];
    for (var i = 0; i <= b.length; i++) {
      var lab = i === 0 ? 'Under ' + legendLabel(rs.metric, b[0]) : i === b.length ? legendLabel(rs.metric, b[i - 1]) + ' or more' : legendLabel(rs.metric, b[i - 1]) + '–' + legendLabel(rs.metric, b[i]);
      items.push('<span><i style="background:var(--c' + i + ')"></i>' + lab + '</span>');
    }
    items.push('<span><i class="hatch"></i>Fewer than ' + MIN_N + ' inspections</span>');
    items.push('<span><i style="background:var(--nodata)"></i>No data yet</span>');
    $('mx-legend').innerHTML = items.join('');
    var notes = [];
    if (m.group === 'Disease signs') notes.push('<strong>Field observations:</strong> signs noted during inspections, not lab-confirmed diagnoses.');
    if (m.winter) notes.push('<strong>Winter loss</strong> follows colonies alive in fall to their first inspection the next spring, so the season filter doesn’t apply.');
    $('mx-callout').innerHTML = notes.join(' ');
    $('mx-callout').hidden = !notes.length;
  }
  function showTip(code, e, el) {
    var rk = REGION_OF[code], rv = regionValue(rk, rs.metric, rs);
    tip.innerHTML = '<strong>' + esc(regionName(rk)) + '</strong><span>' + (rv.n >= MIN_N ? fmt(rs.metric, rv.v) + ' · ' + rv.n.toLocaleString('en-US') + (MET[rs.metric].winter ? ' colonies' : ' inspections') : rv.n ? 'Too few inspections' : 'No data yet') + '</span>';
    tip.hidden = false;
    if (e) moveTip(e);
    else if (el) { var cr = mapCard.getBoundingClientRect(), er = el.getBoundingClientRect(); place(er.left + er.width / 2 - cr.left, er.top - cr.top); }
  }
  function moveTip(e) { var cr = mapCard.getBoundingClientRect(); place(e.clientX - cr.left, e.clientY - cr.top - 8); }
  function place(x, y) { var w = tip.offsetWidth, cw = mapCard.clientWidth; tip.style.left = Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)) + 'px'; tip.style.top = y + 'px'; }

  function renderRegionPanel() {
    var rk = rs.sel, m = MET[rs.metric], panel = $('mx-panel');
    var recs = filterRecs(REF, { region: rk, type: rs.type, year: rs.year, period: m.winter ? null : rs.period });
    var main = regionValue(rk, rs.metric, rs), nat = regionValue('US', rs.metric, rs);
    var ops = {}, cols = {}; recs.forEach(function (r) { ops[r.op] = 1; cols[r.op + r.apiary + r.colony] = 1; });
    var nOps = Object.keys(ops).length, nCols = Object.keys(cols).length;
    var h = [];
    h.push('<div class="lx-panel-head"><h2>' + esc(regionName(rk)) + '</h2>' + (rk !== 'US' ? '<button type="button" class="lx-link" id="mx-to-us">View all regions</button>' : '') + '</div>');
    h.push('<p class="lx-sub">' + (rk === 'US' ? 'All states with monitoring data' : D.regions[rk].states.map(function (s) { return s; }).join(', ')) + '</p>');
    h.push('<p class="lx-sub" style="margin-top:-8px">' + (m.winter ? 'Fall to spring' : PER[rs.period].label) + ' · ' + (rs.year === 'all' ? 'All years' : rs.year) + ' · ' + (rs.type === 'all' ? 'All operation types' : rs.type + ' operations') + '</p>');
    if (!recs.length) {
      h.push('<p class="lx-notice">No monitoring data from this region yet. Inspectors, researchers, and beekeepers here can <a href="contribute.html">contribute data</a>.</p>');
      panel.innerHTML = h.join(''); wirePanel(); return;
    }
    var ok = main.n >= MIN_N;
    var cmp = '';
    if (rk !== 'US' && ok && nat.v != null) {
      var d = main.v - nat.v;
      cmp = MET[rs.metric].unit === 'pct' ? Math.abs(d * 100).toFixed(1) + ' points ' + (d >= 0 ? 'above' : 'below') + ' all regions (' + fmt(rs.metric, nat.v) + ')'
        : Math.abs(d).toFixed(1) + ' ' + (d >= 0 ? 'above' : 'below') + ' all regions (' + fmt(rs.metric, nat.v) + ')';
    }
    h.push('<div class="lx-hero"><p class="lx-k">' + m.label + '</p><p class="lx-big">' + (ok ? fmt(rs.metric, main.v) : '<span class="lx-na">Fewer than ' + MIN_N + ' ' + (m.winter ? 'colonies' : 'inspections') + '</span>') + '</p>' +
      (cmp ? '<p class="lx-cmp">' + cmp + '</p>' : '') +
      '<p class="lx-rank">' + (m.winter ? main.n.toLocaleString('en-US') + ' colonies followed through winter' : main.n.toLocaleString('en-US') + ' inspections') + ' · ' + nCols + ' colonies · ' + nOps + ' operations</p></div>');
    var tiles = ['varroa', 'over3', 'fob', 'queenright', 'disease', 'winter'].filter(function (x) { return x !== rs.metric; }).slice(0, 3);
    h.push('<div class="lx-tiles">' + tiles.map(function (t) {
      var r = regionValue(rk, t, rs);
      return '<div class="lx-tile"><p class="lx-k">' + MET[t].short + '</p><p class="lx-v">' + (r.n >= MIN_N ? fmt(t, r.v) : '<span class="lx-na">n/a</span>') + '</p></div>';
    }).join('') + '</div>');
    // Queen status
    var alive = recs.filter(function (r) { return r.alive && r.queen; }), q = {};
    alive.forEach(function (r) { q[r.queen] = (q[r.queen] || 0) + 1; });
    var qOrder = [['seen', 'Queen seen'], ['eggs_only', 'Eggs, queen not seen'], ['virgin', 'Virgin queen'], ['queenless', 'Queenless'], ['drone_layer', 'Drone layer']];
    if (alive.length) {
      h.push('<div class="lx-block"><h3 class="lx-h3">Queen status</h3><div class="mx-stack">' + qOrder.map(function (o, i) { return q[o[0]] ?
        '<span class="q' + i + '" style="width:' + (q[o[0]] / alive.length * 100).toFixed(2) + '%" title="' + o[1] + ' ' + Math.round(q[o[0]] / alive.length * 100) + '%"></span>' : ''; }).join('') +
        '</div><ul class="mx-keys">' + qOrder.map(function (o, i) { return q[o[0]] ?
        '<li><i class="q' + i + '"></i>' + o[1] + ' <b>' + fmtShare(q[o[0]] / alive.length) + '</b></li>' : ''; }).join('') + '</ul></div>');
    }
    // Treatments
    var tr = {}, nt = 0;
    recs.forEach(function (r) { if (r.alive && r.treat && r.treat !== 'none') { tr[r.treat] = (tr[r.treat] || 0) + 1; nt++; } });
    if (nt) {
      var names = { oxalic: 'Oxalic acid', amitraz: 'Amitraz', formic: 'Formic acid', thymol: 'Thymol', hop_acids: 'Hop beta acids', other: 'Other' };
      var keys = Object.keys(tr).sort(function (a, b) { return tr[b] - tr[a]; });
      h.push('<div class="lx-block"><h3 class="lx-h3">Varroa treatments recorded</h3><p class="lx-small">' + nt.toLocaleString('en-US') + ' treatments, as a share of all treatments in this selection.</p><ul class="lx-stress">' +
        keys.map(function (k) { return '<li><span class="lx-sname">' + names[k] + '</span><span class="lx-track"><span class="lx-fill" style="width:' + (tr[k] / nt * 100).toFixed(1) + '%"></span></span><span class="lx-sval">' + Math.round(tr[k] / nt * 100) + '%</span></li>'; }).join('') + '</ul></div>');
    }
    panel.innerHTML = h.join('');
    wirePanel();
  }
  function fmtShare(x) { var p = x * 100; return (p > 0 && p < 1 ? '<1' : Math.round(p)) + '%'; }
  function wirePanel() { var b = $('mx-to-us'); if (b) b.addEventListener('click', function () { selectRegion('US'); }); }

  function renderSeasonal() {
    var m = MET[rs.metric], box = $('mx-season');
    if (m.winter) { box.innerHTML = '<p class="lx-small">Winter loss is measured once per winter, so it has no monthly pattern. Pick another measure to see the seasonal curve.</p>'; $('mx-season-read').textContent = ''; return; }
    var series = [], others = [];
    function monthly(rk) {
      return MONTHS.map(function (_, i) { var r = regionValue(rk, rs.metric, { type: rs.type, year: rs.year, period: 'm' + (i + 1) }); return r.n >= MIN_N ? r.v : null; });
    }
    REGION_KEYS.forEach(function (rk) { if (rk !== rs.sel) { var v = monthly(rk); if (v.some(function (x) { return x != null; })) others.push({ values: v, cls: 'other' }); } });
    var nat = { values: monthly('US'), cls: 'nat', label: 'All regions' };
    series = others.concat([nat]);
    if (rs.sel !== 'US') series.push({ values: monthly(rs.sel), cls: 'sel', dots: true, label: regionName(rs.sel) });
    $('mx-season-title').textContent = m.short + ' by month';
    var ro = $('mx-season-read');
    ro.innerHTML = (rs.sel !== 'US' ? '<span class="mx-key sel"></span>' + esc(regionName(rs.sel)) + ' ' : '') + '<span class="mx-key nat"></span>All regions <span class="mx-key other"></span>Other regions. Hover a month for values.';
    monthChart(box, rs.metric, series, {
      threshold: rs.metric === 'varroa' ? 3 : null, thresholdLabel: '3 mites per 100 bees',
      aria: m.short + ' by month for each region', readout: ro,
      describe: function (i) {
        var a = rs.sel !== 'US' ? series[series.length - 1].values[i] : null, b = nat.values[i];
        return '<strong>' + MONTHS_LONG[i] + ':</strong> ' + (rs.sel !== 'US' ? esc(regionName(rs.sel)) + ' ' + fmt(rs.metric, a) + ', ' : '') + 'all regions ' + fmt(rs.metric, b);
      }
    });
  }

  function renderRanked() {
    var m = MET[rs.metric], rows = [];
    REGION_KEYS.forEach(function (rk) { var r = regionValue(rk, rs.metric, rs); if (r.n) rows.push({ rk: rk, v: r.v, n: r.n }); });
    rows.sort(function (a, b) { return (b.n >= MIN_N) - (a.n >= MIN_N) || b.v - a.v; });
    var max = 0; rows.forEach(function (r) { if (r.n >= MIN_N) max = Math.max(max, r.v); });
    $('mx-rank-title').textContent = 'Regions compared';
    $('mx-rank-note').textContent = (m.winter ? 'Fall to spring' : PER[rs.period].label) + '. Highest first' + (m.better ? '; ' + m.better + ' is better' : '') + '. Click a region to select it.';
    $('mx-rank').innerHTML = rows.map(function (r) {
      var ok = r.n >= MIN_N;
      return '<li class="' + (r.rk === rs.sel ? 'on' : '') + '" data-rk="' + r.rk + '" tabindex="0" role="button"><span class="lx-sname">' + esc(D.regions[r.rk].name) + '</span>' +
        '<span class="lx-track"><span class="lx-fill" style="width:' + (ok && max ? r.v / max * 100 : 0).toFixed(1) + '%"></span></span>' +
        '<span class="lx-sval">' + (ok ? fmt(rs.metric, r.v) : 'few') + '</span><span class="mx-n">' + r.n.toLocaleString('en-US') + '</span></li>';
    }).join('');
    $('mx-rank').querySelectorAll('li').forEach(function (li) {
      var go = function () { selectRegion(li.getAttribute('data-rk')); };
      li.addEventListener('click', go);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  function selectRegion(rk) { rs.sel = rk; renderRegional(); }
  function renderRegional() { drawMap(); renderRegionPanel(); renderSeasonal(); renderRanked(); }

  metricOptions($('mx-metric')); $('mx-metric').value = rs.metric;
  periodOptions($('mx-period')); $('mx-period').value = rs.period;
  $('mx-year').innerHTML = '<option value="all">All years</option>' + YEARS.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
  $('mx-type').innerHTML = '<option value="all">All operation types</option>' + TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');
  $('mx-metric').addEventListener('change', function () { rs.metric = this.value; $('mx-period').disabled = !!MET[rs.metric].winter; renderRegional(); });
  $('mx-period').addEventListener('change', function () { rs.period = this.value; renderRegional(); });
  $('mx-year').addEventListener('change', function () { rs.year = this.value; renderRegional(); });
  $('mx-type').addEventListener('change', function () { rs.type = this.value; renderRegional(); });
  document.querySelectorAll('[data-seg="mx-style"] button').forEach(function (b) {
    b.addEventListener('click', function () { rs.style = b.getAttribute('data-v'); setSeg('mx-style', rs.style); try { localStorage.setItem('hive-map-style', rs.style); } catch (e) {} drawMap(); });
  });
  setSeg('mx-style', rs.style);

  /* =====================================================================
     YOUR REPORT: import and compare
     ===================================================================== */
  var my = { recs: null, ops: [], op: null, compare: 'auto', used: 'region_type', year: 'all', metric: 'varroa', file: '', issues: null, typeOverride: null };

  function parseCSV(text) {
    var rows = [], row = [], f = '', q = false, i = 0;
    text = text.replace(/^﻿/, '');
    while (i < text.length) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
      i++;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
  }
  var ALIAS = { date: 'inspection_date', inspected: 'inspection_date', inspection: 'inspection_date', mites: 'varroa_mites', mite_count: 'varroa_mites', varroa: 'varroa_mites',
    frames: 'frames_of_bees', fob: 'frames_of_bees', bee_frames: 'frames_of_bees', brood: 'brood_frames', brood_area: 'brood_frames', pattern: 'brood_pattern',
    queen: 'queen_status', type: 'operation_type', operation: 'operation_id', operator: 'operation_id', colony: 'colony_id', hive: 'colony_id', hive_id: 'colony_id',
    apiary: 'apiary_id', yard: 'apiary_id', dwv: 'deformed_wings', shb: 'small_hive_beetle', chalk: 'chalkbrood', alive: 'colony_alive', status: 'colony_alive',
    mites_per_100: 'varroa_per_100', varroa_per100: 'varroa_per_100', bees: 'bees_sampled', method: 'varroa_method', feeding: 'fed', treatment_applied: 'treatment' };
  var KNOWN = ['operation_id', 'operation_type', 'submitted_by', 'state', 'apiary_id', 'colony_id', 'inspection_date', 'colony_alive', 'frames_of_bees', 'brood_frames', 'brood_pattern', 'queen_status',
    'varroa_mites', 'bees_sampled', 'varroa_method', 'varroa_per_100', 'afb', 'efb', 'chalkbrood', 'sacbrood', 'deformed_wings', 'small_hive_beetle', 'treatment', 'fed', 'requeened', 'notes'];
  function normHead(h) { var k = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); return ALIAS[k] || k; }
  function yes(v) { v = String(v || '').trim().toLowerCase(); return ['yes', 'y', 'true', '1', 'x', 'present'].indexOf(v) >= 0; }
  function num(v) { v = String(v == null ? '' : v).trim(); if (v === '') return null; var n = Number(v); return isNaN(n) ? NaN : n; }
  function parseDate(s) {
    s = String(s || '').trim(); var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[1] - 1, +m[2]); }
    return null;
  }
  function stateCode(s) {
    s = String(s || '').trim(); if (!s) return null;
    var up = s.toUpperCase(); if (NAMES[up]) return up;
    var hit = Object.keys(NAMES).filter(function (k) { return NAMES[k].toLowerCase() === s.toLowerCase(); })[0];
    return hit || null;
  }
  function queenCode(s) {
    s = String(s || '').trim().toLowerCase(); if (!s) return null;
    if (/drone|laying worker/.test(s)) return 'drone_layer';
    if (/queenless|no queen|qless|missing/.test(s)) return 'queenless';
    if (/virgin/.test(s)) return 'virgin';
    if (/egg/.test(s)) return 'eggs_only';
    if (/seen|right|present|yes|mated/.test(s)) return 'seen';
    return null;
  }
  function typeName(s) {
    s = String(s || '').trim().toLowerCase();
    if (/hobby|backyard/.test(s)) return 'Hobbyist';
    if (/side/.test(s)) return 'Sideline';
    if (/comm/.test(s)) return 'Commercial';
    return null;
  }
  var TREAT_ALIAS = { oxalic: 'oxalic', 'oxalic acid': 'oxalic', oa: 'oxalic', amitraz: 'amitraz', apivar: 'amitraz', formic: 'formic', 'formic acid': 'formic', mapo: 'formic', formipro: 'formic',
    thymol: 'thymol', apiguard: 'thymol', apilife: 'thymol', hop_acids: 'hop_acids', hopguard: 'hop_acids', 'hop beta acids': 'hop_acids', none: 'none', no: 'none', '': 'none' };

  function importCSV(text, fileName) {
    var rows = parseCSV(text), issues = { skipped: {}, unknownCols: [], warnings: [] };
    if (rows.length < 2) return fail('The file has no data rows. Add your inspections below the header row (on the Inspections tab if you\u2019re using the Excel template).');
    var head = rows[0].map(normHead);
    var idx = {}; head.forEach(function (h, i) { if (KNOWN.indexOf(h) >= 0 && idx[h] == null) idx[h] = i; else if (KNOWN.indexOf(h) < 0 && h) issues.unknownCols.push(rows[0][i].trim()); });
    var missing = ['inspection_date', 'state', 'colony_id'].filter(function (c) { return idx[c] == null; });
    if (missing.length) return fail('The file is missing required columns: ' + missing.join(', ') + '. Use the template column names, or copy the header row from the template.');
    if (idx.varroa_mites == null && idx.varroa_per_100 == null) issues.warnings.push('No Varroa column found, so mite comparisons are left out.');
    function g(r, c) { return idx[c] == null ? '' : (r[idx[c]] || '').trim(); }
    var recs = [];
    function skip(reason) { issues.skipped[reason] = (issues.skipped[reason] || 0) + 1; }
    rows.slice(1).forEach(function (r) {
      var d = parseDate(g(r, 'inspection_date')); if (!d || isNaN(d)) return skip('Date not recognized (use YYYY-MM-DD)');
      var st = stateCode(g(r, 'state')); if (!st) return skip('State not recognized');
      var col = g(r, 'colony_id'); if (!col) return skip('Missing colony ID');
      var aliveRaw = g(r, 'colony_alive');
      var rec = { op: g(r, 'operation_id') || 'My operation', type: typeName(g(r, 'operation_type')), sub: g(r, 'submitted_by'), state: st, region: REGION_OF[st],
        apiary: g(r, 'apiary_id') || 'A1', colony: col, date: d, y: d.getFullYear(), m: d.getMonth() + 1, alive: aliveRaw === '' ? true : yes(aliveRaw) || /alive|live/i.test(aliveRaw) };
      if (rec.alive) {
        var fob = num(g(r, 'frames_of_bees')), brood = num(g(r, 'brood_frames')), pat = num(g(r, 'brood_pattern'));
        rec.fob = fob != null && !isNaN(fob) && fob >= 0 && fob <= 40 ? fob : null;
        rec.brood = brood != null && !isNaN(brood) && brood >= 0 && brood <= 30 ? brood : null;
        rec.pat = pat != null && pat >= 1 && pat <= 5 ? Math.round(pat) : null;
        rec.queen = queenCode(g(r, 'queen_status'));
        var method = g(r, 'varroa_method').toLowerCase(), per = num(g(r, 'varroa_per_100')), mites = num(g(r, 'varroa_mites')), bees = num(g(r, 'bees_sampled'));
        if (/sticky|board|drop/.test(method)) rec.v = null;
        else if (per != null && !isNaN(per)) rec.v = per;
        else if (mites != null && !isNaN(mites)) rec.v = mites / (bees && bees > 0 ? bees : 300) * 100;
        else rec.v = null;
        if (rec.v != null && (rec.v < 0 || rec.v > 100)) { rec.v = null; skip('Varroa value out of range (kept the rest of the row)'); }
        ['afb', 'efb', 'chalkbrood', 'sacbrood', 'deformed_wings', 'small_hive_beetle'].forEach(function (f) { rec[f] = yes(g(r, f)); });
        var t = g(r, 'treatment').toLowerCase(); rec.treat = TREAT_ALIAS[t] || (t ? 'other' : 'none');
        var fd = g(r, 'fed').toLowerCase(); rec.fed = !fd || fd === 'no' || fd === 'none' ? 'none' : fd;
        rec.req = yes(g(r, 'requeened'));
      }
      recs.push(rec);
    });
    if (!recs.length) return fail('None of the rows could be read. ' + Object.keys(issues.skipped).map(function (k) { return k + ' (' + issues.skipped[k] + ' rows)'; }).join('; '));
    my.recs = recs; my.file = fileName; my.issues = issues; my.typeOverride = null;
    var ops = {}; recs.forEach(function (r) { (ops[r.op] = ops[r.op] || { id: r.op, n: 0, type: r.type, state: r.state, region: r.region }).n++; });
    my.ops = Object.keys(ops).map(function (k) { return ops[k]; }).sort(function (a, b) { return b.n - a.n; });
    my.op = my.ops[0].id;
    $('mx-upload-error').hidden = true;
    renderReport();
    return true;
    function fail(msg) { var e = $('mx-upload-error'); e.textContent = msg; e.hidden = false; return false; }
  }

  // Peers: reference operations matching the comparison group, excluding the user's own ID
  function myOp() { return my.ops.filter(function (o) { return o.id === my.op; })[0]; }
  function myRecs() { return my.recs.filter(function (r) { return r.op === my.op; }); }
  function myType() { return my.typeOverride || myOp().type; }
  function peersFor(mode) {
    var o = myOp(), t = myType();
    return Object.keys(REF_BY_OP).map(function (k) { return REF_BY_OP[k]; }).filter(function (p) {
      if (p.id === o.id) return false;
      if ((mode === 'region_type' || mode === 'region') && p.region !== o.region) return false;
      if ((mode === 'region_type' || mode === 'type') && t && p.type !== t) return false;
      return true;
    });
  }
  // 'auto' uses the narrowest group with enough operations
  function peerOps() {
    if (my.compare !== 'auto') { my.used = my.compare; return peersFor(my.compare); }
    var order = ['region_type', 'region', 'type', 'all'];
    for (var i = 0; i < order.length; i++) { var p = peersFor(order[i]); if (p.length >= MIN_PEERS || i === order.length - 1) { my.used = order[i]; return p; } }
  }
  function compareLabel() {
    var o = myOp(), t = myType(), rn = o.region ? D.regions[o.region].name : 'your region';
    return { region_type: t ? t.toLowerCase() + ' operations in the ' + rn : 'operations in the ' + rn, region: 'operations of any type in the ' + rn, type: t ? t.toLowerCase() + ' operations in every region' : 'operations in every region', all: 'operations in every region' }[my.used];
  }
  var REPORT_METRICS = [
    { id: 'varroa', period: 'fall', note: 'Fall average' },
    { id: 'over3', period: 'all', note: 'All inspections' },
    { id: 'fob', period: 'summer', note: 'Summer average' },
    { id: 'queenright', period: 'all', note: 'All inspections' },
    { id: 'pattern', period: 'all', note: 'All inspections' },
    { id: 'disease', period: 'all', note: 'All inspections' },
    { id: 'winter', period: null, note: 'Colonies alive in fall' }
  ];
  function opValue(recs, mid, period) {
    var m = MET[mid];
    var f = filterRecs(recs, { year: m.winter ? 'all' : my.year, period: m.winter ? null : period });
    var r = agg(f, mid);
    var minN = m.winter ? 3 : 5;
    return r.n >= minN ? r : { v: null, n: r.n };
  }
  function quantile(sorted, q) { if (!sorted.length) return null; var p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); }

  function renderReport() {
    var empty = !my.recs;
    $('mx-upload').hidden = !empty;
    $('mx-report').hidden = empty;
    $('mx-upload-again').hidden = empty;
    if (empty) return;
    var o = myOp(), mine = myRecs(), peers = peerOps();
    // controls
    var opSel = $('mx-op');
    opSel.innerHTML = my.ops.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.id) + ' (' + x.n + ' rows)</option>'; }).join('');
    opSel.value = my.op; $('mx-op-wrap').hidden = my.ops.length < 2;
    $('mx-type-wrap').hidden = !!o.type;
    $('mx-compare').value = my.compare; $('mx-ryear').value = my.year;
    // header
    var cols = {}, dates = mine.map(function (r) { cols[r.apiary + '|' + r.colony] = 1; return r.date; }).sort(function (a, b) { return a - b; });
    var fmtD = function (d) { return MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
    $('mx-me').innerHTML = '<h2>' + esc(o.id) + '</h2><p class="lx-sub">' + esc(NAMES[o.state] || o.state) + ' · ' + (o.region ? esc(D.regions[o.region].name) + ' region' : 'No region') + ' · ' + (myType() ? myType() : 'Operation type not given') +
      '</p><p class="mx-mefacts"><span><b>' + Object.keys(cols).length + '</b> colonies</span><span><b>' + mine.length.toLocaleString('en-US') + '</b> inspections</span><span><b>' + fmtD(dates[0]) + '–' + fmtD(dates[dates.length - 1]) + '</b></span><span>Compared with <b>' + peers.length + '</b> ' + esc(compareLabel()) + '</span></p>';
    var few = peers.length < MIN_PEERS, fell = my.compare === 'auto' && my.used !== 'region_type';
    var t = myType(), rn = o.region ? D.regions[o.region].name : 'your region';
    $('mx-fewpeers').hidden = !(few || fell);
    $('mx-fewpeers').innerHTML = few ? 'Only ' + peers.length + ' operation' + (peers.length === 1 ? '' : 's') + ' match this comparison group, too few for a fair comparison. Try a broader group in <b>Compare with</b>.' :
      fell ? 'There aren\u2019t ' + MIN_PEERS + ' or more ' + (t ? t.toLowerCase() + ' ' : '') + 'operations in the ' + esc(rn) + ' yet, so you\u2019re compared with ' + esc(compareLabel()) + '.' : '';
    // compare cards
    $('mx-cards').innerHTML = REPORT_METRICS.map(function (rm) {
      var m = MET[rm.id], you = opValue(mine, rm.id, rm.period);
      var pv = peers.map(function (p) { return opValue(p.recs, rm.id, rm.period).v; }).filter(function (v) { return v != null; }).sort(function (a, b) { return a - b; });
      var med = quantile(pv, 0.5), lo = quantile(pv, 0.25), hi = quantile(pv, 0.75);
      var body;
      if (you.v == null) body = '<p class="mx-none">Not enough of your inspections for this measure' + (rm.id === 'winter' ? ' (needs colonies inspected in fall and again the next spring).' : '.') + '</p>';
      else if (pv.length < MIN_PEERS) body = '<p class="mx-none">Not enough comparable operations.</p>';
      else {
        var below = pv.filter(function (v) { return v < you.v; }).length, ties = pv.filter(function (v) { return v === you.v; }).length;
        var pctBelow = (below + ties / 2) / pv.length;
        var better = m.better === 'lower' ? 1 - pctBelow : pctBelow;
        var cls = better >= 0.75 ? 'good' : better >= 0.25 ? 'mid' : 'warn';
        var word = better >= 0.75 ? 'Better than most' : better >= 0.25 ? 'Typical' : 'Worse than most';
        var mx = Math.max(pv[pv.length - 1], you.v) * 1.08 || 1;
        var X = function (v) { return (v / mx * 100).toFixed(2) + '%'; };
        body = '<div class="mx-strip" aria-hidden="true"><span class="mx-iqr" style="left:' + X(lo) + ';width:calc(' + X(hi) + ' - ' + X(lo) + ')"></span><span class="mx-med" style="left:' + X(med) + '"></span>' +
          pv.map(function (v) { return '<i style="left:' + X(v) + '"></i>'; }).join('') + '<b class="mx-you ' + cls + '" style="left:' + X(you.v) + '"></b></div>' +
          '<p class="mx-verdict"><span class="mx-chip ' + cls + '">' + word + '</span> ' + (pv.length < 20 ? 'Better than ' + Math.round(better * pv.length) + ' of ' + pv.length + ' comparable operations' : 'Better than ' + Math.round(better * 100) + '% of ' + pv.length + ' comparable operations') + '</p>';
      }
      return '<div class="mx-card"><div class="mx-cardtop"><div><p class="lx-k">' + m.label + '</p><p class="mx-scope">' + rm.note + (m.better ? ' · ' + (m.better === 'lower' ? 'lower' : 'higher') + ' is better' : '') + '</p></div></div>' +
        '<div class="mx-vals"><div><span>You</span><b>' + fmt(rm.id, you.v) + '</b></div><div><span>Typical peer</span><b>' + (pv.length >= MIN_PEERS ? fmt(rm.id, med) : '–') + '</b></div></div>' + body + '</div>';
    }).join('');
    renderMyChart(mine, peers);
    renderCheck(mine);
    renderTreat(mine, peers);
    renderDataCheck(mine);
  }

  function renderMyChart(mine, peers) {
    var mid = my.metric;
    $('mx-mychart-title').textContent = MET[mid].short + ' by month, you and comparable operations';
    var youV = MONTHS.map(function (_, i) { var r = agg(filterRecs(mine, { year: my.year, period: 'm' + (i + 1) }), mid); return r.n >= 3 ? r.v : null; });
    var med = [], lo = [], hi = [], counts = [];
    for (var i = 0; i < 12; i++) {
      var pv = peers.map(function (p) { var r = agg(filterRecs(p.recs, { year: my.year, period: 'm' + (i + 1) }), mid); return r.n >= 3 ? r.v : null; }).filter(function (v) { return v != null; }).sort(function (a, b) { return a - b; });
      counts.push(pv.length);
      var ok = pv.length >= MIN_PEERS;
      med.push(ok ? quantile(pv, 0.5) : null); lo.push(ok ? quantile(pv, 0.25) : null); hi.push(ok ? quantile(pv, 0.75) : null);
    }
    var ro = $('mx-mychart-read');
    ro.innerHTML = '<span class="mx-key sel"></span>You <span class="mx-key nat"></span>Typical peer (median) <span class="mx-key band"></span>Middle half of peers. Hover a month for values.';
    monthChart($('mx-mychart'), mid, [{ values: med, cls: 'nat' }, { values: youV, cls: 'sel', dots: true }], {
      band: { lo: lo, hi: hi }, threshold: mid === 'varroa' ? 3 : null, thresholdLabel: '3 mites per 100 bees', readout: ro, aria: 'Your monthly values compared with peers',
      describe: function (i) { return '<strong>' + MONTHS_LONG[i] + ':</strong> you ' + fmt(mid, youV[i]) + ', typical peer ' + fmt(mid, med[i]) + (lo[i] != null ? ' (middle half ' + fmt(mid, lo[i]) + '–' + fmt(mid, hi[i]) + ', ' + counts[i] + ' operations)' : ''); }
    });
  }

  function renderCheck(mine) {
    var latest = {};
    mine.forEach(function (r) { var k = r.apiary + '|' + r.colony; if (!latest[k] || r.date > latest[k].date) latest[k] = r; });
    var lastDate0 = mine.reduce(function (a, r) { return r.date > a ? r.date : a; }, new Date(0));
    // dead-outs from earlier in the record are history, not something to check now
    Object.keys(latest).forEach(function (k) { if (!latest[k].alive && latest[k].date < new Date(lastDate0.getTime() - 60 * 86400000)) delete latest[k]; });
    var items = Object.keys(latest).map(function (k) {
      var r = latest[k], flags = [], sev = 0;
      if (!r.alive) { flags.push(['warn', 'Dead out']); sev += 1; }
      else {
        if (r.afb) { flags.push(['bad', 'AFB signs: contact your state apiarist']); sev += 10; }
        if (r.efb) { flags.push(['bad', 'EFB signs']); sev += 6; }
        if (r.v != null && r.v >= 3) { flags.push([r.v >= 6 ? 'bad' : 'warn', fmt('varroa', r.v) + ' mites per 100 bees']); sev += r.v >= 6 ? 5 : 3; }
        if (r.queen === 'queenless' || r.queen === 'drone_layer') { flags.push(['warn', r.queen === 'queenless' ? 'Queenless' : 'Drone layer']); sev += 4; }
        if (r.deformed_wings) { flags.push(['warn', 'Deformed wings']); sev += 2; }
        if (r.pat != null && r.pat <= 2) { flags.push(['warn', 'Spotty brood']); sev += 2; }
        if (r.chalkbrood || r.sacbrood) { flags.push(['note', r.chalkbrood ? 'Chalkbrood' : 'Sacbrood']); sev += 1; }
      }
      return { r: r, flags: flags, sev: sev };
    }).filter(function (x) { return x.flags.length; }).sort(function (a, b) { return b.sev - a.sev; });
    var lastDate = mine.reduce(function (a, r) { return r.date > a ? r.date : a; }, new Date(0));
    $('mx-check-note').textContent = items.length ? items.length + ' of ' + Object.keys(latest).length + ' colonies had something flagged at their most recent inspection.' : 'Nothing was flagged at each colony’s most recent inspection.';
    $('mx-check').innerHTML = items.length ? '<table class="lx-table mx-table"><thead><tr><th>Colony</th><th>Apiary</th><th>Last inspected</th><th>Flags</th></tr></thead><tbody>' + items.map(function (x) {
      var d = x.r.date;
      return '<tr><th scope="row">' + esc(x.r.colony) + '</th><td>' + esc(x.r.apiary) + '</td><td>' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + (d < new Date(lastDate.getTime() - 60 * 86400000) ? ' <span class="mx-stale">older</span>' : '') + '</td><td class="mx-flags">' +
        x.flags.map(function (f) { return '<span class="mx-flag ' + f[0] + '">' + esc(f[1]) + '</span>'; }).join('') + '</td></tr>';
    }).join('') + '</tbody></table>' : '';
  }

  // Treatment response: mites at a treated inspection vs the next inspection 14-75 days later
  function treatResponse(recs) {
    var byCol = {}, drops = [];
    recs.forEach(function (r) { if (r.alive) (byCol[r.op + '|' + r.apiary + '|' + r.colony] = byCol[r.op + '|' + r.apiary + '|' + r.colony] || []).push(r); });
    Object.keys(byCol).forEach(function (k) {
      var l = byCol[k].sort(function (a, b) { return a.date - b.date; });
      for (var i = 0; i < l.length - 1; i++) {
        var a = l[i], b = l[i + 1], gap = (b.date - a.date) / 86400000;
        if (a.treat && a.treat !== 'none' && a.v != null && a.v >= 1 && b.v != null && gap >= 14 && gap <= 75) drops.push(1 - b.v / a.v);
      }
    });
    drops.sort(function (a, b) { return a - b; });
    return { med: quantile(drops, 0.5), n: drops.length };
  }
  function renderTreat(mine, peers) {
    var you = treatResponse(mine), all = [];
    peers.forEach(function (p) { all = all.concat(p.recs); });
    var pr = treatResponse(all);
    var used = {}; mine.forEach(function (r) { if (r.alive && r.treat && r.treat !== 'none') used[r.treat] = (used[r.treat] || 0) + 1; });
    var names = { oxalic: 'oxalic acid', amitraz: 'amitraz', formic: 'formic acid', thymol: 'thymol', hop_acids: 'hop beta acids', other: 'other products' };
    var list = Object.keys(used).sort(function (a, b) { return used[b] - used[a]; }).map(function (k) { return names[k] + ' (' + used[k] + ')'; });
    var pctTxt = function (x) { return Math.round(Math.max(-1, x) * 100) + '%'; };
    $('mx-treat').innerHTML = !list.length ? '<p class="lx-small">No Varroa treatments recorded in your file.</p>' :
      '<p>You recorded <b>' + list.length + '</b> product' + (list.length > 1 ? 's' : '') + ': ' + list.join(', ') + '.</p>' +
      (you.n >= 3 ? '<p>At the next wash after a treatment, your mite counts were down by a median of <b>' + pctTxt(you.med) + '</b> (' + you.n + ' treated colonies with a wash before and after).' +
        (pr.n >= 10 ? ' For comparable operations: <b>' + pctTxt(pr.med) + '</b>.' : '') + '</p>' :
        '<p class="lx-small">Not enough treated colonies with a wash before and after treatment to measure the drop (needs 3 or more).</p>') +
      '<p class="lx-small">Measured from a wash taken on the day of treatment to the next wash 2 to 10 weeks later. Products, timing, and brood levels all affect results, so treat this as a rough check rather than an efficacy test.</p>';
  }
  function renderDataCheck(mine) {
    var is = my.issues, skipped = Object.keys(is.skipped);
    var dead = mine.filter(function (r) { return !r.alive; }).length, washes = mine.filter(function (r) { return r.v != null; }).length;
    $('mx-datacheck').innerHTML = '<ul class="mx-dc">' +
      '<li><b>' + my.recs.length.toLocaleString('en-US') + '</b> rows read from <b>' + esc(my.file) + '</b>' + (my.ops.length > 1 ? ' (' + my.ops.length + ' operations)' : '') + '</li>' +
      '<li><b>' + washes + '</b> Varroa washes and <b>' + dead + '</b> dead-out records for ' + esc(my.op) + '</li>' +
      (skipped.length ? skipped.map(function (k) { return '<li class="warn">' + is.skipped[k] + ' row' + (is.skipped[k] > 1 ? 's' : '') + ': ' + esc(k) + '</li>'; }).join('') : '<li>No rows skipped</li>') +
      (is.unknownCols.length ? '<li class="warn">Columns not used: ' + is.unknownCols.map(esc).join(', ') + '</li>' : '') +
      is.warnings.map(function (w) { return '<li class="warn">' + esc(w) + '</li>'; }).join('') + '</ul>';
  }

  // Report controls
  metricOptions($('mx-mymetric'), ['varroa', 'over3', 'fob', 'brood', 'pattern', 'queenright', 'disease', 'deformed_wings', 'small_hive_beetle', 'treated']);
  $('mx-mymetric').value = my.metric;
  $('mx-mymetric').addEventListener('change', function () { my.metric = this.value; renderMyChart(myRecs(), peerOps()); });
  $('mx-ryear').innerHTML = '<option value="all">All years</option>' + YEARS.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
  $('mx-ryear').addEventListener('change', function () { my.year = this.value; renderReport(); });
  $('mx-compare').addEventListener('change', function () { my.compare = this.value; renderReport(); });
  $('mx-op').addEventListener('change', function () { my.op = this.value; renderReport(); });
  $('mx-mytype').innerHTML = '<option value="">Choose…</option>' + TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');
  $('mx-mytype').addEventListener('change', function () { my.typeOverride = this.value || null; renderReport(); });

  function readFile(file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { var e = $('mx-upload-error'); e.textContent = 'That file is over 20 MB. Split it into smaller files and try again.'; e.hidden = false; return; }
    var fr = new FileReader();
    if (/\.xlsx?$/i.test(file.name)) {
      // Excel: read the Inspections sheet (or the first sheet) and treat it as CSV
      if (!window.XLSX) { var e2 = $('mx-upload-error'); e2.textContent = 'Excel files need an internet connection to open here. Save the Inspections tab as CSV and try again.'; e2.hidden = false; return; }
      fr.onload = function () {
        try {
          var wb = window.XLSX.read(new Uint8Array(fr.result), { type: 'array', cellDates: true });
          var name = wb.SheetNames.filter(function (n) { return n.toLowerCase() === 'inspections'; })[0] || wb.SheetNames[0];
          importCSV(window.XLSX.utils.sheet_to_csv(wb.Sheets[name], { dateNF: 'yyyy-mm-dd', blankrows: false }), file.name + (name !== wb.SheetNames[0] || name.toLowerCase() === 'inspections' ? ' (' + name + ' sheet)' : ''));
        } catch (err) { var e3 = $('mx-upload-error'); e3.textContent = 'That Excel file couldn\u2019t be read. Try saving the Inspections tab as CSV.'; e3.hidden = false; }
      };
      fr.readAsArrayBuffer(file);
      return;
    }
    fr.onload = function () { importCSV(String(fr.result), file.name); };
    fr.onerror = function () { var e = $('mx-upload-error'); e.textContent = 'The file couldn’t be read. Try saving it again as CSV.'; e.hidden = false; };
    fr.readAsText(file);
  }
  $('mx-file').addEventListener('change', function () { readFile(this.files[0]); this.value = ''; });
  var dz = $('mx-drop');
  ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
  dz.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
  $('mx-example').addEventListener('click', function () { importCSV(D.exampleUpload, 'example file (made-up operation)'); });
  $('mx-upload-again').addEventListener('click', function () { my.recs = null; renderReport(); });
  // template header for copying
  var header = KNOWN.filter(function (k) { return k !== 'varroa_per_100'; }).join(',');
  $('mx-template').textContent = header;
  $('mx-copy-template').setAttribute('data-copy', header);
  $('mx-copy-template').addEventListener('click', function () {
    var b = this;
    try { navigator.clipboard.writeText(header).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy header row'; }, 1600); }, selectTemplate); } catch (e) { selectTemplate(); }
  });
  function selectTemplate() { var r = document.createRange(); r.selectNodeContents($('mx-template')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }

  /* ---------- Tabs ---------- */
  var TABS = [['tab-regional', 'mx-regional', 'regional'], ['tab-report', 'mx-reportpanel', 'report'], ['tab-about', 'about', 'about']];
  function showTab(name) {
    TABS.forEach(function (t) {
      var on = t[2] === name;
      $(t[0]).setAttribute('aria-selected', String(on)); $(t[0]).tabIndex = on ? 0 : -1; $(t[1]).hidden = !on;
    });
    if (name === 'regional') { drawMap(); renderSeasonal(); }
    if (name === 'report' && my.recs) renderMyChart(myRecs(), peerOps());
  }
  TABS.forEach(function (t, i) {
    $(t[0]).addEventListener('click', function () {
      showTab(t[2]);
      try { history.replaceState(null, '', t[2] === 'regional' ? location.pathname + location.search : '#' + t[2]); } catch (e) {}
    });
    $(t[0]).addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { var n = TABS[(i + d + TABS.length) % TABS.length]; $(n[0]).focus(); $(n[0]).click(); }
    });
  });
  document.querySelectorAll('[data-open-tab]').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-open-tab')); window.scrollTo({ top: document.querySelector('.lx-tabs').getBoundingClientRect().top + window.scrollY - 90 }); });
  });
  function hashTab() { var h = location.hash.slice(1); return h === 'report' ? 'report' : (h === 'about' || h.indexOf('ab-') === 0) ? 'about' : 'regional'; }
  window.addEventListener('hashchange', function () { showTab(hashTab()); });

  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (!$('mx-regional').hidden) renderSeasonal(); if (my.recs && !$('mx-reportpanel').hidden) renderMyChart(myRecs(), peerOps()); }, 200);
  });

  /* ---------- Start ---------- */
  var stats = { ops: D.ops.length, recs: REF.length };
  $('mx-demo-count').textContent = stats.ops + ' simulated operations and ' + stats.recs.toLocaleString('en-US') + ' simulated inspections';
  renderRegional();
  renderReport();
  showTab(hashTab());
})();
