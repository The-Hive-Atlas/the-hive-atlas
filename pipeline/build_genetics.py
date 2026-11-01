#!/usr/bin/env python3
"""Build the Genetic Diversity data files from the genetic database spreadsheet.

Usage:
    python3 pipeline/build_genetics.py Genetic_Database2026.xlsx data/genetics.js data/genetics-state-year.csv

Reads one row per genotyped colony and writes ONLY summarized counts by state and year:
  - data/genetics.js             window.HIVE_GENETICS, read by js/genetics.js
  - data/genetics-state-year.csv the same counts, for download

Sample numbers (Sample#), index numbers, and every other per-colony field are dropped.
Nothing below the state level is published.

Haplotype diversity is recomputed here from the haplotype counts (Nei's unbiased estimate,
n/(n-1) * (1 - sum of squared frequencies)) so it can be pooled for regions and the U.S.
The spreadsheet's own Haplo.Div column is NOT used. It is only compared at the end, and differences are printed
so the spreadsheet can be corrected.
"""
import datetime
import json
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent.parent


# State names and NOAA climate regions. Kept in this file so the genetics map does not depend on
# any other data file.
NAMES = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District of Columbia",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
    "PR": "Puerto Rico",
    "US": "United States",
    "GU": "Guam",
}

REGIONS = {
    "NE": {"name": "Northeast", "states": ["CT", "DE", "ME", "MD", "MA", "NH", "NJ", "NY", "PA", "RI", "VT", "DC"]},
    "UM": {"name": "Upper Midwest", "states": ["IA", "MI", "MN", "WI"]},
    "OV": {"name": "Ohio Valley", "states": ["IL", "IN", "KY", "MO", "OH", "TN", "WV"]},
    "SE": {"name": "Southeast", "states": ["AL", "FL", "GA", "NC", "SC", "VA"]},
    "NRP": {"name": "Northern Rockies and Plains", "states": ["MT", "NE", "ND", "SD", "WY"]},
    "S": {"name": "South", "states": ["AR", "KS", "LA", "MS", "OK", "TX"]},
    "SW": {"name": "Southwest", "states": ["AZ", "CO", "NM", "UT"]},
    "NW": {"name": "Northwest", "states": ["ID", "OR", "WA"]},
    "W": {"name": "West", "states": ["CA", "NV"]},
    "AK": {"name": "Alaska", "states": ["AK"]},
    "HI": {"name": "Hawaii", "states": ["HI"]},
}


def main(xlsx, out_js, out_csv):
    df = pd.read_excel(xlsx)
    df.columns = [str(c).strip() for c in df.columns]
    need = ["States", "Year", "Evolutionary_Lineage", "Haplotype", "MatchNCBI", "Novel Haplo", "Haplo.Div"]
    missing = [c for c in need if c not in df.columns]
    if missing:
        sys.exit("Missing columns: " + ", ".join(missing))

    for c in ["States", "Evolutionary_Lineage", "Haplotype", "MatchNCBI"]:
        df[c] = df[c].astype(str).str.strip()
    df["Year"] = df["Year"].astype(int)
    # A stray space in a label (for example "C2d- JQ977701") would count one haplotype as two
    before = df["MatchNCBI"].nunique()
    df["MatchNCBI"] = df["MatchNCBI"].str.replace(r"\s+", "", regex=True)
    if df["MatchNCBI"].nunique() != before:
        print("Note: merged %d haplotype labels that differed only by spaces" % (before - df["MatchNCBI"].nunique()))

    # ---- Checks, printed so a person can review them ----
    bad = df[~df["Evolutionary_Lineage"].isin(["C", "M", "A", "O"])]
    if len(bad):
        sys.exit("Unknown lineage values: %s" % bad["Evolutionary_Lineage"].unique())
    if "Sample#" in df.columns:
        dup = df[df["Sample#"].duplicated(keep=False)]
        for sid in dup["Sample#"].unique():
            print("WARNING: sample ID %s appears %d times (rows kept, check the source)" % (sid, (df["Sample#"] == sid).sum()))
    names, regions = NAMES, REGIONS
    unknown = sorted(set(df["States"]) - set(names))
    if unknown:
        sys.exit("State codes without a name: %s" % unknown)

    hap_groups = sorted(df["Haplotype"].unique(), key=lambda h: (-(df["Haplotype"] == h).sum(), h))
    ncbi_groups = sorted(df["MatchNCBI"].unique())
    lineages = ["C", "M", "A", "O"]
    states = sorted(df["States"].unique())

    rows = []
    for (st, yr), g in df.groupby(["States", "Year"]):
        row = [states.index(st), int(yr), len(g)]
        row += [int((g["Evolutionary_Lineage"] == l).sum()) for l in lineages]
        row.append(int(g["Novel Haplo"].sum()))
        row += [int((g["Haplotype"] == h).sum()) for h in hap_groups]
        row += [int((g["MatchNCBI"] == h).sum()) for h in ncbi_groups]
        rows.append(row)

    cols = ["state", "year", "samples"] + ["lin_" + l for l in lineages] + ["novel"] \
        + ["hap_" + h for h in hap_groups] + ["ncbi_" + h for h in ncbi_groups]

    out = {
        "source": {
            "built": datetime.date.today().isoformat(),
            "samples": int(len(df)),
            "years": sorted(int(y) for y in df["Year"].unique()),
        },
        "names": {s: names[s] for s in names},
        "regions": regions,
        "states": states,
        "lineages": lineages,
        "haplotypes": hap_groups,
        "ncbi": ncbi_groups,
        "cols": cols,
        "rows": rows,
    }
    Path(out_js).write_text(
        "/* The Hive Atlas: Genetic Diversity data. Generated by pipeline/build_genetics.py. Counts only, by state and year. */\n"
        "window.HIVE_GENETICS = " + json.dumps(out, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )

    # Download file: one line per state and year, with readable names
    csv = pd.DataFrame(rows, columns=cols)
    csv.insert(0, "state_name", [names[states[i]] for i in csv["state"]])
    csv["state"] = [states[i] for i in csv["state"]]
    csv.rename(columns={"samples": "colonies_genotyped"}, inplace=True)

    def nei_row(r):
        counts = [r[c] for c in csv.columns if c.startswith("ncbi_") and r[c] > 0]
        n = sum(counts)
        return round(n / (n - 1) * (1 - sum((c / n) ** 2 for c in counts)), 3) if n > 1 else ""
    csv["haplotype_diversity"] = csv.apply(nei_row, axis=1)
    csv = csv[[c for c in csv.columns if not c.startswith("ncbi_")]]
    csv.to_csv(out_csv, index=False)

    # ---- Cross-check against the spreadsheet's own diversity column ----
    def nei(counts):
        n = sum(counts)
        return n / (n - 1) * (1 - sum((c / n) ** 2 for c in counts)) if n > 1 else float("nan")

    print("Wrote %s and %s: %d rows, %d colonies, %d states/territories, years %s" % (
        out_js, out_csv, len(rows), len(df), len(states), out["source"]["years"]))
    print("Haplotype diversity: pipeline value vs. spreadsheet Haplo.Div (differences over 0.0005)")
    for st, g in df.groupby("States"):
        mine = nei(list(g["MatchNCBI"].value_counts()))
        theirs = sorted(g["Haplo.Div"].dropna().unique())
        if len(theirs) > 1:
            print("  %s: spreadsheet has %d different values %s; pipeline gives %.3f" % (st, len(theirs), theirs, mine))
        elif theirs and abs(mine - theirs[0]) > 0.0005:
            print("  %s: pipeline %.3f, spreadsheet %.3f" % (st, mine, theirs[0]))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
