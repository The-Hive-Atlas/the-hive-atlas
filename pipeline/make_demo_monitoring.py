"""SIMULATED colony monitoring data for the Hive Atlas Colony Monitoring page.

*** DEMONSTRATION ONLY. Every record this script writes is made up. ***
Replace data/monitoring-demo.js with real monitoring data before launch
(see pipeline/build_monitoring.py, to be written when real data arrives).

Usage:
    python3 pipeline/make_demo_monitoring.py data/

Writes:
    data/monitoring-demo.js         reference records used for the regional view and peer comparisons
    data/monitoring-example.csv     an example upload for one made-up operation

The simulation follows broad, well-known patterns so the charts behave plausibly:
colonies build up in spring and shrink in fall, earlier in warmer regions; Varroa
counts climb through summer and peak in fall unless treated; treatment lowers
counts; colonies with high fall mite loads are more likely to die over winter.
The numbers themselves are not estimates of anything.
"""
import csv
import io
import json
import math
import os
import random
import sys
from datetime import date, timedelta

# NOAA NCEI U.S. climate regions (Karl and Koss, 1984). DC is grouped with the Northeast.
REGIONS = {
    'NE':  ('Northeast', ['CT', 'DE', 'ME', 'MD', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DC']),
    'UM':  ('Upper Midwest', ['IA', 'MI', 'MN', 'WI']),
    'OV':  ('Ohio Valley', ['IL', 'IN', 'KY', 'MO', 'OH', 'TN', 'WV']),
    'SE':  ('Southeast', ['AL', 'FL', 'GA', 'NC', 'SC', 'VA']),
    'NRP': ('Northern Rockies and Plains', ['MT', 'NE', 'ND', 'SD', 'WY']),
    'S':   ('South', ['AR', 'KS', 'LA', 'MS', 'OK', 'TX']),
    'SW':  ('Southwest', ['AZ', 'CO', 'NM', 'UT']),
    'NW':  ('Northwest', ['ID', 'OR', 'WA']),
    'W':   ('West', ['CA', 'NV']),
    'AK':  ('Alaska', ['AK']),
    'HI':  ('Hawaii', ['HI']),
}

# Season shape per region: (buildup month, peak month, winter severity 0-1, first and last inspection month)
CLIMATE = {
    'NE':  (4.0, 6.3, 0.9, 3, 11),
    'UM':  (4.5, 6.8, 1.0, 4, 10),
    'OV':  (3.6, 6.0, 0.7, 3, 11),
    'SE':  (2.6, 5.0, 0.3, 1, 12),
    'NRP': (4.6, 7.0, 1.0, 4, 10),
    'S':   (2.6, 5.0, 0.3, 1, 12),
    'SW':  (3.0, 5.5, 0.5, 2, 11),
    'NW':  (4.0, 6.5, 0.6, 3, 11),
    'W':   (2.0, 4.5, 0.2, 1, 12),
}

TYPES = {
    #            colonies monitored, base winter loss, chance of a planned late-summer treatment
    'Hobbyist':   ((3, 5), 0.16, 0.45),
    'Sideline':   ((4, 7), 0.11, 0.72),
    'Commercial': ((5, 8), 0.09, 0.90),
}
SUBMITTERS = ['Apiary inspector', 'Researcher', 'Tech-transfer team', 'Beekeeper']
PRODUCTS = [('oxalic', 0.80), ('amitraz', 0.90), ('formic', 0.75), ('thymol', 0.65), ('hop_acids', 0.50)]

COLUMNS = ['operation_id', 'operation_type', 'submitted_by', 'state', 'apiary_id', 'colony_id', 'inspection_date',
           'colony_alive', 'frames_of_bees', 'brood_frames', 'brood_pattern', 'queen_status',
           'varroa_mites', 'bees_sampled', 'varroa_method',
           'afb', 'efb', 'chalkbrood', 'sacbrood', 'deformed_wings', 'small_hive_beetle',
           'treatment', 'fed', 'requeened', 'notes']


def season(month, build, peak, severity):
    """0-1 colony size curve over the year (month can be fractional)."""
    rise = 1 / (1 + math.exp(-(month - build) * 1.6))
    fall_start = peak + 2.5
    fall = 1 / (1 + math.exp((month - fall_start) * (0.9 + 0.6 * severity)))
    winter_floor = 0.25 + 0.25 * (1 - severity)
    return winter_floor + (1 - winter_floor) * rise * fall


def brood_ratio(month, build, peak, severity):
    if month < build - 0.5 or month > peak + 4.5:
        return max(0.0, 0.25 * (1 - severity))
    if month <= peak + 1:
        return 0.55
    return 0.35


def yn(b):
    return 'yes' if b else 'no'


def simulate_operation(rng, op_id, region, otype, submitter, state, years, start_varroa_shift=0.0, treat_bias=0.0):
    build, peak, severity, m_first, m_last = CLIMATE[region]
    (cmin, cmax), base_loss, p_treat = TYPES[otype]
    p_treat = min(0.98, max(0.05, p_treat + treat_bias))
    n_col = rng.randint(cmin, cmax)
    apiaries = ['A1'] if otype == 'Hobbyist' else ['A1', 'A2'] if otype == 'Sideline' else ['A1', 'A2', 'A3']
    vigor = 0.85 + 0.3 * rng.random()  # operation-level management quality
    rows = []
    colonies = []
    for i in range(n_col):
        colonies.append({
            'id': 'C%02d' % (i + 1), 'apiary': apiaries[i % len(apiaries)],
            'size': (11 + rng.random() * 6) * vigor, 'v': max(0.05, rng.uniform(0.2, 0.9) + start_varroa_shift),
            'queen': 'ok', 'q_bad_months': 0, 'alive': True, 'fall_peak_v': 0.0, 'gen': 0,
            'last_treat_month': None,
        })
    for year in years:
        # winter outcome for colonies carried over from last year
        if year != years[0]:
            for c in colonies:
                if not c['alive']:
                    continue
                p_die = base_loss + 0.045 * max(0.0, c['fall_peak_v'] - 2) + 0.06 * severity
                p_die = min(0.85, p_die / vigor)
                if rng.random() < p_die:
                    c['alive'] = False
                    c['dead_reported'] = False
        # visit schedule: about monthly through the active season
        months = list(range(m_first, m_last + 1))
        for m in months:
            for c in colonies:
                c['fall_peak_v'] = c['fall_peak_v'] if m > 8 else 0.0 if m == m_first else c['fall_peak_v']
            day = rng.randint(5, 24)
            for c in colonies:
                when = date(year, m, min(28, max(1, day + rng.randint(-3, 3))))
                if not c['alive']:
                    if not c.get('dead_reported'):
                        rows.append(row(op_id, otype, submitter, state, c, when, dead=True))
                        c['dead_reported'] = True
                        # replace with a split or package; a new colony takes the slot
                        if rng.random() < (0.9 if otype != 'Hobbyist' else 0.7):
                            c.update({'id': c['id'].split('-')[0] + '-R%d' % (c['gen'] + 1), 'gen': c['gen'] + 1,
                                      'size': 7 + rng.random() * 3, 'v': rng.uniform(0.1, 0.5), 'queen': 'ok',
                                      'q_bad_months': 0, 'alive': True, 'fall_peak_v': 0.0, 'last_treat_month': None,
                                      'young': True})
                            c.pop('dead_reported', None)
                    continue
                mm = m + (when.day - 15) / 30.0
                s = season(mm, build, peak, severity)
                young = c.pop('young', False)
                fob = max(1.0, c['size'] * s * (0.7 if young else 1.0) * rng.uniform(0.85, 1.15))
                if c['queen'] in ('queenless', 'drone_layer'):
                    fob *= 0.8
                br = brood_ratio(mm, build, peak, severity)
                brood = 0.0 if c['queen'] in ('queenless',) else max(0.0, fob * br * rng.uniform(0.8, 1.2))
                # Varroa growth: faster while brood is present, concentrates as brood shrinks in fall
                growth = 1.08 + 0.28 * min(1.0, br / 0.55)
                if m >= peak + 1.5 and m <= 10:
                    growth += 0.18
                c['v'] = min(25.0, c['v'] * growth * rng.uniform(0.9, 1.15))
                v_true = c['v']
                mites = sum(1 for _ in range(300) if rng.random() < v_true / 100.0)
                v_meas = mites / 3.0
                if m >= 8:
                    c['fall_peak_v'] = max(c['fall_peak_v'], v_meas)
                # queen events
                requeened = False
                p_fail = 0.025 + 0.01 * max(0, v_true - 3) + (0.02 if m in (6, 7, 8) else 0)
                if c['queen'] == 'ok' and rng.random() < p_fail:
                    c['queen'] = 'queenless' if rng.random() < 0.8 else 'drone_layer'
                elif c['queen'] in ('queenless', 'drone_layer'):
                    c['q_bad_months'] += 1
                    if rng.random() < (0.65 if otype != 'Hobbyist' else 0.45):
                        requeened = True
                        c['queen'] = 'ok'
                        c['q_bad_months'] = 0
                    elif c['q_bad_months'] >= 2 and rng.random() < 0.5:
                        c['alive'] = False
                        c['dead_reported'] = False
                if c['queen'] == 'ok':
                    qs = 'seen' if rng.random() < 0.72 else 'eggs_only'
                    if requeened:
                        qs = 'eggs_only' if rng.random() < 0.6 else 'seen'
                else:
                    qs = c['queen']
                # brood pattern 1-5
                pat = 4.5 - 0.35 * max(0.0, v_meas - 3) + rng.gauss(0, 0.6)
                if qs == 'drone_layer':
                    pat = rng.choice([1, 2])
                if brood == 0:
                    pat = None
                else:
                    pat = int(min(5, max(1, round(pat))))
                # disease signs
                wet_cool = region in ('NE', 'NW', 'UM')
                chalk = m in (4, 5, 6) and rng.random() < (0.09 if wet_cool else 0.05)
                sac = m in (4, 5, 6) and rng.random() < 0.02
                efb = m in (4, 5, 6, 7) and rng.random() < (0.045 if otype == 'Commercial' else 0.02)
                afb = rng.random() < 0.003
                dwv = rng.random() < 0.02 + 0.55 / (1 + math.exp(-(v_meas - 6) / 1.4))
                shb_p = 0.28 if region in ('SE', 'S') and m in range(5, 11) else 0.12 if region in ('SE', 'S') else 0.03
                shb = rng.random() < shb_p
                if pat is not None and (efb or afb or sac):
                    pat = max(1, pat - 1)
                # management at this visit
                treatment = 'none'
                due = c['last_treat_month'] is None or (year * 12 + m) - c['last_treat_month'] >= 3
                planned = m in (8, 9) and rng.random() < p_treat * 0.6
                reactive = v_meas >= 3 and rng.random() < p_treat
                spring = m == m_first + 1 and otype == 'Commercial' and rng.random() < 0.4
                winter_ox = m in (11, 12, 1) and rng.random() < p_treat * 0.25
                if due and (planned or reactive or spring or winter_ox):
                    weights = [0.35, 0.3, 0.15, 0.15, 0.05] if otype == 'Commercial' else [0.4, 0.15, 0.2, 0.2, 0.05]
                    prod, eff = rng.choices(PRODUCTS, weights=weights)[0]
                    if prod == 'oxalic' and br < 0.2:
                        eff = 0.92
                    if prod == 'formic' and m in (7, 8) and region in ('SE', 'S', 'SW', 'W'):
                        eff = 0.6
                    treatment = prod
                    c['v'] = max(0.05, c['v'] * (1 - eff * rng.uniform(0.85, 1.05)))
                    c['last_treat_month'] = year * 12 + m
                fed = 'none'
                if m in (9, 10) and rng.random() < 0.45:
                    fed = 'syrup'
                elif m in (m_first, m_first + 1) and rng.random() < (0.45 if otype == 'Commercial' else 0.25):
                    fed = 'pollen_patty'
                elif m in (1, 2, 12) and rng.random() < 0.2:
                    fed = 'fondant'
                rows.append(row(op_id, otype, submitter, state, c, when, fob=fob, brood=brood, pat=pat, qs=qs,
                                mites=mites, afb=afb, efb=efb, chalk=chalk, sac=sac, dwv=dwv, shb=shb,
                                treatment=treatment, fed=fed, requeened=requeened))
                # colony size drifts a little between visits
                c['size'] = max(6.0, min(20.0, c['size'] + rng.gauss(0, 0.4)))
    return rows


def row(op_id, otype, submitter, state, c, when, dead=False, **k):
    base = {'operation_id': op_id, 'operation_type': otype, 'submitted_by': submitter, 'state': state,
            'apiary_id': c['apiary'], 'colony_id': c['id'], 'inspection_date': when.isoformat()}
    if dead:
        base.update({'colony_alive': 'no', 'notes': 'Dead out'})
        return base
    base.update({
        'colony_alive': 'yes',
        'frames_of_bees': round(k['fob'], 1), 'brood_frames': round(k['brood'], 1),
        'brood_pattern': '' if k['pat'] is None else k['pat'], 'queen_status': k['qs'],
        'varroa_mites': k['mites'], 'bees_sampled': 300, 'varroa_method': 'alcohol_wash',
        'afb': yn(k['afb']), 'efb': yn(k['efb']), 'chalkbrood': yn(k['chalk']), 'sacbrood': yn(k['sac']),
        'deformed_wings': yn(k['dwv']), 'small_hive_beetle': yn(k['shb']),
        'treatment': k['treatment'], 'fed': k['fed'], 'requeened': yn(k['requeened']),
    })
    return base


def to_csv(rows):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=COLUMNS, lineterminator='\n')
    w.writeheader()
    for r in rows:
        w.writerow({c: r.get(c, '') for c in COLUMNS})
    return buf.getvalue()


def main(out_dir):
    rng = random.Random(20240601)
    plan = []
    n = 0
    for region in ['NE', 'UM', 'OV', 'SE', 'NRP', 'S', 'SW', 'NW', 'W']:
        states = REGIONS[region][1]
        # Larger regions get 5 operations of each type, smaller ones 3, so some
        # region-and-type groups are big enough to compare and some are not.
        k = 5 if region in ('NE', 'SE', 'OV', 'S', 'W') else 3
        for j in range(k * 3):
            otype = ['Hobbyist', 'Sideline', 'Commercial'][j % 3]
            n += 1
            plan.append(('OP-%03d' % n, region, otype, rng.choice(SUBMITTERS), rng.choice(states[:8])))
    rows = []
    for op_id, region, otype, sub, st in plan:
        rows.extend(simulate_operation(rng, op_id, region, otype, sub, st, [2024, 2025]))

    # Compact reference rows. Operation details are stored once; each inspection is a short array:
    # [op index, apiary, colony, days since 2024-01-01, alive, frames of bees, brood frames, pattern,
    #  queen code, mites (per 300 bees), disease/pest flags, treatment code, feeding code, requeened]
    op_ids = [p[0] for p in plan]
    ops = [{'id': p[0], 'type': p[2], 'submitted_by': p[3], 'state': p[4]} for p in plan]
    epoch = date(2024, 1, 1)
    flags = ['afb', 'efb', 'chalkbrood', 'sacbrood', 'deformed_wings', 'small_hive_beetle']
    queen_codes = ['seen', 'eggs_only', 'queenless', 'drone_layer']
    treat_codes = ['none', 'oxalic', 'amitraz', 'formic', 'thymol', 'hop_acids', 'other']
    fed_codes = ['none', 'syrup', 'pollen_patty', 'fondant']
    compact = []
    for r in rows:
        day = (date.fromisoformat(r['inspection_date']) - epoch).days
        head = [op_ids.index(r['operation_id']), r['apiary_id'], r['colony_id'], day]
        if r['colony_alive'] == 'no':
            compact.append(head + [0])
            continue
        bits = sum(1 << i for i, f in enumerate(flags) if r[f] == 'yes')
        compact.append(head + [1, r['frames_of_bees'], r['brood_frames'],
                               None if r['brood_pattern'] == '' else r['brood_pattern'],
                               queen_codes.index(r['queen_status']), r['varroa_mites'], bits,
                               treat_codes.index(r['treatment']), fed_codes.index(r['fed']),
                               1 if r['requeened'] == 'yes' else 0])

    # Example upload: a made-up Southeast sideline operation that treats less often than most.
    ex_rng = random.Random(77)
    example = simulate_operation(ex_rng, 'MY-APIARY', 'SE', 'Sideline', 'Beekeeper', 'GA', [2024, 2025],
                                 start_varroa_shift=0.25, treat_bias=-0.25)
    example_csv = to_csv(example)

    regions = {k: {'name': v[0], 'states': v[1]} for k, v in REGIONS.items()}
    with open(os.path.join(out_dir, 'monitoring-demo.js'), 'w') as f:
        f.write('/* SIMULATED DEMONSTRATION DATA. Every record below is made up by pipeline/make_demo_monitoring.py.\n'
                '   Remove before launch and replace with real colony monitoring data. */\n')
        f.write('window.HIVE_MONITOR = ')
        json.dump({'demo': True, 'generated': date.today().isoformat(), 'regions': regions,
                   'epoch': '2024-01-01', 'beesSampled': 300, 'flags': flags, 'queenCodes': queen_codes,
                   'treatCodes': treat_codes, 'fedCodes': fed_codes, 'ops': ops, 'rows': compact,
                   'exampleUpload': example_csv},
                  f, separators=(',', ':'))
        f.write(';\n')
    with open(os.path.join(out_dir, 'monitoring-example.csv'), 'w') as f:
        f.write(example_csv)
    # The upload template now comes from pipeline/make_monitoring_template.py
    ops = len(plan)
    print('reference: %d operations, %d inspection rows; example upload: %d rows' % (ops, len(rows), len(example)))


if __name__ == '__main__':
    main(sys.argv[1])
