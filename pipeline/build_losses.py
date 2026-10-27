"""Turn the NASS Honey Bee Colonies CSV into the data file the Colony Losses map reads.

Usage:
    python3 pipeline/build_losses.py NASS_HoneyBeeColonies_byState_byQuarter.csv data/colony-losses.js

Input columns (one row per state per quarter): year, quarter, period, quarter_label,
state, state_abbr, state_type, colonies_start, colonies_max, colonies_lost, pct_lost,
colonies_added, colonies_renovated, pct_renovated, stressor_* and matching *_lt_half
flags (True where NASS printed "less than half of the unit shown"), plus release dates.

Output: a JavaScript file defining window.HIVE_LOSSES. A script file is used instead of
JSON so the page also works when opened straight from your computer.
"""
import csv
import json
import sys
from datetime import date

FIELDS = [
    ('colonies_start', 'colonies_start'),
    ('colonies_max', 'colonies_max'),
    ('colonies_lost', 'colonies_lost'),
    ('pct_lost', 'pct_lost'),
    ('colonies_added', 'colonies_added'),
    ('colonies_renovated', 'colonies_renovated'),
    ('pct_renovated', 'pct_renovated'),
    ('varroa', 'stressor_varroa'),
    ('other_pests', 'stressor_other_pests'),
    ('diseases', 'stressor_diseases'),
    ('pesticides', 'stressor_pesticides'),
    ('other', 'stressor_other'),
    ('unknown', 'stressor_unknown'),
]

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
    'US': 'United States', 'OTH': 'Other States',
}

MONTHS = {1: ('January-March', 'Jan-Mar'), 2: ('April-June', 'Apr-Jun'),
          3: ('July-September', 'Jul-Sep'), 4: ('October-December', 'Oct-Dec')}


# Published values that contradict NASS's own counts. Each is replaced by the value calculated
# from the published counts and flagged on the page. Remove an entry if NASS corrects it.
CORRECTIONS = [
    {'period': '2023-Q3', 'state': 'WY', 'field': 'pct_lost', 'published': '(Z)',
     'reason': 'NASS published less than 0.5%, but its own counts (860 lost of 23,000 peak colonies) give 3.7%. '
               'The counts add up to the U.S. total, so the percent appears to be the error.'},
    {'period': '2023-Q4', 'state': 'WY', 'field': 'pct_lost', 'published': '(Z)',
     'reason': 'NASS published less than 0.5%, but its own counts (1,700 lost of 18,500 peak colonies) give 9.2%. '
               'The counts add up to the U.S. total, so the percent appears to be the error.'},
]


def num(v):
    v = (v or '').strip()
    if v == '' or v.upper() in ('NA', 'NAN'):
        return None
    f = float(v)
    return int(f) if f.is_integer() else f


def main(src, dst):
    rows = list(csv.DictReader(open(src, newline='', encoding='utf-8-sig')))
    periods = {}
    values = {}
    release = ''
    for r in rows:
        pid = r['period']
        y, q = int(r['year']), int(r['quarter'])
        periods[pid] = (y, q)
        code = r['state_abbr']
        vals = []
        for key, col in FIELDS:
            v = num(r.get(col))
            if v is not None and str(r.get(col + '_lt_half', '')).upper() == 'TRUE':
                v = -1  # NASS "(Z)": less than 0.5 percent
            vals.append(v)
        # NASS prints a dash when no colonies were renovated; the percent is then zero.
        i_ren, i_pct = 5, 6
        if vals[i_pct] is None and vals[i_ren] == 0:
            vals[i_pct] = 0
        values.setdefault(code, {})[pid] = vals
        release = max(release, r.get('release_date_colonies') or '')

    # Apply documented corrections (percent lost recalculated from published counts)
    i_max, i_lost, i_pct = 1, 2, 3
    corrections = {}
    for c in CORRECTIONS:
        row = values.get(c['state'], {}).get(c['period'])
        if not row:
            print('warning: correction for %s %s has no matching row' % (c['state'], c['period']))
            continue
        calc = round(row[i_lost] / row[i_max] * 100, 1)
        row[i_pct] = calc
        corrections.setdefault(c['period'], {}).setdefault(c['state'], {})[c['field']] = {'published': c['published'], 'value': calc, 'reason': c['reason']}
    # Flag any other published percent that disagrees with its own counts, for review
    for code, per in values.items():
        if code == 'US':
            continue
        for pid, row in per.items():
            mx, lost, pct = row[i_max], row[i_lost], row[i_pct]
            if mx and lost is not None and pct is not None and not (pid in corrections and code in corrections[pid]):
                shown = 0.25 if pct == -1 else pct
                if abs(lost / mx * 100 - shown) > 1.5:
                    print('check: %s %s percent lost %s but counts give %.1f%%' % (code, pid, pct, lost / mx * 100))

    order = sorted(periods, key=lambda p: periods[p])
    plist = []
    for pid in order:
        y, q = periods[pid]
        has = any(v is not None for c in values for v in (values[c].get(pid) or []))
        plist.append({'id': pid, 'year': y, 'q': q,
                      'label': '%s %d' % (MONTHS[q][0].replace('-', '–'), y),
                      'short': '%s %d' % (MONTHS[q][1].replace('-', '–'), y),
                      'survey': has})

    data = {
        'source': {
            'name': 'USDA National Agricultural Statistics Service, Honey Bee Colonies report',
            'url': 'https://esmis.nal.usda.gov/publication/honey-bee-colonies',
            'release': release,
            'built': date.today().isoformat(),
        },
        'fields': [k for k, _ in FIELDS],
        'names': NAMES,
        'periods': plist,
        'corrections': corrections,
        'values': values,
    }
    with open(dst, 'w', encoding='utf-8') as f:
        f.write('/* NASS honey bee colony losses by state and quarter. Generated by pipeline/build_losses.py. */\n')
        f.write('window.HIVE_LOSSES = ')
        json.dump(data, f, separators=(',', ':'))
        f.write(';\n')
    print('wrote %d periods, %d areas to %s' % (len(plist), len(values), dst))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
