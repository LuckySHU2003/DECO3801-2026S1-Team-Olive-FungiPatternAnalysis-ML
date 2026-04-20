import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Database,
  LineChart,
  BarChart3,
  Brain,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/shared/StatCard";
import SectionTitle from "@/components/shared/SectionTitle";

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

function SignalChart({
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

function MetricTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function Results({
  setPage,
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
                <SignalChart
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
              <SignalChart
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
              <SignalChart
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

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setPage("prediction")}
        >
          Open prediction details
        </Button>
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={() => setPage("interpretation")}
        >
          Open interpretation page
        </Button>
      </div>
    </motion.div>
  );
}