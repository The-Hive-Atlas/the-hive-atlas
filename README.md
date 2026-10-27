# The Hive Atlas: website setup guide

The Hive Atlas is a static website: a folder of HTML, CSS, JavaScript, and data files with no server or database. The plan:

- **Part 1.** Put the site live for free on GitHub Pages and test it at a temporary address (about 20 minutes).
- **Part 2.** Connect **thehiveatlas.com**, registered at Squarespace, so visitors see your own address (about 20 minutes, plus waiting).
- **Part 3.** Set up the contact email, hello@thehiveatlas.com (optional, can wait).

Everything in the repository is public, so only put published or shareable data in it. Uploaded files on the Colony Monitoring page never reach GitHub; they stay in each visitor's browser.

---

## Before you start: get access to the domain

Your supervisor registered thehiveatlas.com, so the DNS settings live in their Squarespace account. Either your supervisor does Part 2 using these steps, or they give you access:

1. Your supervisor logs in at **account.squarespace.com/domains** and clicks **thehiveatlas.com**.
2. In the side panel, they open **Permissions** and click **Invite domain manager**.
3. They enter your name and email and click **Submit**.
4. You accept the emailed invitation. A domain manager can change DNS settings but can't see billing or delete the domain.

---

## Part 1. Put the site live on GitHub (free, about 20 minutes)

### 1a. Create your GitHub account
Skip this if you already have one (for example, from the DC Scorecard).

1. Go to **github.com** and click **Sign up**.
2. Choose a username. It appears in the test address (`username.github.io`). A project name like `thehiveatlas` works well, or use a GitHub **organization** if you and Mohamed want to share ownership (click **+**, then **New organization**, and choose the free plan).
3. Verify your email.
4. Turn on two-factor authentication: profile picture (top right), **Settings**, **Password and authentication**. This protects the site from being defaced.

### 1b. Create the repository (the folder that holds the site)
1. Click **+** in the top right, then **New repository**. If you made an organization, choose it as the **Owner**.
2. **Repository name:** `the-hive-atlas`
3. **Description (optional):** "Open, mapped data on U.S. honey bee health"
4. Choose **Public**. Free GitHub Pages requires it.
5. Leave **Add a README file** unchecked (this folder already has one). Leave .gitignore and license as **None**.
6. Click **Create repository**.

### 1c. Upload the site files
1. Unzip `hive-atlas-site.zip` on your computer. Inside the `hive-atlas` folder you'll see `index.html`, `README.md`, and the `css`, `js`, `data`, `images`, and `pipeline` folders.
2. On the new, empty repository page, click the link **uploading an existing file** in the **Quick setup** box.
3. Open the unzipped `hive-atlas` folder, select **everything inside it** (Ctrl+A on Windows, Cmd+A on Mac), and drag it onto the GitHub page. Drag the contents, not the folder itself.
   - Use Chrome, Edge, or Firefox, which keep the subfolders when you drag. If a folder doesn't upload, drag it in on its own.
4. Wait until every file appears in the list (about 30).
5. Under **Commit changes**, type "First version of the site". Keep **Commit directly to the main branch** selected and click **Commit changes**.
6. Check the repository's main page: `index.html`, `README.md`, and the folders should be at the top level.
   - If they ended up inside another folder (such as `hive-atlas/`), delete the repository (**Settings**, scroll to **Danger Zone**, **Delete this repository**) and redo 1b and 1c.

### 1d. Turn on GitHub Pages
1. In the repository, click **Settings** (gear icon), then **Pages** in the left sidebar.
2. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`, folder `/ (root)`
   - Click **Save**.
3. Wait one to two minutes and refresh. A banner appears: "Your site is live at `https://username.github.io/the-hive-atlas/`".
   - If nothing shows yet, open the **Actions** tab. Yellow means building, green means done, red means it failed (send Claude a screenshot).
4. Test the site at that address:
   - Click through every page in the menu.
   - On **Colony Losses**, switch quarters, years, and the whole-survey view, click a few states, and try both map styles.
   - On **Colony Monitoring**, open **Your report** and click **Try it with an example file**. Then download the Excel template and confirm it opens.
   - Open the site on your phone.

