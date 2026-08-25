---
title: "Tax Revenue Sector"
header: false
sidebar: false
footer: false
toc: false
---

```js
import * as d3 from "npm:d3@7.9.0";
import {downloadButton} from "./components/download-button.js";
import {sectorTaxCompositionBars} from "./components/sector-tax-composition-bars.js";
import {sectorStackedArea} from "./components/tax-sector-stacked.js";
import {pboSectionNav} from "./components/pbo-section-nav.js";
import {taxHero} from "./components/tax-page.js";
import {tabularRows} from "./components/tabular-data.js";

const rows = tabularRows(await FileAttachment("data/derived/net-receipts-sector.json").json());
const heroImage = await FileAttachment("media/tax-revenue-hero.jpg").url();
const years = Array.from(new Set(rows.map((d) => d.Year))).sort(d3.descending);
const latestYear = d3.max(years);
const taxTypes = ["Total", "Income Taxes", "Corporation Tax", "VAT", "Capital Gains Tax"];
const sectorNames = Array.from(new Set(rows.map((d) => d.Sector))).sort(d3.ascending);

function signedPercentagePoints(value) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${d3.format(".1f")(Math.abs(value) * 100)} percentage points`;
}
```

```js
display(taxHero({
  image: heroImage,
  title: "Ireland's tax revenue",
  subtitle: "The economic sectors associated with different types of tax."
}));
display(pboSectionNav("sectors"));
```

<div class="prose-block lead">
    <p>Sectoral receipts give an overall picture of how different parts of the economy contribute to the tax receipts base.</p>
    <p>Explore the sectoral breakdowns to see how each element contributes to the overall tax receipts base.</p>
</div>

```js
const selectedRows = rows.filter((d) => d.Year === latestYear && d.Tax_type === sectorTaxType);
const selectedTotal = d3.sum(selectedRows, (d) => d.Amount) || 1;
const largestSector = d3.greatest(selectedRows, (d) => d.Amount);
const sectorTaxPhrase = sectorTaxType === "VAT" ? "VAT" : sectorTaxType.toLowerCase();
const largestSectorLabel = largestSector?.Sector.split(";")[0].replace("&", "and");

function sectorShare(year, sector) {
  const comparisonRows = rows.filter((d) => d.Year === year && d.Tax_type === sectorTaxType);
  if (!comparisonRows.length) return null;
  const total = d3.sum(comparisonRows, (d) => d.Amount);
  const sectorAmount = comparisonRows.find((d) => d.Sector === sector)?.Amount;
  return Number.isFinite(sectorAmount) && total ? sectorAmount / total : null;
}

function sectorLookback(yearsBack) {
  const comparisonYear = latestYear - yearsBack;
  const pastShare = sectorShare(comparisonYear, largestSector?.Sector);
  const currentShare = largestSector?.Amount / selectedTotal;
  return {
    comparisonYear,
    pastShare,
    currentShare,
    change: Number.isFinite(pastShare) ? currentShare - pastShare : null,
  };
}

