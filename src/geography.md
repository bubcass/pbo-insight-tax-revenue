---
title: "Tax Revenue Geography"
header: false
sidebar: false
footer: false
toc: false
---

```js
import * as d3 from "npm:d3";
import {downloadButton} from "./components/download-button.js";
import {chartPalettes} from "./config/chart-palette.js";
import {waterfallSegmentsChart} from "./components/waterfall-segments-chart.js";
import {pboSectionNav} from "./components/pbo-section-nav.js";
import {taxHero} from "./components/tax-page.js";

const rows = await FileAttachment("data/net-receipts-county.csv").csv({typed: true});
const heroImage = await FileAttachment("media/tax-revenue-hero.jpg").url();
const years = Array.from(new Set(rows.map((d) => d.Year))).sort(d3.descending);
const taxTypes = ["Total", "Income Taxes", "Corporation Tax", "VAT", "Capital Gains Tax"];
const pboColors = chartPalettes.pbo;

function countyWaterfall(values) {
  const sorted = values.filter((d) => Number.isFinite(d.Amount) && d.Amount > 0).sort((a, b) => d3.descending(a.Amount, b.Amount));
  const total = d3.sum(sorted, (d) => d.Amount) || 1;
  const highlighted = sorted.filter((d) => d.Amount / total >= 0.01 || d.County === "Other / Foreign");
  const names = new Set(highlighted.map((d) => d.County));
  const remainingCounties = sorted.filter((d) => !names.has(d.County));
  const remaining = d3.sum(remainingCounties, (d) => d.Amount);
  const grouped = remaining > 0 ? [...highlighted, {County: "Remaining counties", Amount: remaining}] : highlighted;
  let cumulative = 0;
  const segments = grouped.map((d, index) => {
    const x1 = cumulative;
    cumulative += d.Amount;
    return {
      Segment: d.County,
      value: d.Amount,
      share: d.Amount / total,
      x1,
      x2: cumulative,
      color: index === 0 ? pboColors[0] : index === 1 ? pboColors[1] : index === grouped.length - 1 ? pboColors[3] : pboColors[7]
    };
  });

  return {segments, remainingCounties};
}

function countyChartNote(remainingCounties) {
  const introduction = "Counties are ordered by recorded receipts; smaller locations are grouped.";
  if (!remainingCounties.length) return introduction;

  const entries = remainingCounties.map(
    (d) => `${d.County} (€${d3.format(",.0f")(d.Amount)}m)`
  );
  const list = entries.length === 1
    ? entries[0]
    : entries.length === 2
      ? `${entries[0]} and ${entries[1]}`
      : `${entries.slice(0, -1).join(", ")}, and ${entries.at(-1)}`;

  return `${introduction} The “Remaining counties” group comprises ${list}.`;
}
```

```js
display(taxHero({
  image: heroImage,
  title: "Ireland's tax revenue",
  subtitle: "The registration locations attached to different tax receipts."
}));
display(pboSectionNav("geography"));
```

<div class="prose-block lead">
  <p>The PBO is an independent and specialist unit within the Houses of the Oireachtas Service that is a key source of economic and budgetary intelligence.</p>
</div>

```js
const countyYear = view(Inputs.select(years, {label: "Year", value: d3.max(years), format: String}));
const countyTaxType = view(Inputs.select(taxTypes, {label: "Tax type", value: "Total"}));
```

```js
const selectedRows = rows.filter((d) => d.Year === countyYear && d.Tax_type === countyTaxType);
const selectedTotal = d3.sum(selectedRows, (d) => d.Amount) || 1;
const largestCounty = d3.greatest(selectedRows.filter((d) => d.County !== "Other / Foreign"), (d) => d.Amount);
const countyTaxPhrase = countyTaxType === "VAT" ? "VAT" : countyTaxType.toLowerCase();
const countyBreakdown = countyWaterfall(selectedRows);
```

<div class="tax-insight-callout tax-insight-callout--compact">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>${largestCounty?.County} recorded the largest county total for ${countyTaxPhrase} receipts in ${countyYear}.</h2>
  <p>Its ${d3.format(".1%")(largestCounty?.Amount / selectedTotal)} share uses the complete geographic dataset, including receipts recorded as “Other / Foreign”. The registered location attached to receipts does not necessarily show where the underlying economic activity occurred.</p>
</div>

<div class="chart-block chart-block--wide">

```js
display(waterfallSegmentsChart(countyBreakdown.segments, {
  width: 1000,
  title: `Where ${countyTaxPhrase} receipts were recorded in ${countyYear}`,
  marginLeft: 160,
  minRowHeight: 38,
  minorShareThreshold: 0,
  xLabel: "Cumulative net receipts (€ million)",
  tickFormat: (value) => `€${d3.format(",.0f")(value)}m`,
  valueFormat: (value) => `€${d3.format(",.0f")(value)}m`,
  ariaLabel: `Cumulative county contribution to ${countyTaxPhrase} receipts in ${countyYear}`
}));

const countyNote = document.createElement("p");
countyNote.className = "waterfall-segments-chart__note";
countyNote.textContent = countyChartNote(countyBreakdown.remainingCounties);
display(countyNote);
```

</div>

<div class="prose-block tax-page-interpretation">
  <h2>Why a waterfall?</h2>
  <p>The chart shows both each location's contribution and how quickly the recorded total accumulates, without implying the geographic precision of a choropleth.</p>
</div>

<div class="tax-downloads" aria-label="Download source data">

```js
display(downloadButton(rows, "ireland-tax-receipts-by-county.csv", {label: "Download county data"}));
```

</div>
