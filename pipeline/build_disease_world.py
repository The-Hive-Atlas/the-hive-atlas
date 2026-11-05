"""Build the Disease Surveillance data from the published BRL workbook (adult and brood sheets,
every country), keeping the newer U.S. years from the current site data.

Usage:
    python3 pipeline/build_disease_world.py BRL_1984_2015_PUBLISHED_cleaned.xlsx data/disease.js \
        data/bddl-state-year.csv NE_50M_COUNTRIES.geojson NE_10M_ADMIN1.geojson data/disease-shapes.js

    BRL_..._cleaned.xlsx         the published workbook (sheets ADULTS and BROOD; columns Month, Year,
                                 State, Country, Continent, Varroa_Prevalence, Nosema_Prevalence,
                                 Tracheal_Mite_Prevalence, AFB, EFB). It covers 1984 to 2015.
    data/disease.js              the output. With --keep-newer at the end of the command, its current U.S.
                                 rows for years after the workbook's last year are kept (they come from
                                 the lab spreadsheets via build_disease.py). Without it (the default, as
                                 published since November 2026) the site shows the workbook years only.
    NE_50M_COUNTRIES.geojson     Natural Earth ne_50m_admin_0_countries.geojson (public domain)
    NE_10M_ADMIN1.geojson        Natural Earth ne_10m_admin_1_states_provinces.geojson, used only for the
                                 reference points of Canadian provinces
    (both from https://github.com/nvkelso/natural-earth-vector, geojson folder)

Keep the workbook OUT of the site folder. Only counts per area, year and month are published.

Output rows (window.HIVE_DISEASE.rows) use the same 19 columns as before, but the first column is an
index into D.areas: U.S. state codes ("OH"), or "<ISO3>.<code>" for other countries ("CAN.ON"; "CAN.-"
for Canadian samples with no province; "IND.-" for a country recorded without areas).
D.states lists the U.S. codes only, as before. D.countries lists every country with its continent.

What counts as tested (workbook):
  Varroa, Nosema, tracheal mite, AFB, EFB: 0 = negative, 1 or more = positive (a handful of cells hold
  2 to 4; with one sample per row they are read as positive). Varroa before VARROA_FROM is treated as
  not screened. The workbook has no mite or spore counts (all "NA").
"""
import csv
import json
import sys
from collections import defaultdict, Counter
from datetime import date
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_disease import NAMES, REGIONS, VARROA_FROM, MONTHS, FIX_STATE  # noqa: E402
from build_country_shapes import simplify, area  # noqa: E402

NAMES = dict(NAMES, VI='U.S. Virgin Islands')
# spreadsheet country name -> (ISO3 / Natural Earth ADM0_A3, display name)
COUNTRY = {
    'USA': ('USA', 'United States'), 'Canada': ('CAN', 'Canada'), 'Mexico': ('MEX', 'Mexico'),
    'Guatemala': ('GTM', 'Guatemala'), 'Nicaragua': ('NIC', 'Nicaragua'), 'Costa Rica': ('CRI', 'Costa Rica'),
    'Honduras': ('HND', 'Honduras'), 'Panama': ('PAN', 'Panama'), 'Bahamas': ('BHS', 'Bahamas'),
    'Antigua and Barbuda': ('ATG', 'Antigua and Barbuda'), 'Jamaica': ('JAM', 'Jamaica'),
    'Trinidad and Tobago': ('TTO', 'Trinidad and Tobago'), 'Bermuda': ('BMU', 'Bermuda'), 'Montserrat': ('MSR', 'Montserrat'),
    'Venezuela': ('VEN', 'Venezuela'), 'Uruguay': ('URY', 'Uruguay'), 'Colombia': ('COL', 'Colombia'),
    'Bolivia': ('BOL', 'Bolivia'), 'Ecuador': ('ECU', 'Ecuador'), 'Brazil': ('BRA', 'Brazil'),
    'India': ('IND', 'India'), 'Pakistan': ('PAK', 'Pakistan'), 'Nepal': ('NPL', 'Nepal'), 'Jordan': ('JOR', 'Jordan'),
    'Palestine': ('PSX', 'Palestine'), 'Saudi Arabia': ('SAU', 'Saudi Arabia'), 'United Arab Emirates': ('ARE', 'United Arab Emirates'),
    'Indonesia': ('IDN', 'Indonesia'), 'Thailand': ('THA', 'Thailand'),
    'Nigeria': ('NGA', 'Nigeria'), 'South Africa': ('ZAF', 'South Africa'), 'Algeria': ('DZA', 'Algeria'),
    'Egypt': ('EGY', 'Egypt'), 'Sudan': ('SDN', 'Sudan'),
    'Spain': ('ESP', 'Spain'), 'Belgium': ('BEL', 'Belgium'), 'Poland': ('POL', 'Poland'), 'Fiji': ('FJI', 'Fiji'),
}
PROVINCES = {'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick', 'NL': 'Newfoundland and Labrador',
             'NS': 'Nova Scotia', 'ON': 'Ontario', 'PE': 'Prince Edward Island', 'QC': 'Quebec', 'SK': 'Saskatchewan'}
