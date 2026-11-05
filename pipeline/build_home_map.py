"""Draw the example world map on the landing page from the outlines in data/disease-shapes.js.

Usage: python3 pipeline/build_home_map.py data/disease-shapes.js index.html

The map is an illustration: each land shape gets an example color, not real data. It is written into
index.html between the home-map comments, so the page needs no extra data file.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_country_shapes import simplify, area  # noqa: E402

W, TOL, MIN_AREA = 1000, 0.45, 0.8
PLEN = [1, .9986, .9954, .99, .9822, .973, .96, .9427, .9216, .8962, .8679, .835, .7986, .7597, .7186, .6732, .6213, .5722, .5322]
PDFE = [0, .062, .124, .186, .248, .31, .372, .434, .4958, .5571, .6176, .6769, .7346, .7903, .8435, .8936, .9394, .9761, 1]  # Robinson projection tables, every 5 degrees


def robinson(lon, lat):
    a = min(abs(lat), 89.999)
    i = int(a // 5)
    t = (a - i * 5) / 5
    plen = PLEN[i] + t * (PLEN[i + 1] - PLEN[i])
    pdfe = PDFE[i] + t * (PDFE[i + 1] - PDFE[i])
    return lon / 180 * plen, (pdfe if lat >= 0 else -pdfe)


def main(shapes, page):
    t = Path(shapes).read_text(encoding='utf-8')
    d = json.loads(t[t.index('{'):t.rindex('}') + 1])
    polys = [('', p) for p in d['land']] + [(k, p) for k, c in d['countries'].items() for p in c]
    sx = W / 2
    sy = sx * 0.5072 * 2  # Robinson height to width
    top = 0.97  # the map is cut just above Greenland and below South America
    bottom = -0.70
    h = (top - bottom) * sy / 2
    groups = [[] for _ in range(5)]
    for n, (key, pl) in enumerate(polys):
        if area(pl[0]) < MIN_AREA:
            continue
        pts = simplify([list(q) for q in pl[0]], TOL)
        if len(pts) < 4:
            continue
        out = []
        for lon, lat in pts:
            x, y = robinson(lon, lat)
            out.append('%d %d' % (round((x + 1) * sx), round((top - y) * sy / 2)))
        seed = sum(ord(c) * (i + 3) for i, c in enumerate(key)) if key else n * n * 13 + n * 5
        groups[(seed // 3 + seed) % 5].append('M' + 'L'.join(out) + 'Z')
    svg = '<svg class="worldmap" viewBox="0 0 %d %d" role="img" aria-label="Illustration of a world map with countries shaded by example values">' % (W, round(h))
    for i, g in enumerate(groups):
        svg += '<path fill="var(--c%d)" d="%s"/>' % (i, ''.join(g))
    svg += '</svg>'
    s = Path(page).read_text(encoding='utf-8')
    a, b = '<!-- home-map -->', '<!-- /home-map -->'
    Path(page).write_text(s[:s.index(a) + len(a)] + svg + s[s.index(b):], encoding='utf-8')
    print('map', len(svg) // 1024, 'KB,', sum(len(g) for g in groups), 'shapes')


if __name__ == '__main__':
    main(*sys.argv[1:])
