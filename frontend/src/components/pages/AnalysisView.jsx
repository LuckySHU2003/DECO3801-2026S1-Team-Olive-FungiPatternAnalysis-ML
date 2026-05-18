import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Brain,
  LineChart,
  RefreshCw,
  Search,
  Sparkles,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionTitle from "@/components/shared/SectionTitle";

function getSummary(result) {
  return result?.summary || result?.output?.summary || {};
}

function getPatterns(result) {
  return Array.isArray(result?.output?.patterns) ? result.output.patterns : [];
}

function getPredictionWindow(result) {
  return Array.isArray(result?.output?.predicted_voltage_window)
    ? result.output.predicted_voltage_window
    : [];
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  return String(value);
}

function formatRecurrence(recurrence) {
  if (!recurrence || typeof recurrence !== "object") return "—";
  return Object.entries(recurrence)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function normalizeInputData(inputData = []) {
  return inputData
    .map((row, index) => {
      const time = Number(row?.time ?? row?.Time ?? row?.x ?? row?.X ?? index);
      const voltage = Number(row?.voltage ?? row?.Voltage ?? row?.y ?? row?.Y);
      if (!Number.isFinite(time) || !Number.isFinite(voltage)) return null;
      return { time, voltage, index };
    })
    .filter(Boolean);
}

function patternTooltip(pattern) {
  const fields = [
    ["pattern_id", pattern?.pattern_id],
    ["type", pattern?.type],
    ["start_time", pattern?.start_time],
    ["end_time", pattern?.end_time],
    ["frequency", pattern?.frequency],
    ["amplitude", pattern?.amplitude],
    ["interval", pattern?.interval],
  ];

  return fields
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${formatNumber(value)}`)
    .join("\n");
}

function buildPatternHighlights(inputData, patterns) {
  const points = normalizeInputData(inputData);
  if (!points.length || !Array.isArray(patterns)) return [];

  return patterns
    .map((pattern) => {
      const start = Number(pattern?.start_time);
      const end = Number(pattern?.end_time ?? pattern?.start_time);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

      if (start === end) {
        const closest = points.reduce((best, point) => {
          return Math.abs(point.time - start) < Math.abs(best.time - start) ? point : best;
        }, points[0]);

        return {
          kind: "point",
          point: closest,
          pattern,
          tooltip: patternTooltip(pattern),
        };
      }

      return {
        kind: "range",
        start: Math.min(start, end),
        end: Math.max(start, end),
        pattern,
        tooltip: patternTooltip(pattern),
      };
    })
    .filter(Boolean);
}

function mapPredictionSeries(inputData, predictionWindow) {
  const original = normalizeInputData(inputData);
  const predicted = Array.isArray(predictionWindow)
    ? predictionWindow
        .map((point) => {
          const time = Number(point?.time ?? point?.Time);
          const predictedVoltage = Number(point?.predicted_voltage ?? point?.predictedVoltage);
          if (!Number.isFinite(time) || !Number.isFinite(predictedVoltage)) return null;
          return { time, predictedVoltage };
        })
        .filter(Boolean)
    : [];

  if (original.length && predicted.length) {
    const lastOriginal = original[original.length - 1];
    return {
      original,
      predicted: [
        {
          time: lastOriginal.time,
          predictedVoltage: lastOriginal.voltage,
          isConnector: true,
        },
        ...predicted,
      ],
    };
  }

  return { original, predicted };
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="mt-2 text-sm text-slate-500">{value ?? "—"}</p>
    </div>
  );
}

function buildPath(points, xScale, yScale, valueKey) {
  return points
    .filter((point) => Number.isFinite(point?.time) && Number.isFinite(point?.[valueKey]))
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.time)} ${yScale(point[valueKey])}`)
    .join(" ");
}

