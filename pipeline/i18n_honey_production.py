"""French, Spanish and Arabic text for the Honey Production page and the NASS Data menu.

Run once after editing to merge these entries into js/lang/fr.js, es.js and ar.js:
    python3 pipeline/i18n_honey_production.py

English is the key; existing entries with the same key are replaced. These translations were drafted
by Claude and should be reviewed by a fluent reader before publishing.
"""
import json
import os
import sys

# Text in the page's HTML (matched against each element's inner HTML)
STATIC = {
    'NASS Data': ('Données NASS', 'Datos del NASS', 'بيانات NASS'),
    'NASS Colony Losses': ('Pertes de colonies (NASS)', 'Pérdidas de colonias (NASS)', 'خسائر الطوائف (NASS)'),
    'NASS Honey Production': ('Production de miel (NASS)', 'Producción de miel (NASS)', 'إنتاج العسل (NASS)'),
    'NASS honey production data.': ('Données de la NASS sur la production de miel.', 'Datos del NASS sobre producción de miel.', 'بيانات NASS عن إنتاج العسل.'),
    'Honey production': ('Production de miel', 'Producción de miel', 'إنتاج العسل'),
    'Yearly honey production, yield per colony, prices, and stocks reported by U.S. beekeeping operations, by state.': (
        'Production annuelle de miel, rendement par colonie, prix et stocks déclarés par les exploitations apicoles des États-Unis, par État.',
        'Producción anual de miel, rendimiento por colonia, precios y existencias declarados por las explotaciones apícolas de EE. UU., por estado.',
        'الإنتاج السنوي للعسل، والإنتاج لكل طائفة، والأسعار، والمخزون، كما أبلغت عنها منشآت تربية النحل في الولايات المتحدة، حسب الولاية.'),
    'Multi-year average': ('Moyenne pluriannuelle', 'Promedio de varios años', 'متوسط عدة سنوات'),
    'Prices and values': ('Prix et valeurs', 'Precios y valores', 'الأسعار والقيم'),
    'In 2025 dollars': ('En dollars de 2025', 'En dólares de 2025', 'بدولارات 2025'),
    'As reported': ('Tels que publiés', 'Según lo publicado', 'كما نُشرت'),
    'Honey per colony': ('Miel par colonie', 'Miel por colonia', 'العسل لكل طائفة'),
    'Color ranges stay the same for every year, so you can compare across years.': (
        'Les plages de couleurs restent les mêmes pour chaque année, ce qui permet de comparer les années entre elles.',
        'Los rangos de color son los mismos para todos los años, para que pueda compararlos entre sí.',
        'تبقى نطاقات الألوان نفسها في كل سنة، لتتمكن من المقارنة بين السنوات.'),
    'Download': ('Télécharger', 'Descargar', 'تنزيل'),
    'This table (CSV)': ('Ce tableau (CSV)', 'Esta tabla (CSV)', 'هذا الجدول (CSV)'),
    'All states, all years (CSV)': ('Tous les États, toutes les années (CSV)', 'Todos los estados, todos los años (CSV)', 'كل الولايات وكل السنوات (CSV)'),
    'Want the definitions, how prices are adjusted for inflation, and why some states are grouped? <button type="button" class="lx-link" data-open-about="">Read about this map</button>': (
        'Vous voulez les définitions, la façon dont les prix sont corrigés de l’inflation et la raison pour laquelle certains États sont regroupés ? <button type="button" class="lx-link" data-open-about="">Lire à propos de cette carte</button>',
        '¿Quiere las definiciones, cómo se ajustan los precios a la inflación y por qué se agrupan algunos estados? <button type="button" class="lx-link" data-open-about="">Leer sobre este mapa</button>',
        'هل تريد التعريفات، وطريقة تعديل الأسعار وفق التضخم، وسبب تجميع بعض الولايات؟ <button type="button" class="lx-link" data-open-about="">اقرأ عن هذه الخريطة</button>'),
    'Adjusting for inflation': ('Correction de l’inflation', 'Ajuste por inflación', 'التعديل وفق التضخم'),
    'Multi-year averages': ('Moyennes pluriannuelles', 'Promedios de varios años', 'متوسطات عدة سنوات'),
    'U.S. totals': ('Totaux des États-Unis', 'Totales de EE. UU.', 'إجماليات الولايات المتحدة'),
    'Downloads': ('Téléchargements', 'Descargas', 'التنزيلات'),
    'How much honey U.S. beekeepers produced each year, state by state, how much each colony made, what beekeepers were paid for it, and how much honey they still held at the end of the year. The numbers come from the annual Honey report of the USDA National Agricultural Statistics Service (NASS), which covers every year since 1987.': (
        'La quantité de miel produite chaque année par les apiculteurs des États-Unis, État par État, ce que chaque colonie a produit, le prix payé aux apiculteurs et la quantité de miel encore en stock en fin d’année. Les chiffres proviennent du rapport annuel Honey du Service national des statistiques agricoles (NASS) de l’USDA, qui couvre chaque année depuis 1987.',
        'Cuánta miel produjeron cada año los apicultores de EE. UU., estado por estado, cuánto produjo cada colonia, cuánto se les pagó y cuánta miel conservaban aún al final del año. Las cifras proceden del informe anual Honey del Servicio Nacional de Estadísticas Agrícolas (NASS) del USDA, que abarca todos los años desde 1987.',
        'كمية العسل التي أنتجها مربو النحل في الولايات المتحدة كل عام، ولاية بولاية، وما أنتجته كل طائفة، والسعر الذي حصل عليه مربو النحل، وكمية العسل التي بقيت لديهم في نهاية العام. تأتي الأرقام من تقرير العسل السنوي الصادر عن الدائرة الوطنية للإحصاءات الزراعية (NASS) التابعة لوزارة الزراعة الأمريكية، والذي يغطي كل عام منذ 1987.'),
    'NASS surveys a sample of operations with five or more colonies that qualify as farms, meaning they sold, or would normally sell, at least $1,000 of agricultural products a year. Each year’s report comes out in March and covers the previous year’s honey crop.': (
        'La NASS interroge un échantillon d’exploitations de cinq colonies ou plus considérées comme des fermes, c’est-à-dire qui ont vendu, ou vendraient normalement, au moins 1 000 $ de produits agricoles par an. Le rapport paraît chaque année en mars et porte sur la récolte de miel de l’année précédente.',
        'El NASS encuesta una muestra de explotaciones con cinco o más colonias que se consideran granjas, es decir, que vendieron, o venderían normalmente, al menos 1.000 dólares en productos agrícolas al año. El informe se publica cada marzo y abarca la cosecha de miel del año anterior.',
        'تستطلع NASS عينة من المنشآت التي تضم خمس طوائف أو أكثر وتُعدّ مزارع، أي أنها باعت، أو كانت ستبيع عادةً، منتجات زراعية بقيمة 1,000 دولار على الأقل في السنة. يصدر التقرير كل عام في مارس ويغطي محصول العسل للعام السابق.'),
    '<strong>Color the map by</strong> picks the measure. Honey per colony comes first because it compares fairly across states of any size and is the number most beekeepers can hold up against their own hives.': (
        '<strong>Colorer la carte selon</strong> choisit la mesure. Le miel par colonie vient en premier, car il permet de comparer équitablement des États de toutes tailles et c’est le chiffre que la plupart des apiculteurs peuvent comparer à leurs propres ruches.',
        '<strong>Colorear el mapa por</strong> elige la medida. La miel por colonia aparece primero porque permite comparar con justicia estados de cualquier tamaño y es la cifra que la mayoría de los apicultores puede comparar con sus propias colmenas.',
        '<strong>تلوين الخريطة حسب</strong> يحدد المقياس. يأتي العسل لكل طائفة أولًا لأنه يتيح مقارنة عادلة بين الولايات مهما كان حجمها، وهو الرقم الذي يستطيع معظم مربي النحل مقارنته بخلاياهم.'),
    '<strong>Time period</strong> shows a single year or an average over several years. Use the arrows to step through years one at a time.': (
        '<strong>Période</strong> affiche une seule année ou une moyenne sur plusieurs années. Utilisez les flèches pour passer d’une année à l’autre.',
        '<strong>Periodo</strong> muestra un solo año o un promedio de varios años. Use las flechas para avanzar de un año en uno.',
        '<strong>الفترة</strong> تعرض سنة واحدة أو متوسطًا لعدة سنوات. استخدم الأسهم للتنقل بين السنوات واحدة تلو الأخرى.'),
    '<strong>Prices and values</strong> shows dollar amounts either adjusted for inflation to 2025 dollars (the default) or as NASS reported them. See <a href="#ab-inflation">Adjusting for inflation</a>.': (
        '<strong>Prix et valeurs</strong> affiche les montants en dollars soit corrigés de l’inflation en dollars de 2025 (par défaut), soit tels que la NASS les a publiés. Voir <a href="#ab-inflation">Correction de l’inflation</a>.',
        '<strong>Precios y valores</strong> muestra los importes en dólares ajustados por inflación a dólares de 2025 (opción predeterminada) o según los publicó el NASS. Vea <a href="#ab-inflation">Ajuste por inflación</a>.',
        '<strong>الأسعار والقيم</strong> تعرض المبالغ بالدولار إما معدّلة وفق التضخم بدولارات 2025 (الإعداد الافتراضي) أو كما نشرتها NASS. انظر <a href="#ab-inflation">التعديل وفق التضخم</a>.'),
    '<strong>Click a state</strong> to see its numbers, its rank, how it compares with the U.S., and its trend since 1987. Click a bar in the trend chart to jump the map to that year.': (
        '<strong>Cliquez sur un État</strong> pour voir ses chiffres, son rang, sa comparaison avec les États-Unis et son évolution depuis 1987. Cliquez sur une barre du graphique pour afficher cette année sur la carte.',
        '<strong>Haga clic en un estado</strong> para ver sus cifras, su posición, cómo se compara con EE. UU. y su evolución desde 1987. Haga clic en una barra del gráfico para llevar el mapa a ese año.',
        '<strong>انقر على ولاية</strong> لعرض أرقامها وترتيبها ومقارنتها بالولايات المتحدة واتجاهها منذ 1987. انقر على شريط في الرسم البياني لنقل الخريطة إلى تلك السنة.'),
    '<strong>Download</strong> the table you are looking at, a state’s full history from its panel, or the complete dataset. See <a href="#ab-download">Downloads</a>.': (
        '<strong>Téléchargez</strong> le tableau affiché, l’historique complet d’un État depuis son panneau, ou le jeu de données complet. Voir <a href="#ab-download">Téléchargements</a>.',
        '<strong>Descargue</strong> la tabla que está viendo, el historial completo de un estado desde su panel o el conjunto de datos completo. Vea <a href="#ab-download">Descargas</a>.',
        '<strong>نزّل</strong> الجدول المعروض، أو السجل الكامل لولاية من لوحتها، أو مجموعة البيانات كاملة. انظر <a href="#ab-download">التنزيلات</a>.'),
    'Pounds of honey produced per honey-producing colony (NASS calls this yield per colony).': (
        'Livres de miel produites par colonie productrice de miel (la NASS parle de rendement par colonie).',
        'Libras de miel producidas por colonia productora de miel (el NASS lo llama rendimiento por colonia).',
        'أرطال العسل المنتجة لكل طائفة منتجة للعسل (تسميه NASS الإنتاج لكل طائفة).'),
    'lb per colony': ('lb par colonie', 'lb por colonia', 'رطل لكل طائفة'),
    'Honey produced': ('Miel produit', 'Miel producida', 'العسل المنتج'),
    'Total pounds of honey produced in the state that year.': (
        'Nombre total de livres de miel produites dans l’État cette année-là.',
        'Total de libras de miel producidas en el estado ese año.',
        'إجمالي أرطال العسل المنتجة في الولاية في تلك السنة.'),
    'lb': ('lb', 'lb', 'رطل'),
    'Honey-producing colonies': ('Colonies productrices de miel', 'Colonias productoras de miel', 'الطوائف المنتجة للعسل'),
    'The most colonies honey was taken from during the year. A colony that died later in the year still counts if honey was taken from it. This is not the same as the colony counts on the Colony Losses page.': (
        'Le nombre maximal de colonies dont on a récolté le miel pendant l’année. Une colonie morte plus tard dans l’année compte quand même si son miel a été récolté. Ce n’est pas le même nombre que celui de la page Pertes de colonies.',
        'El mayor número de colonias de las que se cosechó miel durante el año. Una colonia que murió más tarde en el año cuenta igualmente si se cosechó miel de ella. No es el mismo recuento que el de la página Pérdidas de colonias.',
        'أكبر عدد من الطوائف التي جُني منها العسل خلال السنة. تُحتسب الطائفة التي نفقت لاحقًا في السنة إذا كان قد جُني منها العسل. وهذا ليس العدد نفسه المعروض في صفحة خسائر الطوائف.'),
    'Average price per pound': ('Prix moyen par livre', 'Precio medio por libra', 'متوسط السعر للرطل'),
    'The average price beekeepers received, weighted across the ways they sold honey (co-ops, private buyers, and retail).': (
        'Le prix moyen reçu par les apiculteurs, pondéré selon leurs circuits de vente (coopératives, acheteurs privés et vente au détail).',
        'El precio medio que recibieron los apicultores, ponderado según sus canales de venta (cooperativas, compradores privados y venta al por menor).',
        'متوسط السعر الذي حصل عليه مربو النحل، مرجّحًا حسب قنوات البيع (التعاونيات، والمشترون من القطاع الخاص، والبيع بالتجزئة).'),
    '$ per lb': ('$ par lb', '$ por lb', 'دولار للرطل'),
    'Value of honey produced': ('Valeur du miel produit', 'Valor de la miel producida', 'قيمة العسل المنتج'),
    'Honey produced multiplied by the average price per pound.': (
        'Le miel produit multiplié par le prix moyen par livre.',
        'La miel producida multiplicada por el precio medio por libra.',
        'العسل المنتج مضروبًا في متوسط السعر للرطل.'),
    '$': ('$', '$', 'دولار'),
    'Stocks held by producers': ('Stocks détenus par les producteurs', 'Existencias en manos de los productores', 'المخزون لدى المنتجين'),
    'Honey beekeepers still held on December 15, not counting honey under the federal commodity loan program.': (
        'Le miel encore détenu par les apiculteurs au 15 décembre, hors miel engagé dans le programme fédéral de prêts sur marchandises.',
        'La miel que los apicultores aún tenían el 15 de diciembre, sin contar la miel acogida al programa federal de préstamos sobre productos.',
        'العسل الذي كان لا يزال لدى مربي النحل في 15 ديسمبر، دون احتساب العسل المشمول ببرنامج القروض الفيدرالي على السلع.'),
    'A dollar in 1987 bought about 2.8 times what it buys today, so prices as reported make honey look far more valuable now than it was. By default, the map shows prices and values in <strong>2025 dollars</strong>, so every year can be compared fairly.': (
        'Un dollar de 1987 achetait environ 2,8 fois plus qu’aujourd’hui ; les prix tels que publiés font donc paraître le miel bien plus précieux aujourd’hui qu’autrefois. Par défaut, la carte affiche les prix et les valeurs en <strong>dollars de 2025</strong>, pour comparer équitablement toutes les années.',
        'Un dólar de 1987 compraba unas 2,8 veces lo que compra hoy, así que los precios publicados hacen que la miel parezca mucho más valiosa ahora que antes. De forma predeterminada, el mapa muestra precios y valores en <strong>dólares de 2025</strong>, para comparar todos los años con justicia.',
        'كان دولار عام 1987 يشتري نحو 2.8 ضعف ما يشتريه اليوم، لذا تجعل الأسعار المنشورة العسل يبدو أعلى قيمة الآن بكثير مما كان. تعرض الخريطة افتراضيًا الأسعار والقيم <strong>بدولارات 2025</strong> لتتيح مقارنة عادلة بين السنوات.'),
    '<strong>How it’s calculated.</strong> Each year’s dollars are multiplied by the 2025 Consumer Price Index divided by that year’s index, using the yearly average of the CPI for All Urban Consumers (CPI-U) from the Bureau of Labor Statistics. For example, the U.S. price in 1987 was <strong>$0.50</strong> a pound as reported, which is <strong>$1.43</strong> in 2025 dollars (0.503 × 321.9 ÷ 113.6).': (
        '<strong>Mode de calcul.</strong> Les dollars de chaque année sont multipliés par l’indice des prix à la consommation de 2025 divisé par l’indice de l’année, en utilisant la moyenne annuelle du CPI pour l’ensemble des consommateurs urbains (CPI-U) du Bureau of Labor Statistics. Par exemple, le prix aux États-Unis en 1987 était de <strong>0,50 $</strong> la livre tel que publié, soit <strong>1,43 $</strong> en dollars de 2025 (0,503 × 321,9 ÷ 113,6).',
        '<strong>Cómo se calcula.</strong> Los dólares de cada año se multiplican por el índice de precios al consumidor de 2025 dividido por el índice de ese año, usando el promedio anual del CPI para todos los consumidores urbanos (CPI-U) de la Oficina de Estadísticas Laborales. Por ejemplo, el precio en EE. UU. en 1987 fue de <strong>0,50 $</strong> la libra según lo publicado, que equivale a <strong>1,43 $</strong> en dólares de 2025 (0,503 × 321,9 ÷ 113,6).',
        '<strong>طريقة الحساب.</strong> تُضرب دولارات كل سنة في مؤشر أسعار المستهلك لعام 2025 مقسومًا على مؤشر تلك السنة، باستخدام المتوسط السنوي لمؤشر أسعار المستهلك لجميع المستهلكين في المدن (CPI-U) الصادر عن مكتب إحصاءات العمل. على سبيل المثال، كان السعر في الولايات المتحدة عام 1987 <strong>0.50 دولار</strong> للرطل كما نُشر، أي <strong>1.43 دولار</strong> بدولارات 2025 (0.503 × 321.9 ÷ 113.6).'),
    'The CPI measures what households pay for everything they buy, not what it costs to keep bees, so the adjusted price shows honey’s buying power, not beekeepers’ profit. Switch to <strong>As reported</strong> to see NASS’s figures unchanged. The downloads include both.': (
        'Le CPI mesure ce que les ménages paient pour l’ensemble de leurs achats, et non le coût de l’apiculture ; le prix corrigé indique donc le pouvoir d’achat du miel, pas le bénéfice des apiculteurs. Choisissez <strong>Tels que publiés</strong> pour voir les chiffres de la NASS sans modification. Les téléchargements contiennent les deux.',
        'El CPI mide lo que pagan los hogares por todo lo que compran, no lo que cuesta mantener abejas, así que el precio ajustado muestra el poder adquisitivo de la miel, no la ganancia de los apicultores. Elija <strong>Según lo publicado</strong> para ver las cifras del NASS sin cambios. Las descargas incluyen ambas.',
        'يقيس مؤشر أسعار المستهلك ما تدفعه الأسر مقابل كل مشترياتها، لا تكلفة تربية النحل، لذا يُظهر السعر المعدّل القوة الشرائية للعسل لا ربح مربي النحل. اختر <strong>كما نُشرت</strong> لرؤية أرقام NASS دون تغيير. وتتضمن التنزيلات كليهما.'),
    'Honey crops swing with weather, forage, and colony health, so a single year can be misleading, especially for smaller states. The multi-year view averages several years to show how each state typically does.': (
        'Les récoltes de miel varient selon la météo, les ressources florales et la santé des colonies ; une seule année peut donc être trompeuse, surtout pour les petits États. La vue pluriannuelle fait la moyenne de plusieurs années pour montrer les résultats habituels de chaque État.',
        'Las cosechas de miel varían con el clima, la floración y la salud de las colonias, así que un solo año puede inducir a error, sobre todo en los estados pequeños. La vista de varios años promedia varios años para mostrar el resultado habitual de cada estado.',
        'تتقلب محاصيل العسل مع الطقس والمراعي وصحة الطوائف، لذا قد تكون سنة واحدة مضللة، خاصة في الولايات الأصغر. تعرض طريقة عرض المتوسط متوسط عدة سنوات لإظهار الأداء المعتاد لكل ولاية.'),
    '<strong>Each value is the average of the yearly values</strong> in the window. For honey per colony, that is the typical yield of a year in that state.': (
        '<strong>Chaque valeur est la moyenne des valeurs annuelles</strong> de la période. Pour le miel par colonie, c’est le rendement d’une année typique dans cet État.',
        '<strong>Cada valor es el promedio de los valores anuales</strong> del periodo. Para la miel por colonia, es el rendimiento de un año típico en ese estado.',
        '<strong>كل قيمة هي متوسط القيم السنوية</strong> في الفترة. وبالنسبة إلى العسل لكل طائفة، فهي الإنتاج المعتاد لسنة في تلك الولاية.'),
    '<strong>The windows end in <span class="ab-common">2023</span></strong>, the last year most states were published separately, so every state is compared over the same years. One more option, each state’s full record, uses every year a state was published, including 2024 and later for the 20 states still published.': (
        '<strong>Les périodes se terminent en <span class="ab-common">2023</span></strong>, dernière année où la plupart des États étaient publiés séparément, afin de comparer tous les États sur les mêmes années. Une autre option, l’historique complet de chaque État, utilise toutes les années publiées pour un État, y compris 2024 et après pour les 20 États encore publiés.',
        '<strong>Los periodos terminan en <span class="ab-common">2023</span></strong>, el último año en que la mayoría de los estados se publicó por separado, para comparar todos los estados en los mismos años. Otra opción, el historial completo de cada estado, usa todos los años en que se publicó un estado, incluidos 2024 y posteriores para los 20 estados que aún se publican.',
        '<strong>تنتهي الفترات في <span class="ab-common">2023</span></strong>، وهي آخر سنة نُشرت فيها معظم الولايات منفصلة، لتُقارن كل الولايات على السنوات نفسها. وهناك خيار آخر، السجل الكامل لكل ولاية، يستخدم كل سنة نُشرت فيها الولاية، بما في ذلك 2024 وما بعدها للولايات العشرين التي لا تزال تُنشر.'),
    '<strong>A state needs at least 80% of the years</strong> in a window to get a value.': (
        '<strong>Un État doit avoir au moins 80 % des années</strong> d’une période pour obtenir une valeur.',
        '<strong>Un estado necesita al menos el 80 % de los años</strong> de un periodo para tener un valor.',
        '<strong>تحتاج الولاية إلى 80% على الأقل من السنوات</strong> في الفترة لتحصل على قيمة.'),
    'Why some states are in Other States': ('Pourquoi certains États sont dans Autres États', 'Por qué algunos estados están en Otros estados', 'لماذا تُدرج بعض الولايات ضمن ولايات أخرى'),
    'NASS combines states it doesn’t publish separately into a single <strong>Other States</strong> group. From 1987 to 1990 it published 49 states individually. Through 2023 it published 40 to 45, and starting with the 2024 crop it publishes 20. NASS’s report says only that Other States includes the states not shown in its table.': (
        'La NASS regroupe les États qu’elle ne publie pas séparément dans un seul groupe <strong>Autres États</strong>. De 1987 à 1990, elle publiait 49 États séparément. Jusqu’en 2023, elle en publiait de 40 à 45 et, à partir de la récolte 2024, elle en publie 20. Le rapport de la NASS indique seulement qu’Autres États comprend les États absents de son tableau.',
        'El NASS reúne los estados que no publica por separado en un único grupo, <strong>Otros estados</strong>. De 1987 a 1990 publicó 49 estados por separado. Hasta 2023 publicó entre 40 y 45, y desde la cosecha de 2024 publica 20. El informe del NASS solo dice que Otros estados incluye los estados que no aparecen en su tabla.',
        'تجمع NASS الولايات التي لا تنشرها منفصلة في مجموعة واحدة هي <strong>ولايات أخرى</strong>. من 1987 إلى 1990 نشرت 49 ولاية منفصلة، وحتى 2023 نشرت ما بين 40 و45، وابتداءً من محصول 2024 تنشر 20 ولاية. ولا يذكر تقرير NASS سوى أن ولايات أخرى تشمل الولايات غير الواردة في جدوله.'),
    'The 20 states still published are California, Florida, Georgia, Idaho, Iowa, Louisiana, Michigan, Minnesota, Mississippi, Montana, New York, North Carolina, North Dakota, Ohio, Oregon, Pennsylvania, South Dakota, Texas, Washington, and Wisconsin. They produce most of the country’s honey.': (
        'Les 20 États encore publiés sont la Californie, la Floride, la Géorgie, l’Idaho, l’Iowa, la Louisiane, le Michigan, le Minnesota, le Mississippi, le Montana, l’État de New York, la Caroline du Nord, le Dakota du Nord, l’Ohio, l’Oregon, la Pennsylvanie, le Dakota du Sud, le Texas, l’État de Washington et le Wisconsin. Ils produisent l’essentiel du miel du pays.',
        'Los 20 estados que aún se publican son California, Florida, Georgia, Idaho, Iowa, Luisiana, Michigan, Minnesota, Misisipi, Montana, Nueva York, Carolina del Norte, Dakota del Norte, Ohio, Oregón, Pensilvania, Dakota del Sur, Texas, Washington y Wisconsin. Producen la mayor parte de la miel del país.',
        'الولايات العشرون التي لا تزال تُنشر هي كاليفورنيا وفلوريدا وجورجيا وأيداهو وآيوا ولويزيانا وميشيغان ومينيسوتا ومسيسيبي ومونتانا ونيويورك ونورث كارولاينا وداكوتا الشمالية وأوهايو وأوريغون وبنسلفانيا وداكوتا الجنوبية وتكساس وواشنطن وويسكونسن. وهي تنتج معظم عسل البلاد.'),
    'Many commercial colonies travel during the year, so the same colony can make honey in more than one state. NASS counts such a colony in every state where it produced honey. Each state’s honey per colony is therefore the honey made in that state divided by the colonies that made honey there.': (
        'De nombreuses colonies commerciales se déplacent pendant l’année ; une même colonie peut donc produire du miel dans plusieurs États. La NASS compte une telle colonie dans chaque État où elle a produit du miel. Le miel par colonie d’un État correspond donc au miel produit dans cet État divisé par les colonies qui y ont produit du miel.',
        'Muchas colonias comerciales se trasladan durante el año, así que una misma colonia puede producir miel en más de un estado. El NASS cuenta esa colonia en cada estado donde produjo miel. Por eso, la miel por colonia de un estado es la miel producida en ese estado dividida entre las colonias que produjeron miel allí.',
        'تتنقل طوائف تجارية كثيرة خلال السنة، لذا قد تنتج الطائفة نفسها العسل في أكثر من ولاية. تحتسب NASS هذه الطائفة في كل ولاية أنتجت فيها العسل. لذلك فإن العسل لكل طائفة في الولاية هو العسل المنتج فيها مقسومًا على الطوائف التي أنتجت العسل هناك.'),
    'This matters most in the Northern Plains. North Dakota, South Dakota, and Montana host large numbers of commercial colonies during their summer honey flow, which is why North Dakota alone produces about a quarter of U.S. honey, and many of those colonies spend winter and almond season in other states. A state’s numbers describe its honey crop, not necessarily how its own beekeepers fared.': (
        'Cela compte surtout dans les Grandes Plaines du Nord. Le Dakota du Nord, le Dakota du Sud et le Montana accueillent un grand nombre de colonies commerciales pendant leur miellée d’été, ce qui explique que le Dakota du Nord produise à lui seul environ un quart du miel des États-Unis ; beaucoup de ces colonies passent l’hiver et la saison des amandes dans d’autres États. Les chiffres d’un État décrivent sa récolte de miel, pas forcément les résultats de ses propres apiculteurs.',
        'Esto importa sobre todo en las Grandes Llanuras del norte. Dakota del Norte, Dakota del Sur y Montana reciben gran número de colonias comerciales durante su floración de verano; por eso Dakota del Norte produce por sí sola cerca de una cuarta parte de la miel de EE. UU., y muchas de esas colonias pasan el invierno y la temporada del almendro en otros estados. Las cifras de un estado describen su cosecha de miel, no necesariamente cómo les fue a sus propios apicultores.',
        'يبرز ذلك أكثر في السهول الشمالية. تستضيف داكوتا الشمالية وداكوتا الجنوبية ومونتانا أعدادًا كبيرة من الطوائف التجارية خلال موسم تدفق الرحيق الصيفي، ولهذا تنتج داكوتا الشمالية وحدها نحو ربع عسل الولايات المتحدة، وتقضي كثير من هذه الطوائف الشتاء وموسم اللوز في ولايات أخرى. تصف أرقام الولاية محصولها من العسل، لا بالضرورة أداء مربي النحل فيها.'),
    '<strong>Honey per colony.</strong> Because a colony that made honey in two states is counted in both, the U.S. colony total counts some colonies twice. NASS notes this makes the U.S. honey per colony read somewhat low. U.S. honey produced is not affected.': (
        '<strong>Miel par colonie.</strong> Comme une colonie ayant produit du miel dans deux États est comptée dans les deux, le total des colonies des États-Unis compte certaines colonies deux fois. La NASS précise que le miel par colonie des États-Unis est donc un peu sous-estimé. Le miel produit aux États-Unis n’est pas touché.',
        '<strong>Miel por colonia.</strong> Como una colonia que produjo miel en dos estados se cuenta en ambos, el total de colonias de EE. UU. cuenta algunas dos veces. El NASS señala que esto hace que la miel por colonia de EE. UU. resulte algo baja. La miel producida en EE. UU. no se ve afectada.',
        '<strong>العسل لكل طائفة.</strong> لأن الطائفة التي أنتجت العسل في ولايتين تُحتسب في كلتيهما، يحتسب إجمالي طوائف الولايات المتحدة بعض الطوائف مرتين. وتشير NASS إلى أن ذلك يجعل العسل لكل طائفة على مستوى الولايات المتحدة أقل قليلًا. ولا يتأثر إجمالي العسل المنتج.'),
    '<strong>Values.</strong> NASS calculates the U.S. value from U.S. production and the U.S. average price, so it won’t exactly equal the sum of the states. Across all years the gap is under 2.5%.': (
        '<strong>Valeurs.</strong> La NASS calcule la valeur pour les États-Unis à partir de la production et du prix moyen nationaux ; elle n’est donc pas exactement égale à la somme des États. Sur toutes les années, l’écart reste inférieur à 2,5 %.',
        '<strong>Valores.</strong> El NASS calcula el valor de EE. UU. a partir de la producción y el precio medio nacionales, así que no coincide exactamente con la suma de los estados. En todos los años la diferencia es menor del 2,5 %.',
        '<strong>القيم.</strong> تحسب NASS قيمة الولايات المتحدة من الإنتاج الوطني ومتوسط السعر الوطني، لذا لا تساوي تمامًا مجموع الولايات. ويبقى الفرق أقل من 2.5% في كل السنوات.'),
    '<strong>Comparing with the U.S.</strong> For honey per colony and price, a state is compared with the U.S. average. For totals, a state is shown as a share of the U.S.': (
        '<strong>Comparaison avec les États-Unis.</strong> Pour le miel par colonie et le prix, un État est comparé à la moyenne des États-Unis. Pour les totaux, un État est présenté comme une part du total national.',
        '<strong>Comparación con EE. UU.</strong> Para la miel por colonia y el precio, cada estado se compara con el promedio de EE. UU. Para los totales, se muestra como porcentaje del total nacional.',
        '<strong>المقارنة بالولايات المتحدة.</strong> في العسل لكل طائفة والسعر، تُقارن الولاية بمتوسط الولايات المتحدة. أما في الإجماليات، فتُعرض الولاية كنسبة من إجمالي الولايات المتحدة.'),
    'Each measure has five color ranges, set from every state’s values across all years. The ranges stay the same as you change years, so a color means the same thing in 1990 and in 2025. Inflation-adjusted and as-reported dollars each have their own ranges.': (
        'Chaque mesure a cinq plages de couleurs, établies à partir des valeurs de tous les États sur toutes les années. Les plages restent les mêmes quand vous changez d’année ; une couleur a donc le même sens en 1990 et en 2025. Les dollars corrigés de l’inflation et les dollars tels que publiés ont chacun leurs propres plages.',
        'Cada medida tiene cinco rangos de color, fijados a partir de los valores de todos los estados en todos los años. Los rangos no cambian al cambiar de año, así que un color significa lo mismo en 1990 y en 2025. Los dólares ajustados por inflación y los publicados tienen cada uno sus propios rangos.',
        'لكل مقياس خمسة نطاقات لونية، تُحدد من قيم كل الولايات في كل السنوات. تبقى النطاقات نفسها عند تغيير السنة، فيحمل اللون المعنى نفسه في 1990 وفي 2025. وللدولارات المعدّلة وفق التضخم والدولارات المنشورة نطاقات خاصة بكل منها.'),
    'Ranks compare a state with the other states published for the same period, and 1 is the highest value. Since only 20 states are published from 2024 on, ranks from those years are out of 20 instead of about 40.': (
        'Le rang compare un État aux autres États publiés pour la même période ; 1 correspond à la valeur la plus élevée. Comme seuls 20 États sont publiés à partir de 2024, les rangs de ces années sont sur 20 au lieu d’environ 40.',
        'La posición compara un estado con los demás estados publicados en el mismo periodo, y 1 es el valor más alto. Como desde 2024 solo se publican 20 estados, las posiciones de esos años son sobre 20 en lugar de unas 40.',
        'يقارن الترتيب الولاية بالولايات الأخرى المنشورة للفترة نفسها، والرقم 1 هو أعلى قيمة. ولأن 20 ولاية فقط تُنشر منذ 2024، فإن الترتيب في تلك السنوات من أصل 20 بدلًا من نحو 40.'),
    'Gray means the state is counted in Other States. Striped means NASS did not publish that number, or, for a multi-year average, that the state was published for too few of the years.': (
        'Le gris signifie que l’État est compté dans Autres États. Les hachures signifient que la NASS n’a pas publié ce chiffre ou, pour une moyenne pluriannuelle, que l’État a été publié pour trop peu d’années.',
        'El gris significa que el estado se cuenta en Otros estados. El rayado significa que el NASS no publicó esa cifra o, en un promedio de varios años, que el estado se publicó en muy pocos de esos años.',
        'يعني اللون الرمادي أن الولاية مُحتسبة ضمن ولايات أخرى. ويعني التخطيط أن NASS لم تنشر ذلك الرقم، أو، في متوسط عدة سنوات، أن الولاية نُشرت في عدد قليل جدًا من السنوات.'),
    '<strong>This table (CSV)</strong> saves the table under the map for the period you’re viewing, with prices and values in the dollars you’ve chosen.': (
        '<strong>Ce tableau (CSV)</strong> enregistre le tableau situé sous la carte pour la période affichée, avec les prix et valeurs dans les dollars choisis.',
        '<strong>Esta tabla (CSV)</strong> guarda la tabla que aparece bajo el mapa para el periodo que está viendo, con precios y valores en los dólares elegidos.',
        '<strong>هذا الجدول (CSV)</strong> يحفظ الجدول الموجود أسفل الخريطة للفترة المعروضة، بالأسعار والقيم في نوع الدولارات الذي اخترته.'),
    '<strong>State history (CSV)</strong>, in each state panel, saves every year for that state.': (
        '<strong>Historique de l’État (CSV)</strong>, dans le panneau de chaque État, enregistre toutes les années de cet État.',
        '<strong>Historial del estado (CSV)</strong>, en el panel de cada estado, guarda todos los años de ese estado.',
        '<strong>سجل الولاية (CSV)</strong>، في لوحة كل ولاية، يحفظ كل السنوات لتلك الولاية.'),
    '<strong>All states, all years (CSV)</strong> is the complete cleaned dataset: one row per state per year, with dollars both as reported and in 2025 dollars, and the CPI values used.': (
        '<strong>Tous les États, toutes les années (CSV)</strong> est le jeu de données complet et nettoyé : une ligne par État et par année, avec les dollars tels que publiés et en dollars de 2025, ainsi que les valeurs du CPI utilisées.',
        '<strong>Todos los estados, todos los años (CSV)</strong> es el conjunto de datos completo y depurado: una fila por estado y año, con dólares según lo publicado y en dólares de 2025, y los valores del CPI utilizados.',
        '<strong>كل الولايات وكل السنوات (CSV)</strong> هي مجموعة البيانات الكاملة المنقحة: صف لكل ولاية في كل سنة، بالدولارات كما نُشرت وبدولارات 2025، مع قيم مؤشر أسعار المستهلك المستخدمة.'),
    'Values are as NASS published them, except that prices before 2018, which NASS reported in cents per pound, are converted to dollars. Please cite USDA NASS as the source and The Hive Atlas as the compiler.': (
        'Les valeurs sont celles publiées par la NASS, sauf les prix antérieurs à 2018, publiés en cents par livre, qui sont convertis en dollars. Merci de citer l’USDA NASS comme source et The Hive Atlas comme compilateur.',
        'Los valores son los que publicó el NASS, salvo los precios anteriores a 2018, que el NASS publicó en centavos por libra y se convirtieron a dólares. Cite al USDA NASS como fuente y a The Hive Atlas como compilador.',
        'القيم كما نشرتها NASS، باستثناء الأسعار قبل 2018 التي نشرتها NASS بالسنت للرطل وحُوّلت إلى دولارات. يُرجى ذكر USDA NASS مصدرًا وThe Hive Atlas جهةً جامعة للبيانات.'),
    '<strong>Survey estimates.</strong> These are statistical estimates from a sample of operations. NASS revises the previous year’s prices, values, and stocks when it publishes a new report, so the latest year may change.': (
        '<strong>Estimations d’enquête.</strong> Il s’agit d’estimations statistiques tirées d’un échantillon d’exploitations. La NASS révise les prix, valeurs et stocks de l’année précédente à chaque nouveau rapport ; la dernière année peut donc changer.',
        '<strong>Estimaciones de encuesta.</strong> Son estimaciones estadísticas a partir de una muestra de explotaciones. El NASS revisa los precios, valores y existencias del año anterior cuando publica un nuevo informe, así que el último año puede cambiar.',
        '<strong>تقديرات مسحية.</strong> هذه تقديرات إحصائية من عينة من المنشآت. تراجع NASS أسعار السنة السابقة وقيمها ومخزونها عند نشر تقرير جديد، لذا قد تتغير بيانات السنة الأخيرة.'),
    '<strong>Rounded values.</strong> NASS rounds state colonies to the nearest thousand and state honey per colony to the nearest pound.': (
        '<strong>Valeurs arrondies.</strong> La NASS arrondit les colonies par État au millier près et le miel par colonie par État à la livre près.',
        '<strong>Valores redondeados.</strong> El NASS redondea las colonias por estado al millar más cercano y la miel por colonia por estado a la libra más cercana.',
        '<strong>قيم مقرّبة.</strong> تقرّب NASS عدد الطوائف في كل ولاية إلى أقرب ألف، والعسل لكل طائفة إلى أقرب رطل.'),
    '<strong>Colonies move.</strong> A state’s numbers describe the honey made there, not the colonies owned by its beekeepers. See <a href="#ab-migratory">Migratory beekeeping</a>.': (
        '<strong>Les colonies se déplacent.</strong> Les chiffres d’un État décrivent le miel qui y est produit, pas les colonies appartenant à ses apiculteurs. Voir <a href="#ab-migratory">Apiculture transhumante</a>.',
        '<strong>Las colonias se trasladan.</strong> Las cifras de un estado describen la miel producida allí, no las colonias de sus apicultores. Vea <a href="#ab-migratory">Apicultura trashumante</a>.',
        '<strong>الطوائف تتنقل.</strong> تصف أرقام الولاية العسل المنتج فيها، لا الطوائف التي يملكها مربو النحل فيها. انظر <a href="#ab-migratory">تربية النحل المتنقلة</a>.'),
    '<strong>Not comparable with Colony Losses.</strong> Honey-producing colonies count colonies honey was taken from during the year; the Colony Losses survey counts colonies on specific dates.': (
        '<strong>Non comparable avec Pertes de colonies.</strong> Les colonies productrices de miel comptent les colonies dont on a récolté le miel pendant l’année ; l’enquête sur les pertes de colonies compte les colonies à des dates précises.',
        '<strong>No comparable con Pérdidas de colonias.</strong> Las colonias productoras de miel cuentan las colonias de las que se cosechó miel durante el año; la encuesta de pérdidas cuenta las colonias en fechas concretas.',
        '<strong>غير قابلة للمقارنة مع خسائر الطوائف.</strong> تحصي الطوائف المنتجة للعسل الطوائف التي جُني منها العسل خلال السنة، بينما يحصي مسح خسائر الطوائف الطوائف في تواريخ محددة.'),
    'USDA National Agricultural Statistics Service, <a href="https://esmis.nal.usda.gov/publication/honey" target="_blank" rel="noopener">Honey reports</a>, 1988 to present, via <a href="https://quickstats.nass.usda.gov" target="_blank" rel="noopener">NASS Quick Stats</a>.': (
        'Service national des statistiques agricoles de l’USDA, <a href="https://esmis.nal.usda.gov/publication/honey" target="_blank" rel="noopener">rapports Honey</a>, de 1988 à aujourd’hui, via <a href="https://quickstats.nass.usda.gov" target="_blank" rel="noopener">NASS Quick Stats</a>.',
        'Servicio Nacional de Estadísticas Agrícolas del USDA, <a href="https://esmis.nal.usda.gov/publication/honey" target="_blank" rel="noopener">informes Honey</a>, de 1988 a la actualidad, mediante <a href="https://quickstats.nass.usda.gov" target="_blank" rel="noopener">NASS Quick Stats</a>.',
        'الدائرة الوطنية للإحصاءات الزراعية التابعة لوزارة الزراعة الأمريكية، <a href="https://esmis.nal.usda.gov/publication/honey" target="_blank" rel="noopener">تقارير العسل</a>، من 1988 حتى الآن، عبر <a href="https://quickstats.nass.usda.gov" target="_blank" rel="noopener">NASS Quick Stats</a>.'),
    'U.S. Bureau of Labor Statistics, Consumer Price Index for All Urban Consumers (CPI-U), U.S. city average, all items, annual averages, via the <a href="https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1913-" target="_blank" rel="noopener">Federal Reserve Bank of Minneapolis</a>.': (
        'Bureau of Labor Statistics des États-Unis, indice des prix à la consommation pour l’ensemble des consommateurs urbains (CPI-U), moyenne des villes américaines, tous articles, moyennes annuelles, via la <a href="https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1913-" target="_blank" rel="noopener">Federal Reserve Bank of Minneapolis</a>.',
        'Oficina de Estadísticas Laborales de EE. UU., índice de precios al consumidor para todos los consumidores urbanos (CPI-U), promedio de ciudades de EE. UU., todos los artículos, promedios anuales, mediante el <a href="https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1913-" target="_blank" rel="noopener">Banco de la Reserva Federal de Minneapolis</a>.',
        'مكتب إحصاءات العمل الأمريكي، مؤشر أسعار المستهلك لجميع المستهلكين في المدن (CPI-U)، متوسط مدن الولايات المتحدة، جميع البنود، المتوسطات السنوية، عبر <a href="https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1913-" target="_blank" rel="noopener">بنك الاحتياطي الفيدرالي في مينيابوليس</a>.'),
    'Honey Production · The Hive Atlas': ('Production de miel · The Hive Atlas', 'Producción de miel · The Hive Atlas', 'إنتاج العسل · The Hive Atlas'),
    'U.S. honey production, yield per colony, prices, and stocks by state, from USDA NASS surveys since 1987.': (
        'Production de miel des États-Unis, rendement par colonie, prix et stocks par État, d’après les enquêtes de l’USDA NASS depuis 1987.',
        'Producción de miel de EE. UU., rendimiento por colonia, precios y existencias por estado, según las encuestas del USDA NASS desde 1987.',
        'إنتاج العسل في الولايات المتحدة، والإنتاج لكل طائفة، والأسعار، والمخزون حسب الولاية، من مسوح USDA NASS منذ 1987.'),
}

