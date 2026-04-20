import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Filter, Search, BrainCircuit, Waves, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SectionTitle from "@/components/shared/SectionTitle";

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

function formatAxisValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function buildGraphPoints({
  rows,
  xColumn,
  yColumn,
  filterColumn,
  minFilter,
  maxFilter,
  timeRangePercent,
}) {
  let filteredRows = [...rows];

  if (timeRangePercent < 100) {
    const sliceLength = Math.max(20, Math.floor(filteredRows.length * (timeRangePercent / 100)));
    filteredRows = filteredRows.slice(0, sliceLength);
  }

  const points = [];

  filteredRows.forEach((row, index) => {
    const y = row[yColumn];
    if (!isNumericValue(y)) return;

    const xRaw = row[xColumn];
    const x = isNumericValue(xRaw) ? xRaw : index;

    if (filterColumn) {
      const filterValue = row[filterColumn];
      if (isNumericValue(filterValue)) {
        if (filterValue < minFilter || filterValue > maxFilter) return;
      }
    }

    points.push({ x, y, originalIndex: index });
  });

  return points;
}

function normalizeSeries(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);
  return values.map((v) => (v - min) / span);
}

function similarityScore(a, b) {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let diff = 0;
  for (let i = 0; i < len; i += 1) {
    diff += Math.abs(a[i] - b[i]);
  }
  const avgDiff = diff / len;
  return Math.max(0, 1 - avgDiff);
}

function extractPatternWindows(points, windowSize = 18, stride = 6) {
  if (points.length < windowSize) return [];

  const windows = [];
  for (let start = 0; start <= points.length - windowSize; start += stride) {
    const slice = points.slice(start, start + windowSize);
    const values = slice.map((p) => p.y);
    const normalized = normalizeSeries(values);
    const amplitude = Math.max(...values) - Math.min(...values);
    const slope = values[values.length - 1] - values[0];
    const centerIndex = start + Math.floor(windowSize / 2);

    windows.push({
      id: `window-${start}`,
      start,
      end: start + windowSize - 1,
      centerIndex,
      centerPoint: points[centerIndex],
      values,
      normalized,
      amplitude,
      slope,
    });
  }

  return windows;
}

function clusterPatterns(windows) {
  if (!windows.length) return [];

  const sorted = [...windows].sort((a, b) => b.amplitude - a.amplitude);
  const maxPatterns = Math.min(10, sorted.length);
  const seeds = sorted.slice(0, maxPatterns);

  const allAssigned = windows.map((window) => {
    const scores = seeds.map((seed, idx) => ({
      idx,
      score: similarityScore(seed.normalized, window.normalized),
    }));
    scores.sort((a, b) => b.score - a.score);
    return {
      window,
      bestSeedIndex: scores[0].idx,
      bestScore: scores[0].score,
    };
  });

  const rawPatterns = seeds
    .map((seed, seedIndex) => {
      const matches = allAssigned
        .filter((item) => item.bestSeedIndex === seedIndex && item.bestScore > 0.7)
        .map((item) => ({
          ...item.window,
          score: item.bestScore,
        }))
        .sort((a, b) => b.score - a.score);

      if (!matches.length) return null;

      const percent = Math.round((matches.length / Math.max(windows.length, 1)) * 100);

      return {
        seedIndex,
        percent,
        values: seed.values,
        normalized: seed.normalized,
        seed,
        matches,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.percent - a.percent);

  return rawPatterns.map((pattern, index) => {
    const title =
      index < 26
        ? `Pattern ${String.fromCharCode(65 + index)}`
        : `Pattern ${index + 1}`;

    return {
      ...pattern,
      id: title,
      title,
    };
  });
}

function buildInterpretation(match) {
  if (!match) return "No interpretation available.";

  const amplitudeText =
    match.amplitude > 20
      ? "strong local variation"
      : match.amplitude > 8
        ? "moderate local variation"
        : "subtle local variation";

  const slopeText =
    match.slope > 5
      ? "upward trend"
      : match.slope < -5
        ? "downward trend"
        : "stable trend";

  return `This segment shows ${amplitudeText} with a ${slopeText}. It is grouped as a similar local signal shape based on the currently filtered graph.`;
}

function miniPolyline(values, width = 180, height = 40) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = width / Math.max(values.length - 1, 1);
  const toY = (v) => height - ((v - min) / Math.max(max - min, 1e-6)) * (height - 10) - 5;
  return values.map((v, i) => `${i * step},${toY(v)}`).join(" ");
}

function SmallPatternCard({ title, percent, values, isActive = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border bg-white p-3 text-left transition ${
        isActive
          ? "border-sky-400 ring-2 ring-sky-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
        <span>{title}</span>
        <span>{percent}%</span>
      </div>
      <svg viewBox="0 0 180 40" className="h-10 w-full">
        <polyline
          fill="none"
          stroke="#7ea9d6"
          strokeWidth="3"
          points={miniPolyline(values, 180, 40)}
        />
      </svg>
    </button>
  );
}

function PatternDetailCard({ pattern }) {
  if (!pattern) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
        Select a pattern to view details
      </div>
    );
  }

  const chunks = [
    pattern.values,
    pattern.values.slice(0, 8),
    pattern.values.slice(4, 12),
    pattern.values.slice(8, 16),
  ].filter((arr) => arr.length > 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">{pattern.title}</p>
          <p className="text-sm text-slate-500">Detected from the current graph</p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-slate-900">{pattern.percent}%</p>
          <p className="text-xs text-slate-400">coverage</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-2">
          <svg viewBox="0 0 180 40" className="h-10 w-full">
            <polyline
              fill="none"
              stroke="#7ea9d6"
              strokeWidth="3"
              points={miniPolyline(chunks[0], 180, 40)}
            />
          </svg>
        </div>

        <div className="space-y-2">
          {chunks.slice(1).map((chunk, index) => (
            <div key={index} className="border-t border-slate-100 pt-2">
              <svg viewBox="0 0 180 24" className="h-6 w-full">
                <polyline
                  fill="none"
                  stroke="#7ea9d6"
                  strokeWidth="2.5"
                  points={miniPolyline(chunk, 180, 24)}
                />
              </svg>
            </div>
          ))}
        </div>

        <p className="text-xs leading-5 text-slate-500">
          Similar segments are grouped from the currently displayed signal using local window shape similarity.
        </p>
      </div>
    </div>
  );
}

