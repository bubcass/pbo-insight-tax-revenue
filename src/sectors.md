---
title: "Tax Revenue by Sector"
header: false
sidebar: false
footer: false
toc: false
---

```js
import * as d3 from "npm:d3";
import {downloadButton} from "./components/download-button.js";
import {sectorStackedArea} from "./components/tax-sector-stacked.js";
import {pboSectionNav} from "./components/pbo-section-nav.js";
import {taxHero} from "./components/tax-page.js";

const rows = await FileAttachment("data/net-receipts-sector.csv").csv({typed: true});
const heroImage = await FileAttachment("media/tax-revenue-hero.jpg").url();
const years = Array.from(new Set(rows.map((d) => d.Year))).sort(d3.descending);
const latestYear = d3.max(years);
const taxTypes = ["Total", "Income Taxes", "Corporation Tax", "VAT", "Capital Gains Tax"];
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
  <p>Income taxes and corporation taxes have become significant sources of Exchequer revenue, reflecting the growing importance of employment, earnings and company profits to overall tax receipts.</p>
</div>

```js
const sectorTaxType = view(Inputs.select(taxTypes, {label: "Tax type", value: "Total"}));
const sectorMode = view(Inputs.radio(new Map([["Value (€)", "value"], ["Share (%)", "share"]]), {label: "Measure", value: "share"}));
```

```js
const selectedRows = rows.filter((d) => d.Year === latestYear && d.Tax_type === sectorTaxType);
const selectedTotal = d3.sum(selectedRows, (d) => d.Amount) || 1;
const largestSector = d3.greatest(selectedRows, (d) => d.Amount);
const sectorTaxPhrase = sectorTaxType === "VAT" ? "VAT" : sectorTaxType.toLowerCase();
const largestSectorLabel = largestSector?.Sector.split(";")[0].replace("&", "and");
```

<div class="tax-insight-callout tax-insight-callout--compact">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>${largestSectorLabel} recorded the largest sector total for ${sectorTaxPhrase} receipts in ${latestYear}.</h2>
  <p>It accounted for ${d3.format(".1%")(largestSector?.Amount / selectedTotal)} of the net amount recorded across sectors in this view.</p>
</div>

<div class="chart-block chart-block--wide">

```js
display(sectorStackedArea(rows, {taxType: sectorTaxType, mode: sectorMode}));
```

</div>

<div class="prose-block tax-page-interpretation">
  <h2>How to read this</h2>
  <p>Hover or focus a band to isolate one sector. The stacked view groups smaller sectors so the changing composition remains readable; the download retains the full detail.</p>
</div>

<div class="tax-downloads" aria-label="Download source data">

```js
display(downloadButton(rows, "ireland-tax-receipts-by-sector.csv", {label: "Download sector data"}));
```

</div>