COLS = ['area', 'year', 'month', 'samples', 'vd_n', 'vd_pos', 'nos_n', 'nos_pos', 'tm_n', 'tm_pos', 'vil_n', 'vil_sum', 'ms_n', 'ms_sum',
        'brood_n', 'afb_pos', 'efb_pos', 'vil_sumsq', 'ms_sumsq']


def flag(v):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    return 1 if v >= 1 else 0 if v == 0 else None


def read_sheet(ws):
    rows = ws.iter_rows(values_only=True)
    head = list(next(rows))
    col = {k: i for i, k in enumerate(head)}
    for r in rows:
        if r[col['Year']] is None:
            continue
        yield {k: r[i] for k, i in col.items()}


def main(src, dst_js, dst_csv, ne0, ne1, dst_shapes, *flags):
    keep_newer = '--keep-newer' in flags
    old = {'rows': [], 'states': []}
    if keep_newer:
        old_text = Path(dst_js).read_text(encoding='utf-8')
        old = json.loads(old_text[old_text.index('{'):old_text.rindex('}') + 1])

    wb = openpyxl.load_workbook(src, read_only=True)
    cube = defaultdict(lambda: [0] * 16)
    cont_of, odd, skipped = {}, Counter(), Counter()

    def key_of(r):
        cname = str(r['Country'] or '').strip()
        if cname not in COUNTRY:
            skipped['country ' + cname] += 1
            return None
        iso = COUNTRY[cname][0]
        cont_of.setdefault(iso, Counter())[str(r['Continent'] or '').strip()] += 1
        stc = str(r['State'] or '').strip().upper()
        if iso == 'USA':
            stc = FIX_STATE.get(stc, stc)
            if stc not in NAMES or stc == 'US':
                skipped['US state ' + stc] += 1
                return None
            a = stc
        elif iso == 'CAN':
            a = 'CAN.' + (stc if stc in PROVINCES else '-')
        else:
            a = iso + '.-'
        return a, int(r['Year']), MONTHS.get(str(r['Month'] or '').strip()[:3].title(), 0)

    for r in read_sheet(wb['ADULTS']):
        k = key_of(r)
        if not k:
            continue
        c = cube[k]; c[0] += 1
        for name, ni in (('Varroa_Prevalence', 1), ('Nosema_Prevalence', 3), ('Tracheal_Mite_Prevalence', 5)):
            v = r[name]
            if isinstance(v, (int, float)) and v > 1:
                odd[name] += 1
            f = flag(v)
            if f is None or (ni == 1 and k[1] < VARROA_FROM):
                continue
            c[ni] += 1; c[ni + 1] += f
    for r in read_sheet(wb['BROOD']):
        k = key_of(r)
        if not k:
            continue
        for name in ('AFB', 'EFB'):
            if isinstance(r[name], (int, float)) and r[name] > 1:
                odd[name] += 1
        afb, efb = flag(r['AFB']), flag(r['EFB'])
        if afb is None or efb is None:
            skipped['brood with AFB or EFB blank'] += 1
            continue
        c = cube[k]; c[11] += 1; c[12] += afb; c[13] += efb
    last_book = max(k[1] for k in cube)

    # Keep the newer U.S. years from the current site data
    kept = 0
    for r in old['rows']:
        if r[1] <= last_book:
            continue
        s = old['states'][r[0]]
        c = cube[(s, r[1], r[2])]
        vals = r[3:]  # samples, vd_n, vd_pos, nos_n, nos_pos, tm_n, tm_pos, vil_n, vil_sum, ms_n, ms_sum, brood_n, afb, efb, vil_sq, ms_sq
        for i in range(16):
            c[i] += vals[i]
        kept += r[3]

    conts = {iso: cc.most_common(1)[0][0] for iso, cc in cont_of.items()}
    for iso, cc in cont_of.items():
        if len(cc) > 1:
            print('note: %s has rows in more than one continent: %s (using %s)' % (iso, dict(cc), conts[iso]))

    # Natural Earth: outlines and reference points
    ne = json.loads(Path(ne0).read_text(encoding='utf-8'))
    feat = {f['properties']['ADM0_A3']: f for f in ne['features']}
    adm1 = json.loads(Path(ne1).read_text(encoding='utf-8'))
    prov_pt = {}
    for f in adm1['features']:
        p = f['properties']
        if p.get('adm0_a3') == 'CAN' and p.get('postal'):
            prov_pt[p['postal']] = (round(p['longitude'], 2), round(p['latitude'], 2))

    us_states = sorted({k[0] for k in cube if '.' not in k[0]}, key=lambda s: NAMES[s])
    isos = sorted({k[0].split('.')[0] for k in cube if '.' in k[0]}, key=lambda i: [v[1] for v in COUNTRY.values() if v[0] == i][0])
    names_by_iso = {v[0]: v[1] for v in COUNTRY.values()}
    countries = [{'key': 'USA', 'name': 'United States', 'cont': conts.get('USA', 'North America'), 'areas': us_states}]
    area_names = {}
    area_pts = {}
    for iso in isos:
        ids = sorted({k[0] for k in cube if k[0].split('.')[0] == iso}, key=lambda a: (a.endswith('.-'), a))
        for a in ids:
            sub = a.split('.')[1]
            if sub == '-':
                area_names[a] = names_by_iso[iso] if len(ids) == 1 else 'Province not recorded'
                if len(ids) == 1 and iso in feat:
                    p = feat[iso]['properties']; area_pts[a] = [round(p['LABEL_X'], 2), round(p['LABEL_Y'], 2)]
            else:
                area_names[a] = PROVINCES[sub]
                if sub in prov_pt:
                    area_pts[a] = list(prov_pt[sub])
        lp = feat[iso]['properties'] if iso in feat else None
        countries.append({'key': iso, 'name': names_by_iso[iso], 'cont': conts[iso], 'areas': ids,
                          'lat': round(lp['LABEL_Y'], 2) if lp else None, 'lon': round(lp['LABEL_X'], 2) if lp else None})
    areas = us_states + [a for c in countries[1:] for a in c['areas']]
    aidx = {a: i for i, a in enumerate(areas)}
    out = []
    for (a, y, m), c in sorted(cube.items(), key=lambda kv: (kv[0][1], aidx[kv[0][0]], kv[0][2])):
        out.append([aidx[a], y, m] + c[:8] + [round(c[8], 2), c[9], round(c[10], 3)] + c[11:14] + [round(c[14], 2), round(c[15], 3)])
    years = sorted({k[1] for k in cube})
    data = {
        'source': {'name': 'USDA ARS Bee Research Laboratory, Bee Disease Diagnostic Laboratory', 'built': date.today().isoformat(),
                   'first': years[0], 'last': years[-1], 'varroaFrom': VARROA_FROM, 'bookLast': last_book,
                   'book': Path(src).name},
        'states': us_states, 'areas': areas, 'names': dict(NAMES, **area_names), 'points': area_pts,
        'countries': countries, 'continents': sorted({c['cont'] for c in countries}),
        'regions': {k: {'name': v[0], 'states': v[1]} for k, v in REGIONS.items()},
        'cols': COLS, 'rows': out,
    }
    with open(dst_js, 'w', encoding='utf-8') as f:
        f.write('/* BRL/BDDL adult and brood honey bee samples, counted by area, year and month, %d to %d, from the published '
                'workbook (every country)%s. Generated by pipeline/build_disease_world.py. */\n' % (years[0], last_book, '; later U.S. years from the lab spreadsheets' if kept else ''))
        f.write('window.HIVE_DISEASE = ')
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
        f.write(';\n')

    # Outlines: sampled countries in more detail, other land coarser
    def rings_of(geom, tol, min_area):
        polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
        res = []
        for pl in polys:
            if area(pl[0]) < min_area:
                continue
            rings = []
            for r in pl:
                s = simplify([[round(x, 3), round(y, 3)] for x, y in r], tol)
                if len(s) >= 4:
                    rings.append([[round(x, 2), round(y, 2)] for x, y in s])
            if rings:
                res.append(rings)
        return res
    sampled_isos = {c['key'] for c in countries}
    land, shapes = [], {}
    for iso, f in feat.items():
        if iso in ('ATA',):
            continue
        if iso in sampled_isos:
            shapes[iso] = rings_of(f['geometry'], 0.04, 0.0005)
        else:
            land.extend(rings_of(f['geometry'], 0.15, 0.3))
    missing = [c['name'] for c in countries if not shapes.get(c['key'])]
    if missing:
        print('note: no outline for', ', '.join(missing))
    Path(dst_shapes).write_text(
        '/* The Hive Atlas: country outlines for the Disease Surveillance map. Natural Earth 1:50m (public domain), simplified. '
        'Generated by pipeline/build_disease_world.py. Rings of [longitude, latitude]. */\n'
        'window.HIVE_DISEASE_SHAPES = ' + json.dumps({'land': land, 'countries': shapes}, separators=(',', ':')) + ';\n', encoding='utf-8')

    # Download: area by year
    sy = defaultdict(lambda: [0] * 16)
    for (a, y, m), c in cube.items():
        t = sy[(a, y)]
        for i, v in enumerate(c):
            t[i] += v
    ctry = {a: c for c in countries for a in c['areas']}
    with open(dst_csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['year', 'continent', 'country', 'state', 'state_name', 'adult_samples', 'varroa_tested', 'varroa_positive', 'varroa_pct_positive',
                    'nosema_tested', 'nosema_positive', 'nosema_pct_positive', 'tracheal_tested', 'tracheal_positive', 'tracheal_pct_positive',
                    'varroa_counted', 'avg_mites_per_100_bees', 'nosema_counted', 'avg_million_spores_per_bee',
                    'brood_samples', 'afb_positive', 'afb_pct_positive', 'efb_positive', 'efb_pct_positive'])
        pct = lambda p, n: round(100 * p / n, 1) if n else ''
        avg = lambda s, n, d: round(s / n, d) if n else ''
        for (a, y) in sorted(sy, key=lambda k: (k[1], aidx[k[0]])):
            c, cc = sy[(a, y)], ctry[a]
            code = a if '.' not in a else ('' if a.endswith('.-') else a.split('.')[1])
            w.writerow([y, cc['cont'], cc['name'], code, data['names'][a] if code else '', c[0], c[1], c[2], pct(c[2], c[1]), c[3], c[4], pct(c[4], c[3]),
                        c[5], c[6], pct(c[6], c[5]), c[7], avg(c[8], c[7], 2), c[9], avg(c[10], c[9], 2), c[11], c[12], pct(c[12], c[11]), c[13], pct(c[13], c[11])])

    tot = lambda pred, i: sum(c[i] for k, c in cube.items() if pred(k))
    print('workbook years: %d to %d; kept %d U.S. adult samples from %d on' % (years[0], last_book, kept, last_book + 1))
    print('adult samples: %d (U.S. %d), brood samples: %d (U.S. %d)' % (
        tot(lambda k: True, 0), tot(lambda k: '.' not in k[0], 0), tot(lambda k: True, 11), tot(lambda k: '.' not in k[0], 11)))
    print('countries: %d, continents: %s' % (len(countries), data['continents']))
    print('values above 1 read as positive:', dict(odd))
    print('skipped:', dict(skipped))
    print('wrote', dst_js, Path(dst_js).stat().st_size // 1024, 'KB;', dst_shapes, Path(dst_shapes).stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main(*sys.argv[1:])