function SliderControl({ label, min, max, value, onChange, step = 0.01 }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
        <span>{label}</span>
        <span className="text-slate-400">{formatAxisValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-sky-600"
      />
    </div>
  );
}

function MainSignalChart({
  points,
  xLabel,
  yLabel,
  highlightedMatches = [],
  selectedMatchId,
  onSelectMatch,
}) {
  if (!points.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        No graphable data for this selection
      </div>
    );
  }

  const width = 960;
  const height = 300;
  const paddingLeft = 56;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 42;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const toX = (value) =>
    paddingLeft + ((value - minX) / Math.max(maxX - minX, 1)) * chartWidth;

  const toY = (value) =>
    paddingTop + (1 - (value - minY) / Math.max(maxY - minY, 1)) * chartHeight;

  const polylinePoints = points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ");
  const areaPath = `
    M ${toX(points[0].x)} ${height - paddingBottom}
    L ${points.map((p) => `${toX(p.x)} ${toY(p.y)}`).join(" L ")}
    L ${toX(points[points.length - 1].x)} ${height - paddingBottom}
    Z
  `;

  const xTicks = Array.from({ length: 5 }, (_, i) => minX + ((maxX - minX) * i) / 4);
  const yTicks = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4);

  const selectedMatch = highlightedMatches.find((m) => m.id === selectedMatchId);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full">
        {yTicks.map((tick, i) => {
          const y = toY(tick);
          return (
            <g key={`y-${i}`}>
              <line x1={paddingLeft} x2={width - paddingRight} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                {formatAxisValue(tick)}
              </text>
            </g>
          );
        })}

        {xTicks.map((tick, i) => {
          const x = toX(tick);
          return (
            <g key={`x-${i}`}>
              <line x1={x} x2={x} y1={paddingTop} y2={height - paddingBottom} stroke="#f1f5f9" strokeWidth="1" />
              <text x={x} y={height - 12} textAnchor="middle" fontSize="11" fill="#94a3b8">
                {formatAxisValue(tick)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="#dbeafe" opacity="0.85" />
        <polyline fill="none" stroke="#6b9ed6" strokeWidth="3" points={polylinePoints} />

        {highlightedMatches.map((match) => {
          const cx = toX(match.centerPoint.x);
          const cy = toY(match.centerPoint.y);
          const active = match.id === selectedMatchId;

          return (
            <g key={match.id}>
              <circle
                cx={cx}
                cy={cy}
                r={active ? 7 : 5}
                fill={active ? "#ef4444" : "#f59e0b"}
                stroke="#ffffff"
                strokeWidth="2"
                style={{ cursor: "pointer" }}
                onClick={() => onSelectMatch(match)}
              />
            </g>
          );
        })}

        {selectedMatch && (
          <g>
            <rect
              x={Math.min(toX(selectedMatch.centerPoint.x) + 12, width - 235)}
              y={Math.max(toY(selectedMatch.centerPoint.y) - 90, 10)}
              width="220"
              height="94"
              rx="12"
              fill="#ffffff"
              stroke="#cbd5e1"
            />
            <text
              x={Math.min(toX(selectedMatch.centerPoint.x) + 24, width - 223)}
              y={Math.max(toY(selectedMatch.centerPoint.y) - 68, 32)}
              fontSize="11"
              fill="#334155"
            >
              X: {formatAxisValue(selectedMatch.centerPoint.x)}
            </text>
            <text
              x={Math.min(toX(selectedMatch.centerPoint.x) + 24, width - 223)}
              y={Math.max(toY(selectedMatch.centerPoint.y) - 52, 48)}
              fontSize="11"
              fill="#334155"
            >
              Y: {formatAxisValue(selectedMatch.centerPoint.y)}
            </text>

            <polyline
              fill="none"
              stroke="#7ea9d6"
              strokeWidth="2.5"
              points={selectedMatch.values
                .map((v, i, arr) => {
                  const px = Math.min(toX(selectedMatch.centerPoint.x) + 20, width - 227) + (i / Math.max(arr.length - 1, 1)) * 120;
                  const localMin = Math.min(...selectedMatch.values);
                  const localMax = Math.max(...selectedMatch.values);
                  const py =
                    Math.max(toY(selectedMatch.centerPoint.y) - 20, 58) +
                    (1 - (v - localMin) / Math.max(localMax - localMin, 1e-6)) * 26;
                  return `${px},${py}`;
                })
                .join(" ")}
            />
            <text
              x={Math.min(toX(selectedMatch.centerPoint.x) + 24, width - 223)}
              y={Math.max(toY(selectedMatch.centerPoint.y) - 8, 92)}
              fontSize="10"
              fill="#64748b"
            >
              similar local signal shape
            </text>
          </g>
        )}

        <text x={paddingLeft} y={16} fontSize="12" fill="#64748b">
          Y: {yLabel}
        </text>
        <text x={width - paddingRight} y={height - 12} textAnchor="end" fontSize="12" fill="#64748b">
          X: {xLabel}
        </text>
      </svg>
    </div>
  );
}

export default function Preview({
  setPage,
  datasetName,
  hasUploadedData,
  headers = [],
  tableRows = [],
  sheetNames = [],
  selectedSheet = "",
  onSheetChange,
  analysisCompleted = false,
  previewPredictionSummary = null,
}) {
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
      if (!merged.includes(header)) {
        merged.push(header);
      }
    });
    return merged;
  }, [timeLikeHeaders, numericHeaders]);

  const yAxisHeaders = useMemo(() => {
    return numericHeaders;
  }, [numericHeaders]);

  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [minFilter, setMinFilter] = useState(0);
  const [maxFilter, setMaxFilter] = useState(0);
  const [timeRangePercent, setTimeRangePercent] = useState(100);
  const [selectedPattern, setSelectedPattern] = useState("Pattern A");
  const [activeSimilarMatch, setActiveSimilarMatch] = useState(null);
  const [showAllPatterns, setShowAllPatterns] = useState(false);

  useEffect(() => {
    if (!xAxisHeaders.length || !yAxisHeaders.length) return;

    const preferredX = timeLikeHeaders[0] || xAxisHeaders[0];
    if (!xColumn || !xAxisHeaders.includes(xColumn)) {
      setXColumn(preferredX);
    }

    const preferredY =
      yAxisHeaders.find((header) => header !== preferredX) ||
      yAxisHeaders[0];

    if (!yColumn || !yAxisHeaders.includes(yColumn)) {
      setYColumn(preferredY);
    }
  }, [xAxisHeaders, yAxisHeaders, timeLikeHeaders, xColumn, yColumn]);

  useEffect(() => {
    if (!filterColumn) return;

    const values = tableRows
      .map((row) => row[filterColumn])
      .filter((value) => isNumericValue(value));

    if (!values.length) return;

    setMinFilter(Math.min(...values));
    setMaxFilter(Math.max(...values));
  }, [filterColumn, tableRows]);

  const filterColumnRange = useMemo(() => {
    if (!filterColumn) return null;

    const values = tableRows
      .map((row) => row[filterColumn])
      .filter((value) => isNumericValue(value));

    if (!values.length) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [filterColumn, tableRows]);

  const isSelectedXTimeLike = useMemo(() => {
    return isTimeLikeHeader(xColumn);
  }, [xColumn]);

  const graphPoints = useMemo(() => {
    if (!xColumn || !yColumn) return [];
    return buildGraphPoints({
      rows: tableRows,
      xColumn,
      yColumn,
      filterColumn,
      minFilter,
      maxFilter,
      timeRangePercent: isSelectedXTimeLike ? timeRangePercent : 100,
    });
  }, [
    tableRows,
    xColumn,
    yColumn,
    filterColumn,
    minFilter,
    maxFilter,
    timeRangePercent,
    isSelectedXTimeLike,
  ]);

  const patternWindows = useMemo(() => {
    return extractPatternWindows(graphPoints, 18, 6);
  }, [graphPoints]);

  const patterns = useMemo(() => {
    return clusterPatterns(patternWindows);
  }, [patternWindows]);

  useEffect(() => {
    if (!patterns.length) return;

    const stillExists = patterns.some((pattern) => pattern.title === selectedPattern);
    if (!stillExists) {
      setSelectedPattern(patterns[0].title);
      setActiveSimilarMatch(null);
    }
  }, [patterns, selectedPattern]);

  const selectedPatternData = useMemo(() => {
    return patterns.find((pattern) => pattern.title === selectedPattern) || patterns[0];
  }, [patterns, selectedPattern]);

  const visiblePatterns = useMemo(() => {
    return showAllPatterns ? patterns : patterns.slice(0, 3);
  }, [patterns, showAllPatterns]);

  const similarMatches = useMemo(() => {
    if (!selectedPatternData) return [];
    return selectedPatternData.matches.slice(0, 6);
  }, [selectedPatternData]);

  useEffect(() => {
    if (!similarMatches.length) {
      setActiveSimilarMatch(null);
      return;
    }

    const stillExists = similarMatches.some((match) => match.id === activeSimilarMatch?.id);
    if (!stillExists) {
      setActiveSimilarMatch(similarMatches[0]);
    }
  }, [similarMatches, activeSimilarMatch]);

  if (!hasUploadedData) {
    return (
      <motion.div
        key="preview"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
      >
        <SectionTitle
          title="Dataset Preview"
          desc="Preview will appear after you upload a file."
        />
        <Card className="rounded-[28px] border-dashed border-2 border-slate-200">
          <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-500">
              <Waves className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-slate-900">
              No dataset uploaded yet
            </h3>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Dataset Preview"
        desc="Choose the columns you want to visualize and filter."
        action={
          <Button
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setPage("configure")}
          >
            Continue to configuration
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
        <Card className="rounded-[28px] border-slate-200 xl:h-fit">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Filter className="h-5 w-5 text-slate-500" />
              Filters
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dataset</p>
              <p className="mt-1 break-words text-sm font-medium text-slate-700">
                {datasetName}
              </p>
            </div>

            {sheetNames.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Excel Sheet</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => onSheetChange?.(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  {sheetNames.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">X Axis</label>
              <select
                value={xColumn}
                onChange={(e) => setXColumn(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                {xAxisHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            {isSelectedXTimeLike && (
              <SliderControl
                label="Time Range"
                min={20}
                max={100}
                value={timeRangePercent}
                onChange={setTimeRangePercent}
                step={1}
              />
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Y Axis</label>
              <select
                value={yColumn}
                onChange={(e) => setYColumn(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                {yAxisHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Filter Column</label>
              <select
                value={filterColumn}
                onChange={(e) => setFilterColumn(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="">None</option>
                {numericHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            {filterColumn && filterColumnRange && (
              <>
                <SliderControl
                  label="Min Value"
                  min={filterColumnRange.min}
                  max={filterColumnRange.max}
                  value={minFilter}
                  onChange={setMinFilter}
                  step={(filterColumnRange.max - filterColumnRange.min) / 200 || 0.01}
                />
                <SliderControl
                  label="Max Value"
                  min={filterColumnRange.min}
                  max={filterColumnRange.max}
                  value={maxFilter}
                  onChange={setMaxFilter}
                  step={(filterColumnRange.max - filterColumnRange.min) / 200 || 0.01}
                />
              </>
            )}

            <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
              <div className="text-sm font-medium text-slate-700">Pattern Tools</div>
              <Button variant="outline" className="w-full justify-between rounded-2xl">
                Pattern Type
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full rounded-2xl">
                Find Similar Patterns
              </Button>
              <Button variant="outline" className="w-full rounded-2xl">
                Cluster Patterns
              </Button>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
              <div className="text-sm font-medium text-slate-700">Model</div>
              <Button variant="outline" className="w-full justify-between rounded-2xl">
                Random Forest
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-slate-200">
            <CardContent className="p-5">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Full Signal Overview
              </h3>
              <MainSignalChart
                points={graphPoints}
                xLabel={xColumn}
                yLabel={yColumn}
                highlightedMatches={similarMatches}
                selectedMatchId={activeSimilarMatch?.id}
                onSelectMatch={setActiveSimilarMatch}
              />
              {activeSimilarMatch && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      Selected Similar Spot
                    </p>
                    <p className="text-xs text-slate-500">
                      X {formatAxisValue(activeSimilarMatch.centerPoint.x)} · Y {formatAxisValue(activeSimilarMatch.centerPoint.y)}
                    </p>
                  </div>
                  <div className="mb-3 rounded-xl bg-white p-2">
                    <svg viewBox="0 0 220 40" className="h-10 w-full">
                      <polyline
                        fill="none"
                        stroke="#7ea9d6"
                        strokeWidth="2.5"
                        points={miniPolyline(activeSimilarMatch.values, 220, 40)}
                      />
                    </svg>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {buildInterpretation(activeSimilarMatch)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-[28px] border-slate-200">
              <CardContent className="p-5">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Correlation Panel
                </h3>

                <div className="mb-4 flex gap-2">
                  <Button variant="outline" className="rounded-2xl">Signal vs Environment</Button>
                  <Button variant="outline" className="rounded-2xl">Signal Features</Button>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <svg viewBox="0 0 420 180" className="h-[180px] w-full">
                    <line x1="40" y1="20" x2="40" y2="150" stroke="#94a3b8" />
                    <line x1="40" y1="150" x2="390" y2="150" stroke="#94a3b8" />
                    {graphPoints.slice(0, 10).map((point, i) => (
                      <circle
                        key={i}
                        cx={60 + i * 30}
                        cy={120 - ((i % 5) * 14)}
                        r="5"
                        fill={i % 2 === 0 ? "#93c5fd" : "#cbd5e1"}
                      />
                    ))}
                  </svg>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-slate-200">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Search className="h-5 w-5 text-slate-500" />
                  Find Similar Patterns
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                  {similarMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => setActiveSimilarMatch(match)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left ${
                        activeSimilarMatch?.id === match.id
                          ? "border-sky-400 bg-sky-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <span>{formatAxisValue(match.centerPoint.x)}</span>
                      <span className="font-medium text-slate-800">-{match.score.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-slate-200">
            <CardContent className="p-5">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Pattern Library
              </h3>
              <div className="space-y-3">
                {visiblePatterns.map((pattern) => (
                  <SmallPatternCard
                    key={pattern.title}
                    {...pattern}
                    isActive={selectedPattern === pattern.title}
                    onClick={() => {
                      setSelectedPattern(pattern.title);
                      if (pattern.matches.length) {
                        setActiveSimilarMatch(pattern.matches[0]);
                      }
                    }}
                  />
                ))}

                {patterns.length > 3 && (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl"
                    onClick={() => setShowAllPatterns((prev) => !prev)}
                  >
                    {showAllPatterns ? "Show Less" : `Show More (${patterns.length - 3} more)`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200">
            <CardContent className="p-5">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Pattern Details
              </h3>
              <PatternDetailCard pattern={selectedPatternData} />
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Prediction</h3>

              {!analysisCompleted || !previewPredictionSummary ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
                  Prediction will appear after the user runs the analysis from the configuration page.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Next spike</span>
                    <span className="font-semibold text-slate-800">
                      {typeof previewPredictionSummary.nextSpike === "number"
                        ? formatAxisValue(previewPredictionSummary.nextSpike)
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Trend</span>
                    <span className="font-semibold text-slate-800">
                      {previewPredictionSummary.trend || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Confidence</span>
                    <span className="font-semibold text-slate-800">
                      {previewPredictionSummary.confidence || "—"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-sky-50/50 p-3 text-slate-600">
                    <div className="font-medium text-slate-800">Model</div>
                    <p className="mt-1 text-sm">{previewPredictionSummary.model || "—"}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}