import React from "react";
import { motion } from "framer-motion";
import { Save, SlidersHorizontal, Waves, BrainCircuit, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SectionTitle from "@/components/shared/SectionTitle";

function formatAxisValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function RealSignalPreviewChart({ points, thresholdLine, spikes, xLabel, yLabel }) {
  if (!points.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        No graphable data available for the current dataset selection
      </div>
    );
  }

  const width = 940;
  const height = 260;
  const paddingLeft = 52;
  const paddingRight = 24;
  const paddingTop = 18;
  const paddingBottom = 38;

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
    paddingTop + (1 - (value - minY) / Math.max(maxY - minY, 1e-6)) * chartHeight;

  const polylinePoints = points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ");
  const xTicks = Array.from({ length: 5 }, (_, i) => minX + ((maxX - minX) * i) / 4);
  const yTicks = Array.from({ length: 4 }, (_, i) => minY + ((maxY - minY) * i) / 3);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        {yTicks.map((tick, i) => {
          const y = toY(tick);
          return (
            <g key={`y-${i}`}>
              <line x1={paddingLeft} x2={width - paddingRight} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
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

        <polyline fill="none" stroke="#16a34a" strokeWidth="3" points={polylinePoints} />

        {spikes.map((spike) => (
          <circle
            key={`spike-${spike.index}`}
            cx={toX(spike.x)}
            cy={toY(spike.y)}
            r="4"
            fill="#ef4444"
          />
        ))}

        <text x={paddingLeft} y={14} fontSize="12" fill="#64748b">
          Y: {yLabel}
        </text>
        <text x={width - paddingRight} y={height - 12} textAnchor="end" fontSize="12" fill="#64748b">
          X: {xLabel}
        </text>
      </svg>
    </div>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default function Configure({
  setPage,
  filterType,
  setFilterType,
  windowSize,
  setWindowSize,
  threshold,
  setThreshold,
  classifier,
  setClassifier,
  sequenceModel,
  setSequenceModel,
  predictionEnabled,
  setPredictionEnabled,
  baselineRemoval,
  setBaselineRemoval,
  normalization,
  setNormalization,
  startAnalysis,
  setParamErrorOpen,
  setSaveConfigOpen,
  datasetName = "",
  selectedSheet = "",
  analysisSummary,
}) {
  const classifierLabel =
    classifier === "random-forest"
      ? "Random Forest"
      : classifier === "svm"
        ? "SVM"
        : "Gradient Boosting";

  const sequenceLabel =
    sequenceModel === "lstm"
      ? "LSTM"
      : sequenceModel === "transformer"
        ? "Transformer"
        : "Temporal CNN";

  const filterLabel =
    filterType === "butterworth"
      ? "Butterworth"
      : filterType === "wavelet"
        ? "Wavelet Denoising"
        : "No filtering";

  return (
    <motion.div
      key="configure"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Analysis Configuration"
        desc="Adjust how the real uploaded signal is cleaned, how patterns are detected, and how predictions are generated."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setParamErrorOpen(true)}
            >
              Test validation
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setSaveConfigOpen(true)}
            >
              <Save className="mr-2 h-4 w-4" />
              Save preset
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.02fr]">
        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-slate-500" />
                Signal cleaning
              </CardTitle>
              <CardDescription>
                Prepare the uploaded signal before pattern detection starts.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Filter type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="butterworth">Butterworth</SelectItem>
                    <SelectItem value="wavelet">Wavelet Denoising</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter order</Label>
                <Input defaultValue="4" className="rounded-2xl" />
              </div>

              <div className="space-y-2">
                <Label>Low cut (Hz)</Label>
                <Input defaultValue="0.5" className="rounded-2xl" />
              </div>

              <div className="space-y-2">
                <Label>High cut (Hz)</Label>
                <Input defaultValue="50" className="rounded-2xl" />
              </div>

              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <Label>Baseline drift removal</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Correct slow drifting based on the current uploaded signal.
                  </p>
                </div>
                <Switch checked={baselineRemoval} onCheckedChange={setBaselineRemoval} />
              </div>

              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <Label>Normalisation</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Scale the current uploaded signal for easier comparison.
                  </p>
                </div>
                <Switch checked={normalization} onCheckedChange={setNormalization} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-slate-500" />
                Pattern detection
              </CardTitle>
              <CardDescription>
                Control how the uploaded signal is split and how sensitive spike detection should be.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Window size</Label>
                <Select value={windowSize} onValueChange={setWindowSize}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="128">128</SelectItem>
                    <SelectItem value="256">256</SelectItem>
                    <SelectItem value="512">512</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Window overlap step</Label>
                <Input defaultValue="64" className="rounded-2xl" />
              </div>

              <div className="space-y-2">
                <Label>Spike sensitivity</Label>
                <Input
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum peak distance</Label>
                <Input defaultValue="10" className="rounded-2xl" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-slate-500" />
                Model setup
              </CardTitle>
              <CardDescription>
                Choose how the system classifies detected patterns and predicts future behaviour.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Classification model</Label>
                <Select value={classifier} onValueChange={setClassifier}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random-forest">Random Forest</SelectItem>
                    <SelectItem value="svm">SVM</SelectItem>
                    <SelectItem value="gb">Gradient Boosting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <Label>Enable temporal prediction</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Forecast what might happen next in this uploaded signal.
                  </p>
                </div>
                <Switch
                  checked={predictionEnabled}
                  onCheckedChange={setPredictionEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Prediction model</Label>
                <Select value={sequenceModel} onValueChange={setSequenceModel}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lstm">LSTM</SelectItem>
                    <SelectItem value="transformer">Transformer</SelectItem>
                    <SelectItem value="tcn">Temporal CNN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Training epochs</Label>
                <Input defaultValue="25" className="rounded-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-slate-500" />
                Live signal preview
              </CardTitle>
              <CardDescription>
                This preview is generated from the uploaded dataset, current sheet, and detected signal columns.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <RealSignalPreviewChart
                points={analysisSummary?.points || []}
                thresholdLine={analysisSummary?.thresholdLine ?? null}
                spikes={analysisSummary?.spikes || []}
                xLabel={analysisSummary?.xColumn || "X axis"}
                yLabel={analysisSummary?.yColumn || "Y axis"}
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Dataset" value={datasetName || "No file"} />
                <SummaryTile label="Sheet" value={selectedSheet || "Default"} />
                <SummaryTile label="Signal" value={analysisSummary?.yColumn || "No Y column"} />
                <SummaryTile label="Cleaning mode" value={filterLabel} />
                <SummaryTile label="Spike sensitivity" value={`${threshold} σ`} />
                <SummaryTile label="Detected spikes" value={`${analysisSummary?.spikeCount || 0}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Current parameter summary</CardTitle>
              <CardDescription>
                Quick overview of what will be applied to the uploaded signal.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SummaryTile label="Filter" value={filterLabel} />
              <SummaryTile label="Window size" value={`${windowSize} samples`} />
              <SummaryTile label="Spike sensitivity" value={`${threshold} σ`} />
              <SummaryTile label="Classifier" value={classifierLabel} />
              <SummaryTile
                label="Prediction mode"
                value={predictionEnabled ? sequenceLabel : "Prediction disabled"}
              />
              <SummaryTile
                label="Preview source"
                value={
                  analysisSummary?.xColumn && analysisSummary?.yColumn
                    ? `${analysisSummary.xColumn} vs ${analysisSummary.yColumn}`
                    : "Waiting for graph columns"
                }
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setPage("preview")}
            >
              Back
            </Button>
            <Button
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
              onClick={startAnalysis}
            >
              Run analysis
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
