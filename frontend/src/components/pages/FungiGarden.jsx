import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Droplets,
  Sun,
  Thermometer,
  Wind,
  Leaf,
  Sprout,
} from "lucide-react";

const speciesOptions = [
  {
    id: "oyster",
    name: "Oyster",
    scientific: "P. ostreatus",
    icon: "🍄",
    color: "#10b981",
    optima: {
      temperature: [18, 24],
      humidity: [80, 95],
      light: [200, 600],
      co2: [500, 1500],
      airflow: [0.1, 0.6],
    },
  },
  {
    id: "lions-mane",
    name: "Lion's Mane",
    scientific: "H. erinaceus",
    icon: "🦁",
    color: "#60a5fa",
    optima: {
      temperature: [18, 24],
      humidity: [85, 95],
      light: [100, 400],
      co2: [500, 1000],
      airflow: [0.1, 0.5],
    },
  },
  {
    id: "shiitake",
    name: "Shiitake",
    scientific: "L. edodes",
    icon: "🌰",
    color: "#f59e0b",
    optima: {
      temperature: [15, 21],
      humidity: [70, 90],
      light: [100, 500],
      co2: [1000, 3000],
      airflow: [0.1, 0.8],
    },
  },
  {
    id: "reishi",
    name: "Reishi",
    scientific: "G. lucidum",
    icon: "🔴",
    color: "#f87171",
    optima: {
      temperature: [24, 30],
      humidity: [85, 95],
      light: [50, 300],
      co2: [1000, 4000],
      airflow: [0.1, 0.7],
    },
  },
];

function scoreRange(value, [min, max]) {
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  const span = Math.max(max - min, 1);
  return Math.max(0, 1 - distance / span);
}

