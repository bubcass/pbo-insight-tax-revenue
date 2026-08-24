import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..");
const derivedDir = path.join(dataDir, "derived");

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normaliseCountyName(value) {
  return String(value ?? "")
    .replace(/^County\s+/i, "")
    .replace(/^Co\.\s*/i, "")
    .replace(/CITY AND COUNTY OF /i, "")
    .replace(/COUNTY OF /i, "")
    .trim()
    .toUpperCase();
}

async function readCsv(name) {
  const text = await fs.readFile(path.join(dataDir, name), "utf8");
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");

  return lines.map((line) => {
    const cells = line.match(/(".*?"|[^",\s]+|[^,]+)(?=\s*,|\s*$)/g) ?? [];
    const row = Object.fromEntries(
      headers.map((header, index) => {
        const raw = (cells[index] ?? "").replace(/^"|"$/g, "").replace(/""/g, "\"");
        if (header === "Year" || header === "Amount") return [header, toNumber(raw)];
        return [header, raw];
      }),
    );
    return row;
  });
}

const taxheadRows = await readCsv("net-receipts-taxhead.csv");
const sectorRows = await readCsv("net-receipts-sector.csv");
const countyRows = await readCsv("net-receipts-county.csv");

const groupedByYear = new Map();
for (const row of taxheadRows) {
  if (row.Taxhead === "Total Net Receipts") continue;
  const group = groupedByYear.get(row.Year) ?? [];
  group.push(row);
  groupedByYear.set(row.Year, group);
}

const shares = [];
for (const [year, rows] of groupedByYear) {
  const total = rows.reduce((sum, row) => sum + (row.Amount ?? 0), 0);
  for (const row of rows) {
    shares.push({
      Year: year,
      Taxhead: row.Taxhead,
      Amount: row.Amount,
      Share: total ? Number(((row.Amount / total) * 100).toFixed(1)) : 0,
    });
  }
}

const countyTaxTypes = [...new Set(countyRows.map((d) => d.Tax_type).filter(Boolean))].sort();
const sectorTaxTypes = [...new Set(sectorRows.map((d) => d.Tax_type).filter(Boolean))].sort();
const taxheads = [...new Set(taxheadRows.map((d) => d.Taxhead).filter(Boolean))].sort();
const sectors = [...new Set(sectorRows.map((d) => d.Sector).filter(Boolean))].sort();

const metadata = {
  generated_at: new Date().toISOString(),
  years: {
    min_taxhead_year: Math.min(...taxheadRows.map((d) => d.Year).filter(Number.isFinite)),
    max_taxhead_year: Math.max(...taxheadRows.map((d) => d.Year).filter(Number.isFinite)),
    latest_sector_year: Math.max(...sectorRows.map((d) => d.Year).filter(Number.isFinite)),
    latest_county_year: Math.max(...countyRows.map((d) => d.Year).filter(Number.isFinite)),
  },
  taxheads,
  sectors,
  sector_tax_types: sectorTaxTypes,
  county_tax_types: countyTaxTypes,
  source_files: [
    "net-receipts-taxhead.csv",
    "net-receipts-sector.csv",
    "net-receipts-county.csv",
    "geo/counties.geojson",
  ],
  county_normalisation_example: normaliseCountyName("County Dublin"),
};

await fs.mkdir(derivedDir, { recursive: true });
await fs.writeFile(
  path.join(derivedDir, "net-receipts-share.json"),
  JSON.stringify(shares, null, 2) + "\n",
);
await fs.writeFile(
  path.join(derivedDir, "metadata.json"),
  JSON.stringify(metadata, null, 2) + "\n",
);

console.log(`Wrote ${shares.length} share rows and metadata to ${derivedDir}`);
