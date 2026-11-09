"""Clean the NASS Quick Stats honey export into one row per state per year.

Usage:
    python3 pipeline/clean_nass_honey.py QUICKSTATS_EXPORT.csv data/nass-honey-production.csv REVIEW.xlsx

Input: a Quick Stats CSV for Program SURVEY, Commodity HONEY, Geographic Level STATE and NATIONAL
(all data items, all years). Download it from https://quickstats.nass.usda.gov.

Output CSV: one row per state (plus Other States and the U.S.) per year, with
  colonies           honey-producing colonies (the most colonies honey was taken from that year)
  yield_lb           pounds of honey per colony
  production_lb      pounds of honey produced
  stocks_lb          honey stocks held by producers in mid-December
  price_usd_lb       average price per pound, in dollars of that year
  value_usd          value of production, in dollars of that year
  price_usd_lb_real  price in dollars of CPI_BASE_YEAR (CPI-U annual average)
  value_usd_real     value in dollars of CPI_BASE_YEAR

Review workbook: a "Cleaning log" tab (every change made, with the rule) and a "For review" tab
(checks that failed but were left as published), so each automated step can be checked by hand.
"""
import csv
import sys
from collections import defaultdict

import pandas as pd

# CPI-U, all items, U.S. city average, annual average (1982-84=100). BLS, via the Federal Reserve
# Bank of Minneapolis table. 2025 is BLS's annual average (October 2025 was not collected).
CPI = {
    1987: 113.6, 1988: 118.3, 1989: 124.0, 1990: 130.7, 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2,
    1995: 152.4, 1996: 156.9, 1997: 160.5, 1998: 163.0, 1999: 166.6, 2000: 172.2, 2001: 177.1, 2002: 179.9,
    2003: 184.0, 2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5, 2010: 218.1,
    2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7, 2015: 237.0, 2016: 240.0, 2017: 245.1, 2018: 251.1,
    2019: 255.7, 2020: 258.8, 2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 313.7, 2025: 321.9,
}
CPI_BASE_YEAR = 2025

ITEMS = {
    ('HONEY, BEE COLONIES - INVENTORY, MEASURED IN COLONIES', 'MARKETING YEAR'): 'colonies',
    ('HONEY - PRODUCTION, MEASURED IN LB / COLONY', 'MARKETING YEAR'): 'yield_lb',
    ('HONEY - PRODUCTION, MEASURED IN LB', 'MARKETING YEAR'): 'production_lb',
    ('HONEY - STOCKS, MEASURED IN LB', 'MID DEC'): 'stocks_lb',
    ('HONEY - PRICE RECEIVED, MEASURED IN CENTS / LB', 'MARKETING YEAR'): 'price_cents',
    ('HONEY - PRICE RECEIVED, MEASURED IN $ / LB', 'MARKETING YEAR'): 'price_dollars',
    ('HONEY - PRODUCTION, MEASURED IN $', 'MARKETING YEAR'): 'value_usd',
}

ABBR = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA', 'COLORADO': 'CO',
    'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA',
    'MAINE': 'ME', 'MARYLAND': 'MD', 'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN',
    'MISSISSIPPI': 'MS', 'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC',
    'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA',
    'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX',
    'UTAH': 'UT', 'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'OTHER STATES': 'OTH', 'US TOTAL': 'US',
}

OUT_COLS = ['year', 'state', 'state_abbr', 'state_type', 'colonies', 'yield_lb', 'production_lb', 'stocks_lb',
            'price_usd_lb', 'value_usd', 'price_usd_lb_real', 'value_usd_real', 'price_unit_published',
            'cpi_year', 'cpi_base']


def num(v):
    v = str(v).strip().replace(',', '')
    if v in ('', 'nan'):
        return None, 'blank'
    if v.startswith('('):
        return None, v  # NASS codes such as (Z), (S), (D), (NA)
    f = float(v)
    return (int(f) if f.is_integer() else f), None


