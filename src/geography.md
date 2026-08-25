---
title: "Tax Revenue Location"
header: false
sidebar: false
footer: false
toc: false
---

```js
import * as d3 from "npm:d3@7.9.0";
import {downloadButton} from "./components/download-button.js";
import {chartPalettes} from "./config/chart-palette.js";
import {waterfallSegmentsChart} from "./components/waterfall-segments-chart.js";
import {pboSectionNav} from "./components/pbo-section-nav.js";
import {taxHero} from "./components/tax-page.js";
import {tabularRows} from "./components/tabular-data.js";

const rows = tabularRows(await FileAttachment("data/derived/net-receipts-county.json").json());
const heroImage = await FileAttachment("media/tax-revenue-hero.jpg").url();
const years = Array.from(new Set(rows.map((d) => d.Year))).sort(d3.descending);
const taxTypes = ["Total", "Income Taxes", "Corporation Tax", "VAT", "Capital Gains Tax"];
const pboColors = chartPalettes.pbo;

function euroGeographyValue(value) {
  return Math.abs(value) >= 1000
    ? `€${d3.format(".1f")(value / 1000)}bn`
    : `€${d3.format(",.0f")(value)}m`;
}

function euroGeographyTick(value, useBillions = false) {
  return useBillions
    ? `€${d3.format("~g")(value / 1000)}bn`
    : `€${d3.format("~g")(value)}m`;
}

function signedPercentagePoints(value) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${d3.format(".1f")(Math.abs(value) * 100)} percentage points`;
}

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
    (d) => `${d.County} (${euroGeographyValue(d.Amount)})`
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
    <p>Total county receipts are concentrated in a small number of counties, with Dublin and Cork accounting for a particularly large share.</p>
</div>

```js
const selectedRows = rows.filter((d) => d.Year === countyYear && d.Tax_type === countyTaxType);
const selectedTotal = d3.sum(selectedRows, (d) => d.Amount) || 1;
const largestCounty = d3.greatest(selectedRows.filter((d) => d.County !== "Other / Foreign"), (d) => d.Amount);
const countyTaxPhrase = countyTaxType === "VAT" ? "VAT" : countyTaxType.toLowerCase();
const countyBreakdown = countyWaterfall(selectedRows);

function countyShare(year, county) {
  const comparisonRows = rows.filter((d) => d.Year === year && d.Tax_type === countyTaxType);
  if (!comparisonRows.length) return null;
  const total = d3.sum(comparisonRows, (d) => d.Amount);
  const countyAmount = comparisonRows.find((d) => d.County === county)?.Amount;
  return Number.isFinite(countyAmount) && total ? countyAmount / total : null;
}

function countyLookback(yearsBack) {
  const comparisonYear = countyYear - yearsBack;
  const pastShare = countyShare(comparisonYear, largestCounty?.County);
  const currentShare = largestCounty?.Amount / selectedTotal;
  return {
    comparisonYear,
    pastShare,
    currentShare,
    change: Number.isFinite(pastShare) ? currentShare - pastShare : null,
  };
}

const fiveYearComparison = countyLookback(5);
const tenYearComparison = countyLookback(10);
```

<div class="tax-insight-callout tax-insight-callout--compact">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>${largestCounty?.County} recorded the largest location total for ${countyTaxPhrase} receipts in ${countyYear}.</h2>
  <p class="tax-insight-comparisons__context">${largestCounty?.County}'s share of the complete geographic dataset for ${countyTaxPhrase} receipts</p>
  <dl class="tax-insight-comparisons tax-insight-comparisons--two">
    <div class="tax-insight-comparisons__item">
      <dt>Previous 5 years</dt>
      <dd class="tax-insight-comparisons__value">${fiveYearComparison.pastShare == null ? "Not available" : `${d3.format(".0%")(fiveYearComparison.pastShare)} → ${d3.format(".0%")(fiveYearComparison.currentShare)}`}</dd>
      <dd class="tax-insight-comparisons__detail">${fiveYearComparison.change == null ? `County data is not available for ${fiveYearComparison.comparisonYear}` : `${signedPercentagePoints(fiveYearComparison.change)} since ${fiveYearComparison.comparisonYear}`}</dd>
    </div>
    <div class="tax-insight-comparisons__item">
      <dt>Previous 10 years</dt>
      <dd class="tax-insight-comparisons__value">${tenYearComparison.pastShare == null ? "Not available" : `${d3.format(".0%")(tenYearComparison.pastShare)} → ${d3.format(".0%")(tenYearComparison.currentShare)}`}</dd>
      <dd class="tax-insight-comparisons__detail">${tenYearComparison.change == null ? `County data is not available for ${tenYearComparison.comparisonYear}` : `${signedPercentagePoints(tenYearComparison.change)} since ${tenYearComparison.comparisonYear}`}</dd>
    </div>
  </dl>
</div>

```js
const countyYear = view(Inputs.select(years, {label: "Year", value: d3.max(years), format: String}));
const countyTaxType = view(Inputs.select(taxTypes, {label: "Tax type", value: "Total"}));
```

<div class="chart-block chart-block--wide">

```js
display(waterfallSegmentsChart(countyBreakdown.segments, {
  width: 1000,
  title: `Proportion of ${countyTaxPhrase} receipts recorded in ${countyYear}`,
  marginLeft: 160,
  minRowHeight: 38,
  minorShareThreshold: 0,
  xLabel: `Cumulative net receipts · ${selectedTotal >= 1000 ? "€ billion" : "€ million"}`,
  tickFormat: (value) => euroGeographyTick(value, selectedTotal >= 1000),
  valueFormat: euroGeographyValue,
  ariaLabel: `Cumulative county contribution to ${countyTaxPhrase} receipts in ${countyYear}`
}));

const countyNote = document.createElement("p");
countyNote.className = "waterfall-segments-chart__note";
countyNote.textContent = countyChartNote(countyBreakdown.remainingCounties);
display(countyNote);
```

</div>

<div class="prose-block">
    <h2>Significance of receipts by location</h2>
    <p>Tax receipts by location should be interpreted as a view of where receipts are recorded and not necessarily where all underlying economic activity or households are located. For example, PAYE receipts are generally associated with the employer location rather than the employee's residence.</p>
    <p>The heavy distribution to Dublin and Cork likely reflects the location of major employers, company headquarters and large-scale economic activity.</p>
</div>

<div class="prose-block demographics-source-note">
  <h2>About the research</h2>
  <p>This research forms part of the PBO's wider programme of independent, accessible analysis of Ireland's public finances. Find out more on the <a href="https://www.oireachtas.ie/pbo" target="_blank" rel="noreferrer">Parliamentary Budget Office</a> website.</p>
  <p>The chart shows each registration location's contribution and how the recorded total accumulates across locations. Smaller locations are combined into “Remaining counties” where necessary.</p>
  <p>The registered location attached to receipts does not necessarily show where the underlying economic activity occurred.</p>
</div>

<div class="tax-downloads" aria-label="Download source data">

```js
display(downloadButton(rows, "ireland-tax-receipts-by-county.csv", {label: "Download the data"}));
```

</div>
