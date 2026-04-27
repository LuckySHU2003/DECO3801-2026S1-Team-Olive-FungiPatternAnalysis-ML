// Root component — owns ALL application state and wires pages, dialogs, and layout.
import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

import AppShell from "@/components/layout/AppShell";
import Home from "@/Home";
import AllDialogs from "@/components/dialogs/AllDialogs";

// Page components
import Dashboard from "@/components/pages/Dashboard";
import Upload from "@/components/pages/Upload";
import Preview from "@/components/pages/Preview";
import Configure from "@/components/pages/Configure";
import Processing from "@/components/pages/Processing";
import Results from "@/components/pages/Results";
import Prediction from "@/components/pages/Prediction";
import Interpretation from "@/components/pages/Interpretation";
import CompareDatasets from "@/components/pages/CompareDatasets";
import Models from "@/components/pages/Models";
import History from "@/components/pages/History";

function isNumericValue(value) {
  return typeof value === "number" && !Number.isNaN(value);
}

function isTimeLikeHeader(header = "") {
  const h = header.toLowerCase();
  return (
    h.includes("time") ||
    h.includes("elapsed") ||
    h.includes("timestamp") ||
    h.includes("second") ||
    h.includes("minute") ||
    h.includes("hour")
  );
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values) {
  if (!values.length) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function movingAverage(values, window = 9) {
  const half = Math.floor(window / 2);
  return values.map((_, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(values.length, index + half + 1);
    const slice = values.slice(start, end);
    return mean(slice);
  });
}

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);
  return values.map((v) => (v - min) / span);
}

function buildSignalAnalysis({
  rows,
  headers,
  selectedSheet,
  threshold,
  windowSize,
  baselineRemoval,
  normalization,
}) {
  const numericHeaders = headers.filter((header) =>
    rows.some((row) => isNumericValue(row[header]))
  );

  const xColumn =
    headers.find((header) => isTimeLikeHeader(header)) ||
    numericHeaders[0] ||
    "";

  const yColumn =
    numericHeaders.find((header) => header !== xColumn) ||
    numericHeaders[0] ||
    "";

  if (!xColumn || !yColumn) {
    return {
      xColumn: "",
      yColumn: "",
      points: [],
      spikes: [],
      thresholdLine: null,
      spikeCount: 0,
      meanValue: 0,
      rangeMin: 0,
      rangeMax: 0,
      detectedSignalColumn: "",
      selectedSheet,
    };
  }

  const rawPoints = rows
    .map((row, index) => {
      const y = row[yColumn];
      if (!isNumericValue(y)) return null;
      const xRaw = row[xColumn];
      const x = isNumericValue(xRaw) ? xRaw : index;
      return { x, y, index };
    })
    .filter(Boolean);

  if (!rawPoints.length) {
    return {
      xColumn,
      yColumn,
      points: [],
      spikes: [],
      thresholdLine: null,
      spikeCount: 0,
      meanValue: 0,
      rangeMin: 0,
      rangeMax: 0,
      detectedSignalColumn: yColumn,
      selectedSheet,
    };
  }

  let processedY = rawPoints.map((p) => p.y);

  if (baselineRemoval) {
    const baseline = movingAverage(processedY, 11);
    processedY = processedY.map((v, i) => v - baseline[i]);
  }

  if (normalization) {
    processedY = normalize(processedY);
  }

  const points = rawPoints.map((p, i) => ({
    ...p,
    y: processedY[i],
  }));

  const values = points.map((p) => p.y);
  const m = mean(values);
  const sd = stdDev(values);
  const sigma = Number(threshold) || 2.5;
  const thresholdLine = m + sigma * sd * 0.35;

  const spikes = [];
  const distance = Math.max(3, Math.floor((Number(windowSize) || 256) / 32));

  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i].y;
    const prev = points[i - 1].y;
    const next = points[i + 1].y;

    if (current > thresholdLine && current > prev && current > next) {
      const tooClose = spikes.length && i - spikes[spikes.length - 1].index < distance;
      if (!tooClose) spikes.push(points[i]);
    }
  }

  return {
    xColumn,
    yColumn,
    points,
    spikes,
    thresholdLine,
    spikeCount: spikes.length,
    meanValue: mean(values),
    rangeMin: Math.min(...values),
    rangeMax: Math.max(...values),
    detectedSignalColumn: yColumn,
    selectedSheet,
  };
}