# Text built by js/production.js
JS = {
    'Honey per colony': STATIC['Honey per colony'],
    'lb per colony': STATIC['lb per colony'],
    'Honey produced': STATIC['Honey produced'],
    'lb of honey': ('lb de miel', 'lb de miel', 'رطل من العسل'),
    'Honey-producing colonies': STATIC['Honey-producing colonies'],
    'colonies': ('colonies', 'colonias', 'طائفة'),
    'Average price per pound': STATIC['Average price per pound'],
    'per lb': ('par lb', 'por lb', 'للرطل'),
    'Value of honey produced': STATIC['Value of honey produced'],
    'value': ('valeur', 'valor', 'القيمة'),
    'Stocks held by producers, Dec. 15': ('Stocks détenus par les producteurs, 15 déc.', 'Existencias de los productores, 15 dic.', 'المخزون لدى المنتجين، 15 ديسمبر'),
    'lb in stock': ('lb en stock', 'lb en existencias', 'رطل في المخزون'),
    '5 years, {a}–{b}': ('5 ans, {a}–{b}', '5 años, {a}–{b}', '5 سنوات، ⁦{a}–{b}⁩'),
    '10 years, {a}–{b}': ('10 ans, {a}–{b}', '10 años, {a}–{b}', '10 سنوات، ⁦{a}–{b}⁩'),
    'All years, {a}–{b}': ('Toutes les années, {a}–{b}', 'Todos los años, {a}–{b}', 'كل السنوات، ⁦{a}–{b}⁩'),
    'Each state’s full record, {a}–{b}': ('Historique complet de chaque État, {a}–{b}', 'Historial completo de cada estado, {a}–{b}', 'السجل الكامل لكل ولاية، ⁦{a}–{b}⁩'),
    'average of {w}': ('moyenne sur {w}', 'promedio de {w}', 'متوسط {w}'),
    'in {y} dollars': ('en dollars de {y}', 'en dólares de {y}', 'بدولارات {y}'),
    'as reported': ('tels que publiés', 'según lo publicado', 'كما نُشرت'),
    '{n} lb': ('{n} lb', '{n} lb', '{n} رطل'),
    '{n} million lb': ('{n} millions de lb', '{n} millones de lb', '{n} مليون رطل'),
    '${n} million': ('{n} millions $', '{n} millones de $', '{n} مليون دولار'),
    'Published for too few of these years': ('Publié pour trop peu de ces années', 'Publicado en muy pocos de estos años', 'نُشرت في عدد قليل جدًا من هذه السنوات'),
    '<strong>Multi-year average:</strong> the average of each year’s value over {w}. A state needs most of those years published to get a value.': (
        '<strong>Moyenne pluriannuelle :</strong> la moyenne des valeurs annuelles sur {w}. Un État doit avoir la plupart de ces années publiées pour obtenir une valeur.',
        '<strong>Promedio de varios años:</strong> el promedio de los valores anuales de {w}. Un estado necesita tener publicados la mayoría de esos años para tener un valor.',
        '<strong>متوسط عدة سنوات:</strong> متوسط قيم كل سنة على مدى {w}. تحتاج الولاية إلى أن تكون معظم تلك السنوات منشورة لتحصل على قيمة.'),
    '<strong>Adjusted for inflation</strong> to {y} dollars with the Consumer Price Index (CPI-U), so years compare fairly.': (
        '<strong>Corrigé de l’inflation</strong> en dollars de {y} à l’aide de l’indice des prix à la consommation (CPI-U), pour comparer équitablement les années.',
        '<strong>Ajustado por inflación</strong> a dólares de {y} con el índice de precios al consumidor (CPI-U), para comparar los años con justicia.',
        '<strong>معدّل وفق التضخم</strong> بدولارات {y} باستخدام مؤشر أسعار المستهلك (CPI-U)، لتُقارن السنوات بعدل.'),
    '<strong>As reported:</strong> dollars of each year, not adjusted for inflation.': (
        '<strong>Tels que publiés :</strong> dollars de chaque année, non corrigés de l’inflation.',
        '<strong>Según lo publicado:</strong> dólares de cada año, sin ajustar por inflación.',
        '<strong>كما نُشرت:</strong> دولارات كل سنة، دون تعديل وفق التضخم.'),
    '<strong>Colonies that make honey in two states count in both,</strong> so the U.S. figure reads a little low.': (
        '<strong>Les colonies qui produisent du miel dans deux États sont comptées dans les deux,</strong> ce qui rend le chiffre des États-Unis un peu bas.',
        '<strong>Las colonias que producen miel en dos estados se cuentan en ambos,</strong> por lo que la cifra de EE. UU. resulta algo baja.',
        '<strong>تُحتسب الطوائف التي تنتج العسل في ولايتين في كلتيهما،</strong> لذا يبدو رقم الولايات المتحدة أقل قليلًا.'),
    'per colony': ('par colonie', 'por colonia', 'لكل طائفة'),
    'lb': STATIC['lb'],
    'the U.S. average': ('la moyenne des États-Unis', 'el promedio de EE. UU.', 'متوسط الولايات المتحدة'),
    'NASS doesn’t publish {s} separately for {k}. Its honey is counted in <strong>Other States</strong>, shown below.': (
        'La NASS ne publie pas {s} séparément pour {k}. Son miel est compté dans <strong>Autres États</strong>, ci-dessous.',
        'El NASS no publica {s} por separado para {k}. Su miel se cuenta en <strong>Otros estados</strong>, que se muestra abajo.',
        'لا تنشر NASS بيانات {s} منفصلة لـ {k}. يُحتسب عسلها ضمن <strong>ولايات أخرى</strong>، المعروضة أدناه.'),
    'Based on {n} of {of} years published.': ('Basé sur {n} années publiées sur {of}.', 'Basado en {n} de {of} años publicados.', 'استنادًا إلى {n} من أصل {of} سنة منشورة.'),
    'In {y}: <strong>{a}</strong>.': ('En {y} : <strong>{a}</strong>.', 'En {y}: <strong>{a}</strong>.', 'في {y}: <strong>{a}</strong>.'),
    'Average for {w}: <strong>{a}</strong>.': ('Moyenne {w} : <strong>{a}</strong>.', 'Promedio de {w}: <strong>{a}</strong>.', 'متوسط {w}: <strong>{a}</strong>.'),
    'This year: <strong>{b}</strong>.': ('Cette année : <strong>{b}</strong>.', 'Este año: <strong>{b}</strong>.', 'هذه السنة: <strong>{b}</strong>.'),
    'Download {s} history (CSV)': ('Télécharger l’historique : {s} (CSV)', 'Descargar el historial de {s} (CSV)', 'تنزيل سجل {s} (CSV)'),
    'Colonies': ('Colonies', 'Colonias', 'الطوائف'),
    'Lb per colony': ('Lb par colonie', 'Lb por colonia', 'رطل لكل طائفة'),
    'Price per lb': ('Prix par lb', 'Precio por lb', 'السعر للرطل'),
    'Value': ('Valeur', 'Valor', 'القيمة'),
    'Stocks, Dec. 15': ('Stocks, 15 déc.', 'Existencias, 15 dic.', 'المخزون، 15 ديسمبر'),
    'Values are yearly averages.': ('Les valeurs sont des moyennes annuelles.', 'Los valores son promedios anuales.', 'القيم متوسطات سنوية.'),
    'In {y} dollars': ('En dollars de {y}', 'En dólares de {y}', 'بدولارات {y}'),
    'Darker bars are the years in this average, and the dashed line is the U.S.': (
        'Les barres plus foncées sont les années de cette moyenne, et la ligne pointillée représente les États-Unis.',
        'Las barras más oscuras son los años de este promedio, y la línea discontinua es EE. UU.',
        'الأشرطة الأغمق هي سنوات هذا المتوسط، والخط المتقطع يمثل الولايات المتحدة.'),
    'Darker bars are the years in this average.': ('Les barres plus foncées sont les années de cette moyenne.', 'Las barras más oscuras son los años de este promedio.', 'الأشرطة الأغمق هي سنوات هذا المتوسط.'),
    'NASS data for {a} through {b}.': ('Données de la NASS de {a} à {b}.', 'Datos del NASS de {a} a {b}.', 'بيانات NASS من {a} إلى {b}.'),
    'NASS data for {a} through {b}. Latest report released {d}.': (
        'Données de la NASS de {a} à {b}. Dernier rapport publié le {d}.',
        'Datos del NASS de {a} a {b}. Último informe publicado el {d}.',
        'بيانات NASS من {a} إلى {b}. صدر أحدث تقرير في {d}.'),
    'Prices and values are as reported, not adjusted for inflation.': (
        'Les prix et valeurs sont tels que publiés, non corrigés de l’inflation.',
        'Los precios y valores son los publicados, sin ajustar por inflación.',
        'الأسعار والقيم كما نُشرت، دون تعديل وفق التضخم.'),
    'Prices and values are in {y} dollars.': ('Les prix et valeurs sont en dollars de {y}.', 'Los precios y valores están en dólares de {y}.', 'الأسعار والقيم بدولارات {y}.'),
    '{n} states are published separately for this year; Other States combines the rest.': (
        '{n} États sont publiés séparément pour cette année ; Autres États regroupe les autres.',
        'Este año se publican {n} estados por separado; Otros estados agrupa al resto.',
        'نُشرت {n} ولاية منفصلة لهذه السنة، وتجمع ولايات أخرى البقية.'),
    '{n} states have enough published years for this average.': (
        '{n} États ont assez d’années publiées pour cette moyenne.',
        '{n} estados tienen suficientes años publicados para este promedio.',
        'لدى {n} ولاية عدد كافٍ من السنوات المنشورة لهذا المتوسط.'),
    'In {y}, U.S. beekeeping operations with five or more colonies produced <strong>{p}</strong> of honey from {c} colonies, about <strong>{yl}</strong> per colony, and were paid an average of <strong>{pr}</strong> a pound. {top} produced the most honey. Among the {k} states NASS published separately, honey per colony was highest in <strong>{hi}</strong> ({hv}) and lowest in <strong>{lo}</strong> ({lv}). Click any state on the map, or pick one from the table, to see its numbers.': (
        'En {y}, les exploitations apicoles des États-Unis de cinq colonies ou plus ont produit <strong>{p}</strong> de miel avec {c} colonies, soit environ <strong>{yl}</strong> par colonie, et ont été payées en moyenne <strong>{pr}</strong> la livre. L’État ayant produit le plus de miel : {top}. Parmi les {k} États publiés séparément par la NASS, le miel par colonie était le plus élevé en <strong>{hi}</strong> ({hv}) et le plus bas en <strong>{lo}</strong> ({lv}). Cliquez sur un État de la carte, ou choisissez-en un dans le tableau, pour voir ses chiffres.',
        'En {y}, las explotaciones apícolas de EE. UU. con cinco o más colonias produjeron <strong>{p}</strong> de miel con {c} colonias, unas <strong>{yl}</strong> por colonia, y recibieron un promedio de <strong>{pr}</strong> por libra. El estado que más miel produjo fue {top}. Entre los {k} estados que el NASS publicó por separado, la miel por colonia fue más alta en <strong>{hi}</strong> ({hv}) y más baja en <strong>{lo}</strong> ({lv}). Haga clic en cualquier estado del mapa, o elija uno en la tabla, para ver sus cifras.',
        'في {y}، أنتجت منشآت تربية النحل في الولايات المتحدة التي لديها خمس طوائف أو أكثر <strong>{p}</strong> من العسل من {c} طائفة، أي نحو <strong>{yl}</strong> لكل طائفة، وحصلت على متوسط <strong>{pr}</strong> للرطل. وكانت {top} الأكثر إنتاجًا للعسل. ومن بين {k} ولاية نشرتها NASS منفصلة، كان العسل لكل طائفة الأعلى في <strong>{hi}</strong> ({hv}) والأدنى في <strong>{lo}</strong> ({lv}). انقر على أي ولاية في الخريطة، أو اختر واحدة من الجدول، لعرض أرقامها.'),
}


def merge(lang, idx):
    path = os.path.join(os.path.dirname(__file__), '..', 'js', 'lang', lang + '.js')
    src = open(path, encoding='utf-8').read()
    head, body = src[:src.index('{')], src[src.index('{'):src.rindex('}') + 1]
    d = json.loads(body)
    for k, v in STATIC.items():
        d['static'][k] = v[idx]
    for k, v in JS.items():
        d['js'][k] = v[idx]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(head + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('%s: %d static, %d js entries merged' % (lang, len(STATIC), len(JS)))


if __name__ == '__main__':
    for i, lang in enumerate(['fr', 'es', 'ar']):
        merge(lang, i)
