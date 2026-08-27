---
title: "Tax Revenue Composition"
header: false
sidebar: false
footer: false
toc: false
---

```js
import * as d3 from "npm:d3@7.9.0";
import {downloadButton} from "./components/download-button.js";
import {compositionStreamgraph} from "./components/tax-composition-streamgraph.js";
import {pboSectionNav} from "./components/pbo-section-nav.js";
import {taxHero} from "./components/tax-page.js";
import {tabularRows} from "./components/tabular-data.js";

const rows = tabularRows(await FileAttachment("data/derived/net-receipts-taxhead.json").json());
const heroImage = await FileAttachment("media/tax-revenue-hero.jpg").url();
const latestYear = d3.max(rows, (d) => d.Year);
const latestDetail = rows.filter((d) => d.Year === latestYear && d.Taxhead !== "Total Net Receipts");
const latestTotal = d3.sum(latestDetail, (d) => d.Amount);
const incomeTaxes = d3.sum(latestDetail.filter((d) => d.Taxhead === "Income Taxes"), (d) => d.Amount);
const corporationTax = d3.sum(latestDetail.filter((d) => d.Taxhead === "Corporation Tax"), (d) => d.Amount);
const incomeAndCorporation = incomeTaxes + corporationTax;
const taxheadShare = (year, taxhead) => {
  const detail = rows.filter((d) => d.Year === year && d.Taxhead !== "Total Net Receipts" && Number.isFinite(d.Amount));
  const total = d3.sum(detail, (d) => d.Amount);
  const amount = detail.find((d) => d.Taxhead === taxhead)?.Amount ?? 0;
  return total ? amount / total : 0;
};
const fiveYearComparisonYear = latestYear - 5;
const latestIncomeTaxShare = taxheadShare(latestYear, "Income Taxes");
const fiveYearIncomeTaxShare = taxheadShare(fiveYearComparisonYear, "Income Taxes");
const latestCorporationTaxShare = taxheadShare(latestYear, "Corporation Tax");
const fiveYearCorporationTaxShare = taxheadShare(fiveYearComparisonYear, "Corporation Tax");
const euroBillions = (value) => `€${d3.format(".1f")(value / 1000)} billion`;
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

<div class="tax-insight-callout tax-insight-callout--compact tax-insight-callout--split">
  <p class="tax-insight-callout__label">At a glance</p>
  <h2>Income taxes and corporation tax provided ${d3.format(".0%")(incomeAndCorporation / latestTotal)} of detailed net receipts in ${latestYear}.</h2>
  <p><strong>Income taxes contributed ${euroBillions(incomeTaxes)}</strong> and <strong>corporation tax contributed ${euroBillions(corporationTax)}</strong>. Together, they accounted for ${euroBillions(incomeAndCorporation)} of ${euroBillions(latestTotal)} in detailed net receipts.</p>
</div>

<section class="insights-summary composition-comparison-metrics" aria-label="Five-year changes in income-tax and corporation-tax shares of detailed net receipts">
  <div class="metrics-grid" data-count="2">
    <article class="metric-card">
      <p class="metric-card__label">Income taxes · Past 5 years</p>
      <p class="metric-card__value">${d3.format(".0%")(fiveYearIncomeTaxShare)} → ${d3.format(".0%")(latestIncomeTaxShare)}</p>
      <p class="metric-card__note">${d3.format("+.1f")((latestIncomeTaxShare - fiveYearIncomeTaxShare) * 100)} percentage points since ${fiveYearComparisonYear}</p>
    </article>
    <article class="metric-card">
      <p class="metric-card__label">Corporation tax · Past 5 years</p>
      <p class="metric-card__value">${d3.format(".0%")(fiveYearCorporationTaxShare)} → ${d3.format(".0%")(latestCorporationTaxShare)}</p>
      <p class="metric-card__note">${d3.format("+.1f")((latestCorporationTaxShare - fiveYearCorporationTaxShare) * 100)} percentage points since ${fiveYearComparisonYear}</p>
    </article>
  </div>
</section>

```js
const compositionMode = view(Inputs.radio(new Map([["Value (€)", "value"], ["Share (%)", "share"]]), {value: "value"}));
```

<div class="chart-block chart-block--wide">

```js
display(compositionStreamgraph(rows, {mode: compositionMode}));
```

</div>

<div class="prose-block">
    <p><strong>Income taxes</strong> is a collective term for PAYE income tax and USC, self-assessed income tax and USC, Deposit Interest Retention Tax, Life Assurance Exit Tax, Professional Services Withholding Tax, Dividend Withholding Tax, Non-Resident Landlord Withholding Tax and other income taxes.</p>
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
