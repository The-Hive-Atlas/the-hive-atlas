/* The Hive Atlas: Visitors panel at the bottom of every page.
   Reads data/visitors.json (built daily from GoatCounter by .github/workflows/visitors.yml) and shows
   total visits and visits by country with flags. Shows nothing until that file exists.
   Flags: flag-icons by Panayiotis Lipiridis (MIT), images/flags/. */
(function () {
  var foot = document.querySelector('footer .wrap');
  if (!foot || !window.fetch) return;
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/js\/visitors\.js(\?.*)?$/, '') : '';
  var I = window.I18N || {};
  var lang = I.lang || 'en';
  var T = I.T || function (s, v) { return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : s; };
  var LOC = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar', zh: 'zh-CN' }[lang] || 'en-US';
  var NUMLOC = lang === 'ar' ? 'en-US' : LOC;   // the rest of the site uses Western digits in Arabic
  var MAX = 32;   // countries shown

  function num(n) { return Number(n).toLocaleString(NUMLOC); }
  function day(s) {
    var d = new Date(s.length === 10 ? s + 'T12:00:00Z' : s);
    try { return d.toLocaleDateString(LOC, { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' }); } catch (e) { return s.slice(0, 10); }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var names = null;
  try { names = new Intl.DisplayNames([LOC], { type: 'region' }); } catch (e) {}
  function country(cc) { try { return (names && names.of(cc)) || cc; } catch (e) { return cc; } }

  function render(d) {
    if (!d || !d.countries || !d.countries.length) return;
    var rows = d.countries.slice(0, MAX);
    var box = document.createElement('section');
    box.className = 'visitors';
    box.setAttribute('aria-label', T('Visitors'));
    box.innerHTML =
      '<div class="visitors-head"><h2>' + esc(T('Visitors')) + '</h2>' +
      '<p>' + esc(T('Visits by country since {d}', { d: day(d.since) })) + '</p></div>' +
      '<ul class="visitors-grid">' + rows.map(function (r) {
        var cc = r[0], n = r[1], nm = country(cc);
        return '<li title="' + esc(nm + ': ' + num(n)) + '"><img src="' + base + 'images/flags/' + cc.toLowerCase() + '.svg" width="21" height="16" alt="' + esc(nm) + '" loading="lazy" decoding="async">' +
          '<span class="cc">' + esc(cc) + '</span><b>' + num(n) + '</b></li>';
      }).join('') + '</ul>' +
      '<p class="visitors-foot">' + esc(T('Total visits: {n}', { n: num(d.pageviews || 0) })) + ' · ' +
      esc(T('Countries: {n}', { n: num(d.countries.length) })) + ' · ' + esc(T('Updated {d}', { d: day(d.updated) })) + ' · ' +
      '<a href="https://www.goatcounter.com" target="_blank" rel="noopener">' + esc(T('Counted with GoatCounter')) + '</a></p>';
    // a broken flag image falls back to the country code alone
    box.querySelectorAll('img').forEach(function (img) { img.addEventListener('error', function () { img.remove(); }); });
    foot.insertBefore(box, foot.firstChild);
  }

  // ask for a fresh copy once a day, so the browser cache never hides the daily update for long
  var stamp = new Date().toISOString().slice(0, 10);
  fetch(base + 'data/visitors.json?d=' + stamp).then(function (r) { return r.ok ? r.json() : null; }).then(render, function () {});
})();
