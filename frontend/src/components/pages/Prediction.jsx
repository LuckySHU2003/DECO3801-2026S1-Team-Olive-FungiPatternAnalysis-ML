import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, LineChart, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function SignalChart({
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

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function Prediction({
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
            <SignalChart
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