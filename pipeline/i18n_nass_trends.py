"""French, Spanish and Arabic text for the U.S. Trends tab on the NASS pages (losses.html, honey-production.html).

Run once after editing to merge these entries into js/lang/fr.js, es.js and ar.js:
    python3 pipeline/i18n_nass_trends.py

English is the key. Chart text drawn by js/nass-trends.js is translated inside that file.
Drafted by Claude; have a fluent reader review before publishing.
"""
import json
import os

STATIC = {
    "U.S. Trends": (
        "Tendances des États-Unis",
        "Tendencias de EE. UU.",
        "اتجاهات الولايات المتحدة"),
    "The <strong>U.S. Trends</strong> tab shows NASS series that exist only for the United States as a whole, so they are drawn over time instead of state by state.": (
        "L’onglet <strong>Tendances des États-Unis</strong> présente des séries de la NASS qui n’existent que pour l’ensemble des États-Unis : elles sont donc tracées dans le temps plutôt qu’État par État.",
        "La pestaña <strong>Tendencias de EE. UU.</strong> muestra series de NASS que solo existen para EE. UU. en conjunto, por eso se dibujan en el tiempo y no estado por estado.",
        "يعرض تبويب <strong>اتجاهات الولايات المتحدة</strong> سلاسل NASS المتوفرة للولايات المتحدة ككل فقط، لذا تُرسم عبر الزمن لا ولايةً بولاية."),
    "<strong>Sudden colony loss</strong> counts colonies beekeepers reported lost with all of these signs: few or no dead bees in or near the hive; a quick loss of adult bees although the queen, capped brood, and food were still there; robbing of the food absent or delayed; and a loss not explained by Varroa or Nosema. These colonies are part of all colonies lost, not in addition to them. The share is sudden losses divided by all U.S. colonies lost that quarter.": (
        "La <strong>perte soudaine de colonies</strong> compte les colonies déclarées perdues avec tous ces signes : peu ou pas d’abeilles mortes dans la ruche ou à proximité ; une perte rapide des abeilles adultes alors que la reine, le couvain operculé et les réserves étaient encore là ; pillage des réserves absent ou tardif ; et une perte non expliquée par Varroa ou Nosema. Ces colonies font partie de l’ensemble des colonies perdues, elles ne s’y ajoutent pas. La part correspond aux pertes soudaines divisées par toutes les colonies perdues aux États-Unis ce trimestre.",
        "La <strong>pérdida repentina de colonias</strong> cuenta las colonias declaradas perdidas con todas estas señales: pocas o ninguna abeja muerta en la colmena o cerca; pérdida rápida de abejas adultas aunque la reina, la cría operculada y el alimento seguían allí; pillaje del alimento ausente o tardío; y una pérdida no explicada por Varroa ni Nosema. Estas colonias forman parte de todas las colonias perdidas, no se suman a ellas. La proporción es la pérdida repentina dividida entre todas las colonias perdidas en EE. UU. ese trimestre.",
        "<strong>الفقد المفاجئ للطوائف</strong> يعدّ الطوائف التي أفاد النحالون بفقدها مع كل هذه العلامات: قلة النحل الميت أو انعدامه داخل الخلية أو قربها؛ فقدان سريع للنحل البالغ رغم بقاء الملكة والحضنة المختومة والغذاء؛ غياب سرقة الغذاء أو تأخرها؛ وفقد لا تفسره الفاروا ولا النوزيما. وهذه الطوائف جزء من مجموع الطوائف المفقودة لا إضافة إليه. والنسبة هي الفقد المفاجئ مقسومًا على كل الطوائف المفقودة في الولايات المتحدة في ذلك الربع."),
    "<strong>Small beekeeping operations</strong> compares operations with fewer than five colonies, which NASS surveyed only from 2015 to 2017, with operations of five or more colonies. Both are the percent of colonies lost each quarter.": (
        "Les <strong>petites exploitations apicoles</strong> comparent les exploitations de moins de cinq colonies, enquêtées par la NASS seulement de 2015 à 2017, avec celles de cinq colonies ou plus. Les deux séries sont le pourcentage de colonies perdues par trimestre.",
        "Las <strong>explotaciones apícolas pequeñas</strong> comparan las explotaciones con menos de cinco colonias, que NASS solo encuestó de 2015 a 2017, con las de cinco o más. Ambas series son el porcentaje de colonias perdidas cada trimestre.",
        "<strong>المناحل الصغيرة</strong> تقارن المناحل التي تضم أقل من خمس طوائف، والتي لم تمسحها NASS إلا من 2015 إلى 2017، بالمناحل التي تضم خمسًا أو أكثر. والسلسلتان هما نسبة الطوائف المفقودة كل ربع."),
    "<strong>Income from honey, pollination, and other hive products.</strong> Honey is the value of production from the Honey report. Pollination is gross income from renting colonies to growers. Other hive products are everything else beekeepers sold, such as beeswax, queens, and package bees. NASS reports pollination and other income from 2015 on. In 2025 dollars, all three are adjusted with the same CPI-U factors as honey prices.": (
        "<strong>Revenus du miel, de la pollinisation et des autres produits de la ruche.</strong> Le miel correspond à la valeur de la production du rapport Honey. La pollinisation est le revenu brut de la location de colonies aux cultivateurs. Les autres produits de la ruche regroupent tout ce que les apiculteurs ont vendu d’autre : cire, reines, paquets d’abeilles, etc. La NASS publie les revenus de la pollinisation et des autres produits depuis 2015. En dollars de 2025, les trois séries sont corrigées avec les mêmes facteurs CPI-U que les prix du miel.",
        "<strong>Ingresos por miel, polinización y otros productos de la colmena.</strong> La miel es el valor de la producción del informe Honey. La polinización es el ingreso bruto por alquilar colonias a los agricultores. Otros productos de la colmena son todo lo demás que vendieron los apicultores: cera, reinas, paquetes de abejas, etc. NASS publica los ingresos por polinización y otros productos desde 2015. En dólares de 2025, las tres series se ajustan con los mismos factores CPI-U que los precios de la miel.",
        "<strong>الدخل من العسل والتلقيح ومنتجات الخلية الأخرى.</strong> العسل هو قيمة الإنتاج من تقرير العسل. والتلقيح هو الدخل الإجمالي من تأجير الطوائف للمزارعين. ومنتجات الخلية الأخرى هي كل ما باعه النحالون غير ذلك، مثل الشمع والملكات وطرود النحل. وتنشر NASS دخل التلقيح والمنتجات الأخرى منذ 2015. وبدولارات 2025 تُعدَّل السلاسل الثلاث بعوامل CPI-U نفسها المستخدمة لأسعار العسل."),
    "<strong>Honey prices by color.</strong> The price beekeepers received for each NASS color class, for all sales, for retail sales to consumers and stores, and for wholesale sales in bulk to packers and processors. Color classes are reported from 2003; NASS published them in cents per pound until 2017, converted here to dollars.": (
        "<strong>Prix du miel selon la couleur.</strong> Le prix reçu par les apiculteurs pour chaque classe de couleur de la NASS, pour l’ensemble des ventes, les ventes au détail aux consommateurs et aux magasins, et les ventes en gros en vrac aux conditionneurs et transformateurs. Les classes de couleur sont publiées depuis 2003 ; la NASS les publiait en cents par livre jusqu’en 2017, convertis ici en dollars.",
        "<strong>Precios de la miel por color.</strong> El precio que recibieron los apicultores por cada clase de color de NASS, para todas las ventas, las ventas minoristas a consumidores y tiendas, y las ventas mayoristas a granel a envasadores y procesadores. Las clases de color se publican desde 2003; NASS las publicó en centavos por libra hasta 2017, convertidos aquí a dólares.",
        "<strong>أسعار العسل حسب اللون.</strong> السعر الذي تلقاه النحالون لكل فئة لون لدى NASS، لكل المبيعات، ولمبيعات التجزئة للمستهلكين والمتاجر، ولمبيعات الجملة بكميات كبيرة للمعبئين والمصنعين. وتُنشر فئات اللون منذ 2003، وكانت NASS تنشرها بالسنت لكل رطل حتى 2017، وقد حُوّلت هنا إلى دولارات."),
    "<strong>Price as a share of parity.</strong> Parity is the price honey would need to buy as much, relative to what farmers pay for goods, services, interest, taxes, and wages, as it did in 1910–1914. A value of 33% means a pound of honey buys about a third of what it did then.": (
        "<strong>Prix en pourcentage de la parité.</strong> La parité est le prix qu’il faudrait au miel pour acheter autant qu’en 1910–1914, au regard de ce que paient les agriculteurs (biens, services, intérêts, impôts et salaires). Une valeur de 33 % signifie qu’une livre de miel achète environ un tiers de ce qu’elle achetait alors.",
        "<strong>Precio como porcentaje de paridad.</strong> La paridad es el precio que necesitaría la miel para comprar lo mismo que en 1910–1914, frente a lo que pagan los agricultores por bienes, servicios, intereses, impuestos y salarios. Un valor de 33 % significa que una libra de miel compra cerca de un tercio de lo que compraba entonces.",
        "<strong>السعر كنسبة من سعر التعادل.</strong> سعر التعادل هو السعر الذي يحتاجه العسل ليشتري القدر نفسه الذي كان يشتريه في 1910–1914، قياسًا على ما يدفعه المزارعون للسلع والخدمات والفوائد والضرائب والأجور. وتعني القيمة 33% أن رطل العسل يشتري نحو ثلث ما كان يشتريه آنذاك."),
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
