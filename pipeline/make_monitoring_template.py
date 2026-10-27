"""Build the Hive Atlas colony inspection template (Excel and CSV).

Usage:
    python3 pipeline/make_monitoring_template.py data/

Writes data/colony-inspection-template.xlsx and data/colony-inspection-template.csv.
The column names match what the Colony Monitoring page reads, so a filled-in Inspections
sheet (or the CSV) can be opened on the page directly.
"""
import os
import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

FONT = 'Arial'
INK, HONEY, HONEY_SOFT, INPUT, CALC, LINE = '1D2530', 'B87A0B', 'F5E8C8', 'FFF8E1', 'EEEEEE', 'D5D9DD'
ROWS = 1000  # data-entry rows prepared with dropdowns

STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
          'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR',
          'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']
LISTS = {
    'operation_type': ['Hobbyist', 'Sideline', 'Commercial'],
    'submitted_by': ['Beekeeper', 'Apiary inspector', 'Researcher', 'Tech-transfer team'],
    'state': STATES,
    'yes_no': ['yes', 'no'],
    'brood_pattern': [1, 2, 3, 4, 5],
    'queen_status': ['seen', 'eggs_only', 'virgin', 'queenless', 'drone_layer'],
    'varroa_method': ['alcohol_wash', 'sugar_roll', 'sticky_board'],
    'treatment': ['none', 'oxalic', 'amitraz', 'formic', 'thymol', 'hop_acids', 'other'],
    'fed': ['none', 'syrup', 'pollen_patty', 'fondant'],
}

# (column, required, what to enter, allowed values, example, list name or validation)
FIELDS = [
    ('operation_id', 'Recommended', 'A name or code for the beekeeping operation. Inspectors can put several operations in one file. Use a code instead of a name if the operation wants privacy.', 'Any text', 'MY-APIARY', None),
    ('operation_type', 'Recommended', 'Size of the whole operation, not just the colonies monitored. Needed to compare with similar operations.', 'Hobbyist (under 25 colonies), Sideline (25 to 299), Commercial (300 or more)', 'Sideline', 'operation_type'),
    ('submitted_by', 'Optional', 'Who collected the data.', 'Beekeeper, Apiary inspector, Researcher, Tech-transfer team', 'Beekeeper', 'submitted_by'),
    ('state', 'Required', 'State where the apiary is. Used to place the colony in a climate region; exact locations are never collected.', 'Two-letter state code', 'MD', 'state'),
    ('apiary_id', 'Recommended', 'Your label for the apiary or yard.', 'Any text', 'A1', None),
    ('colony_id', 'Required', 'Your label for the colony. Keep it the same at every inspection so the colony can be followed over time. Give a replacement colony a new label.', 'Any text', 'C01', None),
    ('inspection_date', 'Required', 'Date of the inspection.', 'Date (YYYY-MM-DD)', '2025-08-14', 'date'),
    ('colony_alive', 'Required', 'Enter "no" for a dead colony (dead out) and leave the rest of the row blank.', 'yes, no', 'yes', 'yes_no'),
    ('frames_of_bees', 'Recommended', 'Deep frames covered with bees, counted across all boxes. See the Methods tab.', 'Number from 0 to 40, quarters allowed (for example 7.5)', '12', 'frames'),
    ('brood_frames', 'Recommended', 'Deep frames of brood (eggs, larvae, and capped brood). See the Methods tab.', 'Number from 0 to 30', '5', 'brood'),
    ('brood_pattern', 'Recommended', 'How solid the capped brood is. Leave blank if there is no brood. See the Methods tab.', '1 (very spotty) to 5 (solid)', '4', 'brood_pattern'),
    ('queen_status', 'Recommended', 'What you saw. See the Methods tab for each value.', 'seen, eggs_only, virgin, queenless, drone_layer', 'seen', 'queen_status'),
    ('varroa_mites', 'Recommended', 'Mites counted in the sample.', 'Whole number, 0 or more', '7', 'mites'),
    ('bees_sampled', 'Recommended', 'Bees in the sample. A level half cup is about 300 bees; 300 is used if left blank.', 'Whole number from 50 to 1,000', '300', 'bees'),
    ('varroa_method', 'Recommended', 'How the mites were counted. Sticky-board counts are kept but not used in mites per 100 bees.', 'alcohol_wash, sugar_roll, sticky_board', 'alcohol_wash', 'varroa_method'),
    ('varroa_per_100', 'Calculated', 'Filled in automatically from varroa_mites and bees_sampled. Do not type here.', 'Calculated', '2.33', None),
    ('afb', 'Recommended', 'Signs of American foulbrood. Report suspected AFB to your state apiarist.', 'yes, no', 'no', 'yes_no'),
    ('efb', 'Recommended', 'Signs of European foulbrood.', 'yes, no', 'no', 'yes_no'),
    ('chalkbrood', 'Recommended', 'Chalkbrood mummies in cells or at the entrance.', 'yes, no', 'no', 'yes_no'),
    ('sacbrood', 'Recommended', 'Signs of sacbrood.', 'yes, no', 'no', 'yes_no'),
    ('deformed_wings', 'Recommended', 'Bees with deformed or shriveled wings.', 'yes, no', 'no', 'yes_no'),
    ('small_hive_beetle', 'Recommended', 'Adult or larval small hive beetles seen.', 'yes, no', 'yes', 'yes_no'),
    ('treatment', 'Recommended', 'Varroa treatment applied at this visit, by active ingredient (Apivar is amitraz, Apiguard is thymol, Formic Pro is formic, HopGuard is hop_acids).', 'none, oxalic, amitraz, formic, thymol, hop_acids, other', 'oxalic', 'treatment'),
    ('fed', 'Optional', 'Feeding given at this visit.', 'none, syrup, pollen_patty, fondant', 'none', 'fed'),
    ('requeened', 'Optional', 'A new queen or queen cell was introduced at this visit.', 'yes, no', 'no', 'yes_no'),
    ('notes', 'Optional', 'Anything else. Not used in the charts.', 'Any text', 'Strong colony', None),
]
COLS = [f[0] for f in FIELDS]
CI = {c: i + 1 for i, c in enumerate(COLS)}

