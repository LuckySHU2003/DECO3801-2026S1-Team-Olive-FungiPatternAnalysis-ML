import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Table2,
  Clock3,
  Eye,
  Database,
  BarChart3,
  SlidersHorizontal,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  SearchCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import StatCard from "@/components/shared/StatCard";

function toNumberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isNumericValue(value) {
  return toNumberOrNull(value) !== null;
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

function formatDateTime(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString();
}

function formatAxisValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function formatModelName(value) {
  if (value === "random-forest") return "Random Forest";
  if (value === "svm") return "SVM";
  if (value === "gb") return "Gradient Boosting";
  return value || "—";
}

function buildGraphPoints({ rows, xColumn, yColumn, xRange, yRange }) {
  return rows
    .map((row, index) => {
      const y = toNumberOrNull(row[yColumn]);
      if (y === null) return null;

      const parsedX = toNumberOrNull(row[xColumn]);
      const x = parsedX !== null ? parsedX : index;

      if (xRange && (x < xRange[0] || x > xRange[1])) return null;
      if (yRange && (y < yRange[0] || y > yRange[1])) return null;

      return { x, y, index };
    })
    .filter(Boolean);
}


function SimpleSignalChart({
  points = [],
  xLabel = "X axis",
  yLabel = "Y axis",
  spikes = [],
  thresholdLine = null,
  selectable = false,
  onBrushSelect,
  onResetSelection,
}) {
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        No graphable data for this selection
      </div>
    );
  }

  const width = 960;
  const height = 320;
  const paddingLeft = 58;
  const paddingRight = 28;
  const paddingTop = 22;
  const paddingBottom = 44;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues, thresholdLine ?? Infinity);
  const maxY = Math.max(...yValues, thresholdLine ?? -Infinity);

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const toX = (value) =>
    paddingLeft + ((value - minX) / Math.max(maxX - minX, 1e-6)) * chartWidth;

  const toY = (value) =>
    paddingTop +
    (1 - (value - minY) / Math.max(maxY - minY, 1e-6)) * chartHeight;

  const fromSvgXToValue = (svgX) => {
    const clampedX = Math.max(paddingLeft, Math.min(svgX, width - paddingRight));
    return minX + ((clampedX - paddingLeft) / Math.max(chartWidth, 1e-6)) * (maxX - minX);
  };

  const getSvgPoint = (event) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (event) => {
    if (!selectable) return;
    const point = getSvgPoint(event);
    setDragStart(point);
    setDragEnd(point);
  };

  const handleMouseMove = (event) => {
    if (!selectable || dragStart === null) return;
    setDragEnd(getSvgPoint(event));
  };

  const handleMouseUp = () => {
    if (!selectable || dragStart === null || dragEnd === null) return;

    const startX = Math.min(dragStart.x, dragEnd.x);
    const endX = Math.max(dragStart.x, dragEnd.x);
    const startY = Math.min(dragStart.y, dragEnd.y);
    const endY = Math.max(dragStart.y, dragEnd.y);

    if (endX - startX > 8 && endY - startY > 8) {
      const selectedXMin = fromSvgXToValue(startX);
      const selectedXMax = fromSvgXToValue(endX);

      onBrushSelect?.({
        xRange: [selectedXMin, selectedXMax],
      });
    }

    setDragStart(null);
    setDragEnd(null);
  };

  const linePoints = points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ");

  const xTicks = Array.from(
    { length: 5 },
    (_, i) => minX + ((maxX - minX) * i) / 4
  );

  const yTicks = Array.from(
    { length: 5 },
    (_, i) => minY + ((maxY - minY) * i) / 4
  );

  const chartSpikes = spikes;

  const brushX =
    dragStart !== null && dragEnd !== null ? Math.min(dragStart.x, dragEnd.x) : null;
  const brushY =
    dragStart !== null && dragEnd !== null ? Math.min(dragStart.y, dragEnd.y) : null;
  const brushWidth =
    dragStart !== null && dragEnd !== null ? Math.abs(dragEnd.x - dragStart.x) : 0;
  const brushHeight =
    dragStart !== null && dragEnd !== null ? Math.abs(dragEnd.y - dragStart.y) : 0;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {selectable
            ? "Drag a box around a time area to zoom in."
            : "Signal preview based on current data."}
        </span>

        {selectable && (
          <button
            type="button"
            className="shrink-0 rounded-full border px-3 py-1 text-xs hover:bg-slate-50"
            onClick={onResetSelection}
          >
            Reset selection
          </button>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[320px] w-full select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {yTicks.map((tick, i) => {
            const y = toY(tick);
            return (
              <g key={`y-${i}`}>
                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#94a3b8"
                >
                  {formatAxisValue(tick)}
                </text>
              </g>
            );
          })}

          {xTicks.map((tick, i) => {
            const x = toX(tick);
            return (
              <g key={`x-${i}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={paddingTop}
                  y2={height - paddingBottom}
                  stroke="#f1f5f9"
                />
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94a3b8"
                >
                  {formatAxisValue(tick)}
                </text>
              </g>
            );
          })}

          {thresholdLine !== null && (
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={toY(thresholdLine)}
              y2={toY(thresholdLine)}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          )}

          <polyline
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            points={linePoints}
          />

          {chartSpikes.slice(0, 120).map((spike) => (
            <circle
              key={`spike-${spike.index}`}
              cx={toX(spike.x)}
              cy={toY(spike.y)}
              r="5"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2"
              onMouseDown={(event) => event.stopPropagation()}
            />
          ))}

          {brushX !== null && (
            <rect
              x={brushX}
              y={brushY}
              width={brushWidth}
              height={brushHeight}
              fill="#60a5fa"
              opacity="0.22"
              stroke="#2563eb"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
          )}

          <text x={paddingLeft} y={16} fontSize="12" fill="#64748b">
            Y: {yLabel}
          </text>
          <text
            x={width - paddingRight + 28}
            y={height}
            textAnchor="end"
            fontSize="12"
            fill="#64748b"
          >
            X: {xLabel}
          </text>
        </svg>

      </div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-900">{value}</p>
    </div>
  );
}

function RangeSliderControl({ label, min, max, value, onChange, step = 0.01 }) {
  const [minValue, maxValue] = value;

  const updateMin = (newMin) => {
    const safeMin = Math.min(newMin, maxValue);
    onChange([safeMin, maxValue]);
  };

  const updateMax = (newMax) => {
    const safeMax = Math.max(newMax, minValue);
    onChange([minValue, safeMax]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
        <span>{label}</span>
        <span className="text-slate-400">
          {formatAxisValue(minValue)} to {formatAxisValue(maxValue)}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Min</span>
            <span>{formatAxisValue(minValue)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={minValue}
            onChange={(e) => updateMin(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-emerald-600"
          />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Max</span>
            <span>{formatAxisValue(maxValue)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={maxValue}
            onChange={(e) => updateMax(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-emerald-600"
          />
        </div>
      </div>
    </div>
  );
}

{/* Main workspace for data upload, preview, and analysis configuration. */ }
export default function MainWorkspace({
  setPage,
  startAnalysis,

  datasetName,
  hasUploadedData,
  uploadedDatasets = [],
  onFileUpload,
  onOpenUploadedDataset,

  headers = [],
  tableRows = [],
  sheetNames = [],
  selectedSheet = "",
  onSheetChange,

  resultMetrics,
  analysisSummary,
  analysisCompleted,
  analysisRuns = [],

  windowSize,
  setWindowSize,
  classifier,
  setClassifier,
  predictionEnabled,
  setPredictionEnabled,
  normalization,
  setNormalization,

  setParamErrorOpen,
  setSaveConfigOpen,
}) {
  const fileInputRef = useRef(null);
  const uploadRef = useRef(null);
  const previewRef = useRef(null);
  const configRef = useRef(null);

  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [xRange, setXRange] = useState([0, 0]);
  const [yRange, setYRange] = useState([0, 0]);

  {/* Dashboard Summary state and effects */ }
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  const [dashboardDatasets, setDashboardDatasets] = useState([]);
  const [dashboardModels, setDashboardModels] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [selectedDashboardRecord, setSelectedDashboardRecord] = useState(null);
  const [selectedDashboardRecordLoading, setSelectedDashboardRecordLoading] = useState(false);
  const [selectedDashboardRecordError, setSelectedDashboardRecordError] = useState("");

  {/* Upload features state and effects */ }
  const [datasetUploadLoading, setDatasetUploadLoading] = useState(false);
  const [datasetUploadError, setDatasetUploadError] = useState("");
  const [datasetUploadSuccess, setDatasetUploadSuccess] = useState("");
  const [selectedBackendDataset, setSelectedBackendDataset] = useState(null);
  const [selectedBackendDatasetLoading, setSelectedBackendDatasetLoading] = useState(false);
  const [selectedBackendDatasetError, setSelectedBackendDatasetError] = useState("");
  const [deletingDatasetId, setDeletingDatasetId] = useState("");

  {/* Dataset Preview state and effects */ }
  const [datasetPreviewHeaders, setDatasetPreviewHeaders] = useState([]);
  const [datasetPreviewRows, setDatasetPreviewRows] = useState([]);
  const [datasetPreviewLoading, setDatasetPreviewLoading] = useState(false);
  const [datasetPreviewError, setDatasetPreviewError] = useState("");

  {/* Backend API setup & helpers */ }
  const normalizeApiList = (payload, key) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  };

  const getDatasetId = (dataset) => dataset?.dataset_id || dataset?.id || dataset?._id;

  const getModelId = (model) => model?.model_id || model?.id || model?._id;

  const getDatasetDisplayName = (dataset) => {
    return dataset?.name || dataset?.original_filename || dataset?.filename || "Unnamed dataset";
  };

  const getModelDisplayName = (model) => {
    return model?.name || model?.model_name || model?.type || "Unnamed model";
  };

  const getRecordTimestamp = (record) => {
    return record?.created_at || record?.createdAt || record?.uploadedAt || record?.updatedAt || null;
  };

  {/* Fetch datasets and models from the backend API */ }
  const fetchBackendResources = useCallback(async ({ silent = false } = {}) => {
    if (!API_URL) {
      setDashboardError("Missing VITE_API_URL. Add your Render backend URL to the frontend .env file.");
      return;
    }

    if (!silent) setDashboardLoading(true);
    setDashboardError("");

    try {
      const [datasetsResponse, modelsResponse] = await Promise.all([
        fetch(`${API_URL}/datasets`),
        fetch(`${API_URL}/models`),
      ]);

      if (!datasetsResponse.ok) {
        throw new Error(`Failed to load datasets (${datasetsResponse.status})`);
      }

      if (!modelsResponse.ok) {
        throw new Error(`Failed to load models (${modelsResponse.status})`);
      }

      const [datasetsPayload, modelsPayload] = await Promise.all([
        datasetsResponse.json(),
        modelsResponse.json(),
      ]);

      setDashboardDatasets(normalizeApiList(datasetsPayload, "datasets"));
      setDashboardModels(normalizeApiList(modelsPayload, "models"));
    } catch (error) {
      setDashboardError(error?.message || "Failed to load backend resources.");
    } finally {
      if (!silent) setDashboardLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchBackendResources();
  }, [fetchBackendResources]);

  {/* Retrieve the latest dataset and model payload */ }
  const latestDataset = useMemo(() => {
    return [...dashboardDatasets].sort((a, b) => {
      return new Date(getRecordTimestamp(b) || 0) - new Date(getRecordTimestamp(a) || 0);
    })[0];
  }, [dashboardDatasets]);

  const recentDashboardItems = useMemo(() => {
    const datasetItems = dashboardDatasets.map((dataset) => ({
      id: getDatasetId(dataset),
      type: "dataset",
      label: "Dataset uploaded",
      name: getDatasetDisplayName(dataset),
      timestamp: getRecordTimestamp(dataset),
    }));

    const modelItems = dashboardModels.map((model) => ({
      id: getModelId(model),
      type: "model",
      label: "Model available",
      name: getModelDisplayName(model),
      timestamp: getRecordTimestamp(model),
    }));

    return [...datasetItems, ...modelItems]
      .filter((item) => item.id || item.name)
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 6);
  }, [dashboardDatasets, dashboardModels]);

  const handleOpenDashboardRecord = async (item) => {
    if (!API_URL || !item?.id) return;

    const resource = item.type === "dataset" ? "datasets" : "models";

    setSelectedDashboardRecordLoading(true);
    setSelectedDashboardRecordError("");

    try {
      const response = await fetch(`${API_URL}/${resource}/${item.id}`);

      if (!response.ok) {
        throw new Error(`Failed to load ${item.type} metadata (${response.status})`);
      }

      const payload = await response.json();
      setSelectedDashboardRecord({ type: item.type, payload });
    } catch (error) {
      setSelectedDashboardRecordError(error?.message || `Failed to load ${item.type} metadata.`);
    } finally {
      setSelectedDashboardRecordLoading(false);
    }
  };

  {/* Select record metadata for display */ }
  const selectedPayload = selectedDashboardRecord?.payload || {};
  const selectedRecordRows = selectedDashboardRecord
    ? [
        [selectedDashboardRecord.type === "dataset" ? "dataset_id" : "model_id", selectedPayload.dataset_id || selectedPayload.model_id || "—"],
        ["name", selectedPayload.name || selectedPayload.original_filename || "—"],
        ["type", selectedPayload.type || selectedPayload.task_type || "—"],
        ["version", selectedPayload.version || "—"],
        ["source", selectedPayload.source || "—"],
        ["created_at", formatDateTime(selectedPayload.created_at)],
      ]
    : [];

  
  
  const numericHeaders = useMemo(() => {
    return datasetPreviewHeaders.filter((header) =>
      datasetPreviewRows.some((row) => isNumericValue(row[header]))
    );
  }, [datasetPreviewHeaders, datasetPreviewRows]);

  const timeLikeHeaders = useMemo(() => {
    return datasetPreviewHeaders.filter((header) => isTimeLikeHeader(header));
  }, [datasetPreviewHeaders]);

  const xAxisHeaders = useMemo(() => {
    const merged = [...timeLikeHeaders];

    numericHeaders.forEach((header) => {
      if (!merged.includes(header)) merged.push(header);
    });

    return merged;
  }, [timeLikeHeaders, numericHeaders]);

  const yAxisHeaders = numericHeaders;

  useEffect(() => {
    if (!xAxisHeaders.length || !yAxisHeaders.length) {
      setXColumn("");
      setYColumn("");
      return;
    }

    const preferredX = timeLikeHeaders[0] || xAxisHeaders[0];
    const preferredY =
      yAxisHeaders.find((header) => header !== preferredX) || yAxisHeaders[0];

    if (!xColumn || !xAxisHeaders.includes(xColumn)) setXColumn(preferredX);
    if (!yColumn || !yAxisHeaders.includes(yColumn)) setYColumn(preferredY);
  }, [xAxisHeaders, yAxisHeaders, timeLikeHeaders, xColumn, yColumn]);

  const xRangeLimit = useMemo(() => {
    if (!xColumn) return null;

    const values = datasetPreviewRows
      .map((row, index) => {
        const parsed = toNumberOrNull(row[xColumn]);
        return parsed !== null ? parsed : index;
      })
      .filter((value) => isNumericValue(value));

    if (!values.length) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [datasetPreviewRows, xColumn]);

  const yRangeLimit = useMemo(() => {
    if (!yColumn) return null;

    const values = datasetPreviewRows
      .map((row) => toNumberOrNull(row[yColumn]))
      .filter((value) => value !== null);

    if (!values.length) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [datasetPreviewRows, yColumn]);

  useEffect(() => {
    if (!xRangeLimit) return;
    setXRange([xRangeLimit.min, xRangeLimit.max]);
  }, [xRangeLimit]);

  useEffect(() => {
    if (!yRangeLimit) return;
    setYRange([yRangeLimit.min, yRangeLimit.max]);
  }, [yRangeLimit]);

  const resetPreviewSelection = () => {
    if (xRangeLimit) setXRange([xRangeLimit.min, xRangeLimit.max]);
    if (yRangeLimit) setYRange([yRangeLimit.min, yRangeLimit.max]);
  };

  const graphPoints = useMemo(() => {
    if (!xColumn || !yColumn) return [];

    return buildGraphPoints({
      rows: datasetPreviewRows,
      xColumn,
      yColumn,
      xRange,
      yRange,
    });
  }, [datasetPreviewRows, xColumn, yColumn, xRange, yRange]);

  const updateYRangeForSelectedXRange = (nextXRange) => {
    const selectedRows = datasetPreviewRows.filter((row, index) => {
      const parsed = toNumberOrNull(row[xColumn]);
      const x = parsed !== null ? parsed : index;
      return x >= nextXRange[0] && x <= nextXRange[1];
    });

    const selectedYValues = selectedRows
      .map((row) => toNumberOrNull(row[yColumn]))
      .filter((value) => value !== null);

    if (selectedYValues.length) {
      setYRange([
        Math.min(...selectedYValues),
        Math.max(...selectedYValues),
      ]);
    }
  };

  {/* File parsing helpers */ }
  const parseCsvRows = (text) => {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .map((line) => line.split(",").map((cell) => cell.trim()));
  };

  const parseExcelRows = async (file) => {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
  };

  {/* Dataset validation helpers */ }
  const validateDatasetRows = (rows) => {
    const cleanedRows = rows
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : []))
      .filter((row) => row.some((cell) => cell !== ""));

    if (cleanedRows.length < 2) {
      return "The dataset must include one header row and at least one data row.";
    }

    const [headersRow, ...dataRows] = cleanedRows;
    const extraHeaderColumns = headersRow.slice(2).filter((cell) => cell !== "");

    if (headersRow[0] !== "Time") {
      return 'The first column header must be exactly "Time".';
    }

    if (!headersRow[1]) {
      return "The second column must have a non-empty signal column name.";
    }

    if (extraHeaderColumns.length > 0) {
      return "The dataset must contain exactly two columns: Time and one numeric signal column.";
    }

    for (const row of dataRows) {
      const extraCells = row.slice(2).filter((cell) => cell !== "");
      if (extraCells.length > 0) {
        return "The dataset contains extra columns. Only Time and one numeric signal column are allowed.";
      }

      if (!row[0]) {
        return "Every data row must include a Time value.";
      }

      if (row[1] === "" || Number.isNaN(Number(row[1]))) {
        return "Every value in the second column must be numeric.";
      }
    }

    return "";
  };

  const validateDatasetFile = async (file) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(extension)) {
      return "Only CSV, XLSX, and XLS files are supported.";
    }

    const rows = extension === "csv"
      ? parseCsvRows(await file.text())
      : await parseExcelRows(file);

    return validateDatasetRows(rows);
  };

  const refreshBackendDatasetSelection = async (datasetId) => {
    if (!API_URL || !datasetId) return;

    setSelectedBackendDatasetLoading(true);
    setSelectedBackendDatasetError("");

    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}`);

      if (!response.ok) {
        throw new Error(`Failed to load dataset metadata (${response.status})`);
      }

      const payload = await response.json();
      setSelectedBackendDataset(payload);
    } catch (error) {
      setSelectedBackendDatasetError(error?.message || "Failed to load selected dataset metadata.");
    } finally {
      setSelectedBackendDatasetLoading(false);
    }
  };

  {/* Build Preview Data */ }
  const loadSelectedDatasetPreview = useCallback(async (dataset) => {
    if (!dataset) {
      setDatasetPreviewHeaders([]);
      setDatasetPreviewRows([]);
      setDatasetPreviewError("");
      setDatasetPreviewLoading(false);
      return;
    }

    const datasetId = getDatasetId(dataset);

    if (!datasetId) {
      setDatasetPreviewHeaders([]);
      setDatasetPreviewRows([]);
      setDatasetPreviewError("Selected dataset does not include a dataset ID.");
      setDatasetPreviewLoading(false);
      return;
    }

    if (!API_URL) {
      setDatasetPreviewHeaders([]);
      setDatasetPreviewRows([]);
      setDatasetPreviewError("VITE_API_URL is not configured.");
      setDatasetPreviewLoading(false);
      return;
    }

    setDatasetPreviewLoading(true);
    setDatasetPreviewError("");

    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}/preview`);

      if (!response.ok) {
        throw new Error(`Failed to load dataset preview (${response.status}).`);
      }

      const payload = await response.json();

      const previewHeaders = Array.isArray(payload?.headers) ? payload.headers : [];
      const previewRows = Array.isArray(payload?.rows) ? payload.rows : [];

      if (!previewHeaders.length || !previewRows.length) {
        throw new Error("No previewable rows found in the selected dataset.");
      }

      setDatasetPreviewHeaders(previewHeaders);
      setDatasetPreviewRows(previewRows);
    } catch (error) {
      setDatasetPreviewHeaders([]);
      setDatasetPreviewRows([]);
      setDatasetPreviewError(error?.message || "Failed to load dataset preview.");
    } finally {
      setDatasetPreviewLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    loadSelectedDatasetPreview(selectedBackendDataset);
  }, [selectedBackendDataset, loadSelectedDatasetPreview]);
  
  {/* Delete dataset helper */ }
  const handleDeleteBackendDataset = async (dataset) => {
    const datasetId = getDatasetId(dataset);
    if (!API_URL || !datasetId) return;

    const shouldDelete = window.confirm(`Delete dataset "${getDatasetDisplayName(dataset)}"?`);
    if (!shouldDelete) return;

    setDeletingDatasetId(datasetId);
    setDatasetUploadError("");
    setDatasetUploadSuccess("");

    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete dataset (${response.status}). Confirm the backend DELETE /datasets/:dataset_id route exists.`);
      }

      if (getDatasetId(selectedBackendDataset) === datasetId) {
        setSelectedBackendDataset(null);
      }

      setDatasetUploadSuccess("Dataset deleted.");
      await fetchBackendResources({ silent: true });
    } catch (error) {
      setDatasetUploadError(error?.message || "Failed to delete dataset.");
    } finally {
      setDeletingDatasetId("");
    }
  };

  {/* File conversion to payload Helpers */ }
  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    setDatasetUploadLoading(true);
    setDatasetUploadError("");
    setDatasetUploadSuccess("");

    try {
      if (!API_URL) {
        throw new Error("Missing VITE_API_URL. Add your Render backend URL to the frontend .env file.");
      }

      const validationError = await validateDatasetFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/datasets/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = `Failed to upload dataset (${response.status})`;
        try {
          const errorPayload = await response.json();
          message = errorPayload?.message || errorPayload?.error || message;
        } catch {
          const errorText = await response.text();
          if (errorText) message = errorText;
        }
        throw new Error(message);
      }

      const uploadedDataset = await response.json();
      setSelectedBackendDataset(uploadedDataset);
      setDatasetUploadSuccess(`Uploaded dataset: ${uploadedDataset?.name || uploadedDataset?.original_filename || file.name}`);
      await fetchBackendResources({ silent: true });
    } catch (error) {
      setDatasetUploadError(error?.message || "Failed to upload dataset.");
    } finally {
      setDatasetUploadLoading(false);
    }
  };

  const handleRunAnalysis = () => {
    startAnalysis?.();
    setPage("results");
  };

  return (
    <motion.div
      key="workspace"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-8"
    >
      {/* Summary Dashboard */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Summary of backend datasets, available ML models, and recent jobs.</p>
        </div>

        {dashboardError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {dashboardError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Datasets"
            value={dashboardLoading ? "..." : dashboardDatasets.length}
            sub={dashboardDatasets.length ? "stored dataset records" : "No dataset metadata found"}
            icon={Database}
          />
          <StatCard
            title="ML Models"
            value={dashboardLoading ? "..." : dashboardModels.length}
            sub={dashboardModels.length ? "registered model records" : "No model metadata found"}
            icon={BarChart3}
          />
          <StatCard
            title="Latest Dataset"
            value={dashboardLoading ? "..." : latestDataset ? formatDateTime(getRecordTimestamp(latestDataset)) : "—"}
            sub={latestDataset ? getDatasetDisplayName(latestDataset) : "Most recent dataset upload"}
            icon={Clock3}
          />
        </div>

        <Card className="mt-6 rounded-[28px] border-slate-200">
          <CardHeader>
            <CardTitle>Stored Assets Details</CardTitle>
            <CardDescription>Datasets and models in our resources.</CardDescription>
          </CardHeader>

          <CardContent>
            {dashboardLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">Loading backend records...</div>
            ) : !recentDashboardItems.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">No backend records found.</div>
            ) : (
              <div className="space-y-3">
                {recentDashboardItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="max-w-[360px] truncate text-xs text-slate-500">{item.name}</p>
                      <p className="mt-1 max-w-[360px] truncate font-mono text-[11px] text-slate-400">
                        {item.type === "dataset" ? "dataset_id" : "model_id"}: {item.id || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-400">{formatDateTime(item.timestamp)}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={!item.id || selectedDashboardRecordLoading}
                        onClick={() => handleOpenDashboardRecord(item)}
                      >
                        View metadata
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDashboardRecordError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {selectedDashboardRecordError}
              </div>
            ) : null}

            {selectedDashboardRecordLoading ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                Loading selected metadata...
              </div>
            ) : selectedDashboardRecord ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-900">Selected metadata</p>
                <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  {selectedRecordRows.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-white px-3 py-2">
                      <p className="font-mono text-[11px] text-slate-400">{label}</p>
                      <p className="mt-1 break-words text-slate-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Dataset Upload and Selection */}
      <section ref={uploadRef} className="scroll-mt-28">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Upload Dataset</h2>
          <p className="text-sm text-slate-500">
            Upload a CSV or Excel dataset to the backend. The file must contain exactly two columns: Time and one numeric signal column.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[28px] border-2 border-dashed border-slate-200">
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-emerald-50 p-4 text-emerald-600">
                {datasetUploadLoading ? <Loader2 className="h-9 w-9 animate-spin" /> : <UploadCloud className="h-9 w-9" />}
              </div>

              <h3 className="mt-5 text-2xl font-semibold text-slate-900">Upload dataset file</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Accepted formats: CSV, XLSX, XLS. Required structure: first header exactly "Time", second header exactly "Voltage", with no extra columns.
                Time column is a String Time format, and Voltage column is numeric values. Example: Time: 0, Voltage: 0.5
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileChange}
                disabled={datasetUploadLoading}
              />

              <Button
                className="mt-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                onClick={handleChooseFile}
                disabled={datasetUploadLoading}
              >
                {datasetUploadLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {datasetUploadLoading ? "Uploading..." : "Choose File"}
              </Button>

              {datasetUploadError ? (
                <div className="mt-5 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                  {datasetUploadError}
                </div>
              ) : null}

              {datasetUploadSuccess ? (
                <div className="mt-5 flex w-full items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{datasetUploadSuccess}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Select uploaded dataset</CardTitle>
                  <CardDescription>Datasets loaded from the backend dataset metadata endpoint.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => fetchBackendResources({ silent: false })}
                  disabled={dashboardLoading}
                >
                  <RefreshCw className={dashboardLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {dashboardLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">Loading uploaded datasets...</div>
              ) : !dashboardDatasets.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">No uploaded datasets found.</div>
              ) : (
                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {dashboardDatasets.map((dataset) => {
                    const datasetId = getDatasetId(dataset);
                    const isSelected = getDatasetId(selectedBackendDataset) === datasetId;
                    const isDeleting = deletingDatasetId === datasetId;

                    return (
                      <div
                        key={datasetId || getDatasetDisplayName(dataset)}
                        className={isSelected
                          ? "rounded-2xl border border-emerald-300 bg-emerald-50 p-4"
                          : "rounded-2xl border border-slate-200 bg-white p-4"}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-500" />
                              <p className="truncate font-medium text-slate-900">{getDatasetDisplayName(dataset)}</p>
                            </div>
                            <p className="mt-1 truncate font-mono text-[11px] text-slate-400">dataset_id: {datasetId || "—"}</p>
                            <p className="mt-1 text-xs text-slate-500">Created: {formatDateTime(getRecordTimestamp(dataset))}</p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={!datasetId || selectedBackendDatasetLoading}
                              onClick={() => {
                                if (getDatasetId(selectedBackendDataset) === datasetId) {
                                  setSelectedBackendDataset(null);
                                  setSelectedBackendDatasetError("");
                                  return;
                                }

                                refreshBackendDatasetSelection(datasetId);
                              }}
                            >
                              <SearchCheck className="mr-2 h-4 w-4" />
                              Select Dataset
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-red-600 hover:text-red-700"
                              disabled={!datasetId || isDeleting}
                              onClick={() => handleDeleteBackendDataset(dataset)}
                            >
                              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedBackendDatasetError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {selectedBackendDatasetError}
                </div>
              ) : null}

              {selectedBackendDatasetLoading ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                  Loading selected dataset metadata...
                </div>
              ) : selectedBackendDataset ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-900">Selected dataset metadata</p>
                  <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    {[
                      ["dataset_id", selectedBackendDataset.dataset_id || "—"],
                      ["name", selectedBackendDataset.name || "—"],
                      ["original_filename", selectedBackendDataset.original_filename || "—"],
                      ["source", selectedBackendDataset.source || "—"],
                      ["created_at", formatDateTime(selectedBackendDataset.created_at)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-white px-3 py-2">
                        <p className="font-mono text-[11px] text-slate-400">{label}</p>
                        <p className="mt-1 break-words text-slate-700">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Dataset Preview */}
      <section ref={previewRef} className="scroll-mt-28">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Dataset Preview</h2>
            <p className="text-sm text-slate-500">Select a backend dataset, then inspect its signal before running analysis.</p>
          </div>

          <Button
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            disabled={!selectedBackendDataset || datasetPreviewLoading || !datasetPreviewRows.length}
            onClick={() => configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Continue to configuration
          </Button>
        </div>

        {!selectedBackendDataset ? (
          <Card className="rounded-[28px] border-2 border-dashed border-slate-200">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center text-slate-500">
              Select a dataset from the uploaded dataset list to preview it here.
            </CardContent>
          </Card>
        ) : datasetPreviewLoading ? (
          <Card className="rounded-[28px] border-2 border-dashed border-slate-200">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center text-slate-500">
              <Loader2 className="mb-3 h-6 w-6 animate-spin text-emerald-600" />
              Loading dataset preview...
            </CardContent>
          </Card>
        ) : datasetPreviewError ? (
          <Card className="rounded-[28px] border-red-200 bg-red-50">
            <CardContent className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center text-red-700">
              {datasetPreviewError}
            </CardContent>
          </Card>
        ) : !datasetPreviewRows.length ? (
          <Card className="rounded-[28px] border-2 border-dashed border-slate-200">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center text-slate-500">
              No previewable rows found for the selected dataset.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className="rounded-[28px] border-slate-200 xl:h-fit">
              <CardContent className="space-y-5 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dataset</p>
                  <p className="mt-1 break-words text-sm font-medium text-slate-700">
                    {getDatasetDisplayName(selectedBackendDataset)}
                  </p>
                  <p className="mt-1 break-words font-mono text-[11px] text-slate-400">
                    dataset_id: {getDatasetId(selectedBackendDataset) || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rows</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{datasetPreviewRows.length}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">X Axis</label>
                  <select value={xColumn} onChange={(e) => setXColumn(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                    {xAxisHeaders.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                {xRangeLimit && (
                  <RangeSliderControl label="X Range" min={xRangeLimit.min} max={xRangeLimit.max} value={xRange} onChange={setXRange} step={(xRangeLimit.max - xRangeLimit.min) / 300 || 0.01} />
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Y Axis</label>
                  <select value={yColumn} onChange={(e) => setYColumn(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                    {yAxisHeaders.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                {yRangeLimit && (
                  <RangeSliderControl label="Y Range" min={yRangeLimit.min} max={yRangeLimit.max} value={yRange} onChange={setYRange} step={(yRangeLimit.max - yRangeLimit.min) / 300 || 0.01} />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-slate-200">
              <CardContent className="p-5">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Full Signal Overview</h3>

                <SimpleSignalChart
                  points={graphPoints}
                  xLabel={xColumn}
                  yLabel={yColumn}
                  selectable
                  onBrushSelect={({ xRange }) => {
                    setXRange(xRange);
                    updateYRangeForSelectedXRange(xRange);
                  }}
                  onResetSelection={resetPreviewSelection}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Analysis Configuration */}
      <section ref={configRef} className="scroll-mt-28">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Configure Analysis</h2>
          <p className="text-sm text-slate-500">Keep only working analysis settings before generating results.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-slate-500" />
                Analysis settings
              </CardTitle>
              <CardDescription>Select only the settings needed for the current frontend analysis.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Window size</Label>
                <Select value={windowSize} onValueChange={setWindowSize}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="128">128</SelectItem>
                    <SelectItem value="256">256</SelectItem>
                    <SelectItem value="512">512</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Classification model</Label>
                <Select value={classifier} onValueChange={setClassifier}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random-forest">Random Forest</SelectItem>
                    <SelectItem value="svm">SVM</SelectItem>
                    <SelectItem value="gb">Gradient Boosting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <Label>Detrend signal</Label>
                  <p className="mt-1 text-xs text-slate-500">Reduce slow drifting in the signal.</p>
                </div>
                <Switch checked={normalization} onCheckedChange={setNormalization} />
              </div>

              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <Label>Prediction summary</Label>
                  <p className="mt-1 text-xs text-slate-500">Include a simple forecast summary in results.</p>
                </div>
                <Switch checked={predictionEnabled} onCheckedChange={setPredictionEnabled} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
                <CardDescription>Live preview and configuration summary based on uploaded data.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <SimpleSignalChart
                  points={analysisSummary?.points || []}
                  spikes={analysisSummary?.spikes || []}
                  thresholdLine={analysisSummary?.thresholdLine ?? null}
                  xLabel={analysisSummary?.xColumn || "X axis"}
                  yLabel={analysisSummary?.yColumn || "Y axis"}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoTile label="Dataset" value={datasetName || "—"} />
                  <InfoTile label="Sheet" value={selectedSheet || "—"} />
                  <InfoTile label="Signal" value={analysisSummary?.yColumn || "—"} />
                  <InfoTile label="Detrend" value={normalization ? "On" : "Off"} />
                  <InfoTile label="Model" value={formatModelName(classifier)} />
                  <InfoTile label="Window size" value={`${windowSize} samples`} />
                  <InfoTile label="Detected spikes" value={analysisSummary?.spikeCount || 0} />
                  <InfoTile label="Signal range" value={resultMetrics?.range ?? "No data"} />
                  <InfoTile label="Mean" value={resultMetrics?.mean ?? "No data"} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" className="rounded-2xl" onClick={() => setParamErrorOpen?.(true)}>Test validation</Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => setSaveConfigOpen?.(true)}>Save preset</Button>
              <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={!hasUploadedData} onClick={handleRunAnalysis}>Run analysis</Button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
