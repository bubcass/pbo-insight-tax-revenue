import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {csvParse} from "d3-dsv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..");
const derivedDir = path.join(dataDir, "derived");
const args = process.argv.slice(2);
const check = args.includes("--check");
if (args.some((argument) => argument !== "--check")) {
  throw new Error(`Unknown option: ${args.find((argument) => argument !== "--check")}`);
}

function toNumber(value, {nullable = false} = {}) {
  const text = String(value ?? "").trim();
  if (nullable && (!text || text.toUpperCase() === "NA")) return null;
  const num = Number(text);
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

async function readCsv(name, requiredColumns) {
  const text = await fs.readFile(path.join(dataDir, name), "utf8");
  const parsed = csvParse(text.replace(/^\uFEFF/, ""));
  const missing = requiredColumns.filter((column) => !parsed.columns.includes(column));
  if (missing.length) throw new Error(`${name} is missing columns: ${missing.join(", ")}`);

  const rows = parsed.map((input, index) => {
    const row = Object.fromEntries(
      requiredColumns.map((column) => {
        const value = String(input[column] ?? "").trim();
        if (column === "Year") return [column, toNumber(value)];
        if (column === "Amount") {
          const amount = toNumber(value, {nullable: true});
          if (amount === null && value && value.toUpperCase() !== "NA") {
            throw new Error(`${name} row ${index + 2} has an invalid Amount`);
          }
          return [column, amount];
        }
        return [column, value];
      }),
    );
    if (!Number.isFinite(row.Year) || (row.Amount !== null && !Number.isFinite(row.Amount))) {
      throw new Error(`${name} row ${index + 2} has an invalid Year or Amount`);
    }
    for (const column of requiredColumns.filter((column) => !["Year", "Amount"].includes(column))) {
      if (!row[column]) throw new Error(`${name} row ${index + 2} has an empty ${column}`);
    }
    return row;
  });

  if (!rows.length) throw new Error(`${name} contains no data rows`);
  return {
    rows,
    sha256: createHash("sha256").update(text).digest("hex"),
  };
}

const taxhead = await readCsv("net-receipts-taxhead.csv", ["Year", "Taxhead", "Amount"]);
const sector = await readCsv("net-receipts-sector.csv", ["Year", "Sector", "Tax_type", "Amount"]);
const county = await readCsv("net-receipts-county.csv", ["County", "Year", "Tax_type", "Amount"]);
const taxheadRows = taxhead.rows;
const sectorRows = sector.rows;
const countyRows = county.rows;

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
  source_sha256: {
    "net-receipts-taxhead.csv": taxhead.sha256,
    "net-receipts-sector.csv": sector.sha256,
    "net-receipts-county.csv": county.sha256,
  },
  county_normalisation_example: normaliseCountyName("County Dublin"),
};

const outputs = [
  output("net-receipts-taxhead.json", tabular(taxheadRows, ["Year", "Taxhead", "Amount"])),
  output("net-receipts-sector.json", tabular(sectorRows, ["Year", "Sector", "Tax_type", "Amount"])),
  output("net-receipts-county.json", tabular(countyRows, ["County", "Year", "Tax_type", "Amount"])),
  output("net-receipts-share.json", shares, true),
  output("metadata.json", metadata, true),
];

if (check) {
  const stale = [];
  for (const item of outputs) {
    const current = await fs.readFile(item.path, "utf8").catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (current !== item.text) stale.push(path.basename(item.path));
  }
  if (stale.length) throw new Error(`Derived tax data is missing or stale:\n- ${stale.join("\n- ")}`);
} else {
  await fs.mkdir(derivedDir, { recursive: true });
  await Promise.all(outputs.map((item) => fs.writeFile(item.path, item.text, "utf8")));
}

console.log(
  `${check ? "Verified" : "Wrote"} ${taxheadRows.length + sectorRows.length + countyRows.length} browser rows, ` +
  `${shares.length} share rows and metadata to ${derivedDir}`,
);

function output(name, value, pretty = false) {
  return {
    path: path.join(derivedDir, name),
    text: `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`,
  };
}

function tabular(rows, columns) {
  return {columns, rows: rows.map((row) => columns.map((column) => row[column]))};
}
