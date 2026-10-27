"""Turn the Bee Disease Diagnostic Laboratory (BDDL) adult-bee spreadsheet into the data file
the Disease Surveillance map reads.

Usage:
    python3 pipeline/clean_bddl.py Adult_BDDL_1984Present.xlsx Adult_BDDL_cleaned.xlsx   # once per new spreadsheet
    python3 pipeline/build_disease.py Adult_BDDL_cleaned.xlsx data/disease.js data/bddl-adult-state-year.csv

Keep the spreadsheet itself OUT of the site folder: it has zip codes and sample numbers.
This script publishes only counts per state, year and month, never single samples.

Output: data/disease.js defines window.HIVE_DISEASE with one row per state, year and month:
    [state, year, month (0 = not recorded), samples,
     varroa tested, varroa positive, nosema tested, nosema positive,
     tracheal tested, tracheal positive,
     varroa counts, sum of mites per 100 bees, nosema counts, sum of million spores per bee]
and a CSV of the same counts by state and year for download.

What counts as tested:
  Varroa    VD is 0 or 1, from VARROA_FROM on. Every sample before then has VD = 0, which means
            Varroa wasn't screened yet, not that it was absent.
  Nosema    NOS is 0 or 1 (every year).
  Tracheal  TM is 0 or 1; "na" means not examined.
  Loads     VIL and MSPB are numbers (2015 on); "na" means not counted.
"""
import csv
import json
import sys
from collections import defaultdict
from datetime import date

import openpyxl

VARROA_FROM = 1990
MONTHS = {m: i + 1 for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}
FIX_STATE = {'KT': 'KY'}
NAMES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado',
    'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts',
    'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana',
    'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
    'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    'PR': 'Puerto Rico', 'US': 'United States',
}
# NOAA climate regions (Karl and Koss 1984), as used by Abban et al. 2024 and the Colony Monitoring page
REGIONS = {
    'NE': ('Northeast', ['CT', 'DE', 'ME', 'MD', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DC']),
    'UM': ('Upper Midwest', ['IA', 'MI', 'MN', 'WI']),
    'OV': ('Ohio Valley', ['IL', 'IN', 'KY', 'MO', 'OH', 'TN', 'WV']),
    'SE': ('Southeast', ['AL', 'FL', 'GA', 'NC', 'SC', 'VA']),
    'NRP': ('Northern Rockies and Plains', ['MT', 'NE', 'ND', 'SD', 'WY']),
    'S': ('South', ['AR', 'KS', 'LA', 'MS', 'OK', 'TX']),
    'SW': ('Southwest', ['AZ', 'CO', 'NM', 'UT']),
    'NW': ('Northwest', ['ID', 'OR', 'WA']),
    'W': ('West', ['CA', 'NV']),
    'AK': ('Alaska', ['AK']),
    'HI': ('Hawaii', ['HI']),
}


def flag(v):
    return v if v in (0, 1) else None


def number(v):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def main(src, dst_js, dst_csv):
    ws = openpyxl.load_workbook(src, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    head = list(next(rows))
    col = {k: head.index(k) for k in ('Month', 'Year', 'State', 'VD', 'VIL', 'NOS', 'MSPB', 'TM')}
    cube = defaultdict(lambda: [0] * 11)
    unknown = defaultdict(int)
    for r in rows:
        if r[col['Year']] is None:
            continue
        stc = str(r[col['State']] or '').strip().upper()
        stc = FIX_STATE.get(stc, stc)
        if stc not in NAMES or stc == 'US':
            unknown[stc] += 1
            continue
        y = int(r[col['Year']])
        m = MONTHS.get(str(r[col['Month']] or '').strip()[:3].title(), 0)
        c = cube[(stc, y, m)]
        c[0] += 1
        vd, nos, tm = flag(r[col['VD']]), flag(r[col['NOS']]), flag(r[col['TM']])
        if vd is not None and y >= VARROA_FROM:
            c[1] += 1; c[2] += vd
        if nos is not None:
            c[3] += 1; c[4] += nos
        if tm is not None:
            c[5] += 1; c[6] += tm
        vil, ms = number(r[col['VIL']]), number(r[col['MSPB']])
        if vil is not None:
            c[7] += 1; c[8] += vil
        if ms is not None:
            c[9] += 1; c[10] += ms
    if unknown:
        print('skipped rows with unknown state codes:', dict(unknown))

    states = sorted({k[0] for k in cube}, key=lambda s: NAMES[s])
    sidx = {s: i for i, s in enumerate(states)}
    out = []
    for (s, y, m), c in sorted(cube.items(), key=lambda kv: (kv[0][1], sidx[kv[0][0]], kv[0][2])):
        out.append([sidx[s], y, m] + c[:8] + [round(c[8], 2), c[9], round(c[10], 3)])
    years = sorted({k[1] for k in cube})
    data = {
        'source': {'name': 'USDA ARS Bee Research Laboratory, Bee Disease Diagnostic Laboratory', 'built': date.today().isoformat(),
                   'first': years[0], 'last': years[-1], 'varroaFrom': VARROA_FROM},
        'states': states, 'names': NAMES,
        'regions': {k: {'name': v[0], 'states': v[1]} for k, v in REGIONS.items()},
        'cols': ['state', 'year', 'month', 'samples', 'vd_n', 'vd_pos', 'nos_n', 'nos_pos', 'tm_n', 'tm_pos', 'vil_n', 'vil_sum', 'ms_n', 'ms_sum'],
        'rows': out,
    }
    with open(dst_js, 'w', encoding='utf-8') as f:
        f.write('/* BDDL adult honey bee samples, counted by state, year and month. Generated by pipeline/build_disease.py. */\n')
        f.write('window.HIVE_DISEASE = ')
        json.dump(data, f, separators=(',', ':'))
        f.write(';\n')

    # Download: state by year
    sy = defaultdict(lambda: [0] * 11)
    for (s, y, m), c in cube.items():
        t = sy[(s, y)]
        for i, v in enumerate(c):
            t[i] += v
    with open(dst_csv, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['year', 'state', 'state_name', 'samples', 'varroa_tested', 'varroa_positive', 'varroa_pct_positive',
                    'nosema_tested', 'nosema_positive', 'nosema_pct_positive', 'tracheal_tested', 'tracheal_positive', 'tracheal_pct_positive',
                    'varroa_counted', 'avg_mites_per_100_bees', 'nosema_counted', 'avg_million_spores_per_bee'])
        pct = lambda p, n: round(100 * p / n, 1) if n else ''
        avg = lambda s, n, d: round(s / n, d) if n else ''
        for (s, y) in sorted(sy, key=lambda k: (k[1], NAMES[k[0]])):
            c = sy[(s, y)]
            w.writerow([y, s, NAMES[s], c[0], c[1], c[2], pct(c[2], c[1]), c[3], c[4], pct(c[4], c[3]), c[5], c[6], pct(c[6], c[5]),
                        c[7], avg(c[8], c[7], 2), c[9], avg(c[10], c[9], 2)])
    total = sum(c[0] for c in cube.values())
    print('wrote %d samples as %d state-year-month rows, %d states, %d to %d' % (total, len(out), len(states), years[0], years[-1]))


if __name__ == '__main__':
    main(*sys.argv[1:])