EXAMPLES = [
    ['MY-APIARY', 'Sideline', 'Beekeeper', 'MD', 'A1', 'C01', date(2025, 8, 14), 'yes', 12, 5, 4, 'seen', 7, 300, 'alcohol_wash', None, 'no', 'no', 'no', 'no', 'no', 'yes', 'oxalic', 'none', 'no', 'Strong colony'],
    ['MY-APIARY', 'Sideline', 'Beekeeper', 'MD', 'A1', 'C02', date(2025, 8, 14), 'yes', 6, 0, None, 'queenless', 15, 300, 'alcohol_wash', None, 'no', 'no', 'no', 'no', 'yes', 'no', 'none', 'syrup', 'yes', 'Introduced mated queen'],
    ['MY-APIARY', 'Sideline', 'Beekeeper', 'MD', 'A2', 'C03', date(2025, 8, 15), 'no', None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, 'Dead out, moths present'],
]


def font(**k):
    return Font(name=FONT, **k)


def per100_formula(r):
    m, b, meth = (chr(64 + CI[c]) for c in ('varroa_mites', 'bees_sampled', 'varroa_method'))
    return '=IF(OR({m}{r}="",{meth}{r}="sticky_board"),"",ROUND({m}{r}/IF({b}{r}="",300,{b}{r})*100,2))'.format(m=m, b=b, meth=meth, r=r)


def write_table(ws, header, rows, widths, wrap_cols=()):
    thin = Side(style='thin', color=LINE)
    for j, h in enumerate(header, 1):
        c = ws.cell(row=1, column=j, value=h)
        c.font = font(bold=True, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor=INK)
        c.alignment = Alignment(vertical='center', wrap_text=True)
    for i, row in enumerate(rows, 2):
        for j, v in enumerate(row, 1):
            c = ws.cell(row=i, column=j, value=v)
            c.font = font(bold=(j == 1))
            c.alignment = Alignment(vertical='top', wrap_text=True)
            c.border = Border(bottom=thin)
    for j, w in enumerate(widths, 1):
        ws.column_dimensions[chr(64 + j)].width = w
    ws.freeze_panes = 'A2'