function ResultChart({ inputData = [], patterns = [], predictionWindow = [], mode = "patterns", title, description }) {
  const [hoverInfo, setHoverInfo] = useState(null);

  const points = normalizeInputData(inputData);
  const highlights = useMemo(() => buildPatternHighlights(points, patterns), [points, patterns]);
  const predictionSeries = useMemo(
    () => mapPredictionSeries(points, predictionWindow),
    [points, predictionWindow]
  );

  const originalPoints = mode === "prediction" ? predictionSeries.original : points;
  const predictedPoints = mode === "prediction" ? predictionSeries.predicted : [];

  const showTooltip = (event, lines) => {
    const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    setHoverInfo({
      x: event.clientX - rect.left + 14,
      y: event.clientY - rect.top + 14,
      lines,
    });
  };

  const hideTooltip = () => setHoverInfo(null);

  if (!originalPoints.length) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <LineChart className="h-5 w-5" />
          </div>
        </div>
        <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
          No original input data passed into AnalysisView yet.
        </div>
      </div>
    );
  }

  const width = 960;
  const height = 320;
  const padding = { left: 58, right: 30, top: 26, bottom: 44 };

  const allTimeValues = [...originalPoints, ...predictedPoints].map((point) => point.time);
  const allVoltageValues = [
    ...originalPoints.map((point) => point.voltage),
    ...predictedPoints.map((point) => point.predictedVoltage),
  ].filter((value) => Number.isFinite(value));

  const xMin = Math.min(...allTimeValues);
  const xMax = Math.max(...allTimeValues);
  const yMin = Math.min(...allVoltageValues);
  const yMax = Math.max(...allVoltageValues);
  const yPadding = Math.max((yMax - yMin) * 0.12, 0.1);
  const safeXRange = xMax - xMin || 1;
  const safeYRange = yMax - yMin + yPadding * 2 || 1;

  const xScale = (value) =>
    padding.left + ((value - xMin) / safeXRange) * (width - padding.left - padding.right);

  const yScale = (value) =>
    height -
    padding.bottom -
    ((value - (yMin - yPadding)) / safeYRange) *
      (height - padding.top - padding.bottom);

  const originalPath = buildPath(originalPoints, xScale, yScale, "voltage");
  const predictedPath = buildPath(predictedPoints, xScale, yScale, "predictedVoltage");
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
          <LineChart className="h-5 w-5" />
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-[24px] border border-slate-200 bg-slate-50 p-3">
        {hoverInfo && (
          <div
            className="pointer-events-none absolute z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
            style={{ left: hoverInfo.x, top: hoverInfo.y }}
          >
            {hoverInfo.lines.map((line, index) => (
              <div key={index} className="whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] min-w-[760px] w-full">
          {ticks.map((tick) => {
            const x = padding.left + tick * (width - padding.left - padding.right);
            const time = xMin + tick * safeXRange;
            return (
              <g key={`x-${tick}`}>
                <line x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} stroke="#e2e8f0" />
                <text x={x} y={height - 14} textAnchor="middle" className="fill-slate-400 text-[11px]">
                  {formatNumber(time)}
                </text>
              </g>
            );
          })}

          {ticks.map((tick) => {
            const y = padding.top + tick * (height - padding.top - padding.bottom);
            const voltage = yMax + yPadding - tick * safeYRange;
            return (
              <g key={`y-${tick}`}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px]">
                  {formatNumber(voltage)}
                </text>
              </g>
            );
          })}

          {mode !== "prediction" &&
            highlights.map((highlight, index) => {
              if (highlight.kind === "range") {
                const x1 = xScale(highlight.start);
                const x2 = xScale(highlight.end);

                const lines = [
                  `pattern_id: ${highlight.pattern?.pattern_id ?? "—"}`,
                  `type: ${highlight.pattern?.type ?? "—"}`,
                  `start_time: ${formatNumber(highlight.pattern?.start_time)}`,
                  `end_time: ${formatNumber(highlight.pattern?.end_time)}`,
                  `frequency: ${formatNumber(highlight.pattern?.frequency)}`,
                  `amplitude: ${formatNumber(highlight.pattern?.amplitude)}`,
                  `interval: ${formatNumber(highlight.pattern?.interval)}`,
                ];

                return (
                  <rect
                    key={`range-${index}`}
                    x={x1}
                    y={padding.top}
                    width={Math.max(x2 - x1, 3)}
                    height={height - padding.top - padding.bottom}
                    fill="#f59e0b"
                    opacity="0.16"
                    onMouseMove={(event) => showTooltip(event, lines)}
                    onMouseLeave={hideTooltip}
                  />
                );
              }

              const lines = [
                `pattern_id: ${highlight.pattern?.pattern_id ?? "—"}`,
                `type: ${highlight.pattern?.type ?? "—"}`,
                `time: ${formatNumber(highlight.point.time)}`,
                `voltage: ${formatNumber(highlight.point.voltage)}`,
                `start_time: ${formatNumber(highlight.pattern?.start_time)}`,
                `end_time: ${formatNumber(highlight.pattern?.end_time)}`,
                `frequency: ${formatNumber(highlight.pattern?.frequency)}`,
                `amplitude: ${formatNumber(highlight.pattern?.amplitude)}`,
                `interval: ${formatNumber(highlight.pattern?.interval)}`,
              ];

              return (
                <circle
                  key={`point-${index}`}
                  cx={xScale(highlight.point.time)}
                  cy={yScale(highlight.point.voltage)}
                  r="7"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2"
                  onMouseMove={(event) => showTooltip(event, lines)}
                  onMouseLeave={hideTooltip}
                />
              );
            })}

          <path d={originalPath} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {mode === "prediction" && predictedPath && (
            <path
              d={predictedPath}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="3"
              strokeDasharray="8 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {mode === "prediction" &&
            predictedPoints
              .filter((point) => !point.isConnector)
              .map((point, index) => {
                const lines = [
                  `time: ${formatNumber(point.time)}`,
                  `predicted_voltage: ${formatNumber(point.predictedVoltage)}`,
                ];

                return (
                  <circle
                    key={`pred-${index}`}
                    cx={xScale(point.time)}
                    cy={yScale(point.predictedVoltage)}
                    r="5"
                    fill="#7c3aed"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    onMouseMove={(event) => showTooltip(event, lines)}
                    onMouseLeave={hideTooltip}
                  />
                );
              })}

          <text x={width / 2} y={height - 2} textAnchor="middle" className="fill-slate-500 text-[12px]">
            Time
          </text>
          <text x="16" y={height / 2} textAnchor="middle" transform={`rotate(-90 16 ${height / 2})`} className="fill-slate-500 text-[12px]">
            Voltage
          </text>
        </svg>
      </div>
    </div>
  );
}

function InterpretationPanel({ setRegenOpen, title, text }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Backend result interpretation for this tab.</p>
        </div>
        <Button variant="outline" className="rounded-2xl" onClick={() => setRegenOpen?.(true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate
        </Button>
      </CardHeader>
      <CardContent>
        <div className="min-h-[150px] rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          {text || "No generated interpretation is available yet."}
        </div>
      </CardContent>
    </Card>
  );
}

function patternSummaryCards(summary) {
  return [
    { icon: Search, label: "Total patterns", value: formatNumber(summary.total_patterns) },
    { icon: Sparkles, label: "Recurrence", value: formatRecurrence(summary.recurrence) },
    { icon: Activity, label: "Average frequency", value: formatNumber(summary.average_frequency) },
    { icon: LineChart, label: "Average amplitude", value: formatNumber(summary.average_amplitude) },
    { icon: BarChart3, label: "Average interval", value: formatNumber(summary.average_interval) },
  ];
}

function predictionSummaryCards(summary, result) {
  return [
    { icon: Brain, label: "Prediction window", value: formatNumber(result?.output?.prediction_window) },
    { icon: Activity, label: "Start time", value: formatNumber(summary.start_time) },
    { icon: Activity, label: "End time", value: formatNumber(summary.end_time) },
    { icon: LineChart, label: "Min predicted voltage", value: formatNumber(summary.min_predicted_voltage) },
    { icon: LineChart, label: "Max predicted voltage", value: formatNumber(summary.max_predicted_voltage) },
    { icon: Sparkles, label: "Average predicted voltage", value: formatNumber(summary.average_predicted_voltage) },
  ];
}

{/* Temporary holder for ChatCompletion Module */}
function buildInterpretation(type, result) {
  const summary = getSummary(result);
  if (!result) return "No result has been loaded for this tab yet.";

  if (type === "prediction") {
    return `Predicted voltage runs from time ${formatNumber(summary.start_time)} to ${formatNumber(summary.end_time)}. The predicted voltage range is ${formatNumber(summary.min_predicted_voltage)} to ${formatNumber(summary.max_predicted_voltage)}, with an average predicted voltage of ${formatNumber(summary.average_predicted_voltage)}.`;
  }

  return `The backend detected ${formatNumber(summary.total_patterns)} pattern(s). Recurrence: ${formatRecurrence(summary.recurrence)}. Average frequency is ${formatNumber(summary.average_frequency)}, average amplitude is ${formatNumber(summary.average_amplitude)}, and average interval is ${formatNumber(summary.average_interval)}.`;
}

function ResultTabLayout({ result, inputData, mode, graphTitle, graphDescription, cards, interpretationTitle, setRegenOpen }) {
  const patterns = getPatterns(result);
  const predictionWindow = getPredictionWindow(result);

  return (
    <div className="space-y-6">
      <ResultChart
        inputData={inputData}
        patterns={patterns}
        predictionWindow={predictionWindow}
        mode={mode}
        title={graphTitle}
        description={graphDescription}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <InterpretationPanel
        setRegenOpen={setRegenOpen}
        title={interpretationTitle}
        text={buildInterpretation(mode, result)}
      />
    </div>
  );
}

export default function Results({ setRegenOpen, completedAnalysis, analysisData, analysisResults, results, inputData }) {
  const resolvedResults =
    results ||
    analysisResults ||
    completedAnalysis?.results ||
    analysisData?.results ||
    {};

  const resolvedInputData =
    inputData ||
    completedAnalysis?.inputData ||
    analysisData?.inputData ||
    analysisData?.datasetPoints ||
    [];

  const detectResult = resolvedResults.detect_patterns;
  const explorationResult = resolvedResults.custom_exploration;
  const predictionResult = resolvedResults.predict_future;

  const recognitionCards = patternSummaryCards(getSummary(detectResult));
  const explorationCards = patternSummaryCards(getSummary(explorationResult));
  const predictionCards = predictionSummaryCards(getSummary(predictionResult), predictionResult);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <SectionTitle
          title="Results Dashboard"
          desc="Completed backend results from pattern recognition, custom exploration, and prediction."
        />

        <Button type="button" variant="outline" className="rounded-2xl" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Tabs defaultValue="pattern-recognition" className="mt-6">
        <TabsList className="h-auto flex-wrap rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="pattern-recognition" className="rounded-xl px-4 py-2">
            Pattern Recognition
          </TabsTrigger>
          <TabsTrigger value="pattern-exploration" className="rounded-xl px-4 py-2">
            Pattern Exploration
          </TabsTrigger>
          <TabsTrigger value="predict-pattern" className="rounded-xl px-4 py-2">
            Predict Pattern
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pattern-recognition" className="mt-5">
          <div className="mb-4 rounded-3xl bg-gradient-to-r from-emerald-50 to-white p-5">
            <h2 className="text-2xl font-bold text-slate-900">Pattern Recognition</h2>
            <p className="mt-1 text-sm text-slate-500">Detected recurring signal patterns and recognition-level summary.</p>
          </div>

          <ResultTabLayout
            result={detectResult}
            inputData={resolvedInputData}
            mode="patterns"
            graphTitle="Pattern recognition graph"
            graphDescription="Original signal with detected pattern highlights."
            cards={recognitionCards}
            interpretationTitle="Pattern recognition interpretation"
            setRegenOpen={setRegenOpen}
          />
        </TabsContent>

        <TabsContent value="pattern-exploration" className="mt-5">
          <div className="mb-4 rounded-3xl bg-gradient-to-r from-blue-50 to-white p-5">
            <h2 className="text-2xl font-bold text-slate-900">Pattern Exploration</h2>
            <p className="mt-1 text-sm text-slate-500">Custom exploration view for the selected time range and analysis settings.</p>
          </div>

          <ResultTabLayout
            result={explorationResult}
            inputData={resolvedInputData}
            mode="patterns"
            graphTitle="Pattern exploration graph"
            graphDescription="Original signal with custom exploration pattern highlights."
            cards={explorationCards}
            interpretationTitle="Pattern exploration interpretation"
            setRegenOpen={setRegenOpen}
          />
        </TabsContent>

        <TabsContent value="predict-pattern" className="mt-5">
          <div className="mb-4 rounded-3xl bg-gradient-to-r from-violet-50 to-white p-5">
            <h2 className="text-2xl font-bold text-slate-900">Predict Pattern</h2>
            <p className="mt-1 text-sm text-slate-500">Forecast output and predicted pattern behaviour.</p>
          </div>

          <ResultTabLayout
            result={predictionResult}
            inputData={resolvedInputData}
            mode="prediction"
            graphTitle="Predict pattern graph"
            graphDescription="Original signal continued with predicted voltage values."
            cards={predictionCards}
            interpretationTitle="Predict pattern interpretation"
            setRegenOpen={setRegenOpen}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export function AnalysisView(props) {
  return (
    <div className="space-y-12">
      <Results {...props} key="results" />
    </div>
  );
}
