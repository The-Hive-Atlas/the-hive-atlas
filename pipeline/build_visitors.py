"""Builds data/visitors.json: total page views and visits by country, from the site's GoatCounter account.

Run by .github/workflows/visitors.yml once a day. Needs a GoatCounter API token with only the
"Read statistics" permission, stored as the GitHub secret GOATCOUNTER_TOKEN. Nothing here identifies
a visitor: GoatCounter only returns totals, and only country totals are kept.

    GOATCOUNTER_TOKEN=... python3 pipeline/build_visitors.py
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

SITE = os.environ.get('GOATCOUNTER_SITE', 'mohamedalburaki')
START = os.environ.get('VISITORS_START', '2025-01-01')   # count visits from this date on
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'visitors.json')
API = 'https://%s.goatcounter.com/api/v0' % SITE


def get(path, **params):
    url = API + path + ('?' + urllib.parse.urlencode(params) if params else '')
    req = urllib.request.Request(url, headers={
        'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'the-hive-atlas-visitors'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:      # GoatCounter rate limit: wait and retry
                time.sleep(2 + attempt * 3); continue
            raise SystemExit('GoatCounter API error %s on %s: %s' % (e.code, path, e.read()[:300].decode('utf8', 'replace')))


TOKEN = os.environ.get('GOATCOUNTER_TOKEN', '').strip()
if not TOKEN:
    print('GOATCOUNTER_TOKEN is not set; add it under Settings > Secrets and variables > Actions. Nothing updated.')
    sys.exit(0)

now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
span = {'start': START + 'T00:00:00Z', 'end': now.strftime('%Y-%m-%dT%H:%M:%SZ')}

total = get('/stats/total', **span)
pageviews = total.get('total', 0) or 0

countries, offset = {}, 0
while True:
    page = get('/stats/locations', limit=100, offset=offset, **span)
    rows = page.get('stats') or []
    for row in rows:
        code = (row.get('id') or '').upper()[:2]
        if len(code) == 2 and code.isalpha():
            countries[code] = countries.get(code, 0) + int(row.get('count') or 0)
    if not page.get('more') or not rows:
        break
    offset += len(rows)
    time.sleep(0.5)

data = {
    'updated': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
    'since': START,
    'pageviews': pageviews,
    'countries': sorted(([c, n] for c, n in countries.items() if n > 0), key=lambda x: (-x[1], x[0])),
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(data, f, separators=(',', ':'))
    f.write('\n')
print('Wrote %s: %d page views, %d countries' % (os.path.relpath(OUT), pageviews, len(data['countries'])))