def main(out_dir):
    wb = Workbook()

    # ---------- Start here ----------
    ws = wb.active
    ws.title = 'Start here'
    ws.sheet_view.showGridLines = False
    ws.column_dimensions['A'].width = 3
    ws.column_dimensions['B'].width = 100
    lines = [
        ('The Hive Atlas colony inspection template', font(bold=True, size=16, color=INK)),
        ('One row per colony per inspection. Use the same layout every time so records from different beekeepers and programs can be compared.', font(size=11)),
        ('', None),
        ('How to use this workbook', font(bold=True, size=12, color=HONEY)),
        ('1. Enter your inspections on the Inspections tab, starting in row 2. Cells shaded light yellow are for you to fill in; most have a dropdown list.', font(size=11)),
        ('2. Required: inspection_date, state, and colony_id (headers in gold). Fill in everything else you record and leave the rest blank.', font(size=11)),
        ('3. Keep each colony\'s label the same at every visit so it can be followed over time. Record dead colonies with colony_alive = no.', font(size=11)),
        ('4. The gray varroa_per_100 column fills in by itself. Do not type in it.', font(size=11)),
        ('5. The Example tab shows three filled-in rows. The Field guide tab explains every column, and the Methods tab describes how to measure.', font(size=11)),
        ('', None),
        ('Using your file on The Hive Atlas', font(bold=True, size=12, color=HONEY)),
        ('Open this workbook (or a CSV saved from the Inspections tab) on the Colony Monitoring page, under Your report. It is read in your browser only; it is not uploaded or saved.', font(size=11)),
        ('To contribute your records to the shared regional data, see the Contribute page. Credit and privacy terms are agreed first.', font(size=11)),
        ('Exact apiary locations are never collected. State is the most detailed location used.', font(size=11)),
        ('', None),
        ('Legend', font(bold=True, size=12, color=HONEY)),
    ]
    r = 2
    for text, f in lines:
        c = ws.cell(row=r, column=2, value=text)
        if f:
            c.font = f
        c.alignment = Alignment(wrap_text=True, vertical='top')
        r += 1
    for label, fill, fcolor in [('Gold header: required column', HONEY, 'FFFFFF'), ('Dark header: recommended or optional column', INK, 'FFFFFF'),
                                ('Light yellow: cell for you to fill in', INPUT, INK), ('Gray: calculated automatically', CALC, INK)]:
        c = ws.cell(row=r, column=2, value=label)
        c.font = font(size=11, color=fcolor, bold=fill in (HONEY, INK))
        c.fill = PatternFill('solid', fgColor=fill)
        r += 1
    ws.cell(row=r + 1, column=2, value='Template version %s.' % date.today().strftime('%B %Y')).font = font(size=9, color='666666')

    # ---------- Lists ----------
    wl = wb.create_sheet('Lists')
    for j, (name, vals) in enumerate(LISTS.items(), 1):
        col = chr(64 + j)
        h = wl.cell(row=1, column=j, value=name)
        h.font = font(bold=True)
        for i, v in enumerate(vals, 2):
            wl.cell(row=i, column=j, value=v).font = font()
        wl.column_dimensions[col].width = 18
        wb.defined_names['list_' + name] = DefinedName('list_' + name, attr_text="Lists!$%s$2:$%s$%d" % (col, col, len(vals) + 1))
    wl.sheet_state = 'hidden'

    # ---------- Inspections (data entry) ----------
    wi = wb.create_sheet('Inspections', 1)
    required = {f[0] for f in FIELDS if f[1] == 'Required'}
    for f in FIELDS:
        j = CI[f[0]]
        c = wi.cell(row=1, column=j, value=f[0])
        c.font = font(bold=True, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor=HONEY if f[0] in required else (CALC if f[1] == 'Calculated' else INK))
        if f[1] == 'Calculated':
            c.font = font(bold=True, color=INK)
        c.alignment = Alignment(vertical='center')
        c.comment = Comment('%s. %s\nAllowed: %s\nExample: %s' % (f[1], f[2], f[3], f[4]), 'The Hive Atlas', width=320, height=140)
        wi.column_dimensions[c.column_letter].width = max(12, min(22, len(f[0]) + 4))
    wi.column_dimensions[chr(64 + CI['notes'])].width = 40
    input_fill, calc_fill = PatternFill('solid', fgColor=INPUT), PatternFill('solid', fgColor=CALC)
    date_col = CI['inspection_date']
    for r in range(2, ROWS + 2):
        for name in COLS:
            c = wi.cell(row=r, column=CI[name])
            c.font = font()
            if name == 'varroa_per_100':
                c.value = per100_formula(r)
                c.fill = calc_fill
                c.number_format = '0.00'
            else:
                c.fill = input_fill
        wi.cell(row=r, column=date_col).number_format = 'yyyy-mm-dd'
    wi.freeze_panes = 'A2'
    wi.auto_filter.ref = 'A1:%s%d' % (chr(64 + len(COLS)), ROWS + 1)

    def add_dv(dv, name):
        col = chr(64 + CI[name])
        dv.add('%s2:%s%d' % (col, col, ROWS + 1))
        wi.add_data_validation(dv)

    for f in FIELDS:
        kind = f[5]
        if kind in LISTS:
            dv = DataValidation(type='list', formula1='=list_' + kind, allow_blank=True, showErrorMessage=True,
                                errorTitle='Not on the list', error='Choose a value from the dropdown list. See the Field guide tab.')
            add_dv(dv, f[0])
    numeric = {
        'date': DataValidation(type='date', operator='between', formula1='DATE(2000,1,1)', formula2='DATE(2100,12,31)', allow_blank=True,
                               showErrorMessage=True, errorTitle='Date', error='Enter a date, for example 2025-08-14.'),
        'frames': DataValidation(type='decimal', operator='between', formula1='0', formula2='40', allow_blank=True, showErrorMessage=True,
                                 errorTitle='Frames of bees', error='Enter a number from 0 to 40.'),
        'brood': DataValidation(type='decimal', operator='between', formula1='0', formula2='30', allow_blank=True, showErrorMessage=True,
                                errorTitle='Brood frames', error='Enter a number from 0 to 30.'),
        'mites': DataValidation(type='whole', operator='between', formula1='0', formula2='2000', allow_blank=True, showErrorMessage=True,
                                errorTitle='Mites', error='Enter the number of mites counted (a whole number).'),
        'bees': DataValidation(type='whole', operator='between', formula1='50', formula2='1000', allow_blank=True, showErrorMessage=True,
                               errorTitle='Bees sampled', error='Enter the number of bees in the sample (about 300 for a half cup).'),
    }
    for f in FIELDS:
        if f[5] in numeric:
            add_dv(numeric[f[5]], f[0])

    # ---------- Example ----------
    we = wb.create_sheet('Example', 2)
    for f in FIELDS:
        c = we.cell(row=1, column=CI[f[0]], value=f[0])
        c.font = font(bold=True, color='FFFFFF' if f[1] != 'Calculated' else INK)
        c.fill = PatternFill('solid', fgColor=HONEY if f[0] in required else (CALC if f[1] == 'Calculated' else INK))
        we.column_dimensions[c.column_letter].width = max(12, min(22, len(f[0]) + 4))
    we.column_dimensions[chr(64 + CI['notes'])].width = 30
    for i, row in enumerate(EXAMPLES, 2):
        for j, v in enumerate(row, 1):
            c = we.cell(row=i, column=j, value=v)
            c.font = font(italic=True, color='555555')
        we.cell(row=i, column=CI['inspection_date']).number_format = 'yyyy-mm-dd'
        pc = we.cell(row=i, column=CI['varroa_per_100'], value=per100_formula(i))
        pc.font = font(italic=True, color='555555')
        pc.fill = calc_fill
        pc.number_format = '0.00'
    n = we.cell(row=len(EXAMPLES) + 3, column=1,
                value='Examples only, showing the expected format: a strong colony that was treated, a queenless colony that was requeened, and a dead out. Enter your own records on the Inspections tab.')
    n.font = font(size=10, color='666666')
    we.freeze_panes = 'A2'

    # ---------- Field guide ----------
    wg = wb.create_sheet('Field guide', 3)
    write_table(wg, ['Column', 'Required?', 'What to enter', 'Allowed values', 'Example'],
                [[f[0], f[1], f[2], f[3], f[4]] for f in FIELDS], [22, 13, 70, 42, 16])

    # ---------- Methods ----------
    wm = wb.create_sheet('Methods', 4)
    methods = [
        ('When to inspect', 'Inspect monitored colonies about once a month during the active season, and record each colony every time, including dead outs. Fall and early spring visits matter most for tracking Varroa and winter loss.'),
        ('Alcohol wash (preferred)', 'Take about 300 bees (a level half cup) from a brood frame, making sure the queen is not on it. Put them in a jar with enough 70% alcohol to cover them, close it, and shake or swirl for about a minute. Pour through a mesh screen and count the mites that come through. Record mites in varroa_mites, bees in bees_sampled, and alcohol_wash in varroa_method.'),
        ('Sugar roll', 'Same sample size, shaken with powdered sugar instead of alcohol. The bees survive, but fewer mites are recovered than with an alcohol wash, so record sugar_roll so results can be compared fairly.'),
        ('Sticky board', 'Counts mites that drop over a set time. These counts are not comparable with washes and are not used in mites per 100 bees.'),
        ('Mites per 100 bees', 'mites counted / bees sampled x 100. For example, 7 mites in 300 bees is 2.3 mites per 100 bees. A common treatment threshold is 3 mites per 100 bees, though recommended thresholds vary by season.'),
        ('Frames of bees', 'Count frames covered with bees on both sides, in deep-frame equivalents. Add partly covered frames in quarters (a frame half covered on both sides is 0.5). Count a medium frame as about two-thirds of a deep. Add up all boxes.'),
        ('Brood frames', 'Count frames with brood (eggs, larvae, or capped brood) the same way, as deep-frame equivalents, adding partial frames in quarters.'),
        ('Brood pattern score', '5 = solid: nearly every cell in the capped brood area is filled. 4 = mostly solid: a few empty cells. 3 = moderate: clearly scattered empty cells. 2 = spotty: many empty cells. 1 = very spotty: more empty cells than capped brood. Score the best brood frame, and leave blank if there is no brood.'),
        ('Queen status', 'seen = queen seen. eggs_only = queen not seen, but eggs present. virgin = an unmated queen seen, or a queen cell has emerged and no eggs yet. queenless = no queen, no eggs, and no sign of a new queen. drone_layer = drone brood in worker cells or several eggs per cell (failing queen or laying workers).'),
        ('Disease signs', 'Record what you see, not a diagnosis. American foulbrood: sunken, greasy or perforated cappings, and dead larvae that string out when tested with a twig. European foulbrood: twisted, melted-looking larvae, often off-white to brown, before capping. Chalkbrood: hard white or gray mummies. Sacbrood: larvae in a fluid-filled sac with the head raised. Deformed wings: shriveled, crumpled wings on adult bees. Small hive beetle: adult beetles or larvae.'),
        ('Reporting', 'Suspected American foulbrood is reportable in many states. Contact your state apiarist, who can confirm it with a lab test.'),
        ('Treatment', 'Record the treatment applied at this visit by active ingredient: oxalic, amitraz, formic, thymol, hop_acids, or other. Record none if nothing was applied.'),
    ]
    write_table(wm, ['Topic', 'How to measure or record it'], methods, [26, 110])

    # order: Start here, Inspections, Example, Field guide, Methods, Lists (hidden)
    wb.active = 0
    for s in wb.worksheets:
        s.sheet_properties.tabColor = HONEY if s.title == 'Inspections' else None
    xlsx = os.path.join(out_dir, 'colony-inspection-template.xlsx')
    wb.save(xlsx)
    with open(os.path.join(out_dir, 'colony-inspection-template.csv'), 'w') as f:
        f.write(','.join(c for c in COLS if c != 'varroa_per_100') + '\n')
    print('wrote', xlsx)


if __name__ == '__main__':
    main(sys.argv[1])
