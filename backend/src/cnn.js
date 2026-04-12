// train_cnn.js
// Usage:
// node train_cnn.js "./backend/temp-raw-data/your_processed_file.csv"

const tf = require("@tensorflow/tfjs-node");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Please provide path to processed CSV file.");
  process.exit(1);
}

const FEATURES = ["adc1_norm", "adc2_norm", "adc3_norm", "adc4_norm"];
const TARGET_INDEX = 0; // predict next adc1_norm
const WINDOW_SIZE = 20;
const TRAIN_SPLIT = 0.8;
const EPOCHS = 30;
const BATCH_SIZE = 32;

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

function extractFeatureMatrix(rows, featureNames) {
  return rows
    .map((row) => {
      const values = featureNames.map((f) => safeNumber(row[f]));
      return values.every((v) => v !== null) ? values : null;
    })
    .filter(Boolean);
}

function createSequences(data, windowSize, targetIndex) {
  const xs = [];
  const ys = [];

  for (let i = 0; i < data.length - windowSize; i++) {
    const window = data.slice(i, i + windowSize);
    const target = data[i + windowSize][targetIndex];

    xs.push(window);
    ys.push([target]);
  }

  return { xs, ys };
}

function splitTrainTest(xs, ys, ratio = 0.8) {
  const splitIndex = Math.floor(xs.length * ratio);

  return {
    trainXs: xs.slice(0, splitIndex),
    trainYs: ys.slice(0, splitIndex),
    testXs: xs.slice(splitIndex),
    testYs: ys.slice(splitIndex),
  };
}

function buildModel(windowSize, numFeatures) {
  const model = tf.sequential();

  model.add(
    tf.layers.conv1d({
      inputShape: [windowSize, numFeatures],
      filters: 32,
      kernelSize: 3,
      activation: "relu",
      padding: "same",
    })
  );

  model.add(
    tf.layers.maxPooling1d({
      poolSize: 2,
    })
  );

  model.add(
    tf.layers.conv1d({
      filters: 64,
      kernelSize: 3,
      activation: "relu",
      padding: "same",
    })
  );

  model.add(
    tf.layers.globalAveragePooling1d()
  );

  model.add(
    tf.layers.dense({
      units: 32,
      activation: "relu",
    })
  );

  model.add(
    tf.layers.dropout({
      rate: 0.2,
    })
  );

  model.add(
    tf.layers.dense({
      units: 1,
    })
  );

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "meanSquaredError",
    metrics: ["mae"],
  });

  return model;
}

async function main() {
  console.log("Loading CSV...");
  const rows = await loadCSV(path.resolve(inputPath));
  console.log(`Rows loaded: ${rows.length}`);

  const data = extractFeatureMatrix(rows, FEATURES);
  console.log(`Valid numeric rows: ${data.length}`);

  if (data.length <= WINDOW_SIZE) {
    throw new Error("Not enough rows to create CNN windows.");
  }

  const { xs, ys } = createSequences(data, WINDOW_SIZE, TARGET_INDEX);
  console.log(`Sequences created: ${xs.length}`);

  const { trainXs, trainYs, testXs, testYs } = splitTrainTest(xs, ys, TRAIN_SPLIT);

  if (!trainXs.length || !testXs.length) {
    throw new Error("Train/test split produced empty data.");
  }

  const xTrain = tf.tensor3d(trainXs);
  const yTrain = tf.tensor2d(trainYs);
  const xTest = tf.tensor3d(testXs);
  const yTest = tf.tensor2d(testYs);

  console.log("xTrain shape:", xTrain.shape);
  console.log("yTrain shape:", yTrain.shape);

  const model = buildModel(WINDOW_SIZE, FEATURES.length);
  model.summary();

  console.log("Training CNN...");
  await model.fit(xTrain, yTrain, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    validationData: [xTest, yTest],
    shuffle: false,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        console.log(
          `Epoch ${epoch + 1}/${EPOCHS} - loss: ${logs.loss.toFixed(6)} - mae: ${logs.mae.toFixed(6)} - val_loss: ${logs.val_loss.toFixed(6)} - val_mae: ${logs.val_mae.toFixed(6)}`
        );
      },
    },
  });

  console.log("Evaluating...");
  const evalResult = model.evaluate(xTest, yTest);
  const loss = await evalResult[0].data();
  const mae = await evalResult[1].data();

  console.log("Test Loss:", loss[0]);
  console.log("Test MAE:", mae[0]);

  const outputDir = path.resolve("./backend/models/cnn-model");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("Saving model...");
  await model.save(`file://${outputDir}`);
  console.log(`Model saved to: ${outputDir}`);

  console.log("Running sample prediction...");
  const sampleInput = xTest.slice([0, 0, 0], [1, WINDOW_SIZE, FEATURES.length]);
  const prediction = model.predict(sampleInput);

  const predicted = await prediction.data();
  const actual = await yTest.slice([0, 0], [1, 1]).data();

  console.log({
    predicted: predicted[0],
    actual: actual[0],
  });

  tf.dispose([xTrain, yTrain, xTest, yTest, sampleInput, prediction]);
}

main().catch((err) => {
  console.error("Training failed:", err);
  process.exit(1);
});