---
title: "Tax Revenue Overview"
header: false
sidebar: false
footer: false
toc: false
---

```js
import * as d3 from "npm:d3";
import {downloadButton} from "./components/download-button.js";
import {pboSectionNav} from "./components/pbo-section-nav.js";
import {sectorStackedArea} from "./components/tax-sector-stacked.js";
import {taxHero} from "./components/tax-page.js";

const rows = await FileAttachment("data/net-receipts-taxhead.csv").csv({typed: true});
const sectorRows = await FileAttachment("data/net-receipts-sector.csv").csv({typed: true});
const heroImage = await FileAttachment("media/tax-revenue-hero.jpg").url();
const years = Array.from(new Set(rows.map((d) => d.Year))).sort(d3.ascending);
const latestYear = d3.max(years);
const latestTotal = rows.find((d) => d.Year === latestYear && d.Taxhead === "Total Net Receipts")?.Amount ?? 0;
const totalForYear = (year) => rows.find((d) => d.Year === year && d.Taxhead === "Total Net Receipts")?.Amount ?? 0;
const changeSince = (yearsAgo) => {
  const comparisonTotal = totalForYear(latestYear - yearsAgo);
  return comparisonTotal ? (latestTotal - comparisonTotal) / comparisonTotal : 0;
};
const euroBillions = (value) => `€${d3.format(".1f")(value / 1000)} billion`;
const overviewDownloadRows = [
  ...rows.map((d) => ({
    Dataset: "Tax head",
    Year: d.Year,
    Category: d.Taxhead,
    "Tax type": "",
    "Amount (€ million)": d.Amount
  })),
  ...sectorRows.map((d) => ({
    Dataset: "Economic sector",
    Year: d.Year,
    Category: d.Sector,
    "Tax type": d.Tax_type,
    "Amount (€ million)": d.Amount
  }))
];
```

```js
display(taxHero({
  image: heroImage,
  title: "Ireland's tax revenue",
  subtitle: "The trends shaping Ireland’s tax base and the contribution of key sectors."
}));
display(pboSectionNav("overview"));
```

<div class="prose-block lead">
    <p>As of 2025, income taxes and corporation taxes have become significant sources of Exchequer revenue, reflecting the growing importance of employment, earnings and company profits to overall tax receipts.</p>
    <p>This shift has supported growth in total net receipts, but it also has implications for the stability and risk profile of the tax base.</p>
</div>

<div class="tax-insight-callout tax-insight-callout--compact">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>Ireland collected ${euroBillions(latestTotal)} in net Exchequer tax receipts in ${latestYear}.</h2>
  <dl class="tax-insight-comparisons">
    <div class="tax-insight-comparisons__item">
      <dt>Past year</dt>
      <dd class="tax-insight-comparisons__value">${d3.format("+.1%")(changeSince(1))}</dd>
      <dd class="tax-insight-comparisons__detail">compared with ${latestYear - 1}</dd>
    </div>
    <div class="tax-insight-comparisons__item">
      <dt>Past 5 years</dt>
      <dd class="tax-insight-comparisons__value">${d3.format("+.1%")(changeSince(5))}</dd>
      <dd class="tax-insight-comparisons__detail">compared with ${latestYear - 5}</dd>
    </div>
    <div class="tax-insight-comparisons__item">
      <dt>Past 10 years</dt>
      <dd class="tax-insight-comparisons__value">${d3.format("+.1%")(changeSince(10))}</dd>
      <dd class="tax-insight-comparisons__detail">compared with ${latestYear - 10}</dd>
    </div>
  </dl>
</div>

<div class="chart-block chart-block--wide">

```js
display(sectorStackedArea(sectorRows, {
  taxType: "Total",
  mode: "value",
  totalRows: rows,
  limit: 7,
  title: "Tax receipt trends by economic sector"
}));
```

</div>

<div class="prose-block demographics-source-note">
  <h2>About the research</h2>
  <p>This research forms part of the PBO's wider programme of independent, accessible analysis of Ireland's public finances. Find out more on the <a href="https://www.oireachtas.ie/pbo" target="_blank" rel="noreferrer">Parliamentary Budget Office</a> website.</p>
  <p>The chart bands show the largest economic sectors in the sector-attributable data; receipts that cannot be assigned to a sector are shown separately so that every year reconciles to the headline total.</p>
  <p>Values are nominal and are not adjusted for inflation.</p>
</div>

<div class="tax-downloads" aria-label="Download source data">

```js
display(downloadButton(overviewDownloadRows, "ireland-tax-receipts-overview.csv", {label: "Download the data"}));
```

</div>