**Your test site is live.** Share the address with Mohamed or a few reviewers for feedback before connecting the domain.

---

## Part 2. Connect thehiveatlas.com (free, about 20 minutes plus waiting)

Do these in order. Adding the domain on GitHub before pointing DNS at it keeps anyone else from claiming it.

### 2a. Verify the domain with GitHub (recommended)
This stops any other GitHub user from using thehiveatlas.com.

1. On GitHub, click your profile picture, then **Settings**, then **Pages** in the left sidebar (under "Code, planning, and automation"). This is your account (or organization) settings, not the repository's.
   - If the repository belongs to an organization, go to the organization's **Settings**, then **Pages**, instead.
2. Click **Add a domain**, enter `thehiveatlas.com`, and click **Add domain**.
3. GitHub shows a **TXT** record: a host name (something like `_github-pages-challenge-username`) and a value (a long code). Leave this page open.
4. In another tab, open **account.squarespace.com/domains**, click **thehiveatlas.com**, then **DNS** in the side panel.
5. Under **Custom records**, click **Add record** and fill in:
   - **Type:** TXT
   - **Host / Name:** the host name GitHub showed, without `.thehiveatlas.com` at the end (Squarespace adds that)
   - **Data / Value:** the code GitHub showed
   - **TTL:** leave the default
6. Save the record (Squarespace may ask for your password). Go back to GitHub and click **Verify**. If it fails, wait 10 to 30 minutes and try again.

### 2b. Tell GitHub the address
1. Go to the `the-hive-atlas` repository, then **Settings**, then **Pages**.
2. Under **Custom domain**, enter `thehiveatlas.com` and click **Save**.
3. GitHub adds a file named `CNAME` to the repository. **Leave it there**, and don't delete it when you upload new versions of the site.
4. The DNS check will fail until you finish 2c. That's expected.

### 2c. Point the domain at GitHub (in Squarespace)
1. In Squarespace, open **thehiveatlas.com**, then **DNS**.
2. **Remove what points the domain elsewhere.** A new Squarespace domain usually comes with preset records for a Squarespace website or a parking page, often shown as a **Squarespace Defaults** group or as A records starting with `198.` and a `www` CNAME pointing to `ext-sq.squarespace.com`.
   - Delete those web records (trash can icon, then **Confirm**).
   - Leave any **MX**, **TXT**, or email-related records alone, and keep the GitHub TXT record from 2a.
   - If **Domain forwarding** is turned on for the domain, turn it off.
3. Under **Custom records**, click **Add record** for each row below:

   | Type | Host / Name | Data / Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153 |
   | AAAA | @ | 2606:50c0:8001::153 |
   | AAAA | @ | 2606:50c0:8002::153 |
   | AAAA | @ | 2606:50c0:8003::153 |
   | CNAME | www | username.github.io |

   - Replace `username` with your GitHub username (or organization name). Don't include `https://` or `/the-hive-atlas`.
   - The AAAA rows add support for IPv6 internet connections. They're recommended but optional.
   - Don't add a wildcard record (`*`). It would let others attach sites to your subdomains.
4. Save.

### 2d. Wait, then turn on HTTPS
1. DNS changes usually take effect within an hour but can take up to 48 hours. You can watch progress by searching `thehiveatlas.com` on whatsmydns.net (A records should show the `185.199.` addresses).
2. Back in the repository's **Settings**, **Pages**, the custom domain check should turn to "DNS check successful."
3. When the **Enforce HTTPS** box becomes clickable (it can take up to 24 hours while GitHub gets the security certificate), tick it.
4. Visit `https://thehiveatlas.com` and `https://www.thehiveatlas.com`. Both should load the site, and the old `username.github.io/the-hive-atlas` address forwards to the new one automatically.

**If something goes wrong:**
- **The Squarespace page still appears:** a default record is left over. Recheck 2c, step 2, and give it an hour.
- **GitHub shows a 404 page:** confirm Pages is publishing from `main` and `/ (root)`, and that `index.html` sits at the top level of the repository.
- **"Domain's DNS record could not be retrieved":** DNS is still updating. Wait and click **Check again**.

---

