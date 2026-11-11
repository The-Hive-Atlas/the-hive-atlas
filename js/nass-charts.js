/* The Hive Atlas: the "State chart" tab on the NASS pages.
   Each state is one row: a bar to its average over the chosen years, whiskers from its lowest to highest
   value (or ± 1 standard deviation), and a dashed line for the U.S. Clicking a row opens that state's history.
   Reads window.HIVE_LOSSES (losses.html) or window.HIVE_HONEY (honey-production.html), whichever is on the page. */
(function () {
  var host = document.getElementById('nx-view');
  if (!host) return;
  var SRC = host.getAttribute('data-source');
  var DATA = SRC === 'honey' ? window.HIVE_HONEY : window.HIVE_LOSSES;
  if (!DATA) return;
  var I = window.I18N || { lang: 'en', T: function (s) { return s; }, N: function (x, d) { return Number(x).toFixed(d || 0); }, NM: function (s) { return s; } };
  var LANG = I.lang;

  /* Text this tab adds; the rest comes from the site dictionaries in js/lang/. */
  var NX = {
    fr: {
      'Quarter': 'Trimestre',
      '{s} history (CSV)': 'Historique : {s} (CSV)',
      'Click any state in the chart below to see its history.': 'Cliquez sur un État dans le graphique ci-dessous pour voir son historique.',
      'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}. Latest report released {d}.': 'Données du Service national des statistiques agricoles de l’USDA (NASS), de {a} à {b}. Dernier rapport publié le {d}.',
      'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}.': 'Données du Service national des statistiques agricoles de l’USDA (NASS), de {a} à {b}.',
      'State chart': 'Graphique par État', 'Measure': 'Mesure', 'Whiskers': 'Moustaches', 'Lowest to highest': 'Du plus bas au plus haut', '± 1 SD': '± 1 écart-type',
      'Order': 'Ordre', 'Highest first': 'Plus élevé d’abord', 'A to Z': 'De A à Z', 'All': 'Tous', 'Chart': 'Graphique', 'Table': 'Tableau',
      'Jan–Mar': 'janv.–mars', 'Apr–Jun': 'avr.–juin', 'Jul–Sep': 'juil.–sept.', 'Oct–Dec': 'oct.–déc.',
      'Most colonies during the quarter': 'Maximum de colonies pendant le trimestre', 'Colonies added or replaced': 'Colonies ajoutées ou remplacées', 'Colonies renovated': 'Colonies rénovées',
      'thousand colonies': 'milliers de colonies', 'million lb': 'millions de livres', 'million $': 'millions de $', 'lb per colony': 'livres par colonie', '% of colonies': '% des colonies', '$ per lb': '$ par livre',
      '{q} quarters only': 'trimestres {q} seulement', 'all quarters': 'tous les trimestres', 'Average per quarter': 'Moyenne par trimestre', 'Average per year': 'Moyenne par an',
      'U.S.': 'É.-U.', 'Average over the selected years': 'Moyenne sur les années choisies', 'U.S. total, average over the selected years': 'Total des É.-U., moyenne sur les années choisies',
      'Highest state': 'État le plus élevé', 'Lowest state': 'État le plus bas', 'Widest swing': 'Plus grand écart', 'State average': 'Moyenne de l’État',
      'Average ± 1 standard deviation': 'Moyenne ± 1 écart-type', 'Lowest to highest quarter': 'Du trimestre le plus bas au plus haut', 'Lowest to highest year': 'De l’année la plus basse à la plus haute',
      'U.S. average': 'Moyenne des É.-U.', 'Data for fewer than half the period': 'Données pour moins de la moitié de la période',
      'No state data for this selection. Try a wider range of years.': 'Aucune donnée par État pour cette sélection. Essayez une période plus large.',
      'Quarters with data': 'Trimestres avec données', 'Years with data': 'Années avec données', 'Lowest': 'Plus bas', 'Highest': 'Plus haut', 'Std. dev.': 'Écart-type', 'Data': 'Données',
      '{n} quarters': '{n} trimestres', '{n} years': '{n} ans',
      'Each bar is a state’s average over the years you choose. Whiskers show how far it moved from year to year, and the dashed line marks the U.S. Click a state to see its history.':
        'Chaque barre donne la moyenne d’un État sur les années choisies. Les moustaches montrent l’écart d’une année à l’autre, et la ligne pointillée indique les États-Unis. Cliquez sur un État pour voir son historique.',
      '* Data for fewer than half of the selected period, so the average rests on fewer years.': '* Données pour moins de la moitié de la période choisie : la moyenne repose sur moins d’années.',
      'No U.S. line here: the U.S. figure is a national total, so it does not compare with a single state.': 'Pas de ligne des É.-U. ici : la valeur nationale est un total et ne se compare pas à un seul État.',
      'No data was published for April–June 2019.': 'Aucune donnée n’a été publiée pour avril–juin 2019.',
      'From July–September 2024, NASS publishes 20 states separately; the others are in Other States, which is not shown.': 'Depuis juillet–septembre 2024, le NASS publie 20 États séparément ; les autres sont dans « Autres États », non affiché.',
      'State percents use each state’s peak colonies and the U.S. uses colonies at the start of the quarter, so states tend to read a little below the U.S. line.': 'Les pourcentages des États utilisent le maximum de colonies de l’État et ceux des É.-U. les colonies en début de trimestre : les États se situent donc un peu sous la ligne des É.-U.',
      'Stressors overlap: one colony can be counted under several, so they do not add up to 100%.': 'Les facteurs de stress se recoupent : une colonie peut compter pour plusieurs, leur somme ne fait donc pas 100 %.',
      'Values below 0.5% are counted as 0.25%, and two Wyoming 2023 percents use the corrected values (see About This Data).': 'Les valeurs inférieures à 0,5 % comptent pour 0,25 %, et deux pourcentages du Wyoming en 2023 utilisent les valeurs corrigées (voir À propos de ces données).',
      'From 2024, NASS publishes fewer states separately; the others are in Other States, which is not shown.': 'Depuis 2024, le NASS publie moins d’États séparément ; les autres sont dans « Autres États », non affiché.'
    },
    es: {
      'Quarter': 'Trimestre',
      '{s} history (CSV)': 'Historial de {s} (CSV)',
      'Click any state in the chart below to see its history.': 'Haga clic en un estado del gráfico para ver su historial.',
      'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}. Latest report released {d}.': 'Datos del Servicio Nacional de Estadísticas Agrícolas del USDA (NASS), de {a} a {b}. Último informe publicado el {d}.',
      'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}.': 'Datos del Servicio Nacional de Estadísticas Agrícolas del USDA (NASS), de {a} a {b}.',
      'State chart': 'Gráfico por estado', 'Measure': 'Medida', 'Whiskers': 'Bigotes', 'Lowest to highest': 'Del más bajo al más alto', '± 1 SD': '± 1 desv. estándar',
      'Order': 'Orden', 'Highest first': 'Mayor primero', 'A to Z': 'De la A a la Z', 'All': 'Todos', 'Chart': 'Gráfico', 'Table': 'Tabla',
      'Jan–Mar': 'ene–mar', 'Apr–Jun': 'abr–jun', 'Jul–Sep': 'jul–sep', 'Oct–Dec': 'oct–dic',
      'Most colonies during the quarter': 'Máximo de colonias en el trimestre', 'Colonies added or replaced': 'Colonias añadidas o reemplazadas', 'Colonies renovated': 'Colonias renovadas',
      'thousand colonies': 'miles de colonias', 'million lb': 'millones de libras', 'million $': 'millones de $', 'lb per colony': 'libras por colonia', '% of colonies': '% de las colonias', '$ per lb': '$ por libra',
      '{q} quarters only': 'solo trimestres {q}', 'all quarters': 'todos los trimestres', 'Average per quarter': 'Promedio por trimestre', 'Average per year': 'Promedio por año',
      'U.S.': 'EE. UU.', 'Average over the selected years': 'Promedio de los años elegidos', 'U.S. total, average over the selected years': 'Total de EE. UU., promedio de los años elegidos',
      'Highest state': 'Estado más alto', 'Lowest state': 'Estado más bajo', 'Widest swing': 'Mayor variación', 'State average': 'Promedio del estado',
      'Average ± 1 standard deviation': 'Promedio ± 1 desviación estándar', 'Lowest to highest quarter': 'Del trimestre más bajo al más alto', 'Lowest to highest year': 'Del año más bajo al más alto',
      'U.S. average': 'Promedio de EE. UU.', 'Data for fewer than half the period': 'Datos para menos de la mitad del período',
      'No state data for this selection. Try a wider range of years.': 'No hay datos por estado para esta selección. Pruebe con más años.',
      'Quarters with data': 'Trimestres con datos', 'Years with data': 'Años con datos', 'Lowest': 'Más bajo', 'Highest': 'Más alto', 'Std. dev.': 'Desv. estándar', 'Data': 'Datos',
      '{n} quarters': '{n} trimestres', '{n} years': '{n} años',
      'Each bar is a state’s average over the years you choose. Whiskers show how far it moved from year to year, and the dashed line marks the U.S. Click a state to see its history.':
        'Cada barra es el promedio de un estado en los años elegidos. Los bigotes muestran cuánto varió de un año a otro, y la línea discontinua marca EE. UU. Haga clic en un estado para ver su historial.',
      '* Data for fewer than half of the selected period, so the average rests on fewer years.': '* Datos para menos de la mitad del período elegido, así que el promedio se basa en menos años.',
      'No U.S. line here: the U.S. figure is a national total, so it does not compare with a single state.': 'Sin línea de EE. UU.: la cifra nacional es un total y no se compara con un solo estado.',
      'No data was published for April–June 2019.': 'No se publicaron datos para abril–junio de 2019.',
      'From July–September 2024, NASS publishes 20 states separately; the others are in Other States, which is not shown.': 'Desde julio–septiembre de 2024, NASS publica 20 estados por separado; los demás están en Otros estados, que no se muestra.',
      'State percents use each state’s peak colonies and the U.S. uses colonies at the start of the quarter, so states tend to read a little below the U.S. line.': 'Los porcentajes estatales usan el máximo de colonias del estado y EE. UU. usa las colonias al inicio del trimestre, por eso los estados suelen quedar un poco por debajo de la línea de EE. UU.',
      'Stressors overlap: one colony can be counted under several, so they do not add up to 100%.': 'Los factores de estrés se superponen: una colonia puede contar en varios, así que no suman 100 %.',
      'Values below 0.5% are counted as 0.25%, and two Wyoming 2023 percents use the corrected values (see About This Data).': 'Los valores menores de 0,5 % cuentan como 0,25 %, y dos porcentajes de Wyoming en 2023 usan los valores corregidos (vea Acerca de estos datos).',
      'From 2024, NASS publishes fewer states separately; the others are in Other States, which is not shown.': 'Desde 2024, NASS publica menos estados por separado; los demás están en Otros estados, que no se muestra.'
    },
    ar: {
      'Quarter': 'الربع',
      '{s} history (CSV)': 'سجل {s} (CSV)',
      'Click any state in the chart below to see its history.': 'انقر على أي ولاية في الرسم أدناه لترى سجلّها.',
      'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}. Latest report released {d}.': 'بيانات من الدائرة الوطنية للإحصاءات الزراعية التابعة لوزارة الزراعة الأمريكية (NASS)، من {a} إلى {b}. صدر أحدث تقرير في {d}.',
      'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}.': 'بيانات من الدائرة الوطنية للإحصاءات الزراعية التابعة لوزارة الزراعة الأمريكية (NASS)، من {a} إلى {b}.',
      'State chart': 'رسم حسب الولاية', 'Measure': 'المقياس', 'Whiskers': 'الخطوط الجانبية', 'Lowest to highest': 'من الأدنى إلى الأعلى', '± 1 SD': '± انحراف معياري',
      'Order': 'الترتيب', 'Highest first': 'الأعلى أولًا', 'A to Z': 'أبجديًا', 'All': 'الكل', 'Chart': 'رسم بياني', 'Table': 'جدول',
      'Jan–Mar': 'يناير–مارس', 'Apr–Jun': 'أبريل–يونيو', 'Jul–Sep': 'يوليو–سبتمبر', 'Oct–Dec': 'أكتوبر–ديسمبر',
      'Most colonies during the quarter': 'أكبر عدد من الطوائف خلال الربع', 'Colonies added or replaced': 'الطوائف المضافة أو المستبدلة', 'Colonies renovated': 'الطوائف المجدّدة',
      'thousand colonies': 'ألف طائفة', 'million lb': 'مليون رطل', 'million $': 'مليون دولار', 'lb per colony': 'رطل لكل طائفة', '% of colonies': '% من الطوائف', '$ per lb': 'دولار لكل رطل',
      '{q} quarters only': 'أرباع {q} فقط', 'all quarters': 'كل الأرباع', 'Average per quarter': 'المتوسط لكل ربع', 'Average per year': 'المتوسط لكل سنة',
      'U.S.': 'الولايات المتحدة', 'Average over the selected years': 'المتوسط خلال السنوات المختارة', 'U.S. total, average over the selected years': 'إجمالي الولايات المتحدة، متوسط السنوات المختارة',
      'Highest state': 'أعلى ولاية', 'Lowest state': 'أدنى ولاية', 'Widest swing': 'أكبر تذبذب', 'State average': 'متوسط الولاية',
      'Average ± 1 standard deviation': 'المتوسط ± انحراف معياري واحد', 'Lowest to highest quarter': 'من أدنى ربع إلى أعلاه', 'Lowest to highest year': 'من أدنى سنة إلى أعلاها',
      'U.S. average': 'متوسط الولايات المتحدة', 'Data for fewer than half the period': 'بيانات لأقل من نصف الفترة',
      'No state data for this selection. Try a wider range of years.': 'لا توجد بيانات للولايات في هذا الاختيار. جرّب نطاقًا أوسع من السنوات.',
      'Quarters with data': 'أرباع فيها بيانات', 'Years with data': 'سنوات فيها بيانات', 'Lowest': 'الأدنى', 'Highest': 'الأعلى', 'Std. dev.': 'الانحراف المعياري', 'Data': 'البيانات',
      '{n} quarters': '{n} أرباع', '{n} years': '{n} سنوات',
      'Each bar is a state’s average over the years you choose. Whiskers show how far it moved from year to year, and the dashed line marks the U.S. Click a state to see its history.':
        'يمثّل كل عمود متوسط الولاية خلال السنوات التي تختارها. وتُظهر الخطوط الجانبية مدى تغيّرها من سنة إلى أخرى، ويشير الخط المتقطع إلى الولايات المتحدة. انقر على ولاية لترى سجلّها.',
      '* Data for fewer than half of the selected period, so the average rests on fewer years.': '* بيانات لأقل من نصف الفترة المختارة، لذا يعتمد المتوسط على عدد أقل من السنوات.',
      'No U.S. line here: the U.S. figure is a national total, so it does not compare with a single state.': 'لا يظهر خط الولايات المتحدة هنا: فالقيمة الوطنية إجمالي لا يُقارن بولاية واحدة.',
      'No data was published for April–June 2019.': 'لم تُنشر بيانات لربع أبريل–يونيو 2019.',
      'From July–September 2024, NASS publishes 20 states separately; the others are in Other States, which is not shown.': 'منذ يوليو–سبتمبر 2024 تنشر NASS بيانات 20 ولاية منفردة، والبقية ضمن «ولايات أخرى» غير المعروضة هنا.',
      'State percents use each state’s peak colonies and the U.S. uses colonies at the start of the quarter, so states tend to read a little below the U.S. line.': 'تُحسب نسب الولايات من أكبر عدد لطوائفها، ونسبة الولايات المتحدة من الطوائف في بداية الربع، لذا تميل الولايات إلى الظهور أدنى قليلًا من خط الولايات المتحدة.',
      'Stressors overlap: one colony can be counted under several, so they do not add up to 100%.': 'تتداخل عوامل الإجهاد: قد تُحسب الطائفة الواحدة تحت أكثر من عامل، لذا لا يبلغ مجموعها 100%.',
      'Values below 0.5% are counted as 0.25%, and two Wyoming 2023 percents use the corrected values (see About This Data).': 'تُحسب القيم الأقل من 0.5% على أنها 0.25%، وتُستخدم القيم المصحّحة لنسبتين في وايومنغ لعام 2023 (انظر «عن هذه البيانات»).',
      'From 2024, NASS publishes fewer states separately; the others are in Other States, which is not shown.': 'منذ 2024 تنشر NASS عددًا أقل من الولايات منفردة، والبقية ضمن «ولايات أخرى» غير المعروضة هنا.'
    }
  };
  function T(s, v) {
    var o = NX[LANG] && NX[LANG][s];
    if (o == null) return I.T(s, v);
    return v ? o.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : o;
  }
  function N(x, d) { return I.N(x, d); }
  function NM(code) { return I.NM ? I.NM(DATA.names[code]) : DATA.names[code]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Periods and measures ---------- */
  var F = DATA.fields, BASE = DATA.source && DATA.source.cpiBaseYear;
  var PER, YEARS, M, ORDER;
  if (SRC === 'honey') {
    PER = DATA.years.map(function (y) { return { id: String(y), year: y, q: 0 }; });
    M = {
      yield_lb: { label: 'Honey per colony', unit: 'lb per colony', kind: 'num', d: 1, ref: true },
      production_lb: { label: 'Honey produced', unit: 'million lb', kind: 'count', scale: 1e6 },
      colonies: { label: 'Honey-producing colonies', unit: 'thousand colonies', kind: 'count', scale: 1e3 },
      price_usd_lb: { label: 'Average price per pound', unit: '$ per lb', kind: 'usd', ref: true, dollars: true },
      value_usd: { label: 'Value of honey produced', unit: 'million $', kind: 'count', scale: 1e6, dollars: true },
      stocks_lb: { label: 'Stocks held by producers, Dec. 15', unit: 'million lb', kind: 'count', scale: 1e6 }
    };
    ORDER = ['yield_lb', 'production_lb', 'colonies', 'price_usd_lb', 'value_usd', 'stocks_lb'];
  } else {
    PER = DATA.periods.filter(function (p) { return p.survey !== false; });
    M = {
      pct_lost: { label: 'Percent of colonies lost', unit: '% of colonies', kind: 'pct', ref: true },
      colonies_lost: { label: 'Colonies lost', unit: 'thousand colonies', kind: 'count', scale: 1e3 },
      pct_renovated: { label: 'Percent of colonies renovated', unit: '% of colonies', kind: 'pct', ref: true },
      colonies_start: { label: 'Colonies at start of quarter', unit: 'thousand colonies', kind: 'count', scale: 1e3 },
      colonies_max: { label: 'Most colonies during the quarter', unit: 'thousand colonies', kind: 'count', scale: 1e3 },
      colonies_added: { label: 'Colonies added or replaced', unit: 'thousand colonies', kind: 'count', scale: 1e3 },
      colonies_renovated: { label: 'Colonies renovated', unit: 'thousand colonies', kind: 'count', scale: 1e3 },
      varroa: { label: 'Colonies affected by Varroa mites', unit: '% of colonies', kind: 'pct', ref: true, stress: true },
      other_pests: { label: 'Colonies affected by other pests and parasites', unit: '% of colonies', kind: 'pct', ref: true, stress: true },
      diseases: { label: 'Colonies affected by diseases', unit: '% of colonies', kind: 'pct', ref: true, stress: true },
      pesticides: { label: 'Colonies affected by pesticides', unit: '% of colonies', kind: 'pct', ref: true, stress: true },
      other: { label: 'Colonies affected by other causes', unit: '% of colonies', kind: 'pct', ref: true, stress: true },
      unknown: { label: 'Colonies affected by unknown causes', unit: '% of colonies', kind: 'pct', ref: true, stress: true }
    };
    ORDER = ['pct_lost', 'colonies_lost', 'pct_renovated', 'colonies_start', 'colonies_max', 'colonies_added', 'colonies_renovated', 'varroa', 'other_pests', 'diseases', 'pesticides', 'other', 'unknown'];
  }
  YEARS = []; PER.forEach(function (p) { if (YEARS.indexOf(p.year) < 0) YEARS.push(p.year); });
  var QNAME = { 1: 'Jan–Mar', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Oct–Dec' };
  var STATES = Object.keys(DATA.values).filter(function (c) { return c !== 'US' && c !== 'OTH' && DATA.names[c]; });

  var st = { m: ORDER[0], from: YEARS[0], to: YEARS[YEARS.length - 1], q: 0, whisk: 'range', sort: 'val', mode: 'chart', dollars: 'real', sel: null };
  try { var sv = JSON.parse(localStorage.getItem('hive-nx-' + SRC) || 'null'); if (sv) ['whisk', 'sort', 'dollars'].forEach(function (k) { if (sv[k]) st[k] = sv[k]; }); } catch (e) {}
  function remember() { try { localStorage.setItem('hive-nx-' + SRC, JSON.stringify({ whisk: st.whisk, sort: st.sort, dollars: st.dollars })); } catch (e) {} }

  // One value for a state and period, or null. Losses: NASS "less than 0.5" (-1) counts as 0.25, as on the map, and published corrections apply.
  function value(code, p, m) {
    var row = DATA.values[code] && DATA.values[code][p.id]; if (!row) return null;
    var f = m; if (M[m].dollars && st.dollars === 'real') f = m.replace(/_usd(_lb)?$/, function (x) { return x + '_real'; });
    var i = F.indexOf(f); if (i < 0) return null;
    var v = row[i]; if (v == null) return null;
    if (SRC !== 'honey') {
      var cor = DATA.corrections && DATA.corrections[p.id] && DATA.corrections[p.id][code] && DATA.corrections[p.id][code][m];
      if (cor && cor.value != null) return cor.value;
      if (v === -1) return 0.25;
    }
    return v < 0 ? null : v;
  }

  /* ---------- Formatting ---------- */
  function fmt(m, v, d) {
    if (v == null || isNaN(v)) return '–';
    var c = M[m];
    if (c.kind === 'pct') return I.PCT ? I.PCT(v, d == null ? 1 : d) : N(v, 1) + '%';
    if (c.kind === 'usd') return LANG === 'fr' || LANG === 'es' ? N(v, 2) + ' $' : '$' + N(v, 2);
    if (c.kind === 'count') { var x = v / c.scale; return N(x, d == null ? (x >= 100 ? 0 : 1) : d); }
    return N(v, d == null ? c.d || 0 : d);
  }
  function tickFmt(m, v) {
    var c = M[m];
    if (c.kind === 'usd') return N(v, v % 1 ? 2 : 0);
    if (c.kind === 'count') { var x = v / c.scale; return N(x, x % 1 ? 1 : 0); }
    return N(v, v % 1 ? 1 : 0);
  }
  function unitOf(m) {
    var u = T(M[m].unit);
    if (M[m].dollars) u += ', ' + (st.dollars === 'real' ? T('In {y} dollars', { y: BASE }) : T('As reported')).toLowerCase();
    return u;
  }
  function labelOf(m) { return T(M[m].label); }
  function periodLabel(p) { return SRC === 'honey' ? String(p.year) : T(QNAME[p.q]) + ' ' + p.year; }
  function niceMax(v) {
    if (!(v > 0)) return { max: 1, step: 0.2 };
    var raw = v / 5, pw = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pw;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pw;
    return { max: Math.ceil(v / step - 1e-9) * step, step: step };
  }

  /* ---------- Statistics ---------- */
  function selected() { return PER.filter(function (p) { return p.year >= st.from && p.year <= st.to && (!st.q || p.q === st.q); }); }
  function stats(code, ps) {
    var vals = [], at = [];
    ps.forEach(function (p) { var x = value(code, p, st.m); if (x != null) { vals.push(x); at.push(p); } });
    var n = vals.length; if (!n) return null;
    var sum = 0, lo = Infinity, hi = -Infinity, loP, hiP;
    vals.forEach(function (x, k) { sum += x; if (x < lo) { lo = x; loP = at[k]; } if (x > hi) { hi = x; hiP = at[k]; } });
    var mean = sum / n, ss = 0; vals.forEach(function (x) { ss += (x - mean) * (x - mean); });
    return { n: n, mean: mean, min: lo, max: hi, minP: loP, maxP: hiP, sd: n > 1 ? Math.sqrt(ss / (n - 1)) : 0 };
  }
  function compute() {
    var ps = selected(), us = stats('US', ps);
    var expected = ps.filter(function (p) { return value('US', p, st.m) != null; }).length || ps.length;
    var rows = [];
    STATES.forEach(function (c) {
      var r = stats(c, ps); if (!r) return;
      r.code = c; r.few = r.n < Math.ceil(expected / 2);
      if (st.whisk === 'sd') { r.lo = Math.max(0, r.mean - r.sd); r.hi = r.mean + r.sd; } else { r.lo = r.min; r.hi = r.max; }
      rows.push(r);
    });
    if (st.sort === 'name') rows.sort(function (a, b) { return NM(a.code).localeCompare(NM(b.code), LANG); });
    else rows.sort(function (a, b) { return b.mean - a.mean; });
    return { ps: ps, rows: rows, us: us, expected: expected };
  }

  /* ---------- Layout ---------- */
  var hasQ = SRC !== 'honey';
  function seg(id, attr, opts) {
    return '<div class="seg" role="group" aria-labelledby="' + id + '-lab" id="' + id + '">' + opts.map(function (o) { return '<button type="button" ' + attr + '="' + o[0] + '" aria-pressed="false">' + esc(T(o[1])) + '</button>'; }).join('') + '</div>';
  }
  host.innerHTML =
    '<div class="wrap lx-wrap">' +
    '<p class="lx-small">' + esc(T('Each bar is a state’s average over the years you choose. Whiskers show how far it moved from year to year, and the dashed line marks the U.S. Click a state to see its history.')) + '</p>' +
    '<div class="nx-controls">' +
      '<div class="lx-ctl"><label class="lx-lab" for="nx-measure">' + esc(T('Measure')) + '</label><select id="nx-measure">' + ORDER.map(function (k) { return '<option value="' + k + '">' + esc(labelOf(k)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="lx-ctl"><span class="lx-lab" id="nx-years-lab">' + esc(T('Years')) + '</span><div class="nx-years" role="group" aria-labelledby="nx-years-lab">' +
        '<select id="nx-from" aria-label="' + esc(T('From')) + '"></select><span aria-hidden="true">–</span><select id="nx-to" aria-label="' + esc(T('To')) + '"></select></div></div>' +
      (hasQ ? '<div class="lx-ctl"><span class="lx-lab" id="nx-q-lab">' + esc(T('Quarter')) + '</span>' + seg('nx-q', 'data-q', [[0, 'All'], [1, 'Jan–Mar'], [2, 'Apr–Jun'], [3, 'Jul–Sep'], [4, 'Oct–Dec']]) + '</div>' : '') +
      (SRC === 'honey' ? '<div class="lx-ctl" id="nx-dollars-ctl"><span class="lx-lab" id="nx-dollars-lab">' + esc(T('Prices and values')) + '</span>' + seg('nx-dollars', 'data-d', [['real', T('In {y} dollars', { y: BASE })], ['nominal', 'As reported']]) + '</div>' : '') +
      '<div class="lx-ctl"><span class="lx-lab" id="nx-wh-lab">' + esc(T('Whiskers')) + '</span>' + seg('nx-wh', 'data-w', [['range', 'Lowest to highest'], ['sd', '± 1 SD']]) + '</div>' +
      '<div class="lx-ctl"><span class="lx-lab" id="nx-sort-lab">' + esc(T('Order')) + '</span>' + seg('nx-sort', 'data-s', [['val', 'Highest first'], ['name', 'A to Z']]) + '</div>' +
    '</div>' +
    '<div class="nx-strip" id="nx-strip"></div>' +
    '<div class="nx-main">' +
      '<div class="lx-card">' +
        '<div class="nx-cardhead"><h2 class="lx-cardtitle" id="nx-title"></h2>' +
          '<div class="seg" role="group" aria-label="' + esc(T('Chart') + ' / ' + T('Table')) + '" id="nx-mode"><button type="button" data-m="chart" aria-pressed="true">' + esc(T('Chart')) + '</button><button type="button" data-m="table" aria-pressed="false">' + esc(T('Table')) + '</button></div></div>' +
        '<p class="nx-sub" id="nx-subtitle"></p><div class="nx-legend" id="nx-legend"></div>' +
        '<div class="nx-chart" id="nx-chart"></div><div class="nx-tablewrap" id="nx-table" hidden></div>' +
        '<p class="nx-note" id="nx-note"></p>' +
        '<div class="lx-export" id="nx-export"><span class="lx-lab">' + esc(T('Download')) + '</span><button type="button" class="btn" id="nx-dl-table">' + esc(T('This table (CSV)')) + '</button>' +
          (SRC === 'honey' ? '<a class="btn" href="data/nass-honey-production.csv" download>' + esc(T('All states, all years (CSV)')) + '</a>'
            : '<a class="btn" href="data/nass-colony-losses.csv" download>' + esc(T('All states, all quarters (CSV)')) + '</a><a class="btn" href="data/nass-quality.csv" download>' + esc(T('Sample sizes (CSV)')) + '</a>') + '</div>' +
      '</div>' +
      '<aside class="nx-side"><div class="lx-card nx-detail" id="nx-detail" aria-live="polite"></div></aside>' +
    '</div></div>';

  var $ = function (id) { return document.getElementById(id); };
  var elM = $('nx-measure'), elFrom = $('nx-from'), elTo = $('nx-to'), elChart = $('nx-chart'), elTable = $('nx-table'), elDetail = $('nx-detail');
  var tip = document.createElement('div'); tip.className = 'nx-tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
  var cur = null;
  var yopts = function (sel) { return YEARS.map(function (y) { return '<option' + (y === sel ? ' selected' : '') + '>' + y + '</option>'; }).join(''); };
  function pressed(g, attr, v) { $(g).querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(v))); }); }
  function syncControls() {
    elM.value = st.m; elFrom.innerHTML = yopts(st.from); elTo.innerHTML = yopts(st.to);
    if (hasQ) pressed('nx-q', 'data-q', st.q);
    if ($('nx-dollars')) { pressed('nx-dollars', 'data-d', st.dollars); $('nx-dollars-ctl').hidden = !M[st.m].dollars; }
    pressed('nx-wh', 'data-w', st.whisk); pressed('nx-sort', 'data-s', st.sort); pressed('nx-mode', 'data-m', st.mode);
  }
  var quarterly = function () { return hasQ && !st.q; };
  function obsWord(n) { return T(quarterly() ? '{n} quarters' : '{n} years', { n: N(n) }); }

  /* ---------- Render ---------- */
  function render() {
    var m = st.m, c = M[m];
    cur = compute();
    var rows = cur.rows, us = cur.us;
    var yrs = st.from === st.to ? String(st.from) : st.from + '–' + st.to;
    if (LANG === 'ar' && I.ISO) yrs = I.ISO(yrs);
    $('nx-title').textContent = titleCase(labelOf(m));
    $('nx-subtitle').textContent = T(hasQ ? 'Average per quarter' : 'Average per year') + ', ' + yrs + (hasQ ? ', ' + (st.q ? T('{q} quarters only', { q: T(QNAME[st.q]) }) : T('all quarters')) : '') + ' · ' + unitOf(m);

    var byVal = rows.slice().sort(function (a, b) { return b.mean - a.mean; });
    var swing = rows.filter(function (r) { return !r.few && r.n > 1; }).sort(function (a, b) { return (b.max - b.min) - (a.max - a.min); })[0];
    var strip = [[T('U.S.'), us ? fmt(m, us.mean) : '–', T(c.ref ? 'Average over the selected years' : 'U.S. total, average over the selected years')]];
    if (byVal.length) {
      strip.push([T('Highest state'), fmt(m, byVal[0].mean), NM(byVal[0].code)]);
      strip.push([T('Lowest state'), fmt(m, byVal[byVal.length - 1].mean), NM(byVal[byVal.length - 1].code)]);
    }
    if (swing) strip.push([T('Widest swing'), fmt(m, swing.min) + ' – ' + fmt(m, swing.max), NM(swing.code)]);
    $('nx-strip').innerHTML = strip.map(function (s) { return '<div class="nx-stat"><p class="k">' + esc(s[0]) + '</p><p class="v">' + esc(s[1]) + '</p><p class="s">' + esc(s[2]) + '</p></div>'; }).join('');

    var lg = '<span><i class="nx-key-bar"></i>' + esc(T('State average')) + '</span><span><i class="nx-key-wh"></i>' +
      esc(T(st.whisk === 'sd' ? 'Average ± 1 standard deviation' : quarterly() ? 'Lowest to highest quarter' : 'Lowest to highest year')) + '</span>';
    if (c.ref && us) lg += '<span><i class="nx-key-ref"></i>' + esc(T('U.S. average')) + '</span>';
    if (rows.some(function (r) { return r.few; })) lg += '<span><i class="nx-key-few"></i>' + esc(T('Data for fewer than half the period')) + '</span>';
    $('nx-legend').innerHTML = lg;

    if (!rows.length) {
      elChart.innerHTML = '<p class="nx-empty">' + esc(T('No state data for this selection. Try a wider range of years.')) + '</p>';
      elTable.innerHTML = ''; elDetail.innerHTML = ''; $('nx-note').textContent = ''; return;
    }

    var top = 0; rows.forEach(function (r) { top = Math.max(top, r.hi, r.mean); });
    if (c.ref && us) top = Math.max(top, us.mean);
    var nm = niceMax(top), max = nm.max, step = nm.step;
    var P = function (x) { return (Math.max(0, x) / max * 100).toFixed(3) + '%'; };
    var ticks = []; for (var t = 0; t <= max + step / 2; t += step) ticks.push(t);
    var axis = function (cls, extra) {
      return '<div class="nx-axisrow ' + cls + '" aria-hidden="true"><span></span><div class="nx-axis">' +
        ticks.map(function (t) { return '<span style="inset-inline-start:' + P(t) + '">' + tickFmt(m, t) + '</span>'; }).join('') + (extra || '') + '</div><span></span></div>';
    };
    var grid = ticks.map(function (t) { return '<span class="nx-grid" style="inset-inline-start:' + P(t) + '"></span>'; }).join('');
    var showRef = c.ref && us;
    var ref = showRef ? '<span class="nx-refseg" style="inset-inline-start:' + P(us.mean) + '"></span>' : '';
    var html = axis('', showRef ? '<b class="nx-reflabel" style="inset-inline-start:' + P(us.mean) + '">' + esc(T('U.S.') + ' ' + fmt(m, us.mean)) + '</b>' : '');
    rows.forEach(function (r, i) {
      html += '<button type="button" class="nx-row' + (r.few ? ' few' : '') + '" data-i="' + i + '" aria-label="' + esc(NM(r.code) + ': ' + fmt(m, r.mean) + ' (' + fmt(m, r.lo) + ' – ' + fmt(m, r.hi) + ')') + '">' +
        '<span class="nx-name"><b>' + esc(NM(r.code)) + '</b><i>' + r.code + '</i></span>' +
        '<span class="nx-track">' + grid + '<span class="nx-bar" style="width:' + P(r.mean) + '"></span>' +
        '<span class="nx-wh" style="inset-inline-start:' + P(r.lo) + ';width:calc(' + P(r.hi) + ' - ' + P(r.lo) + ')"></span>' + ref + '</span>' +
        '<span class="nx-val">' + fmt(m, r.mean) + '</span></button>';
    });
    html += axis('bottom');
    elChart.innerHTML = html; elChart.appendChild(tip);
    elChart.style.marginTop = showRef ? '26px' : '0';

    var obsHead = T(quarterly() ? 'Quarters with data' : 'Years with data');
    var tr = function (name, r, pin) {
      return '<tr' + (pin ? ' class="pin"' : '') + '><th>' + esc(name) + (r.few ? ' *' : '') + '</th><td class="num">' + fmt(m, r.mean) + '</td><td class="num">' + fmt(m, r.min) + '</td><td class="num">' + fmt(m, r.max) +
        '</td><td class="num">' + fmt(m, r.sd) + '</td><td class="num">' + N(r.n) + ' / ' + N(cur.expected) + '</td></tr>';
    };
    elTable.innerHTML = '<table class="lx-table"><thead><tr><th>' + esc(T('State')) + '</th><th class="num">' + esc(T('Average')) + '</th><th class="num">' + esc(T('Lowest')) + '</th><th class="num">' + esc(T('Highest')) +
      '</th><th class="num">' + esc(T('Std. dev.')) + '</th><th class="num">' + esc(obsHead) + '</th></tr></thead><tbody>' +
      (us ? tr(T('United States'), us, true) : '') + rows.map(function (r) { return tr(NM(r.code), r); }).join('') + '</tbody></table>';
    elChart.hidden = st.mode !== 'chart'; elTable.hidden = st.mode !== 'table'; $('nx-legend').hidden = st.mode !== 'chart';

    var notes = [];
    if (rows.some(function (r) { return r.few; })) notes.push(T('* Data for fewer than half of the selected period, so the average rests on fewer years.'));
    if (!c.ref) notes.push(T('No U.S. line here: the U.S. figure is a national total, so it does not compare with a single state.'));
    if (hasQ) {
      if (c.kind === 'pct') notes.push(T('State percents use each state’s peak colonies and the U.S. uses colonies at the start of the quarter, so states tend to read a little below the U.S. line.'));
      if (c.stress) notes.push(T('Stressors overlap: one colony can be counted under several, so they do not add up to 100%.'));
      if (st.from <= 2019 && st.to >= 2019 && (!st.q || st.q === 2)) notes.push(T('No data was published for April–June 2019.'));
      if (st.to >= 2024) notes.push(T('From July–September 2024, NASS publishes 20 states separately; the others are in Other States, which is not shown.'));
      if (c.kind === 'pct') notes.push(T('Values below 0.5% are counted as 0.25%, and two Wyoming 2023 percents use the corrected values (see About This Data).'));
    } else if (st.to >= 2024) notes.push(T('From 2024, NASS publishes fewer states separately; the others are in Other States, which is not shown.'));
    $('nx-note').textContent = notes.join(' ');

    if (!st.sel || !rows.some(function (r) { return r.code === st.sel; })) st.sel = byVal[0].code;
    markSel(); detail();
  }
  function markSel() {
    elChart.querySelectorAll('.nx-row').forEach(function (b) { var on = cur.rows[+b.getAttribute('data-i')].code === st.sel; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }

  function showTip(btn, clientX) {
    var r = cur.rows[+btn.getAttribute('data-i')], m = st.m, us = cur.us;
    var lines = [[T('Average'), fmt(m, r.mean)]];
    if (st.whisk === 'sd') lines.push([T('± 1 SD'), fmt(m, r.lo) + ' – ' + fmt(m, r.hi)]);
    lines.push([T('Lowest'), fmt(m, r.min) + ' · ' + periodLabel(r.minP)]);
    lines.push([T('Highest'), fmt(m, r.max) + ' · ' + periodLabel(r.maxP)]);
    if (M[m].ref && us) lines.push([T('U.S. average'), fmt(m, us.mean)]);
    lines.push([T('Data'), obsWord(r.n) + ' / ' + N(cur.expected)]);
    tip.innerHTML = '<b>' + esc(NM(r.code)) + '</b>' + lines.map(function (l) { return '<div><span>' + esc(l[0]) + '</span><span>' + esc(l[1]) + '</span></div>'; }).join('');
    tip.hidden = false;
    var cb = elChart.getBoundingClientRect(), bb = btn.getBoundingClientRect();
    var x = clientX != null ? clientX - cb.left : bb.width / 2, w = tip.offsetWidth, h = tip.offsetHeight;
    x = Math.max(0, Math.min(cb.width - w, x - w / 2));
    var y = bb.top - cb.top - h - 8; if (y < 0) y = bb.bottom - cb.top + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  elChart.addEventListener('mousemove', function (e) { var b = e.target.closest('.nx-row'); if (b) showTip(b, e.clientX); else tip.hidden = true; });
  elChart.addEventListener('mouseleave', function () { tip.hidden = true; });
  elChart.addEventListener('focusin', function (e) { var b = e.target.closest('.nx-row'); if (b) showTip(b); });
  elChart.addEventListener('focusout', function () { tip.hidden = true; });
  elChart.addEventListener('click', function (e) {
    var b = e.target.closest('.nx-row'); if (!b) return;
    st.sel = cur.rows[+b.getAttribute('data-i')].code; markSel(); detail();
    if (window.matchMedia('(max-width: 960px)').matches) elDetail.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  });

  /* ---------- One state's history ---------- */
  function detail() {
    var m = st.m, c = M[m], code = st.sel, r = cur.rows.filter(function (x) { return x.code === code; })[0];
    if (!r) { elDetail.innerHTML = ''; return; }
    var pts = cur.ps.map(function (p) { return { p: p, v: value(code, p, m), u: c.ref ? value('US', p, m) : null }; });
    var W = 520, H = 250, pl = 46, pr = 14, pt = 14, pb = 30, n = pts.length;
    var top = 0; pts.forEach(function (o) { if (o.v != null) top = Math.max(top, o.v); if (o.u != null) top = Math.max(top, o.u); });
    var nm = niceMax(top), max = nm.max, step = nm.step;
    var X = function (k) { return pl + (n > 1 ? k / (n - 1) : 0.5) * (W - pl - pr); }, Y = function (y) { return pt + (1 - y / max) * (H - pt - pb); };
    var g = '<g class="ax">';
    for (var t = 0; t <= max + step / 2; t += step) g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '"' + (t === 0 ? ' class="base"' : '') + '/><text x="' + (pl - 6) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end">' + tickFmt(m, t) + '</text>';
    var marks = []; pts.forEach(function (o, k) { if (!marks.length || marks[marks.length - 1].y !== o.p.year) marks.push({ y: o.p.year, k: k }); });
    var every = Math.ceil(marks.length / 7);
    marks.forEach(function (o, j) { if (j % every === 0) g += '<text x="' + X(o.k).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + o.y + '</text>'; });
    g += '</g>';
    var path = function (key) { var d = '', on = false; pts.forEach(function (o, k) { var y = o[key]; if (y == null) { on = false; return; } d += (on ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(y).toFixed(1); on = true; }); return d; };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(NM(code) + ', ' + labelOf(m)) + '" style="direction:ltr">' + g;
    if (c.ref) svg += '<path class="ln-us" d="' + path('u') + '"/>';
    svg += '<path class="ln-st" d="' + path('v') + '"/>';
    if (n <= 60) pts.forEach(function (o, k) { if (o.v != null) svg += '<circle class="pt" cx="' + X(k).toFixed(1) + '" cy="' + Y(o.v).toFixed(1) + '" r="' + (n > 30 ? 2.6 : 3.6) + '"/>'; });
    svg += '<line class="cross" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" visibility="hidden"/><rect class="hit" x="' + pl + '" y="0" width="' + (W - pl - pr) + '" height="' + (H - pb) + '"/></svg>';
    var yrs = st.from === st.to ? String(st.from) : st.from + '–' + st.to;
    elDetail.innerHTML = '<div class="nx-cardhead"><h2 class="lx-cardtitle">' + esc(NM(code)) + '</h2></div>' +
      '<p class="nx-sub">' + esc(labelOf(m) + ' · ' + (hasQ && st.q ? T(QNAME[st.q]) + ', ' : '') + yrs + ' · ' + unitOf(m)) + '</p>' +
      '<div class="nx-dstats"><div><p class="k">' + esc(T('Average')) + '</p><p class="v">' + fmt(m, r.mean) + '</p></div>' +
      '<div><p class="k">' + esc(T('Lowest') + ' · ' + periodLabel(r.minP)) + '</p><p class="v">' + fmt(m, r.min) + '</p></div>' +
      '<div><p class="k">' + esc(T('Highest') + ' · ' + periodLabel(r.maxP)) + '</p><p class="v">' + fmt(m, r.max) + '</p></div></div>' +
      '<div class="nx-dwrap">' + svg + '<div class="nx-tip" hidden></div></div>' +
      '<div class="nx-dlegend"><span><i></i>' + esc(NM(code)) + '</span>' + (c.ref ? '<span><i class="us"></i>' + esc(T('United States')) + '</span>' : '') + '</div>' +
      '<div class="lx-export"><button type="button" class="btn" id="nx-dl-state">' + esc(T('{s} history (CSV)', { s: NM(code) })) + '</button></div>';
    $('nx-dl-state').addEventListener('click', function () { saveHistory(code); });
    var wrap = elDetail.querySelector('.nx-dwrap'), svgEl = wrap.querySelector('svg'), dt = wrap.querySelector('.nx-tip'), cross = svgEl.querySelector('.cross');
    var move = function (clientX) {
      var b = svgEl.getBoundingClientRect(), sx = (clientX - b.left) / b.width * W;
      var k = Math.max(0, Math.min(n - 1, Math.round((sx - pl) / (W - pl - pr) * (n - 1)))), o = pts[k];
      cross.setAttribute('x1', X(k)); cross.setAttribute('x2', X(k)); cross.setAttribute('visibility', 'visible');
      dt.innerHTML = '<b>' + esc(periodLabel(o.p)) + '</b><div><span>' + esc(NM(code)) + '</span><span>' + fmt(m, o.v) + '</span></div>' + (c.ref ? '<div><span>' + esc(T('United States')) + '</span><span>' + fmt(m, o.u) + '</span></div>' : '');
      dt.hidden = false;
      var w = dt.offsetWidth, px = X(k) / W * b.width;
      dt.style.left = Math.max(0, Math.min(b.width - w, px - w / 2)) + 'px'; dt.style.top = (-dt.offsetHeight - 6) + 'px';
    };
    svgEl.addEventListener('mousemove', function (e) { move(e.clientX); });
    svgEl.addEventListener('touchstart', function (e) { move(e.touches[0].clientX); }, { passive: true });
    svgEl.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
    svgEl.addEventListener('mouseleave', function () { dt.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  }

  /* ---------- Controls ---------- */
  elM.addEventListener('change', function () { st.m = elM.value; syncControls(); render(); });
  function years(e) {
    var a = +elFrom.value, b = +elTo.value;
    if (a > b) { if (e.target === elFrom) b = a; else a = b; elFrom.value = a; elTo.value = b; }
    st.from = a; st.to = b; render();
  }
  elFrom.addEventListener('change', years); elTo.addEventListener('change', years);
  function onSeg(id, attr, key, num) {
    var g = $(id); if (!g) return;
    g.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st[key] = num ? +b.getAttribute(attr) : b.getAttribute(attr); pressed(id, attr, st[key]); remember(); render(); });
  }
  onSeg('nx-q', 'data-q', 'q', true); onSeg('nx-dollars', 'data-d', 'dollars'); onSeg('nx-wh', 'data-w', 'whisk'); onSeg('nx-sort', 'data-s', 'sort'); onSeg('nx-mode', 'data-m', 'mode');

  /* ---------- Downloads ---------- */
  function cell(v) { var s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function saveCSV(name, header, rows, notes) {
    var lines = notes.map(function (n) { return '# ' + n; });
    lines.push(header.map(cell).join(','));
    rows.forEach(function (r) { lines.push(r.map(cell).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  var CITE = 'Source: USDA National Agricultural Statistics Service (NASS), ' + (DATA.source && DATA.source.name ? DATA.source.name.replace(/^USDA National Agricultural Statistics Service,\s*/, '') : '') + '. Compiled by The Hive Atlas, https://thehiveatlas.com';
  function raw(v, d) { return v == null ? '' : Math.round(v * Math.pow(10, d)) / Math.pow(10, d); }
  function dollarsNote() { return SRC === 'honey' ? (st.dollars === 'real' ? 'Prices and values in ' + BASE + ' dollars (CPI-U adjusted)' : 'Prices and values as reported, not adjusted for inflation') : null; }
  $('nx-dl-table').addEventListener('click', function () {
    var m = st.m, d = M[m].kind === 'count' ? 0 : 2, yrs = st.from + '-' + st.to;
    var rows = (cur.us ? [['United States', 'US', cur.us]] : []).concat(cur.rows.map(function (r) { return [DATA.names[r.code], r.code, r]; }))
      .map(function (x) { var r = x[2]; return [x[0], x[1], raw(r.mean, d), raw(r.min, d), periodLabelEn(r.minP), raw(r.max, d), periodLabelEn(r.maxP), raw(r.sd, d), r.n, cur.expected]; });
    var notes = [CITE, 'Measure: ' + M[m].label + ' (' + M[m].unit.replace('thousand colonies', 'colonies').replace('million lb', 'lb').replace('million $', '$') + ')',
      'Years ' + st.from + ' to ' + st.to + (hasQ ? ', ' + (st.q ? QNAME[st.q] + ' quarters only' : 'all quarters') : '') + '; average, lowest, highest and standard deviation over the ' + (quarterly() ? 'quarters' : 'years') + ' with data',
      'Other States is not included'];
    if (dollarsNote() && M[m].dollars) notes.push(dollarsNote());
    if (hasQ && M[m].kind === 'pct') notes.push('Values NASS published as less than 0.5% are counted as 0.25%; corrected values are used where NASS percents contradict its own counts');
    saveCSV('hive-atlas-' + (SRC === 'honey' ? 'honey' : 'losses') + '-' + m + '-' + yrs + (hasQ && st.q ? '-q' + st.q : '') + (M[m].dollars ? '-' + st.dollars : '') + '.csv',
      ['state', 'state_abbr', 'average', 'lowest', 'lowest_period', 'highest', 'highest_period', 'std_dev', (quarterly() ? 'quarters' : 'years') + '_with_data', 'periods_selected'], rows, notes);
  });
  function periodLabelEn(p) { return p ? (SRC === 'honey' ? String(p.year) : p.year + '-Q' + p.q) : ''; }
  function saveHistory(code) {
    var flds = F.slice(), rows = [];
    PER.forEach(function (p) {
      var row = DATA.values[code] && DATA.values[code][p.id]; if (!row) return;
      var cor = SRC !== 'honey' && DATA.corrections && DATA.corrections[p.id] && DATA.corrections[p.id][code];
      rows.push([DATA.names[code], code, periodLabelEn(p)].concat(row.map(function (v, i) {
        if (cor && cor[flds[i]] && cor[flds[i]].value != null) return cor[flds[i]].value;
        return v === -1 ? '<0.5' : v;
      })).concat(SRC !== 'honey' ? [cor ? Object.keys(cor).join(' ') : ''] : []));
    });
    saveCSV('hive-atlas-' + (SRC === 'honey' ? 'honey' : 'losses') + '-' + code + '-history.csv', ['state', 'state_abbr', SRC === 'honey' ? 'year' : 'quarter'].concat(flds).concat(SRC !== 'honey' ? ['corrected_fields'] : []), rows,
      [CITE, SRC === 'honey' ? 'Dollar columns ending in _real are in ' + BASE + ' dollars (CPI-U adjusted); the others are as reported' : '<0.5 means NASS published less than half of one percent; corrected_fields lists values recalculated from NASS’s own counts (see About This Data)']);
  }

  /* ---------- Page summary for the latest period ---------- */
  function titleCase(s) {
    if (LANG !== 'en') return s;
    var small = { a: 1, an: 1, and: 1, as: 1, at: 1, by: 1, for: 1, in: 1, of: 1, on: 1, or: 1, the: 1, to: 1 };
    return s.split(' ').map(function (w, i) { return i && small[w] ? w : w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function dropLastSentence(s) {
    var t = s.replace(/\s+$/, ''), i = Math.max(t.lastIndexOf('. ', t.length - 2), t.lastIndexOf('。'));
    return i > 0 ? t.slice(0, i + 1) : t;
  }
  var LOCALE = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-u-nu-latn' }[LANG] || 'en-US';
  // "January–March 2026" in the page language
  function quarterLong(p) {
    if (LANG === 'en') return p.label;
    var mo = function (i) { try { return new Date(2000, i, 15).toLocaleDateString(LOCALE, { month: 'long' }); } catch (e) { return ''; } };
    return mo((p.q - 1) * 3) + '–' + mo((p.q - 1) * 3 + 2) + ' ' + p.year;
  }
  var rel = DATA.source && DATA.source.release ? new Date(DATA.source.release + 'T12:00:00').toLocaleDateString(LOCALE, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  (function summary() {
    var sum = document.getElementById('lx-summary'), note = document.getElementById('lx-note');
    var pub = function (m, p) { return STATES.filter(function (c) { var r = DATA.values[c] && DATA.values[c][p.id]; return r && r[F.indexOf(m)] != null && r[F.indexOf(m)] >= -1; }); };
    var keepD = st.dollars; st.dollars = 'nominal';
    var html = '';
    if (SRC === 'honey') {
      var p = PER[PER.length - 1], v = function (c, m) { return value(c, p, m); };
      var ps = pub('yield_lb', p).sort(function (a, b) { return v(b, 'yield_lb') - v(a, 'yield_lb'); });
      var top = pub('production_lb', p).sort(function (a, b) { return v(b, 'production_lb') - v(a, 'production_lb'); })[0];
      var lb = function (x) { return I.T('{n} lb', { n: N(x, Math.round(x) === x ? 0 : 1) }); };
      var usd = function (x) { return LANG === 'fr' || LANG === 'es' ? N(x, 2) + ' $' : '$' + N(x, 2); };
      html = dropLastSentence(I.T('In {y}, U.S. beekeeping operations with five or more colonies produced <strong>{p}</strong> of honey from {c} colonies, about <strong>{yl}</strong> per colony, and were paid an average of <strong>{pr}</strong> a pound. {top} produced the most honey. Among the {k} states NASS published separately, honey per colony was highest in <strong>{hi}</strong> ({hv}) and lowest in <strong>{lo}</strong> ({lv}). Click any state on the map, or pick one from the table, to see its numbers.',
        { y: p.year, p: I.T('{n} million lb', { n: N(v('US', 'production_lb') / 1e6, 1) }), c: N(Math.round(v('US', 'colonies') / 100) * 100), yl: lb(v('US', 'yield_lb')), pr: usd(v('US', 'price_usd_lb')), top: NM(top), k: ps.length,
          hi: NM(ps[0]), hv: lb(v(ps[0], 'yield_lb')), lo: NM(ps[ps.length - 1]), lv: lb(v(ps[ps.length - 1], 'yield_lb')) }));
      if (note) note.textContent = T(rel ? 'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}. Latest report released {d}.' : 'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}.', { a: PER[0].year, b: p.year, d: rel });
    } else {
      var q = PER[PER.length - 1], g = function (c, m) { return value(c, q, m); };
      var pl = pub('pct_lost', q).sort(function (a, b) { return g(b, 'pct_lost') - g(a, 'pct_lost'); });
      var STR = ['varroa', 'other_pests', 'diseases', 'pesticides', 'other', 'unknown'], SHORT = { varroa: 'Varroa', other_pests: 'Other pests', diseases: 'Diseases', pesticides: 'Pesticides', other: 'Other causes', unknown: 'Unknown' };
      var topS = STR.slice().sort(function (a, b) { return g('US', b) - g('US', a); })[0];
      var pc = function (x, d) { return x < 0.5 ? '<' + I.PCT(0.5, 1) : I.PCT(x, d); };
      html = dropLastSentence(I.T('In {q}, U.S. beekeeping operations with five or more colonies lost <strong>{p}</strong> of their colonies, about <strong>{n}</strong>. Among the {k} states NASS published separately, losses were highest in <strong>{hi}</strong> ({hv}) and lowest in <strong>{lo}</strong> ({lv}). {s} was the most common stressor, affecting <strong>{sv}</strong> of colonies. Click any state on the map, or pick one from the table, to see its numbers.',
        { q: quarterLong(q), p: pc(g('US', 'pct_lost'), 0), n: N(g('US', 'colonies_lost')), k: pl.length, hi: NM(pl[0]), hv: pc(g(pl[0], 'pct_lost'), 0), lo: NM(pl[pl.length - 1]), lv: pc(g(pl[pl.length - 1], 'pct_lost'), 0),
          s: I.T(SHORT[topS]), sv: pc(g('US', topS), 1) }));
      if (note) note.textContent = T(rel ? 'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}. Latest report released {d}.' : 'Data from the USDA National Agricultural Statistics Service (NASS), {a} through {b}.', { a: quarterLong(PER[0]), b: quarterLong(q), d: rel });
    }
    st.dollars = keepD;
    if (sum) sum.innerHTML = html + ' ' + esc(T('Click any state in the chart below to see its history.'));
    var built = document.getElementById('lx-built');
    if (built && DATA.source && DATA.source.built) built.textContent = I.T('Data last updated on this site {d}.', { d: new Date(DATA.source.built + 'T12:00:00').toLocaleDateString(LOCALE, { year: 'numeric', month: 'long', day: 'numeric' }) });
  })();

  /* ---------- Tabs: State Chart / About This Data ---------- */
  var tabs = [$('tab-chart'), $('tab-about')].filter(Boolean);
  function isAbout(h) { return h === 'about' || h.indexOf('ab-') === 0; }
  function showTab(name, scroll) {
    host.hidden = name !== 'chart';
    var ab = $('about'); if (ab) ab.hidden = name !== 'about';
    tabs.forEach(function (t) { var on = t.getAttribute('data-tab') === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    if (scroll) {
      var top = document.querySelector('.lx-tabs').getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'auto' });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      var name = t.getAttribute('data-tab'); showTab(name, false);
      try { history.replaceState(null, '', name === 'about' ? '#about' : location.pathname + location.search); } catch (e) {}
    });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var o = tabs[(i + 1) % tabs.length]; o.focus(); o.click();
    });
  });
  document.querySelectorAll('[data-open-about]').forEach(function (b) {
    b.addEventListener('click', function () { showTab('about', true); try { history.replaceState(null, '', '#about'); } catch (e) {} });
  });
  window.addEventListener('hashchange', function () { showTab(isAbout(location.hash.slice(1)) ? 'about' : 'chart', false); });

  syncControls(); render();
  showTab(isAbout(location.hash.slice(1)) ? 'about' : 'chart', false);
  if (location.hash.slice(1).indexOf('ab-') === 0) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();
