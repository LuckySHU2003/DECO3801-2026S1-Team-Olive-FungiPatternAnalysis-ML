// SVG line chart used throughout the app for signal visualisation.
// Supports optional threshold line (amber dashed), spike markers (red dots),
// and a prediction overlay (purple dashed polyline).
import React from "react";
import { sampleSignal } from "@/constants/data";

/**
 * @param {number[]} data          - Voltage data array to plot
 * @param {number}   height        - SVG canvas height in px (default 220)
 * @param {boolean}  showThreshold - Render the amber threshold line
 * @param {boolean}  showPrediction - Render the LSTM forecast overlay
 */
export default function MiniLine({
  data = sampleSignal,
  height = 220,
  showThreshold = false,
  showPrediction = false,
}) {
  const width = 900;

  // Calculate y-axis domain with padding
  const min = Math.min(...data) - 10;
  const max = Math.max(...data) + 10;

  // Maps a voltage value to an SVG y-coordinate
  const toY = (v) => height - ((v - min) / (max - min)) * (height - 24) - 12;

  const step = width / Math.max(data.length - 1, 1);

  // Build the polyline points string
  const points = data.map((d, i) => `${i * step},${toY(d)}`).join(" ");

  // Threshold is fixed at -5 mV
  const thresholdY = toY(-5);

  // Prediction: offset the last 17 samples slightly upward
  const pred = data.map((d, i) => d + (i > data.length - 18 ? 6 : 0));
  const predPoints = pred.map((d, i) => `${i * step},${toY(d)}`).join(" ");

  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        {/* Background grid lines */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0" x2={width}
            y1={(height / 4) * i + 8}
            y2={(height / 4) * i + 8}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Main signal line */}
        <polyline fill="none" stroke="#16a34a" strokeWidth="3" points={points} />

        {/* Optional threshold line at -5 mV */}
        {showThreshold && (
          <line
            x1="0" x2={width}
            y1={thresholdY} y2={thresholdY}
            stroke="#f59e0b"
            strokeDasharray="8 8"
            strokeWidth="2"
          />
        )}

        {/* Optional LSTM prediction overlay */}
        {showPrediction && (
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeDasharray="10 6"
            strokeWidth="3"
            points={predPoints}
          />
        )}

        {/* Spike markers — red dot on any value above 8 mV */}
        {data.map((d, i) =>
          d > 8 ? (
            <circle key={i} cx={i * step} cy={toY(d)} r="4" fill="#ef4444" />
          ) : null
        )}
      </svg>
    </div>
  );
}
