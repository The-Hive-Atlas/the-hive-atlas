#!/usr/bin/env python3
"""Build the Genetic Diversity data files from the genetic database spreadsheet.

Usage:
    python3 pipeline/build_genetics.py Genetic_Database2026.xlsx data/genetics.js data/genetics-state-year.csv

Reads the "All populations" sheet (one row per genotyped colony, worldwide) and writes ONLY
summarized counts by country, area (U.S. state, or the region/state named in the spreadsheet),
and year:
  - data/genetics.js              window.HIVE_GENETICS, read by js/genetics.js
  - data/genetics-state-year.csv  the same counts, for download

Sample numbers, index numbers, references, and every other per-colony field are dropped.
Area coordinates are the spreadsheet's area-level lookup coordinates (for example a region's
capital), used only to place the area's dot on the map.

Rows without a Country are left out (the count is printed). Spaces are removed from haplotype
names ("Z 7" becomes "Z7"), so one haplotype is never counted as two. Rows without a lineage or haplotype
are counted as colonies but left out of the lineage or haplotype shares.

Haplotype diversity is calculated in js/genetics.js from the haplotype counts written here
(Nei's unbiased estimate, n/(n-1) * (1 - sum of squared frequencies)), using the spreadsheet's
Haplotype column for every country.
"""
import datetime
import json
import sys
from pathlib import Path

import pandas as pd

SHEET = "All populations"

# U.S. state names and NOAA climate regions, used only for the United States.
NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
    "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia",
    "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "PR": "Puerto Rico", "GU": "Guam",
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

# Spreadsheet country name -> (name shown on the site, ISO 3166 numeric codes of the outline(s) to draw).
# The outlines are Natural Earth country shapes (world-atlas), loaded by the page when a country is picked.
COUNTRIES = {
    "USA": ("United States", ["840"]),
    "Algeria": ("Algeria", ["012"]),
    "Argentina": ("Argentina", ["032"]),
    "Belgium": ("Belgium", ["056"]),
    "Canada": ("Canada", ["124"]),
    "Croatia": ("Croatia", ["191"]),
    "Côte d'Ivoire": ("Côte d'Ivoire", ["384"]),
    "Egypt": ("Egypt", ["818"]),
    "Ethiopia": ("Ethiopia", ["231"]),
    "France": ("France", ["250"]),
    "Greece": ("Greece", ["300"]),
    "Iraq": ("Iraq", ["368"]),
    "Italy": ("Italy", ["380"]),
    "Jordan": ("Jordan", ["400"]),
    "Lebanon": ("Lebanon", ["422"]),
    "Madagascar": ("Madagascar", ["450"]),
    "Mauritius": ("Mauritius", ["480"]),
    "Oman": ("Oman", ["512"]),
    "Saudi Arabia": ("Saudi Arabia", ["682"]),
    "Slovenia": ("Slovenia", ["705"]),
    "South Africa": ("South Africa", ["710"]),
    "Spain/Portugal": ("Spain and Portugal", ["724", "620"]),
    "Syria": ("Syria", ["760"]),
    "Ukraine": ("Ukraine", ["804"]),
    "Yemen": ("Yemen", ["887"]),
}
LINEAGES = ["C", "M", "A"]
NO_AREA = "No region recorded"


def clean(s):
    return s.astype("string").str.strip().replace({"": pd.NA, "nan": pd.NA})


