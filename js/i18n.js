/* The Hive Atlas: page languages (English, Français, Español, العربية).
   Load in <head> on every page, before the stylesheet-dependent layout paints:
     <script src="js/i18n.js?v=..."></script>
   and call  I18N.apply();  right after </footer>, before the page's own scripts.
   English is the source text in the HTML. For other languages this file loads js/lang/<code>.js
   (window.HIVE_LANG = { static, js, names, units }) and replaces matching English text.
   Text not in the dictionary simply stays in English, so pages never break. */
(function () {
  var LANGS = [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['ar', 'العربية']];
  var CODES = LANGS.map(function (x) { return x[0]; });
  var VERSION = '20261104a';
  var L = 'en';
  // A choice made with the menu wins (one-time, survives the reload), then ?lang=, then the last choice on this device
  var picked = null;
  try { picked = sessionStorage.getItem('hive-lang-pick'); sessionStorage.removeItem('hive-lang-pick'); } catch (e) {}
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (picked && CODES.indexOf(picked) >= 0) L = picked;
    else if (q && CODES.indexOf(q) >= 0) L = q;
    else { var s = localStorage.getItem('hive-lang'); if (s && CODES.indexOf(s) >= 0) L = s; }
  } catch (e) {}
  try { localStorage.setItem('hive-lang', L); } catch (e) {}

  var root = document.documentElement;
  root.lang = L; root.dir = L === 'ar' ? 'rtl' : 'ltr';

  // Load the dictionary synchronously so it is ready before the page's scripts run
  if (L !== 'en') {
    var me = document.currentScript, base = me && me.src ? me.src.replace(/i18n\.js(\?.*)?$/, '') : 'js/';
    document.write('<script src="' + base + 'lang/' + L + '.js?v=' + VERSION + '"><\/script>');
  }

  function D() { return window.HIVE_LANG || {}; }
  var LOC = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'en-US' }[L];
  var PR = null; try { PR = new Intl.PluralRules(L); } catch (e) {}
  var EN_UNITS = { colony: ['colony', 'colonies'], area: ['area', 'areas'], state: ['state', 'states'], country: ['country', 'countries'],
    region: ['region', 'regions'], study: ['study', 'studies'], stateTerr: ['state or territory', 'states and territories'], sample: ['sample', 'samples'] };

  // Template text: T('Rank {r} of {of}', { r: 3, of: '12 states' })
  function T(s, v) {
    var js = D().js, o = (js && js[s]) || s;
    return v ? o.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : o;
  }
  function N(x, d) { d = d || 0; return Number(x).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function PCT(x, d) { return N(x, d) + (L === 'fr' || L === 'es' ? ' %' : '%'); }
  // Keep number ranges such as 2008–2022 in reading order inside Arabic text
  function ISO(s) { return L === 'ar' ? '⁦' + s + '⁩' : s; }
  // A count with its unit word, in the language's plural rules: P(3, 'colony')
  function P(n, u) {
    var units = D().units || {}, f = (L !== 'en' && units[u]) || EN_UNITS[u] || [u, u];
    if (Array.isArray(f)) return N(n) + ' ' + ((L === 'fr' ? n < 2 : n === 1) ? f[0] : f[1]);
    var cat = PR ? PR.select(n) : 'other';
    return (f[cat] || f.other).replace('{n}', N(n));
  }
  function NM(s) { var nm = D().names; return (nm && nm[s]) || s; }
  function lower(s) { return L === 'en' ? s.toLowerCase() : (L === 'fr' || L === 'es') ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  // Replace English text blocks and attributes that have a translation
  function translateStatic() {
    var dict = D().static || {};
    var TAGS = { P: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, LABEL: 1, BUTTON: 1, A: 1, SPAN: 1, STRONG: 1, TH: 1, TD: 1, DT: 1, DD: 1, FIGCAPTION: 1, SUMMARY: 1, OPTION: 1, CAPTION: 1, B: 1, EM: 1, SMALL: 1, DIV: 1 };
    var SKIP = { SCRIPT: 1, STYLE: 1, SVG: 1, svg: 1, INPUT: 1, TEXTAREA: 1, DATALIST: 1, TEMPLATE: 1 };
    var walk = function (el) {
      for (var i = 0; i < el.children.length; i++) {
        var c = el.children[i];
        if (SKIP[c.tagName] || c.hasAttribute('data-i18n-skip')) continue;
        var own = false;
        for (var j = 0; j < c.childNodes.length; j++) { var nd = c.childNodes[j]; if (nd.nodeType === 3 && nd.textContent.trim()) { own = true; break; } }
        if (TAGS[c.tagName] && own) { var k = c.innerHTML.replace(/\s+/g, ' ').trim(); if (dict[k] != null) c.innerHTML = dict[k]; continue; }
        walk(c);
      }
    };
    ['header', 'main', 'footer'].forEach(function (s) { var e = document.querySelector(s); if (e) walk(e); });
    ['aria-label', 'placeholder', 'title', 'alt'].forEach(function (a) {
      document.querySelectorAll('[' + a + ']').forEach(function (e) { var v = dict[e.getAttribute(a)]; if (v != null) e.setAttribute(a, v); });
    });
    if (dict[document.title] != null) document.title = dict[document.title];
    var md = document.querySelector('meta[name="description"]');
    if (md && dict[md.content] != null) md.content = dict[md.content];
  }

  // The Language menu in the site header
  function addMenu() {
    var head = document.querySelector('.site-header .wrap');
    if (!head || document.getElementById('lang-select')) return;
    var lab = document.createElement('label');
    lab.className = 'lang-menu';
    lab.innerHTML = '<svg class="lang-globe" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 12h19M12 2.5c2.6 2.7 3.9 5.9 3.9 9.5s-1.3 6.8-3.9 9.5M12 2.5C9.4 5.2 8.1 8.4 8.1 12s1.3 6.8 3.9 9.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' +
      '<select id="lang-select" aria-label="' + T('Language') + '">' +
      LANGS.map(function (x) { return '<option value="' + x[0] + '" lang="' + x[0] + '"' + (x[0] === L ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>';
    var nav = head.querySelector('nav');
    if (nav && nav.nextSibling) head.insertBefore(lab, nav.nextSibling); else head.appendChild(lab);
    lab.querySelector('select').addEventListener('change', function (e) {
      var to = e.target.value;
      try { localStorage.setItem('hive-lang', to); sessionStorage.setItem('hive-lang-pick', to); } catch (err) {}
      var hasParam = false; try { hasParam = new URLSearchParams(location.search).has('lang'); } catch (err) {}
      if (hasParam) { try { var u = new URL(location.href); u.searchParams.set('lang', to); location.href = u.href; return; } catch (err) {} }
      location.reload();
    });
  }

  window.I18N = {
    lang: L, langs: LANGS, T: T, N: N, PCT: PCT, P: P, NM: NM, ISO: ISO, lower: lower, sep: L === 'ar' ? '، ' : ', ',
    apply: function () { if (L !== 'en') translateStatic(); addMenu(); }
  };
})();
