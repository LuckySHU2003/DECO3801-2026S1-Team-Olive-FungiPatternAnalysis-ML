import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GitCompare, Info, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function normalize(values) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);
  return values.map((v) => (v - min) / span);
}

function stdDev(values) {
  if (!values.length) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildDatasetSignal(dataset, timePercent, amplitudePercent) {
  if (!dataset?.headers?.length || !dataset?.tableRows?.length) {
    return {
      xColumn: "",
      yColumn: "",
      points: [],
      values: [],
    };
  }

  const numericHeaders = dataset.headers.filter((header) =>
    dataset.tableRows.some((row) => isNumericValue(row[header]))
  );

  const xColumn =
    dataset.headers.find((header) => isTimeLikeHeader(header)) ||
    numericHeaders[0] ||
    "";

  const yColumn =
    numericHeaders.find((header) => header !== xColumn) ||
    numericHeaders[0] ||
    "";

  if (!xColumn || !yColumn) {
    return { xColumn: "", yColumn: "", points: [], values: [] };
  }

  let points = dataset.tableRows
    .map((row, index) => {
      const y = row[yColumn];
      if (!isNumericValue(y)) return null;
      const xRaw = row[xColumn];
      const x = isNumericValue(xRaw) ? xRaw : index;
      return { x, y, index };
    })
    .filter(Boolean);

  if (!points.length) {
    return { xColumn, yColumn, points: [], values: [] };
  }

  const sliceLength = Math.max(20, Math.floor(points.length * (timePercent / 100)));
  points = points.slice(0, sliceLength);

  const values = points.map((p) => p.y);
  const ampMin = Math.min(...values);
  const ampMax = Math.max(...values);
  const ampCut = ampMin + ((ampMax - ampMin) * amplitudePercent) / 100;

  const filteredPoints = points.filter((p) => p.y <= ampCut || amplitudePercent >= 99);

  return {
    xColumn,
    yColumn,
    points: filteredPoints,
    values: filteredPoints.map((p) => p.y),
  };
}

function extractPatternWindows(points, windowSize = 18, stride = 6) {
  if (points.length < windowSize) return [];

  const windows = [];
  for (let start = 0; start <= points.length - windowSize; start += stride) {
    const slice = points.slice(start, start + windowSize);
    const values = slice.map((p) => p.y);
    const normalized = normalize(values);

    const amplitude = Math.max(...values) - Math.min(...values);
    const slope = values[values.length - 1] - values[0];

    let oscillations = 0;
    for (let i = 1; i < values.length - 1; i += 1) {
      const prevDiff = values[i] - values[i - 1];
      const nextDiff = values[i + 1] - values[i];
      if ((prevDiff > 0 && nextDiff < 0) || (prevDiff < 0 && nextDiff > 0)) {
        oscillations += 1;
      }
    }

    windows.push({
      id: `window-${start}`,
      start,
      end: start + windowSize - 1,
      values,
      normalized,
      amplitude,
      slope,
      oscillations,
      centerX: slice[Math.floor(slice.length / 2)]?.x ?? start,
    });
  }

  return windows;
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

function clusterPatterns(windows) {
  if (!windows.length) return [];

  const sorted = [...windows].sort((a, b) => b.amplitude - a.amplitude);
  const seeds = sorted.slice(0, Math.min(8, sorted.length));

  const rawPatterns = seeds.map((seed, idx) => {
    const matches = windows
      .map((window) => ({
        ...window,
        score: similarityScore(seed.normalized, window.normalized),
      }))
      .filter((w) => w.score > 0.75)
      .sort((a, b) => b.score - a.score);

    if (!matches.length) return null;

    return {
      id: `pattern-${idx}`,
      label: `Pattern ${String.fromCharCode(65 + idx)}`,
      seed,
      matches,
      percent: Math.round((matches.length / Math.max(windows.length, 1)) * 100),
      avgAmplitude: mean(matches.map((m) => m.amplitude)),
      avgSlope: mean(matches.map((m) => m.slope)),
      avgOscillations: mean(matches.map((m) => m.oscillations)),
      avgDuration: mean(matches.map((m) => m.end - m.start + 1)),
    };
  }).filter(Boolean);

  return rawPatterns.sort((a, b) => b.percent - a.percent);
}

function comparePatternSets(patternsA, patternsB) {
  const all = [];

  patternsA.forEach((patternA) => {
    let bestMatch = null;
    let bestScore = -1;

    patternsB.forEach((patternB) => {
      const score = similarityScore(patternA.seed.normalized, patternB.seed.normalized);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = patternB;
      }
    });

    if (bestMatch && bestScore >= 0.78) {
      all.push({
        id: `${patternA.id}-${bestMatch.id}`,
        patternA,
        patternB: bestMatch,
        difference: Math.round(patternA.percent - bestMatch.percent),
        score: bestScore,
        status: "Common",
      });
    } else {
      all.push({
        id: `${patternA.id}-uniqueA`,
        patternA,
        patternB: null,
        difference: patternA.percent,
        score: 0,
        status: "Unique to A",
      });
    }
  });

  patternsB.forEach((patternB) => {
    const alreadyMatched = all.some((item) => item.patternB?.id === patternB.id);
    if (!alreadyMatched) {
      all.push({
        id: `${patternB.id}-uniqueB`,
        patternA: null,
        patternB,
        difference: -patternB.percent,
        score: 0,
        status: "Unique to B",
      });
    }
  });

  return all;
}

function buildInterpretation(item, datasetALabel, datasetBLabel) {
  if (!item) return "";

  if (item.status === "Common" && item.patternA && item.patternB) {
    const ampRatio =
      item.patternB.avgAmplitude > 0
        ? (item.patternA.avgAmplitude / item.patternB.avgAmplitude).toFixed(2)
        : "1.00";

    const longer =
      item.patternA.avgDuration > item.patternB.avgDuration
        ? datasetALabel
        : item.patternA.avgDuration < item.patternB.avgDuration
          ? datasetBLabel
          : "both datasets";

    return {
      title: `${item.patternA.label} is common across both datasets`,
      bullets: [
        `The local shape similarity score is ${(item.score * 100).toFixed(0)}%, so these patterns are grouped as the same family.`,
        `Amplitude ratio between ${datasetALabel} and ${datasetBLabel} is ${ampRatio}x.`,
        `The longer average duration appears in ${longer}.`,
        `Average oscillation count is ${item.patternA.avgOscillations.toFixed(1)} in ${datasetALabel} and ${item.patternB.avgOscillations.toFixed(1)} in ${datasetBLabel}.`,
      ],
    };
  }

  if (item.status === "Unique to A" && item.patternA) {
    return {
      title: `${item.patternA.label} only appears in ${datasetALabel}`,
      bullets: [
        `This pattern does not reach the similarity threshold in ${datasetBLabel}.`,
        `Average amplitude is ${item.patternA.avgAmplitude.toFixed(2)}.`,
        `Average duration is ${item.patternA.avgDuration.toFixed(0)} points.`,
        `Average oscillation count is ${item.patternA.avgOscillations.toFixed(1)}.`,
      ],
    };
  }

  if (item.status === "Unique to B" && item.patternB) {
    return {
      title: `${item.patternB.label} only appears in ${datasetBLabel}`,
      bullets: [
        `This pattern does not reach the similarity threshold in ${datasetALabel}.`,
        `Average amplitude is ${item.patternB.avgAmplitude.toFixed(2)}.`,
        `Average duration is ${item.patternB.avgDuration.toFixed(0)} points.`,
        `Average oscillation count is ${item.patternB.avgOscillations.toFixed(1)}.`,
      ],
    };
  }

  return {
    title: "Pattern comparison",
    bullets: ["No interpretation available."],
  };
}

function SmallSignalChart({ points = [], color = "#6b7280" }) {
  if (!points.length) {
    return <div className="h-[120px] rounded-2xl border border-dashed border-slate-200" />;
  }

  const width = 420;
  const height = 120;
  const padding = 12;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const toX = (value) =>
    padding + ((value - minX) / Math.max(maxX - minX, 1e-6)) * (width - padding * 2);

  const toY = (value) =>
    padding + (1 - (value - minY) / Math.max(maxY - minY, 1e-6)) * (height - padding * 2);

  const polyline = points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[120px] w-full rounded-2xl border border-slate-200 bg-white">
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={polyline} />
    </svg>
  );
}

