"""Merge a new NASS Honey Bee Colonies release into the combined state-by-quarter CSV.

Each August, NASS releases the report with a ZIP of its tables. Download the ZIP from
https://esmis.nal.usda.gov/publication/honey-bee-colonies, unzip it, then run:

    python3 pipeline/import_nass_release.py UNZIPPED_FOLDER data/nass-colony-losses.csv 2026-08-03 hcny0726
    python3 pipeline/build_losses.py data/nass-colony-losses.csv data/colony-losses.js

Quarters in the new release replace the same quarters in the CSV (NASS revises the previous
year each August); all other quarters are kept as they are.

NASS table codes: "-" represents zero, "(Z)" is less than half of the unit shown (stored as 0
with the matching *_lt_half flag set), "(X)" is not applicable and "(NA)"/"(D)" are not available.
"""
import csv
import glob
import os
import re
import sys

import pandas as pd

QUARTERS = {1: ('January-March', 'January'), 2: ('April-June', 'April'), 3: ('July-September', 'July'), 4: ('October-December', 'October')}
START_MONTH = {'January': 1, 'April': 2, 'July': 3, 'October': 4}
RANGE = {'January-March': 1, 'April-June': 2, 'July-September': 3, 'October-December': 4}
NAMES = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA', 'Colorado': 'CO',
    'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
    'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
    'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
    'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
    'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
    'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'Other States': 'OTH', 'United States': 'US',
}
COLONY_COLS = ['colonies_start', 'colonies_max', 'colonies_lost', 'pct_lost', 'colonies_added', 'colonies_renovated', 'pct_renovated']
STRESS_COLS = ['stressor_varroa', 'stressor_other_pests', 'stressor_diseases', 'stressor_pesticides', 'stressor_other', 'stressor_unknown']


def cell(v):
    """Return (value, less_than_half)."""
    v = (v or '').strip()
    if v == '-':
        return 0, False
    if v == '(Z)':
        return 0, True
    if v in ('', '(X)', '(NA)', '(D)'):
        return None, False
    return float(v.replace(',', '')), False


def read_table(path):
    title, rows = '', []
    with open(path, encoding='latin-1', newline='') as f:
        for r in csv.reader(f):
            if len(r) < 2:
                continue
            if r[1] == 't' and 'States and United States' in r[2]:
                title = r[2]
            elif r[1] == 'd' and r[2].strip() and title:
                name = re.sub(r'\s*\d+/\s*$', '', r[2]).strip()
                if name not in NAMES:
                    raise ValueError('%s: unknown row name %r' % (path, r[2]))
                rows.append((name, r[3:]))
    return title, rows


def main(folder, combined_csv, release_date, source_file):
    new = {}
    for path in sorted(glob.glob(os.path.join(folder, 'hcny_p*_t*.csv'))):
        title, rows = read_table(path)
        if title.startswith('Colonies, Maximum'):
            m = re.search(r'(January|April|July|October) 1, (\d{4}) and', title)
            q, y, cols = START_MONTH[m.group(1)], int(m.group(2)), COLONY_COLS
        elif title.startswith('Colony Health Stressors'):
            m = re.search(r'(January-March|April-June|July-September|October-December) (\d{4})', title)
            q, y, cols = RANGE[m.group(1)], int(m.group(2)), STRESS_COLS
        else:
            continue  # CCD table is national only and not used on the map
        for name, vals in rows:
            if len(vals) < len(cols):
                raise ValueError('%s: %s has %d values, expected %d' % (path, name, len(vals), len(cols)))
            rec = new.setdefault((y, q, name), {})
            for c, v in zip(cols, vals):
                val, lt = cell(v)
                rec[c] = val
                rec[c + '_lt_half'] = lt
            key = 'release_date_colonies' if cols is COLONY_COLS else 'release_date_stressors'
            rec[key] = release_date
            rec[key.replace('release_date', 'source_file')] = source_file

    old = pd.read_csv(combined_csv)
    columns = list(old.columns)
    periods = sorted({(y, q) for y, q, _ in new})
    out_rows = []
    for (y, q, name), rec in new.items():
        label, month = QUARTERS[q]
        abbr = NAMES[name]
        row = {'year': y, 'quarter': q, 'period': '%d-Q%d' % (y, q), 'quarter_label': label,
               'quarter_start': '%d-%02d-01' % (y, 3 * q - 2), 'state': name, 'state_abbr': abbr,
               'state_type': 'US total' if abbr == 'US' else 'Other States' if abbr == 'OTH' else 'State'}
        row.update(rec)
        for c in COLONY_COLS + STRESS_COLS:
            row.setdefault(c + '_lt_half', False)
        out_rows.append(row)
    fresh = pd.DataFrame(out_rows).reindex(columns=columns)
    replaced = old['period'].isin(['%d-Q%d' % p for p in periods])
    merged = pd.concat([old[~replaced], fresh], ignore_index=True)
    order = {n: i for i, n in enumerate(list(NAMES))}
    merged['_o'] = merged['state'].map(lambda s: order.get(s, 99))
    merged = merged.sort_values(['year', 'quarter', '_o']).drop(columns='_o')
    merged.to_csv(combined_csv, index=False)
    print('release %s: %d quarters (%s to %s), replaced %d old rows, added %d rows; total %d rows'
          % (source_file, len(periods), '%d-Q%d' % periods[0], '%d-Q%d' % periods[-1], int(replaced.sum()), len(fresh), len(merged)))


if __name__ == '__main__':
    main(*sys.argv[1:])
