"""French, Spanish, Arabic and Chinese text for the Collaborators section of about.html.

Run once after editing to merge these entries into js/lang/fr.js, es.js, ar.js and zh.js:
    python3 pipeline/i18n_collaborators.py

Collaborators' names and institutions are not translated. Drafted by Claude; have fluent readers review.
"""
import json
import os

LANGS = ('fr', 'es', 'ar', 'zh')
STATIC = {
    "Collaborators": ("Collaborateurs", "Colaboradores", "المتعاونون", "合作者"),
    "Researchers, inspectors, and organizations who contribute data, expertise, and review to The Hive Atlas.": (
        "Les chercheurs, inspecteurs et organisations qui apportent des données, une expertise et des relectures à The Hive Atlas.",
        "Investigadores, inspectores y organizaciones que aportan datos, experiencia y revisión a The Hive Atlas.",
        "الباحثون والمفتشون والمؤسسات الذين يسهمون في The Hive Atlas بالبيانات والخبرة والمراجعة.",
        "为 The Hive Atlas 提供数据、专业知识和审阅的研究人员、检查员和机构。"),
    "Collaborators will be listed here soon.": (
        "Les collaborateurs seront bientôt présentés ici.",
        "Pronto se mostrarán aquí los colaboradores.",
        "ستُدرج أسماء المتعاونين هنا قريبًا.",
        "合作者名单即将在此列出。"),
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