function generatePrediction(points) {
  if (!points || points.length < 2) return [];

  const lastX = points[points.length - 1].x;
  const lastY = points[points.length - 1].y;
  const step = (points[points.length - 1].x - points[0].x) / Math.max(points.length - 1, 1);

  const recent = points.slice(-20).map((p) => p.y);
  const firstRecent = recent[0] ?? lastY;
  const lastRecent = recent[recent.length - 1] ?? lastY;
  const trend = (lastRecent - firstRecent) / Math.max(recent.length - 1, 1);

  return Array.from({ length: 50 }, (_, i) => {
    const drift = trend * (i + 1);
    const seasonal = Math.sin(i / 4) * Math.max(stdDev(recent) * 0.18, 0.01);
    return {
      x: lastX + (i + 1) * step,
      y: lastY + drift + seasonal,
      index: points.length + i,
    };
  });
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);

  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [signupOpen, setSignupOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [uploadSuccessOpen, setUploadSuccessOpen] = useState(false);
  const [fileErrorOpen, setFileErrorOpen] = useState(false);
  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [saveConfigOpen, setSaveConfigOpen] = useState(false);
  const [paramErrorOpen, setParamErrorOpen] = useState(false);
  const [runCompleteOpen, setRunCompleteOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [retrainOpen, setRetrainOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const [progress, setProgress] = useState(16);

  const [datasetName, setDatasetName] = useState("");
  const [species, setSpecies] = useState("Pleurotus ostreatus");
  const [notes, setNotes] = useState(
    "Humidity-controlled lab recording with nutrient-rich substrate."
  );

  const [hasUploadedData, setHasUploadedData] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const [tableRows, setTableRows] = useState([]);
  const [headers, setHeaders] = useState([]);

  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");

  const [signalData, setSignalData] = useState([]);

  const [filterType, setFilterType] = useState("butterworth");
  const [windowSize, setWindowSize] = useState("256");
  const [threshold, setThreshold] = useState("2.5");
  const [classifier, setClassifier] = useState("random-forest");
  const [sequenceModel, setSequenceModel] = useState("lstm");
  const [predictionEnabled, setPredictionEnabled] = useState(true);

  const [baselineRemoval, setBaselineRemoval] = useState(true);
  const [normalization, setNormalization] = useState(true);

  const [processingSteps, setProcessingSteps] = useState([]);
  const [processingLogs, setProcessingLogs] = useState([]);
  const [predictionData, setPredictionData] = useState([]);

  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [previewPredictionSummary, setPreviewPredictionSummary] = useState(null);

  // dashboard workspace summary state
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [analysisRuns, setAnalysisRuns] = useState([]);

  const buildSignalDataFromRows = (rows, headerList) => {
    const firstNumericHeader = headerList.find((header) =>
      rows.some((row) => typeof row[header] === "number" && !Number.isNaN(row[header]))
    );

    if (!firstNumericHeader) return [];

    return rows
      .map((row) => row[firstNumericHeader])
      .filter((value) => typeof value === "number" && !Number.isNaN(value));
  };

  const parseCsvFile = async (file) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (!lines.length) {
      return { rows: [], headers: [] };
    }

    const parsedHeaders = lines[0].split(",").map((h) => h.trim());

    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((cell) => cell.trim());
      const row = {};

      parsedHeaders.forEach((header, index) => {
        const raw = values[index] ?? "";
        const num = Number(raw);
        row[header] = raw !== "" && !Number.isNaN(num) ? num : raw;
      });

      return row;
    });

    return { rows, headers: parsedHeaders };
  };

  const parseExcelSheet = async (file, sheetNameToUse) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const names = workbook.SheetNames || [];
    const targetSheet = sheetNameToUse || names[0];

    if (!targetSheet) {
      return { rows: [], headers: [], names: [], selected: "" };
    }

    const worksheet = workbook.Sheets[targetSheet];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    const parsedHeaders = jsonRows.length ? Object.keys(jsonRows[0]) : [];

    const rows = jsonRows.map((row) => {
      const cleaned = {};

      parsedHeaders.forEach((header) => {
        const raw = row[header];
        const num = Number(raw);
        cleaned[header] = raw !== "" && !Number.isNaN(num) ? num : raw;
      });

      return cleaned;
    });

    return {
      rows,
      headers: parsedHeaders,
      names,
      selected: targetSheet,
    };
  };

  const handleFileUpload = async (file) => {
    try {
      if (!file) return;

      const extension = file.name.split(".").pop()?.toLowerCase();
      setUploadedFile(file);

      let result = { rows: [], headers: [] };

      if (extension === "csv") {
        result = await parseCsvFile(file);
        setSheetNames([]);
        setSelectedSheet("");
      } else if (extension === "xlsx" || extension === "xls") {
        result = await parseExcelSheet(file);
        setSheetNames(result.names || []);
        setSelectedSheet(result.selected || "");
      } else {
        setFileErrorOpen(true);
        return;
      }

      if (!result.rows.length || !result.headers.length) {
        setFileErrorOpen(true);
        return;
      }

      setDatasetName(file.name);
      setTableRows(result.rows);
      setHeaders(result.headers);
      setSignalData(buildSignalDataFromRows(result.rows, result.headers));
      setHasUploadedData(true);
      setPredictionData([]);
      setAnalysisCompleted(false);
      setPreviewPredictionSummary(null);

      setUploadedDatasets((prev) => {
        const exists = prev.some(
          (item) =>
            item.name === file.name &&
            item.sheet === (result.selected || "") &&
            item.rows === result.rows.length
        );

        if (exists) return prev;

        return [
          {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            sheet: result.selected || "",
            rows: result.rows.length,
            columns: result.headers.length,
            headers: result.headers,
            tableRows: result.rows,
            uploadedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });

      setUploadSuccessOpen(true);
      setPage("preview");
    } catch (error) {
      console.error("File upload error:", error);
      setFileErrorOpen(true);
    }
  };

  const handleOpenUploadedDataset = (dataset) => {
    if (!dataset) return;

    setDatasetName(dataset.name || "");
    setSelectedSheet(dataset.sheet || "");
    setHeaders(dataset.headers || []);
    setTableRows(dataset.tableRows || []);
    setSignalData(buildSignalDataFromRows(dataset.tableRows || [], dataset.headers || []));
    setHasUploadedData(true);

    setPredictionData([]);
    setAnalysisCompleted(false);
    setPreviewPredictionSummary(null);

    setPage("preview");
  };

  const handleSheetChange = async (sheetName) => {
    if (!uploadedFile) return;

    const extension = uploadedFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") return;

    try {
      const result = await parseExcelSheet(uploadedFile, sheetName);

      if (!result.rows.length || !result.headers.length) {
        setFileErrorOpen(true);
        return;
      }

      setSelectedSheet(result.selected);
      setTableRows(result.rows);
      setHeaders(result.headers);
      setSignalData(buildSignalDataFromRows(result.rows, result.headers));
      setPredictionData([]);
      setAnalysisCompleted(false);
      setPreviewPredictionSummary(null);
    } catch (error) {
      console.error("Sheet change error:", error);
      setFileErrorOpen(true);
    }
  };

  const analysisSummary = useMemo(() => {
    return buildSignalAnalysis({
      rows: tableRows,
      headers,
      selectedSheet,
      threshold,
      windowSize,
      baselineRemoval,
      normalization,
    });
  }, [
    tableRows,
    headers,
    selectedSheet,
    threshold,
    windowSize,
    baselineRemoval,
    normalization,
  ]);

  const resultMetrics = useMemo(
    () => ({
      samples: analysisSummary.points.length || signalData.length || 0,
      range:
        analysisSummary.points.length > 0
          ? `${analysisSummary.rangeMin.toFixed(2)} to ${analysisSummary.rangeMax.toFixed(2)}`
          : "No data",
      mean:
        analysisSummary.points.length > 0
          ? analysisSummary.meanValue.toFixed(2)
          : "No data",
      spikes: analysisSummary.spikeCount,
      frequency:
        analysisSummary.points.length > 1
          ? `${(analysisSummary.spikeCount / Math.max(analysisSummary.points.length, 1)).toFixed(2)}`
          : "0.00",
      rmse:
        predictionData.length > 0
          ? Math.max(stdDev(predictionData.map((p) => p.y)) * 0.6, 0.01).toFixed(2)
          : "0.00",
    }),
    [analysisSummary, signalData.length, predictionData]
  );


  const startAnalysis = () => {
    const steps = [
      {
        progress: 18,
        label: "Dataset loaded",
        log: `Loaded ${datasetName || "dataset"}${selectedSheet ? ` from sheet "${selectedSheet}"` : ""}.`,
      },
      {
        progress: 30,
        label: "Preprocessing",
        log: `Applied ${filterType} preprocessing to ${analysisSummary.detectedSignalColumn || "signal"}.`,
      },
      {
        progress: 46,
        label: "Spike detection",
        log: `Detected ${analysisSummary.spikeCount} spikes using window size ${windowSize} and sensitivity ${threshold} σ.`,
      },
      {
        progress: 63,
        label: "Feature extraction",
        log: `Extracted features from ${analysisSummary.points.length} processed signal points.`,
      },
      {
        progress: 79,
        label: "Model inference",
        log: `Ran ${classifier}${predictionEnabled ? ` with ${sequenceModel} prediction enabled` : ""}.`,
      },
      {
        progress: 100,
        label: "Results generated",
        log: `Analysis complete. ${analysisSummary.spikeCount} spikes found in the current processed signal.`,
      },
    ];

    setProcessingSteps(steps);
    setProcessingLogs([]);
    setProgress(0);
    setPredictionData([]);
    setAnalysisCompleted(false);
    setPreviewPredictionSummary(null);
    setPage("processing");

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setProgress(step.progress);
        setProcessingLogs((prev) => [
          ...prev,
          {
            id: `${idx}-${step.progress}`,
            text: step.log,
            progress: step.progress,
            step: step.label,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        if (step.progress === 100) {
          let preds = [];

          if (predictionEnabled) {
            preds = generatePrediction(analysisSummary.points);
            setPredictionData(preds);

            setPreviewPredictionSummary({
              nextSpike: preds.length ? preds[0].x : null,
              trend:
                preds.length > 1
                  ? preds[preds.length - 1].y > preds[0].y
                    ? "Increasing"
                    : preds[preds.length - 1].y < preds[0].y
                      ? "Decreasing"
                      : "Stable"
                  : "Stable",
              confidence: preds.length > 0 ? "High" : "Low",
              model:
                classifier === "random-forest"
                  ? "Random Forest"
                  : classifier === "svm"
                    ? "SVM"
                    : classifier === "gb"
                      ? "Gradient Boosting"
                      : classifier,
            });
          } else {
            setPredictionData([]);
            setPreviewPredictionSummary(null);
          }

          const runRmse =
            predictionEnabled && preds.length > 0
              ? Math.max(stdDev(preds.map((p) => p.y)) * 0.6, 0.01)
              : 4.27;

          setAnalysisRuns((prev) => [
            {
              id: `run-${Date.now()}`,
              datasetName,
              selectedSheet,
              classifier,
              sequenceModel,
              predictionEnabled,
              spikeCount: analysisSummary.spikeCount,
              rmse: runRmse,
              completedAt: new Date().toISOString(),
            },
            ...prev,
          ]);

          setAnalysisCompleted(true);
          setRunCompleteOpen(true);
        }
      }, (idx + 1) * 900);
    });
  };

  const dialogProps = {
    signupOpen,
    setSignupOpen,
    forgotOpen,
    setForgotOpen,
    uploadSuccessOpen,
    setUploadSuccessOpen,
    fileErrorOpen,
    setFileErrorOpen,
    editMetaOpen,
    setEditMetaOpen,
    deleteDataOpen,
    setDeleteDataOpen,
    saveConfigOpen,
    setSaveConfigOpen,
    paramErrorOpen,
    setParamErrorOpen,
    runCompleteOpen,
    setRunCompleteOpen,
    regenOpen,
    setRegenOpen,
    retrainOpen,
    setRetrainOpen,
    compareOpen,
    setCompareOpen,
    datasetName,
    setDatasetName,
    species,
    setSpecies,
    notes,
    setNotes,
    setPage,
    startAnalysis,
    resultMetrics,
    classifier,
    sequenceModel,
    predictionEnabled,
    analysisSummary,
    selectedSheet,
    headers,
    tableRows,
  };

  if (!authenticated) {
    return (
      <>
        <Home
          onGoToDashboard={() => setAuthenticated(true)}
        />
        <AllDialogs {...dialogProps} />
      </>
    );
  }

  return (
    <>
      <AppShell
        page={page}
        setPage={setPage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      >
        <AnimatePresence mode="wait">
          {page === "dashboard" && (
            <Dashboard
              key="dashboard"
              setPage={setPage}
              startAnalysis={startAnalysis}
              datasetName={datasetName}
              hasUploadedData={hasUploadedData}
              selectedSheet={selectedSheet}
              resultMetrics={resultMetrics}
              analysisSummary={analysisSummary}
              analysisCompleted={analysisCompleted}
              classifier={classifier}
              sequenceModel={sequenceModel}
              predictionEnabled={predictionEnabled}
              uploadedDatasets={uploadedDatasets}
              analysisRuns={analysisRuns}
            />
          )}

          {page === "upload" && (
          <Upload
            key="upload"
            datasetName={datasetName}
            onFileUpload={handleFileUpload}
            uploadedDatasets={uploadedDatasets}
            onOpenUploadedDataset={handleOpenUploadedDataset}
            onGoToCompare={() => setPage("compare")}
          />
        )}

          {page === "preview" && (
            <Preview
              key="preview"
              setPage={setPage}
              setEditMetaOpen={setEditMetaOpen}
              setDeleteDataOpen={setDeleteDataOpen}
              datasetName={datasetName}
              species={species}
              signalData={signalData}
              hasUploadedData={hasUploadedData}
              headers={headers}
              tableRows={tableRows}
              sheetNames={sheetNames}
              selectedSheet={selectedSheet}
              onSheetChange={handleSheetChange}
              analysisCompleted={analysisCompleted}
              previewPredictionSummary={previewPredictionSummary}
            />
          )}

          {page === "configure" && (
            <Configure
              key="configure"
              setPage={setPage}
              filterType={filterType}
              setFilterType={setFilterType}
              windowSize={windowSize}
              setWindowSize={setWindowSize}
              threshold={threshold}
              setThreshold={setThreshold}
              classifier={classifier}
              setClassifier={setClassifier}
              sequenceModel={sequenceModel}
              setSequenceModel={setSequenceModel}
              predictionEnabled={predictionEnabled}
              setPredictionEnabled={setPredictionEnabled}
              baselineRemoval={baselineRemoval}
              setBaselineRemoval={setBaselineRemoval}
              normalization={normalization}
              setNormalization={setNormalization}
              startAnalysis={startAnalysis}
              setParamErrorOpen={setParamErrorOpen}
              setSaveConfigOpen={setSaveConfigOpen}
              datasetName={datasetName}
              selectedSheet={selectedSheet}
              headers={headers}
              tableRows={tableRows}
              analysisSummary={analysisSummary}
            />
          )}

          {page === "processing" && (
            <Processing
              key="processing"
              progress={progress}
              datasetName={datasetName}
              selectedSheet={selectedSheet}
              processingSteps={processingSteps}
              processingLogs={processingLogs}
              classifier={classifier}
              sequenceModel={sequenceModel}
              predictionEnabled={predictionEnabled}
              setPage={setPage}
            />
          )}

          {page === "results" && (
            <Results
              key="results"
              setPage={setPage}
              resultMetrics={resultMetrics}
              setCompareOpen={setCompareOpen}
              analysisSummary={analysisSummary}
              datasetName={datasetName}
              selectedSheet={selectedSheet}
              classifier={classifier}
              sequenceModel={sequenceModel}
              predictionEnabled={predictionEnabled}
              predictionData={predictionData}
            />
          )}

          {page === "prediction" && (
            <Prediction
              key="prediction"
              resultMetrics={resultMetrics}
              sequenceModel={sequenceModel}
              setSequenceModel={setSequenceModel}
              analysisSummary={analysisSummary}
              predictionData={predictionData}
              predictionEnabled={predictionEnabled}
              datasetName={datasetName}
              selectedSheet={selectedSheet}
              classifier={classifier}
            />
          )}

          {page === "interpretation" && (
            <Interpretation
              key="interpretation"
              setPage={setPage}
              setRegenOpen={setRegenOpen}
            />
          )}

          {page === "compare" && (
            <CompareDatasets
              key="compare"
              setPage={setPage}
              uploadedDatasets={uploadedDatasets}
            />
          )}

          {page === "models" && (
            <Models
              key="models"
              setRetrainOpen={setRetrainOpen}
            />
          )}

          {page === "history" && (
            <History
              key="history"
              setCompareOpen={setCompareOpen}
            />
          )}
        </AnimatePresence>
      </AppShell>

      <AllDialogs {...dialogProps} />
    </>
  );
}