function MiniPattern({ pattern }) {
  if (!pattern) {
    return <div className="text-sm text-slate-400">—</div>;
  }

  const width = 120;
  const height = 36;
  const values = pattern.seed.values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);

  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / span) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-[120px]">
      <polyline fill="none" stroke="#7ea9d6" strokeWidth="2.5" points={points} />
    </svg>
  );
}

function StatusButton({ status, onClick }) {
  const styles =
    status === "Common"
      ? "bg-slate-100 text-slate-700"
      : status === "Unique to A"
        ? "bg-sky-100 text-sky-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1 text-sm font-medium ${styles}`}
    >
      {status}
    </button>
  );
}

export default function CompareDatasets({
  setPage,
  uploadedDatasets = [],
}) {
  const validDatasets = uploadedDatasets.filter(
    (d) => d?.headers?.length && d?.tableRows?.length
  );

  const [datasetAId, setDatasetAId] = useState(validDatasets[0]?.id || "");
  const [datasetBId, setDatasetBId] = useState(validDatasets[1]?.id || validDatasets[0]?.id || "");
  const [timeRange, setTimeRange] = useState(100);
  const [amplitudeRange, setAmplitudeRange] = useState(100);
  const [frequencyRange, setFrequencyRange] = useState(100);
  const [selectedComparison, setSelectedComparison] = useState(null);

  const datasetA = validDatasets.find((d) => d.id === datasetAId) || null;
  const datasetB = validDatasets.find((d) => d.id === datasetBId) || null;

  const signalA = useMemo(
    () => buildDatasetSignal(datasetA, timeRange, amplitudeRange),
    [datasetA, timeRange, amplitudeRange]
  );

  const signalB = useMemo(
    () => buildDatasetSignal(datasetB, timeRange, amplitudeRange),
    [datasetB, timeRange, amplitudeRange]
  );

  const windowsA = useMemo(
    () => extractPatternWindows(signalA.points, Math.max(12, Math.floor(18 * (frequencyRange / 100))), 6),
    [signalA.points, frequencyRange]
  );

  const windowsB = useMemo(
    () => extractPatternWindows(signalB.points, Math.max(12, Math.floor(18 * (frequencyRange / 100))), 6),
    [signalB.points, frequencyRange]
  );

  const patternsA = useMemo(() => clusterPatterns(windowsA), [windowsA]);
  const patternsB = useMemo(() => clusterPatterns(windowsB), [windowsB]);

  const comparisons = useMemo(
    () => comparePatternSets(patternsA, patternsB),
    [patternsA, patternsB]
  );

  const interpretation = useMemo(
    () =>
      selectedComparison
        ? buildInterpretation(
            selectedComparison,
            datasetA?.name || "Dataset A",
            datasetB?.name || "Dataset B"
          )
        : null,
    [selectedComparison, datasetA, datasetB]
  );

  const datasetCountEnough = validDatasets.length >= 2;

  return (
    <motion.div
      key="compare"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Compare Dataset"
        desc="Compare real uploaded datasets by shared filters, signal pattern similarity, and status interpretation."
        action={
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPage("upload")}
          >
            Upload more datasets
          </Button>
        }
      />

      {!datasetCountEnough ? (
        <Card className="rounded-3xl">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <GitCompare className="h-10 w-10 text-slate-400" />
            <h3 className="mt-4 text-2xl font-semibold text-slate-900">
              Need at least 2 saved datasets
            </h3>
            <p className="mt-2 max-w-xl text-slate-500">
              Upload at least two datasets with parsed headers and rows, then reopen this page to compare their real signal patterns.
            </p>
            <Button
              className="mt-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setPage("upload")}
            >
              Go to upload
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="rounded-3xl xl:h-fit">
            <CardHeader>
              <CardTitle>Compare Mode</CardTitle>
              <CardDescription>Select the two uploaded datasets and shared filters.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Dataset A</label>
                <select
                  value={datasetAId}
                  onChange={(e) => setDatasetAId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  {validDatasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Dataset B</label>
                <select
                  value={datasetBId}
                  onChange={(e) => setDatasetBId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  {validDatasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">Shared Filters</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Time Range</span>
                    <span>{timeRange}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={timeRange}
                    onChange={(e) => setTimeRange(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Amplitude Range</span>
                    <span>{amplitudeRange}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={amplitudeRange}
                    onChange={(e) => setAmplitudeRange(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Frequency Range</span>
                    <span>{frequencyRange}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={frequencyRange}
                    onChange={(e) => setFrequencyRange(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Dataset A Overview</CardTitle>
                  <CardDescription>{datasetA?.name || "Dataset A"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SmallSignalChart points={signalA.points} color="#6b7280" />
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Dataset B Overview</CardTitle>
                  <CardDescription>{datasetB?.name || "Dataset B"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SmallSignalChart points={signalB.points} color="#86b88a" />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Pattern Comparison</CardTitle>
                <CardDescription>
                  Real pattern groups computed from the current filtered signals.
                </CardDescription>
              </CardHeader>

              <CardContent className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.2fr_1fr_80px_1fr_1fr] gap-3 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-600">
                    <div>Pattern</div>
                    <div>Dataset A</div>
                    <div>vs.</div>
                    <div>Dataset B</div>
                    <div>Status</div>
                  </div>

                  <div className="space-y-3 pt-3">
                    {comparisons.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1.2fr_1fr_80px_1fr_1fr] items-center gap-3 rounded-2xl border border-slate-200 p-3"
                      >
                        <div className="font-medium text-slate-900">
                          {item.patternA?.label || item.patternB?.label || "Pattern"}
                        </div>

                        <div className="flex items-center gap-3">
                          <MiniPattern pattern={item.patternA} />
                          <span className="text-sm text-slate-700">
                            {item.patternA ? `${item.patternA.percent}%` : "—"}
                          </span>
                        </div>

                        <div className="flex justify-center text-slate-500">
                          <ArrowRightLeft className="h-4 w-4" />
                        </div>

                        <div className="flex items-center gap-3">
                          <MiniPattern pattern={item.patternB} />
                          <span className="text-sm text-slate-700">
                            {item.patternB ? `${item.patternB.percent}%` : "—"}
                          </span>
                        </div>

                        <div>
                          <StatusButton status={item.status} onClick={() => setSelectedComparison(item)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Signal Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <svg viewBox="0 0 700 220" className="h-[220px] w-full">
                      <polyline
                        fill="none"
                        stroke="#7ea9d6"
                        strokeWidth="2.5"
                        points={
                          signalA.points.length
                            ? signalA.points
                                .map((p, i) => {
                                  const x = 20 + (i / Math.max(signalA.points.length - 1, 1)) * 660;
                                  const ys = signalA.points.map((q) => q.y);
                                  const minY = Math.min(...ys);
                                  const maxY = Math.max(...ys);
                                  const y = 20 + (1 - (p.y - minY) / Math.max(maxY - minY, 1e-6)) * 180;
                                  return `${x},${y}`;
                                })
                                .join(" ")
                            : ""
                        }
                      />
                      <polyline
                        fill="none"
                        stroke="#93c59a"
                        strokeWidth="2.5"
                        points={
                          signalB.points.length
                            ? signalB.points
                                .map((p, i) => {
                                  const x = 20 + (i / Math.max(signalB.points.length - 1, 1)) * 660;
                                  const ys = signalB.points.map((q) => q.y);
                                  const minY = Math.min(...ys);
                                  const maxY = Math.max(...ys);
                                  const y = 20 + (1 - (p.y - minY) / Math.max(maxY - minY, 1e-6)) * 180;
                                  return `${x},${y}`;
                                })
                                .join(" ")
                            : ""
                        }
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Correlation Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <svg viewBox="0 0 420 220" className="h-[220px] w-full">
                      <line x1="40" y1="20" x2="40" y2="190" stroke="#94a3b8" />
                      <line x1="40" y1="190" x2="390" y2="190" stroke="#94a3b8" />
                      {patternsA.slice(0, 8).map((pattern, i) => (
                        <circle
                          key={`a-${pattern.id}`}
                          cx={70 + i * 35}
                          cy={170 - Math.min(pattern.avgAmplitude * 18, 130)}
                          r="5"
                          fill="#7ea9d6"
                        />
                      ))}
                      {patternsB.slice(0, 8).map((pattern, i) => (
                        <circle
                          key={`b-${pattern.id}`}
                          cx={85 + i * 35}
                          cy={170 - Math.min(pattern.avgAmplitude * 18, 130)}
                          r="5"
                          fill="#93c59a"
                        />
                      ))}
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!selectedComparison} onOpenChange={(open) => !open && setSelectedComparison(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{interpretation?.title || "Pattern Detail"}</DialogTitle>
            <DialogDescription>
              Real comparison interpretation based on the selected pattern status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="mb-2 font-medium text-slate-900">{datasetA?.name || "Dataset A"}</p>
                  <MiniPattern pattern={selectedComparison?.patternA} />
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="mb-2 font-medium text-slate-900">{datasetB?.name || "Dataset B"}</p>
                  <MiniPattern pattern={selectedComparison?.patternB} />
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                <Info className="h-4 w-4" />
                Interpretation
              </div>
              <ul className="space-y-2 text-sm leading-6 text-slate-600">
                {interpretation?.bullets?.map((bullet, index) => (
                  <li key={index}>• {bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}