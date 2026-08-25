# PBO Tax Revenue Insights

An Observable Framework resource exploring Ireland's net Exchequer tax receipts by tax head, registration location and economic sector.

Published at [bubcass.github.io/pbo-insight-tax-revenue](https://bubcass.github.io/pbo-insight-tax-revenue/).

## What is here

- `src/data/`: canonical source snapshots and committed browser-ready derivatives
- `src/data/transformers/build-tax-derived.mjs`: offline validation and derivation
- `src/index.md`: tax-revenue overview
- `src/styles/`: shared Open Data Insights style base plus tax-specific styles

## Local development

```bash
npm install
npm run check:data
npm run dev
```

## Data flow

CSV files in `src/data` are the canonical, R-friendly source snapshots. They
are not parsed by the browser. The offline transformer validates their schema
and values and writes compact, typed tabular JSON to `src/data/derived` for the
Observable pages.

After deliberately replacing a canonical CSV, run:

```bash
npm run build:data
npm run check:data
npm run build
```

The derived JSON and its source hashes are versioned. A routine site build uses
those reviewed outputs and does not regenerate data. `npm run verify` fails if
the canonical CSVs and committed derived outputs are out of sync.

CSV remains available as the interchange and download format. The compact JSON
uses one column list plus value arrays to avoid repeating field names; the
browser hydrates those arrays without CSV parsing or dynamic code generation.