## Part 3. Set up hello@thehiveatlas.com (optional)

The site lists **hello@thehiveatlas.com** as its contact address, but mail sent there goes nowhere until the domain has email. Options:

- **Email forwarding:** forwards hello@ to an existing inbox, free or low cost through Squarespace (if offered for your domain) or a service like ImprovMX. Fine for a contact address.
- **Google Workspace** (sold through Squarespace) or **Microsoft 365:** a real mailbox, paid monthly per user.

Whichever you choose, it adds **MX** (and usually **TXT**) records in the same Squarespace DNS page. These don't affect the website records from Part 2. If you'd rather use a different contact address, tell Claude and it will update the site.

---

## Before you share the site widely

- **Colony Monitoring runs on simulated data.** The page says so in a banner, but replace `data/monitoring-demo.js` with real monitoring data (or hide the page) before announcing the site.
- **Founder bios** on the About page are drafts. Have Mohamed review his.
- **Disease Surveillance and Genetic Diversity** are "coming soon" pages.
- **Questions for NASS** (noted on the Colony Losses About tab): the 2023 Wyoming percentages, why 24 states moved to Other States, and the 2024 change in how national stressor rates are calculated.
- If either founder is a federal employee, check with an agency ethics official that running the site and naming affiliations is fine.

---

## Updating the site
1. In the repository, open the folder holding the file (for example `data`).
2. Click **Add file**, **Upload files**, drag in the new version with the same name, and click **Commit changes**. GitHub replaces the old file.
3. The live site updates within a minute or two. Every past version stays in the repository's history, so any change can be undone.
4. Never delete the `CNAME` file.

## Refreshing the NASS data (each August)
1. Download the new release ZIP from https://esmis.nal.usda.gov/publication/honey-bee-colonies (open the newest release; the ZIP is listed with the PDF).
2. Send it to Claude, or run:
   ```
   python3 pipeline/import_nass_release.py UNZIPPED_FOLDER data/nass-colony-losses.csv 2027-08-02 hcny0727
   python3 pipeline/build_losses.py data/nass-colony-losses.csv data/colony-losses.js
   ```
   using the new release date and file name. Quarters in the new release replace the same quarters in the file, since NASS revises the previous year. The build prints a warning if any published percent disagrees with NASS's own counts.
3. For sample sizes, also download that year's quality report from https://www.nass.usda.gov/Publications/Methodology_and_Data_Quality/Honey_Bee_Colonies/index.php and run `pipeline/build_quality.py` (instructions inside), or send it to Claude.
4. Upload the changed files (`data/colony-losses.js`, `data/nass-colony-losses.csv`, and `data/colony-quality.js`) as described above. The page updates itself, including the summary paragraph.

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Home page |
| `losses.html` | Colony Losses (NASS data) |
| `monitoring.html` | Colony Monitoring (simulated demo data for now) |
| `disease.html`, `genetics.html` | Coming-soon pages |
| `methods.html`, `contribute.html`, `publications.html`, `about.html` | Information pages |
| `css/style.css` | Colors, fonts, and layout shared by every page |
| `js/site.js` | Mobile menu, copy buttons, and map illustrations |
| `js/losses.js` | Colony Losses map, panel, and table |
| `js/monitoring.js` | Colony Monitoring map, charts, file import, and report |
| `data/colony-losses.js` | NASS colony loss data, formatted for the map |
| `data/nass-colony-losses.csv` | Combined NASS data, as published |
| `data/colony-quality.js`, `data/nass-quality.csv` | NASS sample sizes and response rates |
| `data/state-shapes.js` | State outlines (U.S. Census Bureau, via us-atlas) |
| `data/monitoring-demo.js` | **Simulated** monitoring records (replace before launch) |
| `data/colony-inspection-template.xlsx`, `.csv` | Templates for colony inspection records |
| `data/monitoring-example.csv` | Made-up example upload |
| `pipeline/` | Scripts that rebuild the data files |

## Costs
- Domain: already registered at Squarespace (renews yearly)
- GitHub Pages: free
- Email: free to a few dollars a month for forwarding; Google Workspace or Microsoft 365 if you want full mailboxes