def main(xlsx, out_js, out_csv):
    df = pd.read_excel(xlsx, sheet_name=SHEET)
    df.columns = [str(c).strip() for c in df.columns]
    need = ["Country", "State", "Latitude", "Longitude", "Year", "Evolutionary_Lineage", "Haplotype"]
    missing = [c for c in need if c not in df.columns]
    if missing:
        sys.exit("Missing columns in sheet '%s': %s" % (SHEET, ", ".join(missing)))
    for c in ["Country", "State", "Evolutionary_Lineage", "Haplotype"]:
        df[c] = clean(df[c])
    df["Evolutionary_Lineage"] = df["Evolutionary_Lineage"].str.upper()
    # Haplotype names never contain spaces: "Z 7" and "Z7" are the same haplotype
    spaced = df["Haplotype"].str.contains(r"\s", regex=True, na=False)
    if spaced.any():
        fixed = sorted(set(df.loc[spaced, "Haplotype"]))
        print("Removed spaces from %d haplotype names in %d rows: %s" % (len(fixed), int(spaced.sum()), ", ".join("'%s'" % h for h in fixed)))
        df["Haplotype"] = df["Haplotype"].str.replace(r"\s+", "", regex=True)

    # ---- Checks, printed so a person can review them ----
    no_country = int(df["Country"].isna().sum())
    if no_country:
        print("Left out: %d rows with no Country" % no_country)
    df = df[df["Country"].notna()].copy()
    unknown = sorted(set(df["Country"]) - set(COUNTRIES))
    if unknown:
        sys.exit("Countries not listed in COUNTRIES in this script (add their name and ISO code): %s" % unknown)
    bad = df[df["Evolutionary_Lineage"].notna() & ~df["Evolutionary_Lineage"].isin(LINEAGES)]
    if len(bad):
        sys.exit("Unknown lineage values: %s" % sorted(bad["Evolutionary_Lineage"].unique()))
    us = df["Country"] == "USA"
    bad_us = sorted(set(df.loc[us, "State"].dropna()) - set(NAMES))
    if bad_us:
        sys.exit("U.S. state codes without a name: %s" % bad_us)
    print("Rows with no lineage: %d; no haplotype: %d; no year: %d" % (
        df["Evolutionary_Lineage"].isna().sum(), df["Haplotype"].isna().sum(), df["Year"].isna().sum()))

    df["Year"] = pd.to_numeric(df["Year"], errors="coerce").fillna(0).astype(int)
    df["Area"] = df["State"].fillna(NO_AREA)

    hap_counts = df["Haplotype"].value_counts()
    haplotypes = sorted(hap_counts.index, key=lambda h: (-hap_counts[h], h))
    hap_index = {h: i for i, h in enumerate(haplotypes)}

    countries, csv_rows = [], []
    order = ["USA"] + sorted((c for c in df["Country"].unique() if c != "USA"), key=lambda c: COUNTRIES[c][0])
    for key in order:
        cdf = df[df["Country"] == key]
        name, iso = COUNTRIES[key]
        areas = []
        area_names = sorted(cdf["Area"].unique(), key=lambda a: (a == NO_AREA, NAMES.get(a, a) if key == "USA" else a))
        for a in area_names:
            g = cdf[cdf["Area"] == a]
            ll = g.dropna(subset=["Latitude", "Longitude"])
            if len(ll):
                lat, lon = ll.groupby(["Latitude", "Longitude"]).size().idxmax()
                lat, lon = round(float(lat), 2), round(float(lon), 2)
            else:
                lat = lon = None
            areas.append({"id": a if key == "USA" else str(len(areas)),
                          "name": NAMES.get(a, a) if key == "USA" else a, "lat": lat, "lon": lon})
        aidx = {a: i for i, a in enumerate(area_names)}
        rows = []
        for (a, yr), g in cdf.groupby(["Area", "Year"]):
            lin = [int((g["Evolutionary_Lineage"] == l).sum()) for l in LINEAGES]
            hc = g["Haplotype"].dropna().value_counts()
            pairs = []
            for h in sorted(hc.index, key=lambda h: hap_index[h]):
                pairs += [hap_index[h], int(hc[h])]
            rows.append([aidx[a], int(yr), len(g)] + lin + [pairs])
            csv_rows.append({
                "country": name, "area": areas[aidx[a]]["name"], "area_code": a if key == "USA" else "",
                "year": int(yr) if yr else "", "colonies_genotyped": len(g),
                "lineage_C": lin[0], "lineage_M": lin[1], "lineage_A": lin[2],
                "lineage_not_recorded": len(g) - sum(lin),
                "haplotype_recorded": int(hc.sum()), "haplotypes": "; ".join("%s:%d" % (h, hc[h]) for h in hc.index),
                "haplotype_diversity": nei(list(hc)),
            })
        countries.append({"key": key, "name": name, "iso": iso, "areas": areas, "rows": rows})
        yrs = sorted(y for y in cdf["Year"].unique() if y)
        print("  %-20s %5d colonies, %3d areas, years %s%s" % (
            name, len(cdf), len(areas), (str(yrs[0]) + "-" + str(yrs[-1])) if yrs else "none",
            ", %d without a year" % (cdf["Year"] == 0).sum() if (cdf["Year"] == 0).any() and yrs else ""))

    out = {
        "source": {"built": datetime.date.today().isoformat(), "samples": int(len(df)), "file": Path(xlsx).name},
        "lineages": LINEAGES,
        "haplotypes": haplotypes,
        "us": {"names": NAMES, "regions": REGIONS},
        "cols": ["area", "year", "samples", "lin_C", "lin_M", "lin_A", "haps"],
        "countries": countries,
    }
    Path(out_js).write_text(
        "/* The Hive Atlas: Genetic Diversity data. Generated by pipeline/build_genetics.py. "
        "Counts only, by country, area, and year (year 0 = not recorded). */\n"
        "window.HIVE_GENETICS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    pd.DataFrame(csv_rows).to_csv(out_csv, index=False)
    print("Wrote %s and %s: %d colonies, %d countries, %d haplotypes" % (
        out_js, out_csv, len(df), len(countries), len(haplotypes)))


def nei(counts):
    n = sum(counts)
    return round(n / (n - 1) * (1 - sum((c / n) ** 2 for c in counts)), 3) if n > 1 else ""


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
