"""French, Spanish and Arabic text for the State Chart on the NASS pages (losses.html, honey-production.html).

Run once after editing to merge these entries into js/lang/fr.js, es.js and ar.js:
    python3 pipeline/i18n_nass_charts.py

English is the key. Text drawn by js/nass-charts.js itself is translated inside that file.
Drafted by Claude; have a fluent reader review before publishing.
"""
import json
import os

STATIC = {
    "Honey Bee Colony Losses": (
        "Pertes de colonies d’abeilles",
        "Pérdidas de colonias de abejas",
        "خسائر طوائف نحل العسل"),
    "State Chart": (
        "Graphique par État",
        "Gráfico por estado",
        "رسم حسب الولاية"),
    "About This Data": (
        "À propos de ces données",
        "Acerca de estos datos",
        "عن هذه البيانات"),
    "What This Page Shows": (
        "Ce que montre cette page",
        "Qué muestra esta página",
        "ما تعرضه هذه الصفحة"),
    "How to Use It": (
        "Comment l’utiliser",
        "Cómo usarla",
        "طريقة الاستخدام"),
    "The Measures": (
        "Les mesures",
        "Las medidas",
        "المقاييس"),
    "How the Averages Work": (
        "Comment les moyennes sont calculées",
        "Cómo se calculan los promedios",
        "كيف تُحسب المتوسطات"),
    "Migratory Beekeeping": (
        "Apiculture pastorale",
        "Apicultura trashumante",
        "تربية النحل المتنقلة"),
    "Sample Sizes": (
        "Tailles d’échantillon",
        "Tamaños de muestra",
        "أحجام العينات"),
    "<strong>Each row is one state.</strong> The bar ends at the state’s average over the years you pick, and the number at the end of the row is that average.": (
        "<strong>Chaque ligne est un État.</strong> La barre s’arrête à la moyenne de l’État sur les années choisies, et le nombre en bout de ligne est cette moyenne.",
        "<strong>Cada fila es un estado.</strong> La barra termina en el promedio del estado en los años elegidos, y el número al final de la fila es ese promedio.",
        "<strong>كل صف يمثّل ولاية.</strong> ينتهي العمود عند متوسط الولاية خلال السنوات المختارة، والرقم في نهاية الصف هو ذلك المتوسط."),
    "<strong>Whiskers</strong> run from the state’s lowest to its highest value in those years. Switch to <strong>± 1 SD</strong> to show one standard deviation either side of the average instead. A short whisker means a steady state; a long one means big swings.": (
        "<strong>Les moustaches</strong> vont de la valeur la plus basse à la plus haute de l’État sur ces années. Choisissez <strong>± 1 écart-type</strong> pour afficher plutôt un écart-type de part et d’autre de la moyenne. Une moustache courte indique un État stable ; une longue, de fortes variations.",
        "<strong>Los bigotes</strong> van del valor más bajo al más alto del estado en esos años. Elija <strong>± 1 desv. estándar</strong> para mostrar en su lugar una desviación estándar a cada lado del promedio. Un bigote corto indica un estado estable; uno largo, grandes variaciones.",
        "<strong>الخطوط الجانبية</strong> تمتد من أدنى قيمة للولاية إلى أعلاها في تلك السنوات. اختر <strong>± انحراف معياري</strong> لعرض انحراف معياري واحد على جانبي المتوسط بدلًا من ذلك. الخط القصير يعني ولاية مستقرة، والطويل يعني تقلبات كبيرة."),
    "<strong>The dashed line</strong> is the U.S. average for the same years. It is shown for percents only, because U.S. colony counts are national totals.": (
        "<strong>La ligne pointillée</strong> est la moyenne des États-Unis sur les mêmes années. Elle n’apparaît que pour les pourcentages, car les effectifs de colonies des États-Unis sont des totaux nationaux.",
        "<strong>La línea discontinua</strong> es el promedio de EE. UU. en los mismos años. Solo aparece para los porcentajes, porque los recuentos de colonias de EE. UU. son totales nacionales.",
        "<strong>الخط المتقطع</strong> هو متوسط الولايات المتحدة للسنوات نفسها. ويظهر للنسب المئوية فقط، لأن أعداد الطوائف على مستوى الولايات المتحدة إجماليات وطنية."),
    "<strong>Measure</strong> picks what to chart: losses and renovations first, then colony counts, then the six stressors.": (
        "<strong>Mesure</strong> choisit ce qui est représenté : d’abord les pertes et les rénovations, puis les effectifs de colonies, puis les six facteurs de stress.",
        "<strong>Medida</strong> elige qué se representa: primero las pérdidas y renovaciones, luego los recuentos de colonias y después los seis factores de estrés.",
        "<strong>المقياس</strong> يحدد ما يُعرض: الخسائر والتجديد أولًا، ثم أعداد الطوائف، ثم عوامل الإجهاد الستة."),
    "<strong>Years</strong> and <strong>Quarter</strong> set the period. With All quarters, every quarter counts as one value. Pick a single quarter, such as January–March for winter losses, to compare like with like.": (
        "<strong>Années</strong> et <strong>Trimestre</strong> fixent la période. Avec tous les trimestres, chaque trimestre compte comme une valeur. Choisissez un seul trimestre, par exemple janvier–mars pour les pertes hivernales, pour comparer ce qui est comparable.",
        "<strong>Años</strong> y <strong>Trimestre</strong> fijan el período. Con todos los trimestres, cada trimestre cuenta como un valor. Elija un solo trimestre, como enero–marzo para las pérdidas invernales, para comparar lo comparable.",
        "<strong>السنوات</strong> و<strong>الربع</strong> يحددان الفترة. عند اختيار كل الأرباع يُحسب كل ربع قيمةً واحدة. اختر ربعًا واحدًا، مثل يناير–مارس لخسائر الشتاء، لمقارنة المتماثل."),
    "<strong>Click a state</strong> to see every quarter for that state next to the U.S. <strong>Table</strong> lists the same numbers, and <strong>Highest first</strong> or <strong>A to Z</strong> sets the order.": (
        "<strong>Cliquez sur un État</strong> pour voir chacun de ses trimestres à côté des États-Unis. <strong>Tableau</strong> donne les mêmes chiffres, et <strong>Plus élevé d’abord</strong> ou <strong>De A à Z</strong> fixe l’ordre.",
        "<strong>Haga clic en un estado</strong> para ver cada trimestre de ese estado junto a EE. UU. <strong>Tabla</strong> muestra las mismas cifras, y <strong>Mayor primero</strong> o <strong>De la A a la Z</strong> fija el orden.",
        "<strong>انقر على ولاية</strong> لترى كل أرباعها إلى جانب الولايات المتحدة. ويعرض <strong>جدول</strong> الأرقام نفسها، ويحدد <strong>الأعلى أولًا</strong> أو <strong>أبجديًا</strong> الترتيب."),
    "NASS publishes quarterly numbers only. A state’s average is the plain average of its published quarterly values in the years and quarters you pick, so percents are <strong>average quarterly losses, not annual loss rates</strong>. For example, U.S. losses in 2024 were 15%, 9%, 10%, and 14%, an average quarterly loss of <strong>12.0%</strong>. Compounding the same four quarters gives 40.1%, and total colonies lost divided by January 1 colonies gives 50.7%, so take care when comparing with annual loss surveys.": (
        "La NASS ne publie que des chiffres trimestriels. La moyenne d’un État est la moyenne simple de ses valeurs trimestrielles publiées pour les années et trimestres choisis : les pourcentages sont donc des <strong>pertes trimestrielles moyennes, pas des taux de perte annuels</strong>. Par exemple, les pertes des États-Unis en 2024 étaient de 15 %, 9 %, 10 % et 14 %, soit une perte trimestrielle moyenne de <strong>12,0 %</strong>. En cumulant ces quatre trimestres on obtient 40,1 %, et le total des colonies perdues divisé par les colonies au 1er janvier donne 50,7 % : prudence donc en comparant avec des enquêtes de pertes annuelles.",
        "NASS solo publica cifras trimestrales. El promedio de un estado es el promedio simple de sus valores trimestrales publicados en los años y trimestres elegidos, así que los porcentajes son <strong>pérdidas trimestrales promedio, no tasas de pérdida anuales</strong>. Por ejemplo, las pérdidas de EE. UU. en 2024 fueron de 15 %, 9 %, 10 % y 14 %, una pérdida trimestral promedio de <strong>12,0 %</strong>. Acumulando esos cuatro trimestres se obtiene 40,1 %, y el total de colonias perdidas dividido entre las colonias al 1 de enero da 50,7 %, así que conviene tener cuidado al comparar con encuestas de pérdidas anuales.",
        "لا تنشر NASS إلا أرقامًا ربع سنوية. ومتوسط الولاية هو المتوسط البسيط لقيمها الربع سنوية المنشورة في السنوات والأرباع المختارة، لذا فالنسب هي <strong>متوسط الخسائر الربع سنوية، وليست معدلات خسارة سنوية</strong>. فمثلًا كانت خسائر الولايات المتحدة في 2024: 15% و9% و10% و14%، أي متوسط خسارة ربع سنوية قدره <strong>12.0%</strong>. وبمضاعفة الأرباع الأربعة نفسها نحصل على 40.1%، وبقسمة مجموع الطوائف المفقودة على طوائف 1 يناير نحصل على 50.7%، لذا يجب الحذر عند المقارنة بمسوح الخسائر السنوية."),
    "Losses run higher in winter, so a state that is missing some winter quarters can look better than it is. States with data for fewer than half of the selected quarters are drawn in a lighter color and marked with an asterisk. To compare states fairly, pick a single quarter or end the period in 2024, before NASS cut the number of states it publishes separately.": (
        "Les pertes sont plus fortes en hiver : un État auquel il manque des trimestres d’hiver peut donc paraître meilleur qu’il ne l’est. Les États ayant des données pour moins de la moitié des trimestres choisis sont dessinés en couleur plus claire et marqués d’un astérisque. Pour comparer équitablement, choisissez un seul trimestre ou arrêtez la période en 2024, avant que la NASS ne réduise le nombre d’États publiés séparément.",
        "Las pérdidas son mayores en invierno, así que un estado al que le faltan trimestres de invierno puede parecer mejor de lo que es. Los estados con datos para menos de la mitad de los trimestres elegidos se dibujan en un color más claro y llevan un asterisco. Para comparar estados de forma justa, elija un solo trimestre o termine el período en 2024, antes de que NASS redujera el número de estados que publica por separado.",
        "الخسائر أعلى في الشتاء، لذا قد تبدو الولاية التي تنقصها أرباع شتوية أفضل مما هي عليه. وتُرسم الولايات التي لديها بيانات لأقل من نصف الأرباع المختارة بلون أفتح مع علامة نجمة. ولمقارنة عادلة، اختر ربعًا واحدًا أو أنهِ الفترة في 2024، قبل أن تقلّص NASS عدد الولايات التي تنشرها منفردة."),
    "NASS doesn’t publish a margin of error for loss rates, so treat states a point or two apart as effectively tied.": (
        "La NASS ne publie pas de marge d’erreur pour les taux de perte : considérez donc comme à égalité des États séparés d’un ou deux points.",
        "NASS no publica un margen de error para las tasas de pérdida, así que considere prácticamente empatados a los estados separados por uno o dos puntos.",
        "لا تنشر NASS هامش خطأ لمعدلات الخسارة، لذا اعتبر الولايات التي يفصل بينها نقطة أو نقطتان متعادلة عمليًا."),
    "Why So Many States Are in Other States": (
        "Pourquoi tant d’États sont dans « Autres États »",
        "Por qué tantos estados están en Otros estados",
        "لماذا تقع ولايات كثيرة ضمن «ولايات أخرى»"),
    "The chart leaves Other States out, because its numbers describe the group as a whole and not any one state. A state counted in Other States has no value for those quarters.": (
        "Le graphique laisse de côté « Autres États », car ses chiffres décrivent le groupe dans son ensemble et non un État en particulier. Un État compté dans « Autres États » n’a pas de valeur pour ces trimestres.",
        "El gráfico deja fuera Otros estados, porque sus cifras describen al grupo en conjunto y no a un estado concreto. Un estado contado en Otros estados no tiene valor para esos trimestres.",
        "لا يتضمن الرسم «ولايات أخرى»، لأن أرقامها تصف المجموعة ككل لا ولاية بعينها. والولاية المحتسبة ضمن «ولايات أخرى» ليست لها قيمة في تلك الأرباع."),
    "When comparing states, keep in mind that summer honey states and winter destination states see different parts of the same colonies’ year. Pick one quarter at a time in the chart to see when a state’s losses happen.": (
        "En comparant les États, gardez à l’esprit que les États producteurs de miel en été et les États de destination en hiver voient des parties différentes de l’année des mêmes colonies. Choisissez un trimestre à la fois dans le graphique pour voir quand les pertes d’un État ont lieu.",
        "Al comparar estados, tenga en cuenta que los estados mieleros de verano y los de destino invernal ven partes distintas del año de las mismas colonias. Elija un trimestre cada vez en el gráfico para ver cuándo se producen las pérdidas de un estado.",
        "عند مقارنة الولايات، تذكّر أن ولايات العسل الصيفية وولايات التشتية ترى أجزاء مختلفة من سنة الطوائف نفسها. اختر ربعًا واحدًا في كل مرة في الرسم لترى متى تحدث خسائر الولاية."),
    "NASS surveys a sample of operations in each state, not every beekeeper. Its yearly data quality reports, available from 2019 on, give the number of operations sampled in each state every quarter and the share that responded. The <strong>Sample sizes (CSV)</strong> download lists them.": (
        "La NASS enquête auprès d’un échantillon d’exploitations dans chaque État, pas auprès de tous les apiculteurs. Ses rapports annuels sur la qualité des données, disponibles à partir de 2019, donnent le nombre d’exploitations échantillonnées dans chaque État à chaque trimestre et la part qui a répondu. Le téléchargement <strong>Tailles d’échantillon (CSV)</strong> les indique.",
        "NASS encuesta a una muestra de explotaciones en cada estado, no a todos los apicultores. Sus informes anuales de calidad de datos, disponibles desde 2019, dan el número de explotaciones de la muestra en cada estado cada trimestre y la proporción que respondió. La descarga <strong>Tamaños de muestra (CSV)</strong> los recoge.",
        "تمسح NASS عينة من المنشآت في كل ولاية، لا كل النحالين. وتذكر تقاريرها السنوية عن جودة البيانات، المتاحة منذ 2019، عدد المنشآت التي شملتها العينة في كل ولاية كل ربع ونسبة من استجاب منها. ويسردها تنزيل <strong>أحجام العينات (CSV)</strong>."),
    "Smaller states rest on few operations. In January 2024, for example, NASS sampled 252 operations in California but 14 in Maine. With so few operations, one or two large ones can drive a state’s loss rate, which is one reason small states often have long whiskers. NASS samples every large or multi-state operation and a random selection of smaller ones. Sample sizes before 2019 were not published.": (
        "Les petits États reposent sur peu d’exploitations. En janvier 2024, par exemple, la NASS a échantillonné 252 exploitations en Californie mais 14 dans le Maine. Avec si peu d’exploitations, une ou deux grandes peuvent déterminer le taux de perte d’un État, ce qui explique en partie les longues moustaches des petits États. La NASS inclut toutes les grandes exploitations ou celles présentes dans plusieurs États, et un échantillon aléatoire des plus petites. Les tailles d’échantillon avant 2019 n’ont pas été publiées.",
        "Los estados pequeños se basan en pocas explotaciones. En enero de 2024, por ejemplo, NASS incluyó en la muestra 252 explotaciones en California pero 14 en Maine. Con tan pocas explotaciones, una o dos grandes pueden determinar la tasa de pérdida de un estado, una de las razones por las que los estados pequeños suelen tener bigotes largos. NASS incluye todas las explotaciones grandes o multiestatales y una selección aleatoria de las más pequeñas. Los tamaños de muestra anteriores a 2019 no se publicaron.",
        "تعتمد الولايات الصغيرة على عدد قليل من المنشآت. ففي يناير 2024 مثلًا شملت عينة NASS ‏252 منشأة في كاليفورنيا مقابل 14 في مين. ومع هذا العدد القليل قد تحدد منشأة أو اثنتان كبيرتان معدل خسارة الولاية، وهذا أحد أسباب طول الخطوط الجانبية للولايات الصغيرة. وتشمل NASS كل المنشآت الكبيرة أو العاملة في عدة ولايات، واختيارًا عشوائيًا من المنشآت الأصغر. ولم تُنشر أحجام العينات قبل 2019."),
    "The counts appear to be right: together with every other state they add up exactly to NASS’s U.S. total, and they fit Wyoming’s losses in other years. So the published percents appear to be the error, and the chart uses the percent calculated from the counts, in single quarters and in averages. The complete dataset keeps NASS’s values as published. If NASS corrects its table, the correction here will be removed.": (
        "Les effectifs semblent justes : avec ceux de tous les autres États, ils correspondent exactement au total des États-Unis publié par la NASS, et ils concordent avec les pertes du Wyoming les autres années. Ce sont donc les pourcentages publiés qui semblent erronés, et le graphique utilise le pourcentage calculé à partir des effectifs, pour les trimestres isolés comme pour les moyennes. Le jeu de données complet conserve les valeurs telles que publiées par la NASS. Si la NASS corrige son tableau, cette correction sera retirée.",
        "Los recuentos parecen correctos: junto con los de todos los demás estados suman exactamente el total de EE. UU. de NASS y concuerdan con las pérdidas de Wyoming en otros años. Así que el error parece estar en los porcentajes publicados, y el gráfico usa el porcentaje calculado a partir de los recuentos, en trimestres sueltos y en promedios. El conjunto de datos completo conserva los valores tal como los publicó NASS. Si NASS corrige su tabla, se eliminará esta corrección.",
        "تبدو الأعداد صحيحة: فهي مع أعداد كل الولايات الأخرى تساوي تمامًا إجمالي الولايات المتحدة لدى NASS، وتتسق مع خسائر وايومنغ في السنوات الأخرى. لذا يبدو أن الخطأ في النسب المنشورة، ويستخدم الرسم النسبة المحسوبة من الأعداد، في الأرباع المنفردة وفي المتوسطات. وتحتفظ مجموعة البيانات الكاملة بالقيم كما نشرتها NASS. وإذا صححت NASS جدولها، سيُزال هذا التصحيح."),
    "<strong>This table (CSV)</strong> saves the chart’s numbers for the measure, years, and quarter you’ve chosen: each state’s average, lowest and highest value and when they happened, standard deviation, and how many quarters had data.": (
        "<strong>Ce tableau (CSV)</strong> enregistre les chiffres du graphique pour la mesure, les années et le trimestre choisis : moyenne de chaque État, valeurs la plus basse et la plus haute et leur date, écart-type, et nombre de trimestres avec données.",
        "<strong>Esta tabla (CSV)</strong> guarda las cifras del gráfico para la medida, los años y el trimestre elegidos: el promedio de cada estado, sus valores más bajo y más alto y cuándo ocurrieron, la desviación estándar y cuántos trimestres tuvieron datos.",
        "<strong>هذا الجدول (CSV)</strong> يحفظ أرقام الرسم للمقياس والسنوات والربع المختارة: متوسط كل ولاية، وأدنى قيمة وأعلاها وتوقيتهما، والانحراف المعياري، وعدد الأرباع التي فيها بيانات."),
    "<strong>State history (CSV)</strong>, under each state’s chart, saves every quarter NASS published for that state, with every measure and stressor.": (
        "<strong>Historique de l’État (CSV)</strong>, sous le graphique de chaque État, enregistre chaque trimestre publié par la NASS pour cet État, avec toutes les mesures et tous les facteurs de stress.",
        "<strong>Historial del estado (CSV)</strong>, bajo el gráfico de cada estado, guarda cada trimestre que NASS publicó para ese estado, con todas las medidas y factores de estrés.",
        "<strong>سجل الولاية (CSV)</strong>، أسفل رسم كل ولاية، يحفظ كل ربع نشرته NASS لتلك الولاية، مع كل المقاييس وعوامل الإجهاد."),
    "The complete dataset keeps values as NASS published them, with a flag for each value NASS reported as less than half of one percent. The table and state downloads use the corrected values shown in the chart and list which values were corrected (see <a href=\"#ab-corrections\">Corrections</a>). Please cite USDA NASS as the source and The Hive Atlas as the compiler.": (
        "Le jeu de données complet conserve les valeurs telles que publiées par la NASS, avec un indicateur pour chaque valeur publiée comme inférieure à un demi pour cent. Les téléchargements du tableau et des États utilisent les valeurs corrigées affichées dans le graphique et indiquent les valeurs corrigées (voir <a href=\"#ab-corrections\">Corrections</a>). Merci de citer l’USDA NASS comme source et The Hive Atlas comme compilateur.",
        "El conjunto de datos completo conserva los valores tal como los publicó el NASS, con una marca para cada valor publicado como inferior a medio punto porcentual. Las descargas de la tabla y de los estados usan los valores corregidos del gráfico e indican qué valores se corrigieron (vea <a href=\"#ab-corrections\">Correcciones</a>). Cite al USDA NASS como fuente y a The Hive Atlas como compilador.",
        "تحتفظ مجموعة البيانات الكاملة بالقيم كما نشرتها NASS، مع علامة لكل قيمة نشرتها على أنها أقل من نصف بالمئة. أما تنزيلات الجدول والولايات فتستخدم القيم المصححة المعروضة في الرسم وتبيّن القيم التي صُححت (انظر <a href=\"#ab-corrections\">التصحيحات</a>). يُرجى ذكر USDA NASS مصدرًا وThe Hive Atlas جهةً جامعة للبيانات."),
    "Limits to Keep in Mind": (
        "Limites à garder à l’esprit",
        "Límites que conviene tener en cuenta",
        "حدود يجب مراعاتها"),
    "<strong>Small values.</strong> NASS reports values below half a percent as “&lt;0.5%”. The chart counts them as 0.25%.": (
        "<strong>Petites valeurs.</strong> La NASS publie les valeurs inférieures à un demi pour cent sous la forme « &lt;0,5 % ». Le graphique les compte pour 0,25 %.",
        "<strong>Valores pequeños.</strong> NASS publica los valores inferiores a medio punto porcentual como «&lt;0,5 %». El gráfico los cuenta como 0,25 %.",
        "<strong>القيم الصغيرة.</strong> تنشر NASS القيم الأقل من نصف بالمئة بصيغة «&lt;0.5%». ويحسبها الرسم على أنها 0.25%."),
    "Honey Production": (
        "Production de miel",
        "Producción de miel",
        "إنتاج العسل"),
    "Adjusting for Inflation": (
        "Correction de l’inflation",
        "Ajuste por inflación",
        "التعديل حسب التضخم"),
    "U.S. Totals": (
        "Totaux des États-Unis",
        "Totales de EE. UU.",
        "إجماليات الولايات المتحدة"),
    "<strong>Whiskers</strong> run from the state’s lowest to its highest year. Switch to <strong>± 1 SD</strong> to show one standard deviation either side of the average instead. A short whisker means steady crops; a long one means big swings from year to year.": (
        "<strong>Les moustaches</strong> vont de l’année la plus basse à la plus haute de l’État. Choisissez <strong>± 1 écart-type</strong> pour afficher plutôt un écart-type de part et d’autre de la moyenne. Une moustache courte indique des récoltes stables ; une longue, de fortes variations d’une année à l’autre.",
        "<strong>Los bigotes</strong> van del año más bajo al más alto del estado. Elija <strong>± 1 desv. estándar</strong> para mostrar en su lugar una desviación estándar a cada lado del promedio. Un bigote corto indica cosechas estables; uno largo, grandes variaciones de un año a otro.",
        "<strong>الخطوط الجانبية</strong> تمتد من أدنى سنة للولاية إلى أعلاها. اختر <strong>± انحراف معياري</strong> لعرض انحراف معياري واحد على جانبي المتوسط بدلًا من ذلك. الخط القصير يعني محاصيل مستقرة، والطويل يعني تقلبات كبيرة من سنة إلى أخرى."),
    "<strong>The dashed line</strong> is the U.S. average for the same years. It is shown for honey per colony and price only, because the other measures are national totals.": (
        "<strong>La ligne pointillée</strong> est la moyenne des États-Unis sur les mêmes années. Elle n’apparaît que pour le miel par colonie et le prix, car les autres mesures sont des totaux nationaux.",
        "<strong>La línea discontinua</strong> es el promedio de EE. UU. en los mismos años. Solo aparece para la miel por colonia y el precio, porque las demás medidas son totales nacionales.",
        "<strong>الخط المتقطع</strong> هو متوسط الولايات المتحدة للسنوات نفسها. ويظهر للعسل لكل طائفة وللسعر فقط، لأن المقاييس الأخرى إجماليات وطنية."),
    "<strong>Measure</strong> picks what to chart. Honey per colony comes first because it compares fairly across states of any size and is the number most beekeepers can hold up against their own hives.": (
        "<strong>Mesure</strong> choisit ce qui est représenté. Le miel par colonie vient en premier, car il se compare équitablement entre États de toutes tailles et c’est le chiffre que la plupart des apiculteurs peuvent confronter à leurs propres ruches.",
        "<strong>Medida</strong> elige qué se representa. La miel por colonia va primero porque se compara de forma justa entre estados de cualquier tamaño y es la cifra que la mayoría de los apicultores puede contrastar con sus propias colmenas.",
        "<strong>المقياس</strong> يحدد ما يُعرض. ويأتي العسل لكل طائفة أولًا لأنه يُقارن بإنصاف بين الولايات مهما كان حجمها، وهو الرقم الذي يستطيع معظم النحالين مقارنته بخلاياهم."),
    "<strong>Years</strong> sets the period. <strong>Prices and values</strong> shows dollar amounts either adjusted for inflation to 2025 dollars (the default) or as NASS reported them. See <a href=\"#ab-inflation\">Adjusting for inflation</a>.": (
        "<strong>Années</strong> fixe la période. <strong>Prix et valeurs</strong> affiche les montants soit corrigés de l’inflation en dollars de 2025 (par défaut), soit tels que publiés par la NASS. Voir <a href=\"#ab-inflation\">Correction de l’inflation</a>.",
        "<strong>Años</strong> fija el período. <strong>Precios y valores</strong> muestra los importes ajustados por inflación a dólares de 2025 (por defecto) o tal como los publicó NASS. Vea <a href=\"#ab-inflation\">Ajuste por inflación</a>.",
        "<strong>السنوات</strong> تحدد الفترة. ويعرض <strong>الأسعار والقيم</strong> المبالغ إما معدّلة حسب التضخم بدولارات 2025 (الافتراضي) أو كما نشرتها NASS. انظر <a href=\"#ab-inflation\">التعديل حسب التضخم</a>."),
    "<strong>Click a state</strong> to see every year for that state next to the U.S. <strong>Table</strong> lists the same numbers, and <strong>Highest first</strong> or <strong>A to Z</strong> sets the order.": (
        "<strong>Cliquez sur un État</strong> pour voir chacune de ses années à côté des États-Unis. <strong>Tableau</strong> donne les mêmes chiffres, et <strong>Plus élevé d’abord</strong> ou <strong>De A à Z</strong> fixe l’ordre.",
        "<strong>Haga clic en un estado</strong> para ver cada año de ese estado junto a EE. UU. <strong>Tabla</strong> muestra las mismas cifras, y <strong>Mayor primero</strong> o <strong>De la A a la Z</strong> fija el orden.",
        "<strong>انقر على ولاية</strong> لترى كل سنواتها إلى جانب الولايات المتحدة. ويعرض <strong>جدول</strong> الأرقام نفسها، ويحدد <strong>الأعلى أولًا</strong> أو <strong>أبجديًا</strong> الترتيب."),
    "A dollar in 1987 bought about 2.8 times what it buys today, so prices as reported make honey look far more valuable now than it was. By default, the chart shows prices and values in <strong>2025 dollars</strong>, so every year can be compared fairly.": (
        "Un dollar de 1987 achetait environ 2,8 fois plus qu’aujourd’hui : les prix tels que publiés font paraître le miel bien plus précieux aujourd’hui qu’autrefois. Par défaut, le graphique affiche les prix et les valeurs en <strong>dollars de 2025</strong>, pour que toutes les années se comparent équitablement.",
        "Un dólar de 1987 compraba unas 2,8 veces más que hoy, así que los precios tal como se publicaron hacen que la miel parezca mucho más valiosa ahora que antes. Por defecto, el gráfico muestra precios y valores en <strong>dólares de 2025</strong>, para que todos los años se comparen de forma justa.",
        "كان دولار 1987 يشتري نحو 2.8 ضعف ما يشتريه اليوم، لذا تُظهر الأسعار كما نُشرت العسلَ أغلى بكثير الآن مما كان. ويعرض الرسم افتراضيًا الأسعار والقيم <strong>بدولارات 2025</strong>، لتُقارن كل السنوات بإنصاف."),
    "Honey crops swing with weather, forage, and colony health, so a single year can be misleading, especially for smaller states. A state’s bar is the plain average of its published yearly values in the years you pick, and the whiskers show its range.": (
        "Les récoltes de miel varient avec la météo, les ressources florales et la santé des colonies : une seule année peut donc tromper, surtout pour les petits États. La barre d’un État est la moyenne simple de ses valeurs annuelles publiées sur les années choisies, et les moustaches montrent son étendue.",
        "Las cosechas de miel varían con el clima, la floración y la salud de las colonias, así que un solo año puede engañar, sobre todo en los estados pequeños. La barra de un estado es el promedio simple de sus valores anuales publicados en los años elegidos, y los bigotes muestran su rango.",
        "تتقلب محاصيل العسل مع الطقس والمرعى وصحة الطوائف، لذا قد تكون سنة واحدة مضللة، خاصة في الولايات الصغيرة. وعمود الولاية هو المتوسط البسيط لقيمها السنوية المنشورة في السنوات المختارة، وتُظهر الخطوط الجانبية مداها."),
    "States were not all published for the same years. States with data for fewer than half of the selected years are drawn in a lighter color and marked with an asterisk. To compare states fairly, end the period in 2023, the last year most states were published separately.": (
        "Les États n’ont pas tous été publiés les mêmes années. Les États ayant des données pour moins de la moitié des années choisies sont dessinés en couleur plus claire et marqués d’un astérisque. Pour comparer équitablement, arrêtez la période en 2023, dernière année où la plupart des États étaient publiés séparément.",
        "No todos los estados se publicaron en los mismos años. Los estados con datos para menos de la mitad de los años elegidos se dibujan en un color más claro y llevan un asterisco. Para comparar estados de forma justa, termine el período en 2023, el último año en que la mayoría de los estados se publicaron por separado.",
        "لم تُنشر كل الولايات في السنوات نفسها. وتُرسم الولايات التي لديها بيانات لأقل من نصف السنوات المختارة بلون أفتح مع علامة نجمة. ولمقارنة عادلة، أنهِ الفترة في 2023، آخر سنة نُشرت فيها معظم الولايات منفردة."),
    "Why Some States Are in Other States": (
        "Pourquoi certains États sont dans « Autres États »",
        "Por qué algunos estados están en Otros estados",
        "لماذا تقع بعض الولايات ضمن «ولايات أخرى»"),
    "The chart leaves Other States out, because its numbers describe the group as a whole and not any one state. A state counted in Other States has no value for those years.": (
        "Le graphique laisse de côté « Autres États », car ses chiffres décrivent le groupe dans son ensemble et non un État en particulier. Un État compté dans « Autres États » n’a pas de valeur pour ces années.",
        "El gráfico deja fuera Otros estados, porque sus cifras describen al grupo en conjunto y no a un estado concreto. Un estado contado en Otros estados no tiene valor para esos años.",
        "لا يتضمن الرسم «ولايات أخرى»، لأن أرقامها تصف المجموعة ككل لا ولاية بعينها. والولاية المحتسبة ضمن «ولايات أخرى» ليست لها قيمة في تلك السنوات."),
    "<strong>Comparing with the U.S.</strong> For honey per colony and price, the chart draws the U.S. average as a dashed line. For totals, there is no U.S. line, because the U.S. figure is the sum of all states.": (
        "<strong>Comparaison avec les États-Unis.</strong> Pour le miel par colonie et le prix, le graphique trace la moyenne des États-Unis en pointillé. Pour les totaux, il n’y a pas de ligne des États-Unis, car la valeur nationale est la somme de tous les États.",
        "<strong>Comparación con EE. UU.</strong> Para la miel por colonia y el precio, el gráfico traza el promedio de EE. UU. como línea discontinua. Para los totales no hay línea de EE. UU., porque la cifra nacional es la suma de todos los estados.",
        "<strong>المقارنة بالولايات المتحدة.</strong> للعسل لكل طائفة وللسعر، يرسم الرسم متوسط الولايات المتحدة خطًا متقطعًا. أما الإجماليات فلا يظهر لها خط للولايات المتحدة، لأن القيمة الوطنية هي مجموع كل الولايات."),
    "<strong>This table (CSV)</strong> saves the chart’s numbers for the measure and years you’ve chosen: each state’s average, lowest and highest year, standard deviation, and how many years had data, with prices and values in the dollars you’ve chosen.": (
        "<strong>Ce tableau (CSV)</strong> enregistre les chiffres du graphique pour la mesure et les années choisies : moyenne de chaque État, années la plus basse et la plus haute, écart-type et nombre d’années avec données, avec les prix et valeurs dans les dollars choisis.",
        "<strong>Esta tabla (CSV)</strong> guarda las cifras del gráfico para la medida y los años elegidos: el promedio de cada estado, sus años más bajo y más alto, la desviación estándar y cuántos años tuvieron datos, con precios y valores en los dólares elegidos.",
        "<strong>هذا الجدول (CSV)</strong> يحفظ أرقام الرسم للمقياس والسنوات المختارة: متوسط كل ولاية، وأدنى سنة وأعلاها، والانحراف المعياري، وعدد السنوات التي فيها بيانات، مع الأسعار والقيم بالدولارات المختارة."),
    "<strong>State history (CSV)</strong>, under each state’s chart, saves every year for that state, with dollars both as reported and in 2025 dollars.": (
        "<strong>Historique de l’État (CSV)</strong>, sous le graphique de chaque État, enregistre chaque année de cet État, avec les dollars tels que publiés et en dollars de 2025.",
        "<strong>Historial del estado (CSV)</strong>, bajo el gráfico de cada estado, guarda cada año de ese estado, con dólares tal como se publicaron y en dólares de 2025.",
        "<strong>سجل الولاية (CSV)</strong>، أسفل رسم كل ولاية، يحفظ كل سنة لتلك الولاية، بالدولارات كما نُشرت وبدولارات 2025."),
}

def merge(lang, idx):
    path = os.path.join(os.path.dirname(__file__), '..', 'js', 'lang', lang + '.js')
    src = open(path, encoding='utf-8').read()
    head, body = src[:src.index('{')], src[src.index('{'):src.rindex('}') + 1]
    d = json.loads(body)
    for k, v in STATIC.items():
        d['static'][k] = v[idx]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(head + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('%s: %d entries merged' % (lang, len(STATIC)))


if __name__ == '__main__':
    for i, lang in enumerate(['fr', 'es', 'ar']):
        merge(lang, i)
