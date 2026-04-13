// train_rf.js
// from cd backend/src, run:
// node randomforest.js "../temp-raw-data/data_processed.csv"

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { RandomForestRegression } = require("ml-random-forest");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Please provide path to processed CSV file.");
  process.exit(1);
}

const FEATURES = ["adc1_norm", "adc2_norm", "adc3_norm", "adc4_norm"];
const TARGET = "adc1_norm"; // predict this column
const TRAIN_SPLIT = 0.8;

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function buildDataset(rows, featureCols, targetCol) {
  const X = [];
  const y = [];

  for (const row of rows) {
    const features = featureCols.map((col) => safeNumber(row[col]));
    const target = safeNumber(row[targetCol]);

    if (features.every((v) => v !== null) && target !== null) {
      X.push(features);
      y.push(target);
    }
  }

  return { X, y };
}

function splitTrainTest(X, y, ratio = 0.8) {
  const splitIndex = Math.floor(X.length * ratio);

  return {
    XTrain: X.slice(0, splitIndex),
    yTrain: y.slice(0, splitIndex),
    XTest: X.slice(splitIndex),
    yTest: y.slice(splitIndex),
  };
}

function mae(actual, predicted) {
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += Math.abs(actual[i] - predicted[i]);
  }
  return sum / actual.length;
}

function mse(actual, predicted) {
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += (actual[i] - predicted[i]) ** 2;
  }
  return sum / actual.length;
}

function rmse(actual, predicted) {
  return Math.sqrt(mse(actual, predicted));
}

function r2(actual, predicted) {
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;

  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < actual.length; i++) {
    ssRes += (actual[i] - predicted[i]) ** 2;
    ssTot += (actual[i] - mean) ** 2;
  }

  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

async function main() {
  console.log("Loading CSV...");
  const rows = await loadCSV(path.resolve(inputPath));
  console.log(`Rows loaded: ${rows.length}`);

  const { X, y } = buildDataset(rows, FEATURES, TARGET);
  console.log(`Valid rows: ${X.length}`);

  if (X.length < 10) {
    throw new Error("Not enough valid rows to train.");
  }

  const { XTrain, yTrain, XTest, yTest } = splitTrainTest(X, y, TRAIN_SPLIT);

  console.log(`Train size: ${XTrain.length}`);
  console.log(`Test size: ${XTest.length}`);

  const options = {
    seed: 42,
    maxFeatures: FEATURES.length,
    replacement: true,
    nEstimators: 100,
  };

  console.log("Training Random Forest...");
  const model = new RandomForestRegression(options);
  model.train(XTrain, yTrain);

  console.log("Predicting...");
  const predictions = model.predict(XTest);

  const metrics = {
    mae: mae(yTest, predictions),
    mse: mse(yTest, predictions),
    rmse: rmse(yTest, predictions),
    r2: r2(yTest, predictions),
  };

  console.log("Evaluation:");
  console.log(metrics);

  const outputDir = path.resolve(__dirname, "../temp-raw-data/rf_model");
  const modelPath = path.join(outputDir, "model.json");

  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    modelPath,
    JSON.stringify(
      {
        modelType: "random_forest",
        model: model.toJSON(),
        metadata: {
          features: FEATURES,
          target: TARGET,
          trainSize: XTrain.length,
          testSize: XTest.length,
          metrics,
        },
      },
      null,
      2
    )
  );

  console.log(`Model saved to ${outputDir}`);

  if (XTest.length > 0) {
    console.log("Sample prediction:");
    console.log({
      input: XTest[0],
      predicted: predictions[0],
      actual: yTest[0],
    });
  }
}

main().catch((err) => {
  console.error("Training failed:", err);
  process.exit(1);
});