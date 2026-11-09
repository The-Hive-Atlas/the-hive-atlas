/* The Hive Atlas shared script: mobile menu, copy buttons, and the static map illustrations. */
(function () {
  // Mobile menu
  var btn = document.getElementById('menu-btn');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    var setMenu = function (open) { nav.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    if (window.matchMedia('(max-width: 1040px)').matches) setMenu(false);
    btn.addEventListener('click', function () { setMenu(nav.hidden); });
  }

  // Copy buttons: <button class="copy-btn" data-copy="text">
  document.querySelectorAll('.copy-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var done = function () { var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1600); };
      // Older method, which also works on pages not yet served over HTTPS
      var fallback = function () {
        var t = document.createElement('textarea');
        t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(t);
        if (ok) done(); else window.prompt('Copy this address:', text);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });

  // Static hex tile map illustration. Example values only; not interactive.
  var layout = [
    ['AK',0,0],['ME',0,11],
    ['WI',1,6],['VT',1,10],['NH',1,11],
    ['WA',2,1],['ID',2,2],['MT',2,3],['ND',2,4],['MN',2,5],['IL',2,6],['MI',2,7],['NY',2,9],['MA',2,10],
    ['OR',3,1],['NV',3,2],['WY',3,3],['SD',3,4],['IA',3,5],['IN',3,6],['OH',3,7],['PA',3,8],['NJ',3,9],['CT',3,10],['RI',3,11],
    ['CA',4,1],['UT',4,2],['CO',4,3],['NE',4,4],['MO',4,5],['KY',4,6],['WV',4,7],['VA',4,8],['MD',4,9],['DE',4,10],
    ['AZ',5,2],['NM',5,3],['KS',5,4],['AR',5,5],['TN',5,6],['NC',5,7],['SC',5,8],['DC',5,9],
    ['OK',6,4],['LA',6,5],['MS',6,6],['AL',6,7],['GA',6,8],
    ['HI',7,0],['TX',7,4],['FL',7,8]
  ];
  window.HIVE_HEX_LAYOUT = layout;
  function hash(code, seed) {
    var h = seed || 0; for (var i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 997;
    return h;
  }
  var seq = ['--c0','--c1','--c2','--c3','--c4'];
  var lineages = ['--lin-c','--lin-m','--lin-a','--lin-o'];

  document.querySelectorAll('svg.hexmap').forEach(function (svg) {
    var mode = svg.getAttribute('data-mode') || 'sequential';
    var seed = parseInt(svg.getAttribute('data-seed') || '0', 10);
    var r = 19, w = Math.sqrt(3) * r, vstep = 1.5 * r, pad = 4, ns = 'http://www.w3.org/2000/svg';
    var width = 12 * w + w / 2 + pad * 2, height = 7 * vstep + 2 * r + pad * 2;
    svg.setAttribute('viewBox', '0 0 ' + width.toFixed(1) + ' ' + height.toFixed(1));
    layout.forEach(function (s) {
      var code = s[0], row = s[1], col = s[2];
      var cx = pad + w / 2 + col * w + (row % 2 ? w / 2 : 0);
      var cy = pad + r + row * vstep;
      var pts = [];
      for (var k = 0; k < 6; k++) {
        var a = Math.PI / 180 * (60 * k - 90);
        pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
      }
      var h = hash(code, seed), fill, dark;
      if (mode === 'lineage') {
        // Example pattern: mostly C, some M, A in a few southern states, one O
        var li = ['TX','AZ','NM','FL'].indexOf(code) >= 0 ? 2 : code === 'UT' ? 3 : (h % 10) < 3 ? 1 : 0;
        fill = lineages[li]; dark = false;
      } else {
        var bin = Math.min(4, Math.floor(((h * 7) % 56) / 11.2));
        fill = seq[bin]; dark = bin >= 3;
      }
      var p = document.createElementNS(ns, 'polygon');
      p.setAttribute('points', pts.join(' '));
      p.setAttribute('fill', 'var(' + fill + ')');
      p.setAttribute('class', 'tile');
      var t = document.createElementNS(ns, 'text');
      t.setAttribute('x', cx.toFixed(1)); t.setAttribute('y', cy.toFixed(1));
      t.setAttribute('fill', dark ? 'var(--surface)' : 'var(--ink)');
      t.textContent = code;
      svg.appendChild(p); svg.appendChild(t);
    });
  });
})();
