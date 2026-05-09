import React, { useMemo, useRef, useState, useEffect } from "react";
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
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import StatCard from "@/components/shared/StatCard";

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
      const y = row[yColumn];
      if (!isNumericValue(y)) return null;

      const xRaw = row[xColumn];
      const x = isNumericValue(xRaw) ? xRaw : index;

      if (xRange && (x < xRange[0] || x > xRange[1])) return null;
      if (yRange && (y < yRange[0] || y > yRange[1])) return null;

      return { x, y, index };
    })
    .filter(Boolean);
}

function detectPreviewSpikes(points = []) {
  if (points.length < 5) return [];

  const values = points.map((p) => p.y);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  const threshold = avg + sd * 0.8;

  const detected = [];

  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];

    if (
      current.y > threshold &&
      current.y > points[i - 1].y &&
      current.y > points[i + 1].y
    ) {
      detected.push(current);
    }
  }

  return detected;
}

function getSpikeMeaning(spike, points) {
  if (!spike || !points.length) return "No spike selected.";

  const values = points.map((p) => p.y);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  if (spike.y > avg) {
    return "This spike shows a sudden increase in signal activity compared with the surrounding values.";
  }

  return "This point is a local signal change, but it is not much higher than the overall average.";
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
  const [selectedSpike, setSelectedSpike] = useState(null);

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
    setSelectedSpike(null);
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

  const chartSpikes = spikes.length ? spikes : detectPreviewSpikes(points);

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
            ? "Drag a box around a time area to zoom in. Click red dots to inspect spikes."
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
              className="cursor-pointer"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedSpike({
                  ...spike,
                  screenX: toX(spike.x),
                  screenY: toY(spike.y),
                  meaning: getSpikeMeaning(spike, points),
                });
              }}
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
            x={width - paddingRight}
            y={height - 12}
            textAnchor="end"
            fontSize="12"
            fill="#64748b"
          >
            X: {xLabel}
          </text>
        </svg>

        {selectedSpike && (
          <div
            className="absolute z-10 max-w-[270px] rounded-2xl border bg-white p-4 text-sm shadow-lg"
            style={{
              left: `${Math.min((selectedSpike.screenX / width) * 100, 72)}%`,
              top: `${Math.max((selectedSpike.screenY / height) * 100 - 8, 4)}%`,
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-900">Spike detail</p>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setSelectedSpike(null)}
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500">
              X: {formatAxisValue(selectedSpike.x)}
            </p>
            <p className="text-xs text-slate-500">
              Y: {formatAxisValue(selectedSpike.y)}
            </p>

            <div className="mt-3 h-12 rounded-xl bg-slate-50 px-2 py-1">
              <svg viewBox="0 0 180 42" className="h-full w-full">
                {(() => {
                  const index = points.findIndex(
                    (p) => p.index === selectedSpike.index
                  );

                  const local = points.slice(
                    Math.max(0, index - 8),
                    Math.min(points.length, index + 9)
                  );

                  if (local.length < 2) return null;

                  const localX = local.map((p) => p.x);
                  const localY = local.map((p) => p.y);
                  const lxMin = Math.min(...localX);
                  const lxMax = Math.max(...localX);
                  const lyMin = Math.min(...localY);
                  const lyMax = Math.max(...localY);

                  const miniPoints = local
                    .map((p) => {
                      const x =
                        ((p.x - lxMin) / Math.max(lxMax - lxMin, 1e-6)) * 170 +
                        5;
                      const y =
                        38 -
                        ((p.y - lyMin) / Math.max(lyMax - lyMin, 1e-6)) * 34;
                      return `${x},${y}`;
                    })
                    .join(" ");

                  return (
                    <polyline
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2"
                      points={miniPoints}
                    />
                  );
                })()}
              </svg>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-600">
              {selectedSpike.meaning}
            </p>
          </div>
        )}
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

  const numericHeaders = useMemo(() => {
    return headers.filter((header) =>
      tableRows.some((row) => isNumericValue(row[header]))
    );
  }, [headers, tableRows]);

  const timeLikeHeaders = useMemo(() => {
    return headers.filter((header) => isTimeLikeHeader(header));
  }, [headers]);

  const xAxisHeaders = useMemo(() => {
    const merged = [...timeLikeHeaders];

    numericHeaders.forEach((header) => {
      if (!merged.includes(header)) merged.push(header);
    });

    return merged;
  }, [timeLikeHeaders, numericHeaders]);

  const yAxisHeaders = numericHeaders;

  useEffect(() => {
    if (!xAxisHeaders.length || !yAxisHeaders.length) return;

    const preferredX = timeLikeHeaders[0] || xAxisHeaders[0];
    const preferredY =
      yAxisHeaders.find((header) => header !== preferredX) || yAxisHeaders[0];

    if (!xColumn || !xAxisHeaders.includes(xColumn)) setXColumn(preferredX);
    if (!yColumn || !yAxisHeaders.includes(yColumn)) setYColumn(preferredY);
  }, [xAxisHeaders, yAxisHeaders, timeLikeHeaders, xColumn, yColumn]);

  const xRangeLimit = useMemo(() => {
    if (!xColumn) return null;

    const values = tableRows
      .map((row, index) => {
        const raw = row[xColumn];
        return isNumericValue(raw) ? raw : index;
      })
      .filter((value) => isNumericValue(value));

    if (!values.length) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [tableRows, xColumn]);

  const yRangeLimit = useMemo(() => {
    if (!yColumn) return null;

    const values = tableRows
      .map((row) => row[yColumn])
      .filter((value) => isNumericValue(value));

    if (!values.length) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [tableRows, yColumn]);

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
      rows: tableRows,
      xColumn,
      yColumn,
      xRange,
      yRange,
    });
  }, [tableRows, xColumn, yColumn, xRange, yRange]);

  const updateYRangeForSelectedXRange = (nextXRange) => {
    const selectedRows = tableRows.filter((row, index) => {
      const raw = row[xColumn];
      const x = isNumericValue(raw) ? raw : index;
      return x >= nextXRange[0] && x <= nextXRange[1];
    });

    const selectedYValues = selectedRows
      .map((row) => row[yColumn])
      .filter((value) => isNumericValue(value));

    if (selectedYValues.length) {
      setYRange([
        Math.min(...selectedYValues),
        Math.max(...selectedYValues),
      ]);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onFileUpload?.(file);
    e.target.value = "";

    setTimeout(() => {
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
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
      <div className="sticky top-0 z-20 -mx-2 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Workspace</h1>
            <p className="text-sm text-slate-500">
              Upload, preview, configure, and run analysis in one flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => uploadRef.current?.scrollIntoView({ behavior: "smooth" })}>Upload</Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth" })}>Preview</Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => configRef.current?.scrollIntoView({ behavior: "smooth" })}>Configure</Button>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Real summary of uploaded datasets and recent activity.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard title="Datasets" value={uploadedDatasets.length} sub={uploadedDatasets.length ? "uploaded in this workspace" : "No dataset uploaded yet"} icon={Database} />
          <StatCard title="Analyses" value={analysisRuns.length} sub={analysisRuns.length ? "completed runs" : "No completed analysis yet"} icon={BarChart3} />
          <StatCard title="Last Run" value={analysisRuns.length ? formatDateTime(analysisRuns[0].completedAt) : "—"} sub="Most recent analysis" icon={Clock3} />
        </div>

        <Card className="mt-6 rounded-[28px] border-slate-200">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest uploads and analysis runs in this workspace.</CardDescription>
          </CardHeader>

          <CardContent>
            {!uploadedDatasets.length && !analysisRuns.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">No activity yet.</div>
            ) : (
              <div className="space-y-3">
                {uploadedDatasets.slice(0, 3).map((dataset) => (
                  <div key={`upload-${dataset.id}`} className="flex items-center justify-between rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Uploaded dataset</p>
                      <p className="max-w-[260px] truncate text-xs text-slate-500">{dataset.name}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(dataset.uploadedAt)}</span>
                  </div>
                ))}

                {analysisRuns.slice(0, 3).map((run, index) => (
                  <div key={`run-${index}`} className="flex items-center justify-between rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Analysis completed</p>
                      <p className="text-xs text-slate-500">{formatModelName(run.classifier)}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(run.completedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section ref={uploadRef} className="scroll-mt-28">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Upload Dataset</h2>
          <p className="text-sm text-slate-500">Upload a CSV or Excel file. Uploaded files are stored below and can be reopened.</p>
        </div>

        <Card className="rounded-[28px] border-2 border-dashed border-slate-200">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-emerald-50 p-4 text-emerald-600">
              <UploadCloud className="h-9 w-9" />
            </div>

            <h3 className="mt-5 text-2xl font-semibold text-slate-900">Upload your file</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Supports CSV, XLSX, and XLS files. Excel files with multiple sheets can be selected in preview.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button className="mt-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={handleChooseFile}>
              <UploadCloud className="mr-2 h-4 w-4" />
              Choose File
            </Button>

            {datasetName && (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <FileText className="h-4 w-4 text-slate-500" />
                Current dataset: {datasetName}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-[28px] border-slate-200">
          <CardHeader>
            <CardTitle>Uploaded datasets</CardTitle>
            <CardDescription>Reopen a previous upload and continue previewing or configuring it.</CardDescription>
          </CardHeader>

          <CardContent>
            {!uploadedDatasets.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">No uploaded datasets yet.</div>
            ) : (
              <div className="space-y-3">
                {uploadedDatasets.map((dataset) => (
                  <div key={dataset.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <p className="truncate font-medium text-slate-900">{dataset.name}</p>
                      </div>

                      <div className="mt-2 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <Table2 className="h-4 w-4" />
                          <span>{dataset.rows} rows · {dataset.columns} columns</span>
                        </div>
                        <div className="truncate">Sheet: {dataset.sheet || "Default"}</div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          <span>{formatDateTime(dataset.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        onOpenUploadedDataset?.(dataset);
                        setTimeout(() => {
                          previewRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }, 100);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section ref={previewRef} className="scroll-mt-28">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Dataset Preview</h2>
            <p className="text-sm text-slate-500">Select axes and ranges before running analysis.</p>
          </div>

          <Button
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            disabled={!hasUploadedData}
            onClick={() => configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Continue to configuration
          </Button>
        </div>

        {!hasUploadedData ? (
          <Card className="rounded-[28px] border-2 border-dashed border-slate-200">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center text-slate-500">No dataset uploaded yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className="rounded-[28px] border-slate-200 xl:h-fit">
              <CardContent className="space-y-5 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dataset</p>
                  <p className="mt-1 break-words text-sm font-medium text-slate-700">{datasetName}</p>
                </div>

                {sheetNames.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Excel Sheet</label>
                    <select value={selectedSheet} onChange={(e) => onSheetChange?.(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                      {sheetNames.map((sheet) => (
                        <option key={sheet} value={sheet}>{sheet}</option>
                      ))}
                    </select>
                  </div>
                )}

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
