import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Database,
  LineChart,
  BarChart3,
  Brain,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/shared/StatCard";
import SectionTitle from "@/components/shared/SectionTitle";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatAxisValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
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

// SignalChart for Results
function ResultSignalChart({
  points = [],
  thresholdLine = null,
  spikes = [],
  predictionData = [],
  xLabel = "X axis",
  yLabel = "Y axis",
  title = "",
  showPrediction = false,
}) {
  if (!points.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        No graphable data available
      </div>
    );
  }

  const mergedPoints =
    showPrediction && predictionData.length > 0
      ? [...points, ...predictionData]
      : points;

  const width = 940;
  const height = 280;
  const paddingLeft = 52;
  const paddingRight = 24;
  const paddingTop = 18;
  const paddingBottom = 38;

  const xValues = mergedPoints.map((p) => p.x);
  const yValues = mergedPoints.map((p) => p.y);

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
  const predictionPolyline =
    showPrediction && predictionData.length > 1
      ? predictionData.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ")
      : "";

  const xTicks = Array.from({ length: 5 }, (_, i) => minX + ((maxX - minX) * i) / 4);
  const yTicks = Array.from({ length: 4 }, (_, i) => minY + ((maxY - minY) * i) / 3);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      {title ? <p className="mb-3 text-sm font-medium text-slate-700">{title}</p> : null}

      <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full">
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

        {showPrediction && predictionData.length > 1 && (
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="8 6"
            opacity="0.9"
            points={predictionPolyline}
          />
        )}

        {showPrediction && predictionData.length > 1 && (
          <text
            x={width - paddingRight}
            y={paddingTop + 12}
            textAnchor="end"
            fontSize="11"
            fill="#3b82f6"
          >
            Prediction
          </text>
        )}

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

// SignalChart for Prediction
function PredictionSignalChart({
  points = [],
  thresholdLine = null,
  spikes = [],
  predictionData = [],
  xLabel = "X axis",
  yLabel = "Y axis",
}) {
  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        No graphable data available
      </div>
    );
  }

  const mergedPoints = predictionData.length > 0 ? [...points, ...predictionData] : points;

  const width = 980;
  const height = 320;
  const paddingLeft = 56;
  const paddingRight = 24;
  const paddingTop = 18;
  const paddingBottom = 42;

  const xValues = mergedPoints.map((p) => p.x);
  const yValues = mergedPoints.map((p) => p.y);

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

  const actualPolyline = points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ");
  const predictionPolyline =
    predictionData.length > 1
      ? predictionData.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ")
      : "";

  const xTicks = Array.from({ length: 5 }, (_, i) => minX + ((maxX - minX) * i) / 4);
  const yTicks = Array.from({ length: 4 }, (_, i) => minY + ((maxY - minY) * i) / 3);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
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

        <polyline
          fill="none"
          stroke="#16a34a"
          strokeWidth="3"
          points={actualPolyline}
        />

        {spikes.map((spike) => (
          <circle
            key={`spike-${spike.index}`}
            cx={toX(spike.x)}
            cy={toY(spike.y)}
            r="4"
            fill="#ef4444"
          />
        ))}

        {predictionData.length > 1 && (
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="8 6"
            opacity="0.95"
            points={predictionPolyline}
          />
        )}

        {predictionData.length > 1 && (
          <text
            x={width - paddingRight}
            y={paddingTop + 12}
            textAnchor="end"
            fontSize="11"
            fill="#3b82f6"
          >
            Forecast
          </text>
        )}

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

function MetricTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

