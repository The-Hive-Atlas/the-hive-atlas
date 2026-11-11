"""Build the national-only NASS series shown on the U.S. Trends tabs of losses.html and honey-production.html.

Usage:
    python3 pipeline/build_nass_national.py QUICKSTATS_EXPORT.csv data/honey-production.js data/nass-national.js data/nass-national.csv

QUICKSTATS_EXPORT.csv is a NASS Quick Stats download for Commodity = HONEY (all data items, national and state).
data/honey-production.js is read only for its yearly CPI factors (value_usd_real / value_usd for the U.S.),
so pollination and other-products income can be shown in the same constant dollars as honey.

NASS publishes these series for the United States only:
  - gross income from pollination and from other apiary products (2015 on)
  - honey value of production (from the yearly Honey report; taken from honey-production.js)
  - price received by color class, all sales / retail / wholesale (2003 on; cents per lb before 2018)
  - price received as a percent of parity, monthly
  - colonies lost with NASS's sudden-loss symptoms, quarterly (NASS data item "COLONY COLLAPSE DISORDER")
  - operations with fewer than five colonies, 2015 to 2017 (inventory, loss, added, renovated)
"""
import csv
import json
import sys
from collections import defaultdict

src, honey_js, out_js, out_csv = sys.argv[1:5]

QMAP = {'JAN THRU MAR': 1, 'APR THRU JUN': 2, 'JUL THRU SEP': 3, 'OCT THRU DEC': 4,
        'FIRST OF JAN': 1, 'FIRST OF APR': 2, 'FIRST OF JUL': 3, 'FIRST OF OCT': 4}
MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
SMALL = 'INVENTORY OF BEE COLONIES: (LESS THAN 5 COLONIES)'


def num(v):
    v = v.strip().replace(',', '')
    if v == '(Z)':
        return 0.0
    try:
        return float(v)
    except ValueError:
        return None  # (D), (S), (NA): withheld or not available


rows = [r for r in csv.DictReader(open(src, encoding='utf-8-sig')) if r['State'] == 'US TOTAL']
income = defaultdict(dict)        # key -> {year: $}
price = defaultdict(dict)         # class|market -> {year: $/lb}
parity = {}                       # 'YYYY-MM' -> pct
sudden = {}                       # 'YYYY-Qn' -> colonies
small = defaultdict(dict)         # field -> {'YYYY-Qn': value}
CLASSES = {'WATER WHITE & EXTRA WHITE & WHITE': 'white', 'EXTRA LIGHT AMBER': 'extra_light', 'LIGHT AMBER & AMBER & DARK AMBER': 'amber',
           'AREA SPECIALTIES & OTHER COLORS': 'other'}

for r in rows:
    item, dom, per, y = r['Data Item'], r['Domain Category'], r['Period'], int(r['Year'])
    v = num(r['Value'])
    if v is None:
        continue
    if dom == SMALL:
        q = QMAP.get(per)
        if not q:
            continue
        key = '%d-Q%d' % (y, q)
        f = {'HONEY, BEE COLONIES - INVENTORY, MEASURED IN COLONIES': 'colonies_start',
             'HONEY, BEE COLONIES - LOSS, DEADOUT, MEASURED IN COLONIES': 'colonies_lost',
             'HONEY, BEE COLONIES - LOSS, DEADOUT, MEASURED IN PCT OF COLONIES': 'pct_lost',
             'HONEY, BEE COLONIES - ADDED & REPLACED, MEASURED IN COLONIES': 'colonies_added',
             'HONEY, BEE COLONIES, RENOVATED - INVENTORY, MEASURED IN PCT OF COLONIES': 'pct_renovated'}.get(item)
        if f:
            small[f][key] = v
        continue
    if dom != 'NOT SPECIFIED':
        continue
    if item == 'HONEY, CONTRACTING HIVES FOR POLLINATION - GROSS INCOME, MEASURED IN $':
        income['pollination'][y] = v
    elif item == 'HONEY, OTHER APIARY PRODUCTS - GROSS INCOME, MEASURED IN $':
        income['other_products'][y] = v
    elif item == 'HONEY - PRICE RECEIVED, MEASURED IN PCT OF PARITY' and per in MONTHS:
        parity['%d-%02d' % (y, MONTHS.index(per) + 1)] = v
    elif item == 'HONEY, BEE COLONIES - LOSS, COLONY COLLAPSE DISORDER, MEASURED IN COLONIES' and per in QMAP:
        sudden['%d-Q%d' % (y, QMAP[per])] = v
    elif item.startswith('HONEY, ') and 'PRICE RECEIVED' in item and per == 'MARKETING YEAR':
        name = item[len('HONEY, '):item.index(' - PRICE RECEIVED')]
        market = 'all'
        for m in ('RETAIL', 'WHOLESALE'):
            if name.endswith(', ' + m):
                name, market = name[:-len(', ' + m)], m.lower()
        if name in ('RETAIL', 'WHOLESALE'):
            name, market = 'ALL COLORS', name.lower()
        cls = CLASSES.get(name, 'all_colors' if name == 'ALL COLORS' else None)
        if not cls:
            continue
        if item.endswith('CENTS / LB'):
            v = v / 100.0
        price[cls + '|' + market][y] = round(v, 3)

