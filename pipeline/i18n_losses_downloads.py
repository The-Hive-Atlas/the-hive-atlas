"""French, Spanish and Arabic text for the Colony Losses downloads.

Run once after editing to merge these entries into js/lang/fr.js, es.js and ar.js:
    python3 pipeline/i18n_losses_downloads.py

English is the key. Drafted by Claude; have a fluent reader review before publishing.
"""
import json
import os

STATIC = {
    'All states, all quarters (CSV)': ('Tous les États, tous les trimestres (CSV)', 'Todos los estados, todos los trimestres (CSV)', 'كل الولايات وكل الأرباع (CSV)'),
    'Sample sizes (CSV)': ('Tailles d’échantillon (CSV)', 'Tamaños de muestra (CSV)', 'أحجام العينات (CSV)'),
    '<strong>This table (CSV)</strong> saves the table under the map for the period you’re viewing, with every measure and stressor, plus NASS’s sample sizes where they exist.': (
        '<strong>Ce tableau (CSV)</strong> enregistre le tableau situé sous la carte pour la période affichée, avec toutes les mesures et tous les facteurs de stress, ainsi que les tailles d’échantillon de la NASS lorsqu’elles existent.',
        '<strong>Esta tabla (CSV)</strong> guarda la tabla que aparece bajo el mapa para el periodo que está viendo, con todas las medidas y factores de estrés, y los tamaños de muestra del NASS cuando existen.',
        '<strong>هذا الجدول (CSV)</strong> يحفظ الجدول الموجود أسفل الخريطة للفترة المعروضة، مع كل المقاييس وعوامل الإجهاد، وأحجام عينات NASS حيثما توفرت.'),
    '<strong>State history (CSV)</strong>, in each state panel, saves every surveyed quarter for that state, including the quarters it was counted in Other States.': (
        '<strong>Historique de l’État (CSV)</strong>, dans le panneau de chaque État, enregistre tous les trimestres enquêtés pour cet État, y compris ceux où il était compté dans Autres États.',
        '<strong>Historial del estado (CSV)</strong>, en el panel de cada estado, guarda todos los trimestres encuestados de ese estado, incluidos aquellos en que se contó en Otros estados.',
        '<strong>سجل الولاية (CSV)</strong>، في لوحة كل ولاية، يحفظ كل الأرباع التي شملها المسح لتلك الولاية، بما فيها الأرباع التي احتُسبت فيها ضمن ولايات أخرى.'),
    '<strong>All states, all quarters (CSV)</strong> is the complete cleaned dataset, one row per state per quarter, with the NASS release each value came from.': (
        '<strong>Tous les États, tous les trimestres (CSV)</strong> est le jeu de données complet et nettoyé : une ligne par État et par trimestre, avec la publication de la NASS d’où provient chaque valeur.',
        '<strong>Todos los estados, todos los trimestres (CSV)</strong> es el conjunto de datos completo y depurado: una fila por estado y trimestre, con la publicación del NASS de la que procede cada valor.',
        '<strong>كل الولايات وكل الأرباع (CSV)</strong> هي مجموعة البيانات الكاملة المنقحة: صف لكل ولاية في كل ربع، مع إصدار NASS الذي جاءت منه كل قيمة.'),
    '<strong>Sample sizes (CSV)</strong> lists the operations NASS sampled and the response rates by state and quarter, from 2019 on.': (
        '<strong>Tailles d’échantillon (CSV)</strong> indique les exploitations échantillonnées par la NASS et les taux de réponse par État et par trimestre, à partir de 2019.',
        '<strong>Tamaños de muestra (CSV)</strong> recoge las explotaciones que el NASS incluyó en la muestra y las tasas de respuesta por estado y trimestre, desde 2019.',
        '<strong>أحجام العينات (CSV)</strong> تسرد المنشآت التي شملتها عينة NASS ومعدلات الاستجابة حسب الولاية والربع، ابتداءً من 2019.'),
    'The complete dataset keeps values as NASS published them, with a flag for each value NASS reported as less than half of one percent. The table and state downloads use the corrected values shown on the map and list which values were corrected (see <a href="#ab-corrections">Corrections</a>). Please cite USDA NASS as the source and The Hive Atlas as the compiler.': (
        'Le jeu de données complet conserve les valeurs telles que publiées par la NASS, avec un indicateur pour chaque valeur publiée comme inférieure à un demi pour cent. Les téléchargements du tableau et des États utilisent les valeurs corrigées affichées sur la carte et indiquent les valeurs corrigées (voir <a href="#ab-corrections">Corrections</a>). Merci de citer l’USDA NASS comme source et The Hive Atlas comme compilateur.',
        'El conjunto de datos completo conserva los valores tal como los publicó el NASS, con una marca para cada valor publicado como inferior a medio punto porcentual. Las descargas de la tabla y de los estados usan los valores corregidos del mapa e indican qué valores se corrigieron (vea <a href="#ab-corrections">Correcciones</a>). Cite al USDA NASS como fuente y a The Hive Atlas como compilador.',
        'تحتفظ مجموعة البيانات الكاملة بالقيم كما نشرتها NASS، مع علامة لكل قيمة نشرتها على أنها أقل من نصف بالمئة. أما تنزيلات الجدول والولايات فتستخدم القيم المصححة المعروضة على الخريطة وتبيّن القيم التي صُححت (انظر <a href="#ab-corrections">التصحيحات</a>). يُرجى ذكر USDA NASS مصدرًا وThe Hive Atlas جهةً جامعة للبيانات.'),
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
