import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Database,
  BarChart3,
  Brain,
  LineChart,
  ChevronRight,
  Play,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/shared/StatCard";
import SectionTitle from "@/components/shared/SectionTitle";

function formatAxisValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function formatDateTime(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleString();
}

function SignalPreviewChart({ points = [], spikes = [], xLabel = "X axis", yLabel = "Y axis" }) {
  if (!points.length) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        No signal preview available yet
      </div>
    );
  }

  const width = 900;
  const height = 240;
  const paddingLeft = 52;
  const paddingRight = 24;
  const paddingTop = 18;
  const paddingBottom = 38;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const toX = (value) =>
    paddingLeft + ((value - minX) / Math.max(maxX - minX, 1e-6)) * chartWidth;

  const toY = (value) =>
    paddingTop + (1 - (value - minY) / Math.max(maxY - minY, 1e-6)) * chartHeight;

  const polylinePoints = points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ");

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
        <polyline fill="none" stroke="#16a34a" strokeWidth="3" points={polylinePoints} />

        {spikes.slice(0, 60).map((spike) => (
          <circle
            key={`dash-spike-${spike.index}`}
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

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900 break-words">{value}</p>
    </div>
  );
}

export default function Dashboard({
  setPage,
  startAnalysis,
  datasetName,
  hasUploadedData,
  selectedSheet,
  resultMetrics,
  analysisSummary,
  analysisCompleted,
  classifier,
  sequenceModel,
  predictionEnabled,
  uploadedDatasets = [],
  analysisRuns = [],
}) {
  const latestRun = analysisRuns[0] || null;

  const bestModel = useMemo(() => {
    if (!analysisRuns.length) return "No model yet";

    const sorted = [...analysisRuns].sort((a, b) => a.rmse - b.rmse);
    const best = sorted[0];

    return best.classifier === "random-forest"
      ? "Random Forest"
      : best.classifier === "svm"
        ? "SVM"
        : best.classifier === "gb"
          ? "Gradient Boosting"
          : best.classifier;
  }, [analysisRuns]);

  const latestRmse = useMemo(() => {
    if (!analysisRuns.length) return "—";
    return `${Number(analysisRuns[0].rmse).toFixed(2)} RMSE`;
  }, [analysisRuns]);

  const predictionModelLabel = useMemo(() => {
    if (!predictionEnabled) return "Disabled";
    if (sequenceModel === "lstm") return "LSTM";
    if (sequenceModel === "transformer") return "Transformer";
    if (sequenceModel === "tcn") return "Temporal CNN";
    return sequenceModel || "Enabled";
  }, [predictionEnabled, sequenceModel]);

  const recentActivity = useMemo(() => {
    const uploadItems = uploadedDatasets.map((dataset) => ({
      type: "upload",
      title: "Dataset uploaded",
      detail: dataset.name,
      time: dataset.uploadedAt,
      badge: "Upload",
    }));

    const runItems = analysisRuns.map((run) => ({
      type: "run",
      title: "Analysis completed",
      detail: `${run.datasetName} · ${run.spikeCount} spikes`,
      time: run.completedAt,
      badge: "Run",
    }));

    return [...uploadItems, ...runItems]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5);
  }, [uploadedDatasets, analysisRuns]);

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Dashboard"
        desc="Summary of uploaded datasets, completed analyses, and the current workspace."
        action={
          <Button
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setPage("upload")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload dataset
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Datasets"
          value={uploadedDatasets.length}
          sub={
            uploadedDatasets.length > 0
              ? `${uploadedDatasets.length} uploaded in this workspace`
              : "No dataset uploaded yet"
          }
          icon={Database}
        />

        <StatCard
          title="Analyses"
          value={analysisRuns.length}
          sub={
            analysisRuns.length > 0
              ? `${analysisRuns.length} completed run${analysisRuns.length > 1 ? "s" : ""}`
              : "No completed analyses yet"
          }
          icon={BarChart3}
        />

        <StatCard
          title="Best Model"
          value={bestModel}
          sub={
            analysisRuns.length > 0
              ? "Lowest RMSE from completed runs"
              : "Available after analysis"
          }
          icon={Brain}
        />

        <StatCard
          title="Next Spike Error"
          value={latestRmse}
          sub={latestRun ? "Latest prediction run" : "No prediction run yet"}
          icon={LineChart}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Current workspace</CardTitle>
            <CardDescription>
              Latest uploaded dataset and current analysis state.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {!hasUploadedData ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                No dataset is currently loaded. Upload a file to begin preview and analysis.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoTile label="Dataset" value={datasetName || "No dataset"} />
                  <InfoTile label="Sheet" value={selectedSheet || "Default"} />
                  <InfoTile
                    label="Signal column"
                    value={analysisSummary?.yColumn || "Not detected"}
                  />
                  <InfoTile
                    label="Status"
                    value={analysisCompleted ? "Analysis completed" : "Ready to analyse"}
                  />
                </div>

                <SignalPreviewChart
                  points={analysisSummary?.points || []}
                  spikes={analysisCompleted ? analysisSummary?.spikes || [] : []}
                  xLabel={analysisSummary?.xColumn || "X axis"}
                  yLabel={analysisSummary?.yColumn || "Y axis"}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button
                className="justify-between rounded-2xl"
                variant="outline"
                onClick={() => setPage("preview")}
                disabled={!hasUploadedData}
              >
                <span>Open dataset preview</span>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                className="justify-between rounded-2xl"
                variant="outline"
                onClick={() => setPage("configure")}
                disabled={!hasUploadedData}
              >
                <span>Configure analysis</span>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                className="justify-between rounded-2xl"
                variant="outline"
                onClick={() => setPage("results")}
                disabled={!analysisCompleted}
              >
                <span>Open results</span>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                className="justify-between rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={startAnalysis}
                disabled={!hasUploadedData}
              >
                <span>{analysisCompleted ? "Run analysis again" : "Run analysis"}</span>
                <Play className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-400">
                  No activity yet.
                </div>
              ) : (
                recentActivity.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-slate-500 break-words">{item.detail}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(item.time)}</p>
                    </div>
                    <Badge variant="secondary">{item.badge}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {analysisCompleted && (
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Latest run highlights</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoTile label="Signal mean" value={resultMetrics?.mean ?? "No data"} />
                <InfoTile label="Signal range" value={resultMetrics?.range ?? "No data"} />
                <InfoTile label="Spike count" value={resultMetrics?.spikes ?? 0} />
                <InfoTile label="Prediction model" value={predictionModelLabel} />
                <InfoTile
                  label="Latest classifier"
                  value={
                    classifier === "random-forest"
                      ? "Random Forest"
                      : classifier === "svm"
                        ? "SVM"
                        : classifier === "gb"
                          ? "Gradient Boosting"
                          : classifier || "No model"
                  }
                />
                <InfoTile
                  label="Latest RMSE"
                  value={latestRun ? Number(latestRun.rmse).toFixed(2) : "—"}
                />
              </CardContent>
            </Card>
          )}

          {!analysisCompleted && hasUploadedData && (
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Next step</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>
                  Your dataset is uploaded and ready. Open the preview page to inspect the signal,
                  then configure the analysis to detect spikes and generate prediction results.
                </p>
                <Button
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setPage("configure")}
                >
                  Go to configuration
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}