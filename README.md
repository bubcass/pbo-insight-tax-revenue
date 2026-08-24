# PBO Tax Revenue Insights

An Observable Framework resource exploring Ireland's net Exchequer tax receipts by tax head, geography and economic sector.

Published at [bubcass.github.io/pbo-insight-tax-revenue](https://bubcass.github.io/pbo-insight-tax-revenue/).

## What is here

- `src/data/`: copied source files from the Shiny dashboard
- `src/data/transformers/build-tax-derived.mjs`: build-time derivations for shares and metadata
- `src/index.md`: initial narrative and data inventory page
- `src/styles/`: shared Open Data Insights style base plus tax-specific styles

## Local development

```bash
npm install
npm run build:data
npm run dev
```