const fiveYearComparison = sectorLookback(5);
const tenYearComparison = sectorLookback(10);
```

<div class="tax-insight-callout tax-insight-callout--compact">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>${largestSectorLabel} recorded the largest sector total for ${sectorTaxPhrase} receipts in ${latestYear}.</h2>
  <p class="tax-insight-comparisons__context">${largestSectorLabel}'s share of net ${sectorTaxPhrase} receipts recorded across sectors</p>
  <dl class="tax-insight-comparisons tax-insight-comparisons--two">
    <div class="tax-insight-comparisons__item">
      <dt>Past 5 years</dt>
      <dd class="tax-insight-comparisons__value">${fiveYearComparison.pastShare == null ? "Not available" : `${d3.format(".0%")(fiveYearComparison.pastShare)} → ${d3.format(".0%")(fiveYearComparison.currentShare)}`}</dd>
      <dd class="tax-insight-comparisons__detail">${fiveYearComparison.change == null ? `Sector data is not available for ${fiveYearComparison.comparisonYear}` : `${signedPercentagePoints(fiveYearComparison.change)} since ${fiveYearComparison.comparisonYear}`}</dd>
    </div>
    <div class="tax-insight-comparisons__item">
      <dt>Past 10 years</dt>
      <dd class="tax-insight-comparisons__value">${tenYearComparison.pastShare == null ? "Not available" : `${d3.format(".0%")(tenYearComparison.pastShare)} → ${d3.format(".0%")(tenYearComparison.currentShare)}`}</dd>
      <dd class="tax-insight-comparisons__detail">${tenYearComparison.change == null ? `Sector data is not available for ${tenYearComparison.comparisonYear}` : `${signedPercentagePoints(tenYearComparison.change)} since ${tenYearComparison.comparisonYear}`}</dd>
    </div>
  </dl>
</div>

<div class="tax-sector-controls">

```js
const sectorTaxType = view(Inputs.select(taxTypes, {label: "Tax type", value: "Total"}));
const sectorMode = view(Inputs.radio(new Map([["Value (€)", "value"], ["Share (%)", "share"]]), {label: "Measure", value: "share"}));
```

</div>

<div class="chart-block chart-block--wide">

```js
display(sectorStackedArea(rows, {taxType: sectorTaxType, mode: sectorMode}));
```

</div>

<div class="prose-block">
    <p>Receipts from the Accommodation and food services sector are closely linked to activity in hotels, restaurants, cafes and related services. This makes the sector sensitive to changes in domestic demand, tourism and wider consumer spending.</p>
    <p>The sharp decline around the COVID-19 period illustrates how sectoral receipts can be affected by temporary restrictions and changes in behaviour. The subsequent recovery shows the importance of reopening, renewed demand and price developments for receipts from this sector.</p>
    <p>It is worth noting that rate of VAT for much of the accommodation and food services sector has not been constant over this period, with the rate fluctuating between 9% and 13.5%. VAT changes in hospitality and tourism were seen in 2011, 2019, 2020 and 2023.</p>
</div>

<div class="prose-block tax-more-analysis">
  <h2>Tax revenue by sector</h2>
  <p>Select a sector to see how its net tax receipts were divided between VAT, income taxes, corporation tax and capital gains tax over time.</p>
</div>

<div class="tax-sector-controls">

```js
const compositionSector = view(Inputs.select(sectorNames, {label: "Sector", value: "Accommodation & food services"}));
const compositionMode = view(Inputs.radio(new Map([["Value (€)", "value"], ["Share (%)", "share"]]), {label: "Measure", value: "value"}));
```

</div>

```js
const compositionLatestRows = rows.filter((d) => d.Year === latestYear && d.Sector === compositionSector);
const compositionLatestTotal = compositionLatestRows.find((d) => d.Tax_type === "Total")?.Amount ?? 0;
const compositionLargestComponent = d3.greatest(
  compositionLatestRows.filter((d) => d.Tax_type !== "Total"),
  (d) => d.Amount
);
const formatSectorValue = (value) => Math.abs(value) >= 1000
  ? `${value < 0 ? "−" : ""}€${d3.format(".1f")(Math.abs(value) / 1000)}bn`
  : `${value < 0 ? "−" : ""}€${d3.format(",.0f")(Math.abs(value))}m`;
```

<div class="tax-insight-callout tax-insight-callout--compact">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>${compositionSector} recorded ${formatSectorValue(compositionLatestTotal)} in net receipts in ${latestYear}.</h2>
  <p>The largest component was <strong>${compositionLargestComponent?.Tax_type}</strong> at ${formatSectorValue(compositionLargestComponent?.Amount ?? 0)}.</p>
</div>

<div class="prose-block">
    <p>The distribution is shaped by several channels at once: employment and earnings affect income taxes, spending affects VAT, profits affect corporation tax and asset disposals affect capital gains tax. Sectors with large contributions across more than one of these channels tend to account for the largest shares.</p>
</div>

<div class="chart-block chart-block--wide">

```js
display(sectorTaxCompositionBars(rows, {sector: compositionSector, mode: compositionMode}));
```

</div>

<div class="prose-block">
    <p>Total refers to the combined receipts from income taxes, corporation tax, capital gains tax and VAT internal, as these are the only tax heads for which a sectoral breakdown is provided.</p>
    <p>Total sectoral receipts combine the tax heads for which a sectoral breakdown is available. This gives an overall picture of how different parts of the economy contribute to the receipts base.</p>
</div>

<div class="prose-block demographics-source-note">
  <h2>About the research</h2>
  <p>This research forms part of the PBO's wider programme of independent, accessible analysis of Ireland's public finances. Find out more on the <a href="https://www.oireachtas.ie/pbo" target="_blank" rel="noreferrer">Parliamentary Budget Office</a> website.</p>
  <p>The first chart shows net receipts associated with economic sectors. In the value view, the thickness of each band represents receipts in € billion; in the share view, it represents that sector's proportion of net receipts for the selected tax type in each year. Smaller sectors are grouped to keep the chart readable.</p>
  <p>The second chart breaks a selected sector's net total into VAT, income taxes, corporation tax and capital gains tax. Negative components are shown below zero. The download retains the full detail used by both charts.</p>
  <p>Values are nominal and are not adjusted for inflation.</p>
</div>

<div class="tax-downloads" aria-label="Download source data">

```js
display(downloadButton(rows, "ireland-tax-receipts-by-sector.csv", {label: "Download the data"}));
```

</div>