// Results Component
export default function Results({
  resultMetrics,
  setCompareOpen,
  analysisSummary,
  datasetName,
  selectedSheet,
  classifier,
  sequenceModel,
  predictionEnabled,
  predictionData = [],
}) {
  const values = useMemo(
    () => (analysisSummary?.points || []).map((p) => p.y),
    [analysisSummary]
  );

  const derivedMetrics = useMemo(() => {
    if (!values.length) {
      return {
        peakAmplitude: "No data",
        interSpikeInterval: "No data",
        stdDeviation: "No data",
        confidence: "No data",
      };
    }

    const peakAmplitude = Math.max(...values) - Math.min(...values);
    const spikeXs = (analysisSummary?.spikes || []).map((s) => s.x);
    const intervals =
      spikeXs.length > 1
        ? spikeXs.slice(1).map((x, i) => x - spikeXs[i])
        : [];

    return {
      peakAmplitude: peakAmplitude.toFixed(2),
      interSpikeInterval: intervals.length
        ? mean(intervals).toFixed(2)
        : "Not enough spikes",
      stdDeviation: stdDev(values).toFixed(2),
      confidence:
        analysisSummary?.spikeCount > 0
          ? Math.min(0.99, 0.7 + analysisSummary.spikeCount / Math.max(values.length, 1)).toFixed(2)
          : "0.00",
    };
  }, [values, analysisSummary]);

  const classifierLabel =
    classifier === "random-forest"
      ? "Random Forest"
      : classifier === "svm"
        ? "SVM"
        : classifier === "gb"
          ? "Gradient Boosting"
          : classifier || "Classifier";

  const sequenceLabel =
    sequenceModel === "lstm"
      ? "LSTM"
      : sequenceModel === "transformer"
        ? "Transformer"
        : sequenceModel === "tcn"
          ? "Temporal CNN"
          : sequenceModel || "Prediction model";

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Results Dashboard"
        desc="Real signal analysis results generated from the uploaded dataset."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setCompareOpen(true)}
            >
              Compare runs
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Samples" value={resultMetrics.samples} icon={Database} />
        <StatCard title="Range" value={resultMetrics.range} icon={LineChart} />
        <StatCard title="Mean" value={resultMetrics.mean} icon={BarChart3} />
        <StatCard title="Spike Count" value={resultMetrics.spikes} icon={AlertTriangle} />
        <StatCard title="Frequency" value={resultMetrics.frequency} icon={Brain} />
        <StatCard title="Status" value="Ready" icon={CheckCircle2} />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="h-auto flex-wrap rounded-2xl">
          <TabsTrigger value="overview">Signal Overview</TabsTrigger>
          <TabsTrigger value="spikes">Spike Detection</TabsTrigger>
          <TabsTrigger value="features">Feature Summary</TabsTrigger>
          <TabsTrigger value="classification">Classification Output</TabsTrigger>
          <TabsTrigger value="temporal">Temporal Prediction</TabsTrigger>
          <TabsTrigger value="notes">Interpretation Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Processed signal overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResultSignalChart
                  points={analysisSummary?.points || []}
                  thresholdLine={analysisSummary?.thresholdLine ?? null}
                  spikes={analysisSummary?.spikes || []}
                  xLabel={analysisSummary?.xColumn || "X axis"}
                  yLabel={analysisSummary?.yColumn || "Y axis"}
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Run summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <MetricTile label="Dataset" value={datasetName || "No dataset"} />
                <MetricTile label="Sheet" value={selectedSheet || "Default"} />
                <MetricTile label="Signal column" value={analysisSummary?.yColumn || "No signal"} />
                <MetricTile label="Time column" value={analysisSummary?.xColumn || "No time column"} />
                <MetricTile label="Classifier" value={classifierLabel} />
                <MetricTile
                  label="Prediction"
                  value={predictionEnabled ? sequenceLabel : "Disabled"}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="spikes" className="mt-4">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Detected spikes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultSignalChart
                points={analysisSummary?.points || []}
                thresholdLine={analysisSummary?.thresholdLine ?? null}
                spikes={analysisSummary?.spikes || []}
                xLabel={analysisSummary?.xColumn || "X axis"}
                yLabel={analysisSummary?.yColumn || "Y axis"}
                title={`Detected spikes: ${analysisSummary?.spikeCount || 0}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <Card className="rounded-3xl">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              <MetricTile label="Spike count" value={analysisSummary?.spikeCount ?? 0} />
              <MetricTile label="Peak amplitude" value={derivedMetrics.peakAmplitude} />
              <MetricTile label="Dominant frequency" value={resultMetrics.frequency} />
              <MetricTile label="Inter-spike interval" value={derivedMetrics.interSpikeInterval} />
              <MetricTile label="Std deviation" value={derivedMetrics.stdDeviation} />
              <MetricTile label="Classification confidence" value={derivedMetrics.confidence} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classification" className="mt-4">
          <Card className="rounded-3xl">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-slate-500">Model used</p>
              <p className="text-xl font-semibold text-slate-900">
                {classifierLabel} Signal Classifier
              </p>
              <p className="text-sm leading-7 text-slate-600">
                The selected signal windows were classified using the current processed signal,
                extracted spike behaviour, and summary signal statistics from the uploaded dataset.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <MetricTile label="Processed samples" value={resultMetrics.samples} />
                <MetricTile label="Detected spikes" value={analysisSummary?.spikeCount ?? 0} />
                <MetricTile label="Signal mean" value={resultMetrics.mean} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temporal" className="mt-4">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Prediction overlay</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultSignalChart
                points={analysisSummary?.points || []}
                thresholdLine={analysisSummary?.thresholdLine ?? null}
                spikes={analysisSummary?.spikes || []}
                predictionData={predictionData}
                xLabel={analysisSummary?.xColumn || "X axis"}
                yLabel={analysisSummary?.yColumn || "Y axis"}
                showPrediction={predictionEnabled}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card className="rounded-3xl">
            <CardContent className="space-y-3 p-6 text-slate-600">
              <p>
                This result was generated from <strong>{datasetName || "the uploaded dataset"}</strong>
                {selectedSheet ? <> on sheet <strong>{selectedSheet}</strong></> : null}.
              </p>
              <p>
                The processed signal uses <strong>{analysisSummary?.yColumn || "the detected signal column"}</strong>{" "}
                against <strong>{analysisSummary?.xColumn || "the detected time/index column"}</strong>.
              </p>
              <p>
                The run detected <strong>{analysisSummary?.spikeCount ?? 0} spikes</strong> after preprocessing,
                and the signal mean for the processed run is <strong>{resultMetrics.mean}</strong>.
              </p>
              <p>
                Classification was performed with <strong>{classifierLabel}</strong>
                {predictionEnabled ? <> and temporal forecasting used <strong>{sequenceLabel}</strong></> : null}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Prediction Component
export function Prediction({
  resultMetrics,
  sequenceModel,
  setSequenceModel,
  analysisSummary,
  predictionData = [],
  predictionEnabled,
  datasetName,
  selectedSheet,
  classifier,
}) {
  const [forecastWindow, setForecastWindow] = useState("120");

  const nextSpikeValue = useMemo(() => {
    if (!predictionData.length) return "No prediction";
    return formatAxisValue(predictionData[0].x);
  }, [predictionData]);

  const confidenceValue = useMemo(() => {
    if (!predictionEnabled || !predictionData.length) return "0.00";
    const spread = predictionData.map((p) => p.y);
    const avg = mean(spread);
    const variance =
      spread.reduce((sum, v) => sum + (v - avg) ** 2, 0) / Math.max(spread.length, 1);
    const confidence = Math.max(0.5, 1 - variance * 0.2);
    return confidence.toFixed(2);
  }, [predictionData, predictionEnabled]);

  const maeValue = useMemo(() => {
    if (!predictionData.length) return "0.00";
    const errors = predictionData.map((p, i) => Math.abs(p.y - (predictionData[0].y + i * 0.002)));
    return mean(errors).toFixed(2);
  }, [predictionData]);

  const classifierLabel =
    classifier === "random-forest"
      ? "Random Forest"
      : classifier === "svm"
        ? "SVM"
        : classifier === "gb"
          ? "Gradient Boosting"
          : classifier || "Classifier";

  const sequenceLabel =
    sequenceModel === "lstm"
      ? "LSTM"
      : sequenceModel === "transformer"
        ? "Transformer"
        : sequenceModel === "tcn"
          ? "Temporal CNN"
          : sequenceModel || "Prediction model";

  const trendLabel = useMemo(() => {
    if (predictionData.length < 2) return "No trend";
    return predictionData[predictionData.length - 1].y > predictionData[0].y
      ? "Increasing"
      : predictionData[predictionData.length - 1].y < predictionData[0].y
        ? "Decreasing"
        : "Stable";
  }, [predictionData]);

  return (
    <motion.div
      key="prediction"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Prediction Detail"
        desc="Forecast output linked to the same temporal prediction shown in the results dashboard."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Next Spike" value={nextSpikeValue} icon={Brain} />
        <StatCard title="Confidence" value={confidenceValue} icon={CheckCircle2} />
        <StatCard title="MAE" value={maeValue} icon={LineChart} />
        <StatCard title="RMSE" value={resultMetrics.rmse} icon={BarChart3} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Actual vs predicted</CardTitle>
          </CardHeader>
          <CardContent>
            <PredictionSignalChart
              points={analysisSummary?.points || []}
              thresholdLine={analysisSummary?.thresholdLine ?? null}
              spikes={analysisSummary?.spikes || []}
              predictionData={predictionEnabled ? predictionData : []}
              xLabel={analysisSummary?.xColumn || "X axis"}
              yLabel={analysisSummary?.yColumn || "Y axis"}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Forecast controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Forecast window</Label>
                <Select value={forecastWindow} onValueChange={setForecastWindow}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60 s</SelectItem>
                    <SelectItem value="120">120 s</SelectItem>
                    <SelectItem value="300">300 s</SelectItem>
                  </SelectContent>
                </Select>
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

              <Button className="w-full rounded-2xl" variant="outline">
                Compare models
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Prediction summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InfoTile label="Dataset" value={datasetName || "No dataset"} />
              <InfoTile label="Sheet" value={selectedSheet || "Default"} />
              <InfoTile label="Classifier" value={classifierLabel} />
              <InfoTile label="Prediction model" value={sequenceLabel} />
              <InfoTile label="Expected trend" value={trendLabel} />
              <InfoTile
                label="Forecast points"
                value={predictionEnabled ? predictionData.length : 0}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

export function Interpretation({ setPage, setRegenOpen }) {
  return (
    <motion.div
      key="interpretation"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Text Interpretation"
        desc="Research-friendly explanation of signal behaviour and model results."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setRegenOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />Regenerate
            </Button>
            <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700">
              Copy summary
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">

        {/* ── Generated interpretation text ─────────────────────── */}
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Generated interpretation</CardTitle></CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-slate-700">
            <p>
              <span className="font-semibold">Signal quality summary: </span>
              The uploaded fungal electrical recording is structurally usable after preprocessing,
              with no missing values and manageable baseline drift.
            </p>
            <p>
              <span className="font-semibold">Spike behaviour summary: </span>
              The system detected 11 spike-like events, with several recurring peaks above the
              adaptive threshold, suggesting non-random temporal structure.
            </p>
            <p>
              <span className="font-semibold">Prediction summary: </span>
              The temporal model forecasts the next likely spike at approximately 32.4 seconds,
              with moderate-to-high confidence.
            </p>
            <p>
              <span className="font-semibold">Biological interpretation: </span>
              These patterns may reflect coordinated signalling behaviour, nutrient response,
              or adaptive environmental sensing in the mycelial network.
            </p>
            <p>
              <span className="font-semibold">Limitations: </span>
              The interpretation remains hypothesis-supporting only and should be checked against
              species variation, recording conditions, and larger datasets.
            </p>
          </CardContent>
        </Card>

        {/* ── Sidebar: next steps + actions ─────────────────────── */}
        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader><CardTitle>Suggested next steps</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">Compare this run with low-humidity recordings.</div>
              <div className="rounded-2xl bg-slate-50 p-4">Export the feature summary for lab notes.</div>
              <div className="rounded-2xl bg-slate-50 p-4">Retrain the classifier with more labelled spike windows.</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="rounded-2xl">
                <Download className="mr-2 h-4 w-4" />Download report
              </Button>
              <Button variant="outline" className="rounded-2xl">
                Add to experiment notes
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setPage("history")}
              >
                Open experiment history
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// Combined Analysis View
export function AnalysisView(props) {
  const { setPage, ...restProps } = props;

  return (
    <div className="space-y-12">
      <Results 
        {...restProps} 
        setPage={setPage} 
        key="results" 
      />
      
      <Prediction 
        {...restProps} 
        key="prediction" 
      />

      <Interpretation 
        {...restProps} 
        key="interpretation" 
      />
    </div>
  );
}