function calculateGrowthScore(values, species) {
  const scores = [
    scoreRange(values.temperature, species.optima.temperature),
    scoreRange(values.humidity, species.optima.humidity),
    scoreRange(values.light, species.optima.light),
    scoreRange(values.co2, species.optima.co2),
    scoreRange(values.airflow, species.optima.airflow),
  ];

  return Math.round(
    (scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100
  );
}

function getConditionLabel(score) {
  if (score >= 85) return "Thriving";
  if (score >= 65) return "Growing well";
  if (score >= 45) return "A little stressed";
  if (score >= 25) return "Struggling";
  return "Dormant";
}

function getRangeText(value, [min, max], lowText, goodText, highText) {
  if (value < min) return lowText;
  if (value > max) return highText;
  return goodText;
}

function SliderRow({
  icon: Icon,
  label,
  value,
  unit,
  min,
  max,
  step,
  color,
  onChange,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
          {label}
        </div>

        <div className="font-semibold text-emerald-600">
          {value}
          {unit}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-emerald-600"
      />
    </div>
  );
}

function MiniChart({ score, color }) {
  const points = Array.from({ length: 22 }, (_, index) => {
    const base = 35 + Math.sin(index / 2) * 12;
    const growth = (score / 100) * index * 1.8;
    const spike = index % 6 === 0 ? 18 : 0;
    return Math.max(8, Math.min(86, base + growth + spike));
  });

  const growthPoints = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    })
    .join(" ");

  const spikePoints = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - Math.min(92, value * 0.75 + 12);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Bioelectric response preview
          </p>
          <p className="text-xs text-slate-500">
            Educational signal estimate from the sliders
          </p>
        </div>

        <div className="flex gap-4 text-xs text-slate-500">
          <span>Growth</span>
          <span>Spike activity</span>
        </div>
      </div>

      <svg viewBox="0 0 100 100" className="h-28 w-full">
        {[25, 50, 75].map((line) => (
          <line
            key={line}
            x1="0"
            x2="100"
            y1={line}
            y2={line}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        <polyline
          points={growthPoints}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={spikePoints}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

export default function FungiGarden({ setPage }) {
  const canvasRef = useRef(null);
  const [speciesId, setSpeciesId] = useState("oyster");

  const [values, setValues] = useState({
    light: 420,
    humidity: 78,
    temperature: 22,
    co2: 820,
    airflow: 0.3,
  });

  const selectedSpecies =
    speciesOptions.find((species) => species.id === speciesId) ||
    speciesOptions[0];

  const growthScore = useMemo(
    () => calculateGrowthScore(values, selectedSpecies),
    [values, selectedSpecies]
  );

  const conditionLabel = getConditionLabel(growthScore);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const score = growthScore / 100;
    const color = selectedSpecies.color;

    const hexToRgba = (hex, alpha) => {
      const red = parseInt(hex.slice(1, 3), 16);
      const green = parseInt(hex.slice(3, 5), 16);
      const blue = parseInt(hex.slice(5, 7), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    };

    context.clearRect(0, 0, width, height);

    const bg = context.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#f0fdf4");
    bg.addColorStop(0.5, "#ffffff");
    bg.addColorStop(1, "#eff6ff");
    context.fillStyle = bg;
    context.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const groundY = height * 0.74;

    context.fillStyle = "rgba(16,185,129,0.06)";
    context.beginPath();
    context.arc(centerX, groundY - 80, 180 + score * 70, 0, Math.PI * 2);
    context.fill();

    if (values.light > 100) {
      const beams = Math.round(2 + values.light / 220);
      for (let i = 0; i < beams; i += 1) {
        const beamX = 80 + i * ((width - 160) / Math.max(1, beams - 1));
        const gradient = context.createLinearGradient(beamX, 0, beamX, height * 0.58);
        gradient.addColorStop(0, "rgba(251,191,36,0.20)");
        gradient.addColorStop(1, "rgba(251,191,36,0)");

        context.fillStyle = gradient;
        context.beginPath();
        context.moveTo(beamX - 18, 0);
        context.lineTo(beamX + 18, 0);
        context.lineTo(beamX + 58, height * 0.58);
        context.lineTo(beamX - 58, height * 0.58);
        context.closePath();
        context.fill();
      }
    }

    function seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    function drawBranch(x, y, angle, length, depth, seed) {
      if (depth <= 0 || length < 5) return;

      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(endX, endY);
      context.strokeStyle = hexToRgba(color, 0.2 + score * 0.6);
      context.lineWidth = Math.max(0.5, depth * 0.45);
      context.stroke();

      const spread = 0.3 + score * 0.48;
      const children = depth > 3 ? 3 : 2;

      for (let i = 0; i < children; i += 1) {
        const nextSeed = seed + i * 12.7;
        const angleOffset = (seededRandom(nextSeed) - 0.5) * spread * 2;
        drawBranch(
          endX,
          endY,
          angle + angleOffset,
          length * (0.55 + seededRandom(nextSeed + 4) * 0.2),
          depth - 1,
          nextSeed
        );
      }
    }

    const branchCount = Math.round(6 + score * 22);
    const branchLength = 40 + score * 95;
    const depth = 3 + Math.round(score * 4);

    for (let i = 0; i < branchCount; i += 1) {
      const seed = i * 137.5 + values.temperature * 3 + values.humidity * 0.7;
      const angle =
        -Math.PI / 2 +
        (seededRandom(seed) - 0.5) * Math.PI * (0.5 + score * 0.8);

      drawBranch(
        centerX + (seededRandom(seed + 2) - 0.5) * 40,
        groundY,
        angle,
        branchLength * (0.5 + seededRandom(seed + 1) * 0.7),
        depth,
        seed
      );
    }

    const particleCount = Math.round(score * 54);
    for (let i = 0; i < particleCount; i += 1) {
      const particleX =
        centerX +
        (Math.sin(i * 2.4) * 120 + Math.cos(i * 1.1) * 80) *
          (0.5 + score * 0.5);
      const particleY =
        groundY +
        (Math.cos(i * 1.7) * 80 + Math.sin(i * 0.9) * 50) *
          (0.5 + score * 0.5) -
        score * 55;

      context.beginPath();
      context.arc(
        particleX,
        particleY,
        1.5 + seededRandom(i) * 3,
        0,
        Math.PI * 2
      );
      context.fillStyle = hexToRgba(color, 0.3 + score * 0.55);
      context.fill();
    }

    const capHeight = 22 + score * 40;
    const capWidth = 30 + score * 92;
    const stalkHeight = 18 + score * 54;

    context.beginPath();
    context.ellipse(
      centerX,
      groundY - stalkHeight - capHeight / 2,
      capWidth / 2,
      capHeight / 2,
      0,
      0,
      Math.PI * 2
    );
    context.fillStyle = hexToRgba(color, 0.22 + score * 0.22);
    context.fill();
    context.strokeStyle = hexToRgba(color, 0.5 + score * 0.35);
    context.lineWidth = 2;
    context.stroke();

    context.beginPath();
    context.moveTo(centerX - 6, groundY);
    context.lineTo(centerX - 4, groundY - stalkHeight);
    context.lineTo(centerX + 4, groundY - stalkHeight);
    context.lineTo(centerX + 6, groundY);
    context.closePath();
    context.fillStyle = "#f5ead2";
    context.fill();
    context.strokeStyle = hexToRgba(color, 0.4);
    context.stroke();

    const ground = context.createLinearGradient(0, height * 0.78, 0, height);
    ground.addColorStop(0, "rgba(16,185,129,0.12)");
    ground.addColorStop(1, "rgba(16,185,129,0.04)");
    context.fillStyle = ground;
    context.fillRect(0, height * 0.78, width, height * 0.22);
  }, [growthScore, selectedSpecies, values]);

  const conditionTags = [
    {
      label: "Light",
      value: `${values.light} lux`,
      color: "#f59e0b",
      status: getRangeText(
        values.light,
        selectedSpecies.optima.light,
        "low",
        "good",
        "high"
      ),
    },
    {
      label: "Humidity",
      value: `${values.humidity}%`,
      color: "#60a5fa",
      status: getRangeText(
        values.humidity,
        selectedSpecies.optima.humidity,
        "dry",
        "optimal",
        "too wet"
      ),
    },
    {
      label: "Temp",
      value: `${values.temperature}°C`,
      color: "#f87171",
      status: getRangeText(
        values.temperature,
        selectedSpecies.optima.temperature,
        "cold",
        "optimal",
        "warm"
      ),
    },
    {
      label: "CO₂",
      value: `${values.co2} ppm`,
      color: "#34d399",
      status: getRangeText(
        values.co2,
        selectedSpecies.optima.co2,
        "low",
        "good",
        "elevated"
      ),
    },
    {
      label: "Airflow",
      value: `${values.airflow.toFixed(1)} m/s`,
      color: "#14b8a6",
      status: getRangeText(
        values.airflow,
        selectedSpecies.optima.airflow,
        "still",
        "good",
        "strong"
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Fungi Garden
          </h1>
          <p className="text-sm text-slate-500">
            Kid-friendly simulation mode. No dataset required.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPage?.("workspace")}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-900">
              Interactive growth simulation
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Use the sliders to test how environment changes may affect fungal
              growth. Uploading data is optional for a future version.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
              Species
            </p>

            <div className="grid grid-cols-2 gap-2">
              {speciesOptions.map((species) => (
                <button
                  key={species.id}
                  type="button"
                  onClick={() => setSpeciesId(species.id)}
                  className={`rounded-2xl border p-3 text-center transition ${
                    speciesId === species.id
                      ? "border-emerald-300 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-2xl">{species.icon}</span>
                  <span className="mt-1 block text-xs font-medium text-slate-800">
                    {species.name}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {species.scientific}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Environment controls
            </p>

            <SliderRow
              icon={Sun}
              label="Light"
              value={values.light}
              unit=" lux"
              min={0}
              max={1000}
              step={10}
              color="#f59e0b"
              onChange={(light) => setValues((prev) => ({ ...prev, light }))}
            />

            <SliderRow
              icon={Droplets}
              label="Humidity"
              value={values.humidity}
              unit="%"
              min={30}
              max={100}
              step={1}
              color="#60a5fa"
              onChange={(humidity) =>
                setValues((prev) => ({ ...prev, humidity }))
              }
            />

            <SliderRow
              icon={Thermometer}
              label="Temperature"
              value={values.temperature}
              unit="°C"
              min={5}
              max={40}
              step={1}
              color="#f87171"
              onChange={(temperature) =>
                setValues((prev) => ({ ...prev, temperature }))
              }
            />

            <SliderRow
              icon={Leaf}
              label="CO₂"
              value={values.co2}
              unit=" ppm"
              min={400}
              max={5000}
              step={10}
              color="#10b981"
              onChange={(co2) => setValues((prev) => ({ ...prev, co2 }))}
            />

            <SliderRow
              icon={Wind}
              label="Airflow"
              value={values.airflow}
              unit=" m/s"
              min={0}
              max={2}
              step={0.1}
              color="#14b8a6"
              onChange={(airflow) =>
                setValues((prev) => ({ ...prev, airflow }))
              }
            />
          </div>
        </aside>

        <main className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedSpecies.name} mycelium growth preview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Adjust sliders and watch the mycelium density, colour, and
                  activity change.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                <motion.span
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                Live preview
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={900}
              height={460}
              className="h-[460px] w-full rounded-3xl border border-emerald-100 bg-emerald-50"
            />
          </div>

          <section className="flex flex-wrap gap-2">
            {conditionTags.map((tag) => (
              <div
                key={tag.label}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.label}: <strong>{tag.value}</strong> — {tag.status}
              </div>
            ))}
          </section>

          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <svg className="mx-auto h-28 w-28" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke={
                    growthScore > 70
                      ? "#10b981"
                      : growthScore > 45
                        ? "#f59e0b"
                        : "#f87171"
                  }
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="201"
                  strokeDashoffset={201 - (201 * growthScore) / 100}
                  transform="rotate(-90 40 40)"
                  transition={{ duration: 0.5 }}
                />
              </svg>

              <p
                className="text-5xl font-bold"
                style={{
                  color:
                    growthScore > 70
                      ? "#10b981"
                      : growthScore > 45
                        ? "#f59e0b"
                        : "#f87171",
                }}
              >
                {growthScore}
              </p>
              <p className="mt-1 text-sm text-slate-500">{conditionLabel}</p>
            </div>

            <MiniChart score={growthScore} color={selectedSpecies.color} />
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Sprout className="h-4 w-4" />
              Kid-friendly explanation
            </div>
            This mode does not need a dataset because it is meant to be a playful
            educational simulation. The sliders let users explore what happens
            when temperature, humidity, light, CO₂, and airflow change. If
            environmental data is added later, it can be used to auto-fill these
            sliders as a starting point.
          </div>
        </main>
      </div>
    </div>
  );
}