# U.S. honey value and CPI factors from the yearly Honey data on the site
hj = open(honey_js, encoding='utf-8').read()
H = json.loads(hj[hj.index('{'):hj.rindex('}') + 1])
fi = H['fields']
cpi = {}
for y, row in H['values']['US'].items():
    if row and row[fi.index('value_usd')]:
        income['honey'][int(y)] = row[fi.index('value_usd')]
        cpi[int(y)] = row[fi.index('value_usd_real')] / row[fi.index('value_usd')]
# U.S. all-colors price (all sales) from the same file, for the price chart
for y, row in H['values']['US'].items():
    if row and row[fi.index('price_usd_lb')] is not None:
        price['all_colors|all'][int(y)] = row[fi.index('price_usd_lb')]

# Share of all colonies lost each quarter that showed the sudden-loss symptoms
lj = open(honey_js.replace('honey-production.js', 'colony-losses.js'), encoding='utf-8').read()
LO = json.loads(lj[lj.index('{'):lj.rindex('}') + 1])
lost_i = LO['fields'].index('colonies_lost')
pct_i = LO['fields'].index('pct_lost')
all_lost = {k: v[lost_i] for k, v in LO['values']['US'].items() if v and v[lost_i] is not None}
us_pct = {k: v[pct_i] for k, v in LO['values']['US'].items() if v and v[pct_i] is not None}

ints = lambda d: {str(k): (int(v) if float(v).is_integer() else v) for k, v in sorted(d.items())}
out = {
    'source': {'name': 'USDA National Agricultural Statistics Service (NASS), via Quick Stats', 'url': 'https://quickstats.nass.usda.gov',
               'cpiBaseYear': H['source'].get('cpiBaseYear'), 'built': H['source'].get('built')},
    'cpi': {str(k): round(v, 5) for k, v in sorted(cpi.items())},
    'income': {k: ints(v) for k, v in income.items()},
    'price': {k: ints(v) for k, v in sorted(price.items())},
    'parity': ints(parity),
    'sudden': ints(sudden),
    'allLost': ints(all_lost),
    'usPctLost': ints(us_pct),
    'small': {k: ints(v) for k, v in small.items()},
}
with open(out_js, 'w', encoding='utf-8') as f:
    f.write('/* National NASS series for the U.S. Trends tabs. Generated by pipeline/build_nass_national.py. */\n')
    f.write('window.HIVE_NATIONAL = ' + json.dumps(out, separators=(',', ':')) + ';\n')

with open(out_csv, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['# Source: USDA National Agricultural Statistics Service (NASS), via Quick Stats. Compiled by The Hive Atlas, https://thehiveatlas.com'])
    w.writerow(['# United States only. Dollars as reported. "sudden colony loss" is NASS data item "Colony collapse disorder" (see About This Data).'])
    w.writerow(['series', 'detail', 'period', 'value', 'unit'])
    for k, d in sorted(income.items()):
        for y, v in sorted(d.items()):
            w.writerow(['income', k, y, int(v), 'dollars'])
    for k, d in sorted(price.items()):
        c, m = k.split('|')
        for y, v in sorted(d.items()):
            w.writerow(['price_received', c + ' ' + m, y, v, 'dollars per lb'])
    for k, v in sorted(parity.items()):
        w.writerow(['price_pct_of_parity', '', k, v, 'percent'])
    for k, v in sorted(sudden.items()):
        w.writerow(['sudden_colony_loss', '', k, int(v), 'colonies'])
    for f_, d in sorted(small.items()):
        for k, v in sorted(d.items()):
            w.writerow(['operations_under_5_colonies', f_, k, v, 'percent' if f_.startswith('pct') else 'colonies'])
print('wrote', out_js, out_csv)
