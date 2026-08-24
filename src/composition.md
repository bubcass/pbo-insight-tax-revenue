---
title: "Tax Revenue Composition"
header: false
sidebar: false
footer: false
toc: false
---

```js
import * as d3 from "npm:d3";
import {downloadButton} from "./components/download-button.js";
import {compositionStreamgraph} from "./components/tax-composition-streamgraph.js";
import {pboSectionNav} from "./components/pbo-section-nav.js";
import {taxHero} from "./components/tax-page.js";

const rows = await FileAttachment("data/net-receipts-taxhead.csv").csv({typed: true});
const heroImage = await FileAttachment("media/tax-revenue-hero.jpg").url();
const latestYear = d3.max(rows, (d) => d.Year);
const latestDetail = rows.filter((d) => d.Year === latestYear && d.Taxhead !== "Total Net Receipts");
const latestTotal = d3.sum(latestDetail, (d) => d.Amount);
const incomeAndCorporation = d3.sum(latestDetail.filter((d) => ["Income Taxes", "Corporation Tax"].includes(d.Taxhead)), (d) => d.Amount);
const incomeAndCorporationShare = (year) => {
  const detail = rows.filter((d) => d.Year === year && d.Taxhead !== "Total Net Receipts" && Number.isFinite(d.Amount));
  const total = d3.sum(detail, (d) => d.Amount);
  const combined = d3.sum(detail.filter((d) => ["Income Taxes", "Corporation Tax"].includes(d.Taxhead)), (d) => d.Amount);
  return total ? combined / total : 0;
};
const latestCombinedShare = incomeAndCorporationShare(latestYear);
```

```js
display(taxHero({
  image: heroImage,
  title: "Ireland's tax revenue",
  subtitle: "The changing balance between income, company, consumption and other taxes."
}));
display(pboSectionNav("composition"));
```

<div class="prose-block lead">
  <p>The mix of tax type receipts may vary significantly but taken as a high-level indicator it can be a useful bellwether of tax base stability.</p>
</div>

<div class="tax-insight-callout tax-insight-callout--compact">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>Income taxes and corporation tax provided ${d3.format(".0%")(incomeAndCorporation / latestTotal)} of detailed net receipts in ${latestYear}.</h2>
  <p class="tax-insight-comparisons__context">Income and corporation taxes tend to combine to form the largest share of detailed net receipts</p>
  <dl class="tax-insight-comparisons tax-insight-comparisons--two">
    <div class="tax-insight-comparisons__item">
      <dt>Past 5 years</dt>
      <dd class="tax-insight-comparisons__value">${d3.format(".0%")(incomeAndCorporationShare(latestYear - 5))} → ${d3.format(".0%")(latestCombinedShare)}</dd>
      <dd class="tax-insight-comparisons__detail">+${d3.format(".1f")((latestCombinedShare - incomeAndCorporationShare(latestYear - 5)) * 100)} percentage points since ${latestYear - 5}</dd>
    </div>
    <div class="tax-insight-comparisons__item">
      <dt>Past 10 years</dt>
      <dd class="tax-insight-comparisons__value">${d3.format(".0%")(incomeAndCorporationShare(latestYear - 10))} → ${d3.format(".0%")(latestCombinedShare)}</dd>
      <dd class="tax-insight-comparisons__detail">+${d3.format(".1f")((latestCombinedShare - incomeAndCorporationShare(latestYear - 10)) * 100)} percentage points since ${latestYear - 10}</dd>
    </div>
  </dl>
</div>

```js
const compositionMode = view(Inputs.radio(new Map([["Value (€)", "value"], ["Share (%)", "share"]]), {value: "value"}));
```

<div class="chart-block chart-block--wide">

```js
display(compositionStreamgraph(rows, {mode: compositionMode}));
```

</div>

<div class="prose-block">
  <p>Tax revenues vary due to changes in tax rates over time and may not reflect changes in underlying activity.</p>
  <p>Before the economic and financial crisis in 2008, <strong>consumption taxes</strong> and <strong>stamp duties</strong> accounted for a larger share of the tax base. Stamp Duty receipts are linked to transactions, including residential property transactions, and were therefore more exposed to changes in the volume and value of activity in the property market.</p>
</div>

<div class="prose-block demographics-source-note">
  <h2>About the research</h2>
  <p>This research forms part of the PBO's wider programme of independent, accessible analysis of Ireland's public finances. Find out more on the <a href="https://www.oireachtas.ie/pbo" target="_blank" rel="noreferrer">Parliamentary Budget Office</a> website.</p>
  <p>The chart uses net Exchequer tax receipts by tax head. In the value view, the thickness of each band represents receipts in € billion; in the share view, it represents that tax head's proportion of detailed net receipts in each year.</p>
  <p>Values are nominal and are not adjusted for inflation.</p>
</div>

<div class="tax-downloads" aria-label="Download source data">

```js
display(downloadButton(rows, "ireland-tax-receipts-by-taxhead.csv", {label: "Download the data"}));
```

</div>
