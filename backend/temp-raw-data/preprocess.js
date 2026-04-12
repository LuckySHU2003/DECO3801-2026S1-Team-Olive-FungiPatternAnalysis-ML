// This script reads an Excel file, preprocesses the data, and exports it as a CSV file.
// This is a sampling way for ML team to preprocess data locally
// This temp-raw-data folder is meant to be a placeholder on main branch, 
// Apart from this file, all other files in this folder should be ignored by git, and only exist in local branches for ML team to use as they wish.

// preprocess_mushroom_excel.js
// Usage:
//   npm install xlsx
// (optional) cd to the folder containing this script, then run:
//   node preprocess.js "mushroom-file.xlsx"

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const inputPath = path.resolve(__dirname, process.argv[2] || "");
if (!inputPath) {
  console.error("Please provide input file path");
  process.exit(1);
}

// ---------- helpers ----------
function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function median(arr) {
  const clean = arr.filter(v => v != null).sort((a, b) => a - b);
  if (!clean.length) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2
    ? clean[mid]
    : (clean[mid - 1] + clean[mid]) / 2;
}

// ---------- read file ----------
const wb = XLSX.readFile(inputPath);
const sheetName = wb.SheetNames[0]; // assume first sheet
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

if (!rows.length) {
  console.error("No data found");
  process.exit(1);
}

// ---------- extract channels ----------
const adc1 = rows.map(r => safeNumber(r["ADC1 (green)"]));
const adc2 = rows.map(r => safeNumber(r["ADC2 (yellow)"]));
const adc3 = rows.map(r => safeNumber(r["ADC3 (orange)"]));
const adc4 = rows.map(r => safeNumber(r["ADC4 (red)"]));

// ---------- compute medians ----------
const med1 = median(adc1);
const med2 = median(adc2);
const med3 = median(adc3);
const med4 = median(adc4);

// ---------- preprocess ----------
const startTime = new Date(rows[0]["Time"]);

const processed = rows.map((r, i) => {
  const t = new Date(r["Time"]);

  const v1 = safeNumber(r["ADC1 (green)"]);
  const v2 = safeNumber(r["ADC2 (yellow)"]);
  const v3 = safeNumber(r["ADC3 (orange)"]);
  const v4 = safeNumber(r["ADC4 (red)"]);

  return {
    index: i + 1,
    time: r["Time"],
    elapsedSeconds: (t - startTime) / 1000,

    adc1: v1,
    adc2: v2,
    adc3: v3,
    adc4: v4,

    // median normalization
    adc1_norm: v1 != null && med1 != null ? v1 - med1 : null,
    adc2_norm: v2 != null && med2 != null ? v2 - med2 : null,
    adc3_norm: v3 != null && med3 != null ? v3 - med3 : null,
    adc4_norm: v4 != null && med4 != null ? v4 - med4 : null,
  };
});

// ---------- export CSV ----------
function toCSV(data) {
  const headers = Object.keys(data[0]);
  const escape = v => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);

  return [
    headers.join(","),
    ...data.map(row => headers.map(h => escape(row[h])).join(","))
  ].join("\n");
}

const outputPath = path.join(
  path.dirname(inputPath),
  path.basename(inputPath, path.extname(inputPath)) + "_processed.csv"
);

fs.writeFileSync(outputPath, toCSV(processed));

console.log("Done:", outputPath);
console.log("Medians:", { med1, med2, med3, med4 });