def main(src, dst, review):
    d = pd.read_csv(src, dtype=str)
    log, flags = [], []
    d = d[(d['Program'] == 'SURVEY') & (d['Commodity'] == 'HONEY')]

    rows = defaultdict(dict)
    dropped = defaultdict(int)
    for _, r in d.iterrows():
        k = (r['Data Item'], r['Period'])
        if k not in ITEMS:
            continue
        if r['Domain'] != 'TOTAL':
            dropped[(r['Data Item'], r['Domain Category'])] += 1
            continue
        y = int(r['Year'])
        st = r['State'].strip().upper()
        if r['Geo Level'] == 'NATIONAL':
            st = 'US TOTAL'
        if st not in ABBR:
            flags.append({'year': y, 'state': st, 'field': ITEMS[k], 'issue': 'Unknown state name; row skipped', 'value': r['Value']})
            continue
        v, code = num(r['Value'])
        if code:
            log.append({'year': y, 'state': st.title(), 'field': ITEMS[k], 'original': r['Value'].strip(), 'new': '',
                        'rule': 'NASS code %s stored as blank' % code})
        rows[(y, st)][ITEMS[k]] = v

    for (item, cat), n in sorted(dropped.items()):
        log.append({'year': '2015-2017', 'state': 'all', 'field': item, 'original': '%d rows' % n, 'new': 'not included',
                    'rule': 'Left out the separate breakdown for "%s"; totals are kept' % cat})

    out = []
    for (y, st), v in sorted(rows.items()):
        abbr = ABBR[st]
        # One price column in dollars per pound. NASS switched from cents to dollars in 2018.
        if v.get('price_cents') is not None:
            price, unit = round(v['price_cents'] / 100, 4), 'cents/lb'
        elif v.get('price_dollars') is not None:
            price, unit = v['price_dollars'], '$/lb'
        else:
            price, unit = None, ''
        if v.get('price_cents') is not None and v.get('price_dollars') is not None:
            flags.append({'year': y, 'state': st.title(), 'field': 'price', 'issue': 'Both cents and dollar prices published; used cents',
                          'value': '%s c / $%s' % (v['price_cents'], v['price_dollars'])})
        f = CPI[CPI_BASE_YEAR] / CPI[y]
        name = 'United States' if abbr == 'US' else 'Other States' if abbr == 'OTH' else st.title()
        rec = {
            'year': y, 'state': name, 'state_abbr': abbr,
            'state_type': 'U.S.' if abbr == 'US' else 'Other States' if abbr == 'OTH' else 'State',
            'colonies': v.get('colonies'), 'yield_lb': v.get('yield_lb'), 'production_lb': v.get('production_lb'),
            'stocks_lb': v.get('stocks_lb'), 'price_usd_lb': price, 'value_usd': v.get('value_usd'),
            'price_usd_lb_real': round(price * f, 2) if price is not None else None,
            'value_usd_real': round(v['value_usd'] * f) if v.get('value_usd') is not None else None,
            'price_unit_published': unit, 'cpi_year': CPI[y], 'cpi_base': CPI[CPI_BASE_YEAR],
        }
        out.append(rec)
    log.append({'year': '1987-2017', 'state': 'all', 'field': 'price', 'original': 'cents per pound', 'new': 'dollars per pound',
                'rule': 'Divided by 100 so every year uses dollars per pound (NASS switched units in 2018)'})

    # Checks. Values stay as published; anything off goes to the review list.
    by = {(r['year'], r['state_abbr']): r for r in out}
    for r in out:
        tag = (r['year'], r['state'])
        c, y_, p, pr, val = r['colonies'], r['yield_lb'], r['production_lb'], r['price_usd_lb'], r['value_usd']
        missing = [k for k in ('colonies', 'yield_lb', 'production_lb', 'stocks_lb', 'price_usd_lb', 'value_usd') if r[k] is None]
        if missing:
            flags.append({'year': tag[0], 'state': tag[1], 'field': ', '.join(missing), 'issue': 'Not published', 'value': ''})
        # NASS rounds colonies to thousands and yield to whole pounds, so allow for rounding
        if c and y_ is not None and p:
            calc = c * y_
            if abs(calc - p) > max(0.6 * c, 0.005 * p) and abs(calc - p) > 1000:
                flags.append({'year': tag[0], 'state': tag[1], 'field': 'production_lb',
                              'issue': 'Colonies x yield differs from production by %.1f%%' % ((calc - p) / p * 100),
                              'value': '%s x %s = %s vs %s' % (c, y_, round(calc), p)})
        if p and pr and val:
            calc = p * pr
            if abs(calc - val) / val > 0.02:
                flags.append({'year': tag[0], 'state': tag[1], 'field': 'value_usd',
                              'issue': 'Production x price differs from value by %.1f%%' % ((calc - val) / val * 100),
                              'value': '%s x %s = %s vs %s' % (p, pr, round(calc), val)})
    years = sorted({r['year'] for r in out})
    for y in years:
        us = by.get((y, 'US'))
        if not us:
            continue
        for k in ('colonies', 'production_lb', 'stocks_lb', 'value_usd'):
            s = sum(r[k] or 0 for r in out if r['year'] == y and r['state_abbr'] not in ('US',))
            if us[k] and abs(s - us[k]) / us[k] > 0.005:
                flags.append({'year': y, 'state': 'United States', 'field': k,
                              'issue': 'States plus Other States add up to %.2f%% %s the U.S. total' % (abs(s - us[k]) / us[k] * 100, 'above' if s > us[k] else 'below'),
                              'value': '%s vs %s' % (s, us[k])})

    with open(dst, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=OUT_COLS)
        w.writeheader()
        for r in out:
            w.writerow({k: ('' if r[k] is None else r[k]) for k in OUT_COLS})

    with pd.ExcelWriter(review) as xw:
        pd.DataFrame(out, columns=OUT_COLS).to_excel(xw, 'Cleaned data', index=False)
        pd.DataFrame(log, columns=['year', 'state', 'field', 'original', 'new', 'rule']).to_excel(xw, 'Cleaning log', index=False)
        pd.DataFrame(flags, columns=['year', 'state', 'field', 'issue', 'value']).to_excel(xw, 'For review', index=False)
    print('wrote %d rows (%d-%d) to %s; %d log entries, %d for review' % (len(out), years[0], years[-1], dst, len(log), len(flags)))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
