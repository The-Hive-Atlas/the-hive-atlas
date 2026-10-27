# The Hive Atlas

**Open, mapped data on U.S. honey bee health.** Live at [thehiveatlas.com](https://thehiveatlas.com).

The Hive Atlas brings public data on honey bee colony losses, disease, and colony monitoring into one place, on interactive maps of the United States. Click a state to see its numbers, compare it with the country, and see how things have changed over time.

## What's on the site

| Page | What it shows | Source |
|---|---|---|
| **Colony Losses** | Quarterly colony losses, renovations, and self-reported stressors by state, 2015 to now | USDA National Agricultural Statistics Service (NASS), *Honey Bee Colonies* reports |
| **Disease Surveillance** | Varroa, Nosema, and tracheal mite results from adult bee samples, by state, climate region, year, and month, 1984 to now | USDA ARS Bee Disease Diagnostic Laboratory, Beltsville, Maryland |
| **Colony Monitoring** | Repeated colony inspections by climate region, plus a personal report for your own records | Currently **simulated demonstration data** |
| **Genetic Diversity** | Mitochondrial lineages of U.S. honey bee populations | Coming soon |

Each map page has an **About this map** tab with definitions, methods, and limits. Methods for the whole site are on the [Data & Methods](https://thehiveatlas.com/methods.html) page.

## Data and privacy

- Only summarized data is published: counts and rates by state, region, year, and month. No apiary locations, zip codes, sample numbers, or beekeeper details.
- Files uploaded on the Colony Monitoring page stay in the visitor's browser. They are never sent to a server.
- Summary tables can be downloaded from each map page and from the [`data`](data) folder.

## Citing The Hive Atlas

> The Hive Atlas (2026). *Open, mapped data on U.S. honey bee health.* https://thehiveatlas.com

Please also cite the original sources:

- USDA National Agricultural Statistics Service. *Honey Bee Colonies.* https://esmis.nal.usda.gov/publication/honey-bee-colonies
- Abban, S. K., Alburaki, M., et al. (2024). *Scientific Reports* 14: 1726. https://doi.org/10.1038/s41598-024-51514-9
- Alburaki, M., et al. (2025). A thirty-two-year (1984–2015) longitudinal analysis of honey bee disease. *Apidologie*.
- Alburaki, M., Abban, S. K., Evans, J. D., and Chen, Y. P. (2024). *Journal of Apicultural Research* 63(4): 701–710. https://doi.org/10.1080/00218839.2024.2329854

## How the site is built

A static website: plain HTML, CSS, and JavaScript, with no server or database, hosted on GitHub Pages.

```
*.html        the pages
css/          shared styles
js/           map and page code
data/         summarized data the maps read, plus downloadable CSV files
pipeline/     Python scripts that turn the source data into the files in data/
```

To update the NASS colony loss data each August:

```
python3 pipeline/import_nass_release.py UNZIPPED_RELEASE_FOLDER data/nass-colony-losses.csv RELEASE_DATE SOURCE_NAME
python3 pipeline/build_losses.py data/nass-colony-losses.csv data/colony-losses.js
```

To update the disease data from a new laboratory spreadsheet (keep the spreadsheet itself out of this repository):

```
python3 pipeline/clean_bddl.py Adult_BDDL.xlsx Adult_BDDL_cleaned.xlsx
python3 pipeline/build_disease.py Adult_BDDL_cleaned.xlsx data/disease.js data/bddl-adult-state-year.csv
```

## Contributing data

Researchers, state apiary programs, and beekeepers can share data with full credit. See the [Contribute](https://thehiveatlas.com/contribute.html) page.

## Contact

Founded by Mohamed Alburaki and Shayne Madella. Email **contact@thehiveatlas.com**.
