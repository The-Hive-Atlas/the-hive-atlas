"""French, Spanish, Arabic and Chinese text for the November 2026 homepage update (index.html):
the new opening paragraph, "Five ways to explore", and the new Honey Production card.

Run once after editing to merge these entries into js/lang/fr.js, es.js, ar.js and zh.js:
    python3 pipeline/i18n_homepage.py

Drafted by Claude; have fluent readers review. Terms follow pipeline/i18n_nass_trends.py.
"""
import json
import os

LANGS = ('fr', 'es', 'ar', 'zh')
HONEY_ICON = ('<svg width="22" height="25" viewBox="0 0 34 38" aria-hidden="true"><polygon points="17,1 33,10 33,28 17,37 1,28 1,10" '
              'fill="none" stroke="var(--honey)" stroke-width="4"></polygon><circle cx="17" cy="19" r="6" fill="var(--honey)"></circle></svg>')
STATIC = {
    "The Hive Atlas brings published disease surveillance, genetic diversity, colony loss, and honey production data for honey bees in the United States and around the world into one place. Explore it by continent, country, state/province or climate region, by pathogen, and by year, then download what you need.": (
        "The Hive Atlas réunit en un seul endroit les données publiées de surveillance des maladies, de diversité génétique, de pertes de colonies et de production de miel pour les abeilles des États-Unis et du monde entier. Explorez-les par continent, pays, État/province ou région climatique, par agent pathogène et par année, puis téléchargez ce dont vous avez besoin.",
        "The Hive Atlas reúne en un solo lugar datos publicados de vigilancia de enfermedades, diversidad genética, pérdidas de colonias y producción de miel para las abejas de EE. UU. y de todo el mundo. Explórelos por continente, país, estado/provincia o región climática, por patógeno y por año, y descargue lo que necesite.",
        "يجمع The Hive Atlas في مكان واحد البيانات المنشورة عن ترصد الأمراض والتنوع الوراثي وخسائر الطوائف وإنتاج العسل لنحل العسل في الولايات المتحدة والعالم. استكشفها حسب القارة أو الدولة أو الولاية/المقاطعة أو الإقليم المناخي، وحسب المُمرِض والسنة، ثم نزّل ما تحتاجه.",
        "The Hive Atlas 将已发表的美国和全球蜜蜂疾病监测、遗传多样性、蜂群损失和蜂蜜生产数据汇集在一处。可按大洲、国家、州/省或气候区，按病原体和年份进行探索，并下载所需内容。"),
    "Five ways to explore": (
        "Cinq façons d’explorer",
        "Cinco formas de explorar",
        "خمس طرق للاستكشاف",
        "五种探索方式"),
    "How much honey U.S. beekeepers produced each year, state by state, with yield per colony, prices, and year-end stocks from USDA surveys since 1987. A U.S. Trends tab adds income from pollination and other hive products, and honey prices by color.": (
        "La quantité de miel produite chaque année par les apiculteurs américains, État par État, avec le rendement par colonie, les prix et les stocks de fin d’année, d’après les enquêtes de l’USDA depuis 1987. Un onglet Tendances des États-Unis ajoute les revenus de la pollinisation et des autres produits de la ruche, ainsi que les prix du miel selon la couleur.",
        "Cuánta miel produjeron cada año los apicultores de EE. UU., estado por estado, con el rendimiento por colonia, los precios y las existencias de fin de año, según las encuestas del USDA desde 1987. Una pestaña Tendencias de EE. UU. añade los ingresos por polinización y otros productos de la colmena, y los precios de la miel por color.",
        "كمية العسل التي أنتجها النحالون في الولايات المتحدة كل عام، ولاية بولاية، مع إنتاجية الطائفة والأسعار والمخزون في نهاية العام، من مسوح وزارة الزراعة الأمريكية منذ 1987. ويضيف تبويب اتجاهات الولايات المتحدة الدخل من التلقيح ومنتجات الخلية الأخرى، وأسعار العسل حسب اللون.",
        "美国养蜂人每年在各州生产了多少蜂蜜，以及每群产量、价格和年底库存，数据来自 1987 年以来的美国农业部调查。“美国趋势”选项卡还提供授粉和其他蜂产品的收入，以及按颜色分的蜂蜜价格。"),
    # Card title: the dictionary key is the heading's whole inner HTML, icon included, as the browser writes it
    HONEY_ICON + " Honey Production": tuple(HONEY_ICON + " " + t for t in (
        "Production de miel", "Producción de miel", "إنتاج العسل", "蜂蜜生产")),
    "Yield per colony": ("Rendement par colonie", "Rendimiento por colonia", "إنتاجية الطائفة", "每群产量"),
    "Prices": ("Prix", "Precios", "الأسعار", "价格"),
    "Stocks": ("Stocks", "Existencias", "المخزون", "库存"),
    "Income": ("Revenus", "Ingresos", "الدخل", "收入"),
    "Open honey production →": (
        "Ouvrir la production de miel →",
        "Abrir la producción de miel →",
        "افتح إنتاج العسل ←",
        "打开蜂蜜生产 →"),
}


def merge():
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'lang')
    for i, lang in enumerate(LANGS):
        path = os.path.join(here, lang + '.js')
        src = open(path, encoding='utf-8').read()
        head = src[:src.index('{')]
        data = json.loads(src[src.index('{'):src.rindex('}') + 1])
        for k, v in STATIC.items():
            data['static'][k] = v[i]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(head + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
        print(lang + ': %d entries merged' % len(STATIC))


if __name__ == '__main__':
    merge()
