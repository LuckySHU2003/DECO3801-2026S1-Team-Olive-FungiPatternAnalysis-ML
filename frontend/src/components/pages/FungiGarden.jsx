import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Droplets,
  Sun,
  Thermometer,
  Wind,
  FlaskConical,
  Sprout,
  Activity,
  CircleAlert,
  BookOpen,
} from "lucide-react";



// Reference used for this educational simulation:
// Environmental Conditions for Fungal Growth, Mustan Siriyah University.
// https://uomustansiriyah.edu.iq/media/lectures/6/6_2017_01_21!08_17_16_PM.pdf
// Factors used: temperature, pH, oxygen/aeration, water availability, and light.
// Species: Aspergillus flavus, Penicillium chrysogenum,Cladosporium herbarum, Stachybotrys chartarum, and Pythium oligandrum.

const speciesOptions = [
  {
    id: "aspergillus-flavus",
    name: "Aspergillus flavus",
    scientific: "A. flavus",
    rootColor: "#16a34a",
    capColor: "#f59e0b",
    capHighlight: "#fef3c7",
    capStroke: "#92400e",
    stemColor: "#fff7ed",
    optima: {
      temperature: [25, 35],   // Fig.1: mesophile, opt ~30°C
      ph: [5.5, 6.0],          // acid-tolerant
      oxygen: [65, 100],       // facultative aerobe
      water: [65, 90],         // needs available water; not aquatic
      light: [50, 700],        // little effect on growth
    },
  },
  {
    id: "penicillium-chrysogenum",
    name: "Penicillium chrysogenum",
    scientific: "P. chrysogenum",
    rootColor: "#FF6666",
    capColor: "#c084fc",
    capHighlight: "#f3e8ff",
    capStroke: "#7e22ce",
    stemColor: "#faf5ff",
    optima: {
       temperature: [20, 25],   // Fig.1: opt ~22°C
      ph: [5.5, 6.0],          // acid-tolerant
      oxygen: [60, 100],       // aerobic
      water: [60, 85],         // moderate water needs
      light: [50, 700],        // little effect on veg growth
    },
  },
  {
    id: "cladosporium-herbarum",
    name: "Cladosporium herbarum",
    scientific: "C. herbarum",
    rootColor: "#22c55e",
    capColor: "#fb7185",
    capHighlight: "#ffe4e6",
    capStroke: "#be123c",
    stemColor: "#fff1f2",
    optima: {
      temperature: [18, 25],   // Fig.1: opt ~20°C
      ph: [5.0, 7.0],          // Fig.2a: broad peak across 5–7
      oxygen: [65, 100],       // aerobic
      water: [55, 85],         // moderate
      light: [50, 700],        // little effect on growth
    },
  },
  {
    id: "stachybotrys-chartarum",
    name: "Stachybotrys chartarum",
    scientific: "S. chartarum",
    rootColor: "#64748b",
    capColor: "#78350f",
    capHighlight: "#fbbf24",
    capStroke: "#451a03",
    stemColor: "#fef3c7",
    optima: {
      temperature: [20, 28],   // mesophile range
      ph: [5.0, 6.0],          // Fig.2b: sharp peak at acidic side ~5–6
      oxygen: [60, 100],       // aerobic
      water: [80, 100],        // high moisture species
      light: [50, 700],        // little effect on growth
    },
  },
  {
    id: "pythium-oligandrum",
    name: "Pythium oligandrum",
    scientific: "P. oligandrum",
    rootColor: "#FF99FF",
    capColor: "#fef9c3",
    capHighlight: "#ffffff",
    capStroke: "#ca8a04",
    stemColor: "#fefce8",
    optima: {
      temperature: [20, 25],   // mesophile
      ph: [6.0, 7.0],          // Fig.2c: peak near neutral 6–7
      oxygen: [55, 100],       // aerobic, aquatic habitat
      water: [75, 100],        // aquatic Oomycete (needs abundant water)
      light: [50, 700],        // little effect on growth
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
    scoreRange(values.ph, species.optima.ph),
    scoreRange(values.oxygen, species.optima.oxygen),
    scoreRange(values.water, species.optima.water),
    scoreRange(values.light, species.optima.light),
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

        <div className="font-semibold" style={{ color }}>
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

function SpeciesIcon({ species }) {
  return (
    <div className="relative mx-auto h-16 w-16">
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <g opacity="0.95">
          {species.id === "aspergillus-flavus" && (
            <>
              <line x1="40" y1="62" x2="40" y2="30" stroke={species.rootColor} strokeWidth="4" strokeLinecap="round" />
              <circle cx="40" cy="26" r="9" fill={species.capColor} stroke={species.capStroke} strokeWidth="3" />
              <circle cx="24" cy="40" r="5" fill={species.rootColor} opacity="0.75" />
              <circle cx="56" cy="42" r="5" fill={species.rootColor} opacity="0.75" />
              <line x1="40" y1="44" x2="24" y2="40" stroke={species.rootColor} strokeWidth="3" />
              <line x1="40" y1="44" x2="56" y2="42" stroke={species.rootColor} strokeWidth="3" />
            </>
          )}

          {species.id === "penicillium-chrysogenum" && (
            <>
              {Array.from({ length: 9 }).map((_, i) => {
                const x = 22 + i * 4.5;
                const y = 54 - i * 3;
                return (
                  <g key={i}>
                    <line x1="40" y1="64" x2={x} y2={y} stroke={species.rootColor} strokeWidth="2.5" />
                    <circle cx={x} cy={y} r="4" fill={species.capColor} stroke={species.capStroke} strokeWidth="1.5" />
                  </g>
                );
              })}
            </>
          )}

          {species.id === "cladosporium-herbarum" && (
            <>
              <circle cx="40" cy="40" r="8" fill={species.capColor} stroke={species.capStroke} strokeWidth="3" />
              {Array.from({ length: 16 }).map((_, i) => {
                const a = (Math.PI * 2 * i) / 16;
                const x = 40 + Math.cos(a) * 23;
                const y = 40 + Math.sin(a) * 23;
                return (
                  <g key={i}>
                    <line x1="40" y1="40" x2={x} y2={y} stroke={species.rootColor} strokeWidth="2" opacity="0.65" />
                    <circle cx={x} cy={y} r="4" fill={species.capColor} stroke={species.capStroke} strokeWidth="1.4" />
                  </g>
                );
              })}
            </>
          )}

          {species.id === "stachybotrys-chartarum" && (
            <>
              {Array.from({ length: 10 }).map((_, i) => {
                const x = 18 + i * 5;
                const y = 58 - Math.sin(i) * 18;
                return (
                  <g key={i}>
                    <line x1="40" y1="66" x2={x} y2={y} stroke={species.rootColor} strokeWidth="2.5" />
                    <circle cx={x} cy={y} r="5" fill={species.capColor} stroke={species.capStroke} strokeWidth="2" />
                  </g>
                );
              })}
            </>
          )}

          {species.id === "pythium-oligandrum" && (
            <>
              <line x1="40" y1="66" x2="40" y2="32" stroke={species.rootColor} strokeWidth="4" strokeLinecap="round" />
              <circle cx="40" cy="28" r="7" fill={species.capColor} stroke={species.capStroke} strokeWidth="3" />
              <circle cx="25" cy="47" r="7" fill={species.capColor} stroke={species.capStroke} strokeWidth="1.5" />
              <circle cx="56" cy="48" r="7" fill={species.capColor} stroke={species.capStroke} strokeWidth="1.5" />
              <circle cx="32" cy="36" r="5" fill={species.capColor} stroke={species.capStroke} strokeWidth="1.5" />
              <circle cx="50" cy="36" r="5" fill={species.capColor} stroke={species.capStroke} strokeWidth="1.5" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

function LegendIcon({ type, species }) {
  if (type === "roots") {
    return (
      <svg viewBox="0 0 48 32" className="h-8 w-12">
        <path d="M24 28 C18 20, 14 16, 7 12" fill="none" stroke={species.rootColor} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 28 C30 20, 34 16, 42 10" fill="none" stroke={species.rootColor} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 28 C23 20, 23 14, 24 6" fill="none" stroke={species.rootColor} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="7" cy="12" r="3" fill={species.rootColor} opacity="0.75" />
        <circle cx="42" cy="10" r="3" fill={species.rootColor} opacity="0.75" />
        <circle cx="24" cy="6" r="3" fill={species.rootColor} opacity="0.75" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12">
      <path d="M22 29 L20 15 L28 15 L26 29 Z" fill={species.stemColor} stroke="#64748b" strokeWidth="1.4" />
      <path d="M8 16 Q24 2 40 16 Q24 25 8 16 Z" fill={species.capColor} stroke={species.capStroke} strokeWidth="2" />
      <path d="M14 14 Q24 8 34 14" fill="none" stroke={species.capHighlight} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function MiniChart({ score, color }) {
  const growthPoints = Array.from({ length: 28 }, (_, index) => {
    const x = (index / 27) * 100;
    const y =
      58 -
      Math.sin(index * 0.65) * (8 + score / 18) -
      Math.cos(index * 0.27) * (4 + score / 30);
    return { x, y: Math.max(16, Math.min(82, y)) };
  });

  const spikePoints = growthPoints.map((point, index) => ({
    x: point.x,
    y:
      point.y +
      16 +
      Math.sin(index * 0.9) * 5 +
      (index % 7 === 0 ? -10 * (score / 100) : 0),
  }));

  const toPolyline = (points) =>
    points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Bioelectric response preview
          </p>
          <p className="text-xs text-slate-500">
            Educational estimate from the environmental sliders
          </p>
        </div>

        <div className="flex gap-4 text-xs text-slate-500">
          <span style={{ color }}>Growth</span>
          <span className="text-blue-500">Spike activity</span>
        </div>
      </div>

      <svg viewBox="0 0 100 100" className="h-36 w-full">
        {[25, 50, 75].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#e2e8f0" strokeWidth="1" />
        ))}

        <polyline
          points={toPolyline(growthPoints)}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={toPolyline(spikePoints)}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
        <div className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
          <Activity className="h-4 w-4 text-blue-500" />
          What this graph means
        </div>
        The coloured line represents estimated growth activity. The blue line
        represents estimated spike activity, which means quick bioelectric bursts.
        When conditions are close to the preferred range, both lines become
        stronger and more active. When the environment is poor, the response
        becomes weaker.
      </div>
    </div>
  );
}

export default function FungiGarden({ setPage, setHasEntered }) {
  const canvasRef = useRef(null);
  const [speciesId, setSpeciesId] = useState("aspergillus-flavus");

  const [values, setValues] = useState({
    temperature: 24,
    ph: 6,
    oxygen: 80,
    water: 75,
    light: 420,
  });

  const selectedSpecies =
    speciesOptions.find((species) => species.id === speciesId) ||
    speciesOptions[0];

  const growthScore = useMemo(
    () => calculateGrowthScore(values, selectedSpecies),
    [values, selectedSpecies]
  );

  const conditionLabel = getConditionLabel(growthScore);

  const stressReasons = useMemo(() => {
    const reasons = [];

    if (values.temperature < selectedSpecies.optima.temperature[0]) {
      reasons.push("temperature is too cold");
    }
    if (values.temperature > selectedSpecies.optima.temperature[1]) {
      reasons.push("temperature is too hot");
    }
    if (
      values.ph < selectedSpecies.optima.ph[0] ||
      values.ph > selectedSpecies.optima.ph[1]
    ) {
      reasons.push("pH is outside the preferred range");
    }
    if (values.oxygen < selectedSpecies.optima.oxygen[0]) {
      reasons.push("oxygen/aeration is low");
    }
    if (values.water < selectedSpecies.optima.water[0]) {
      reasons.push("water availability is low");
    }
    if (values.water > selectedSpecies.optima.water[1]) {
      reasons.push("water availability is too high");
    }
    if (values.light < selectedSpecies.optima.light[0]) {
      reasons.push("light is low");
    }
    if (values.light > selectedSpecies.optima.light[1]) {
      reasons.push("light is high");
    }

    return reasons;
  }, [values, selectedSpecies]);

  const hasStress = stressReasons.length > 0 || growthScore < 45;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const score = growthScore / 100;
    const species = selectedSpecies;

    const hexToRgba = (hex, alpha) => {
      const red = parseInt(hex.slice(1, 3), 16);
      const green = parseInt(hex.slice(3, 5), 16);
      const blue = parseInt(hex.slice(5, 7), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    };

    function seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    context.clearRect(0, 0, width, height);

    const bg = context.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#f0fdf4");
    bg.addColorStop(0.45, "#ffffff");
    bg.addColorStop(1, "#eff6ff");
    context.fillStyle = bg;
    context.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const groundY = height * 0.74;

    const isDry = values.water < species.optima.water[0];
    const isHot = values.temperature > species.optima.temperature[1];
    const isCold = values.temperature < species.optima.temperature[0];
    const lowOxygen = values.oxygen < species.optima.oxygen[0];
    const phStress =
      values.ph < species.optima.ph[0] || values.ph > species.optima.ph[1];

    if (isDry) {
      context.fillStyle = "rgba(245, 158, 11, 0.08)";
      context.fillRect(0, 0, width, height);
    }

    if (isHot) {
      context.fillStyle = "rgba(248, 113, 113, 0.08)";
      context.fillRect(0, 0, width, height);
    }

    if (isCold) {
      context.fillStyle = "rgba(96, 165, 250, 0.08)";
      context.fillRect(0, 0, width, height);
    }

    if (phStress) {
      context.fillStyle = "rgba(168, 85, 247, 0.05)";
      context.fillRect(0, 0, width, height);
    }

    if (lowOxygen) {
      context.fillStyle = "rgba(15, 23, 42, 0.04)";
      context.fillRect(0, 0, width, height);
    }

    if (values.light > 80) {
      const beams = Math.round(2 + values.light / 220);
      for (let i = 0; i < beams; i += 1) {
        const beamX = 80 + i * ((width - 160) / Math.max(1, beams - 1));
        const gradient = context.createLinearGradient(
          beamX,
          0,
          beamX,
          height * 0.58
        );
        gradient.addColorStop(0, "rgba(251,191,36,0.18)");
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

    context.fillStyle = hexToRgba(species.rootColor, 0.035 + score * 0.055);
    context.beginPath();
    context.arc(centerX, groundY - 80, 170 + score * 85, 0, Math.PI * 2);
    context.fill();

    function drawBranch(x, y, angle, length, depth, seed) {
      if (depth <= 0 || length < 5) return;

      const midX =
        x + Math.cos(angle + (seededRandom(seed) - 0.5) * 0.7) * length * 0.5;
      const midY =
        y +
        Math.sin(angle + (seededRandom(seed + 3) - 0.5) * 0.7) *
          length *
          0.5;

      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(midX, midY, endX, endY);
      context.strokeStyle = hexToRgba(
        species.rootColor,
        isDry || lowOxygen ? 0.08 + score * 0.18 : 0.11 + score * 0.28
      );
      context.lineWidth = Math.max(0.25, depth * 0.28);
      context.lineCap = "round";
      context.stroke();

      const pulseChance = seededRandom(seed + values.light + values.oxygen);
      if (pulseChance > 0.78 && score > 0.35) {
        context.beginPath();
        context.arc(endX, endY, 1.8 + score * 2.6, 0, Math.PI * 2);
        context.fillStyle = hexToRgba(species.rootColor, 0.22 + score * 0.32);
        context.fill();
      }

      const spread = 0.3 + score * 0.52;
      const children = depth > 3 ? 3 : 2;

      for (let i = 0; i < children; i += 1) {
        const nextSeed = seed + i * 12.7;
        const angleOffset = (seededRandom(nextSeed) - 0.5) * spread * 2;

        drawBranch(
          endX,
          endY,
          angle + angleOffset,
          length * (0.55 + seededRandom(nextSeed + 4) * 0.22),
          depth - 1,
          nextSeed
        );
      }
    }

    const branchCount = Math.round(5 + score * 24);
    const branchLength = 32 + score * 95;
    const depth = 3 + Math.round(score * 4);

    for (let i = 0; i < branchCount; i += 1) {
      const seed = i * 137.5 + values.temperature * 3 + values.water * 0.7;
      const angle =
        -Math.PI / 2 +
        (seededRandom(seed) - 0.5) * Math.PI * (0.5 + score * 0.9);

      drawBranch(
        centerX + (seededRandom(seed + 2) - 0.5) * 52,
        groundY,
        angle,
        branchLength * (0.45 + seededRandom(seed + 1) * 0.8),
        depth,
        seed
      );
    }

    const particleCount = Math.round(score * 34);
    for (let i = 0; i < particleCount; i += 1) {
      const particleX =
        centerX +
        (Math.sin(i * 2.4) * 135 + Math.cos(i * 1.1) * 90) *
          (0.5 + score * 0.5);
      const particleY =
        groundY +
        (Math.cos(i * 1.7) * 85 + Math.sin(i * 0.9) * 55) *
          (0.5 + score * 0.5) -
        score * 60;

      context.beginPath();
      context.arc(
        particleX,
        particleY,
        1.3 + seededRandom(i) * 2.4,
        0,
        Math.PI * 2
      );
      context.fillStyle = hexToRgba(species.rootColor, 0.15 + score * 0.28);
      context.fill();
    }

    const mushroomScale = 0.75 + score * 0.75;
    const capWidth = 95 * mushroomScale;
    const capHeight = 52 * mushroomScale;
    const stemHeight = 90 * mushroomScale;
    const stemWidth = 20 * mushroomScale;

    const stemTopY = groundY - stemHeight;
    const capY = stemTopY - capHeight * 0.35;

    context.save();

    if (hasStress) {
      context.beginPath();
      context.arc(centerX, capY + 8, capWidth * 0.72, 0, Math.PI * 2);
      context.strokeStyle = isHot
        ? "rgba(248,113,113,0.35)"
        : phStress
          ? "rgba(168,85,247,0.3)"
          : "rgba(245,158,11,0.33)";
      context.lineWidth = 6;
      context.stroke();
    }

    context.beginPath();
    context.moveTo(centerX - stemWidth / 2, groundY);
    context.bezierCurveTo(
      centerX - stemWidth * 0.7,
      stemTopY + 25,
      centerX - stemWidth * 0.35,
      stemTopY + 10,
      centerX - stemWidth / 3,
      stemTopY
    );
    context.lineTo(centerX + stemWidth / 3, stemTopY);
    context.bezierCurveTo(
      centerX + stemWidth * 0.35,
      stemTopY + 10,
      centerX + stemWidth * 0.7,
      stemTopY + 25,
      centerX + stemWidth / 2,
      groundY
    );
    context.closePath();
    context.fillStyle = species.stemColor;
    context.strokeStyle = "rgba(15, 23, 42, 0.3)";
    context.lineWidth = 2.8;
    context.fill();
    context.stroke();

    const capGradient = context.createLinearGradient(
      centerX - capWidth,
      capY - capHeight,
      centerX + capWidth,
      capY + capHeight
    );
    capGradient.addColorStop(0, species.capHighlight);
    capGradient.addColorStop(0.45, species.capColor);
    capGradient.addColorStop(1, species.capStroke);

    if (species.id === "aspergillus-flavus") {
      context.beginPath();
      context.moveTo(centerX - capWidth * 0.62, capY + capHeight * 0.12);
      context.quadraticCurveTo(
        centerX,
        capY - capHeight * 0.72,
        centerX + capWidth * 0.62,
        capY + capHeight * 0.12
      );
      context.quadraticCurveTo(
        centerX,
        capY + capHeight * 0.52,
        centerX - capWidth * 0.62,
        capY + capHeight * 0.12
      );
      context.closePath();
      context.fillStyle = capGradient;
      context.strokeStyle = species.capStroke;
      context.lineWidth = 4.5;
      context.fill();
      context.stroke();
    }

    if (species.id === "penicillium-chrysogenum") {
      for (let i = 0; i < 14; i += 1) {
        const angle = Math.PI + (Math.PI * i) / 13;
        const x = centerX + Math.cos(angle) * capWidth * 0.42;
        const y = capY + Math.sin(angle) * capHeight * 0.38;
        context.beginPath();
        context.arc(x, y, 8 * mushroomScale, 0, Math.PI * 2);
        context.fillStyle = capGradient;
        context.strokeStyle = species.capStroke;
        context.lineWidth = 2.2;
        context.fill();
        context.stroke();
      }

      context.beginPath();
      context.ellipse(
        centerX,
        capY,
        capWidth * 0.5,
        capHeight * 0.36,
        -0.1,
        0,
        Math.PI * 2
      );
      context.fillStyle = "rgba(255,255,255,0.5)";
      context.fill();
    }

    if (species.id === "cladosporium-herbarum") {
      context.beginPath();
      context.ellipse(
        centerX,
        capY,
        capWidth * 0.55,
        capHeight * 0.42,
        0.12,
        0,
        Math.PI * 2
      );
      context.fillStyle = capGradient;
      context.strokeStyle = species.capStroke;
      context.lineWidth = 4.5;
      context.fill();
      context.stroke();

      context.beginPath();
      context.ellipse(
        centerX - capWidth * 0.18,
        capY - capHeight * 0.08,
        capWidth * 0.22,
        capHeight * 0.12,
        0.1,
        0,
        Math.PI * 2
      );
      context.fillStyle = "rgba(255,255,255,0.42)";
      context.fill();
    }

    if (species.id === "stachybotrys-chartarum") {
      context.beginPath();
      context.moveTo(centerX - capWidth * 0.6, capY + capHeight * 0.22);
      context.quadraticCurveTo(
        centerX,
        capY - capHeight * 0.6,
        centerX + capWidth * 0.6,
        capY + capHeight * 0.22
      );
      context.quadraticCurveTo(
        centerX,
        capY + capHeight * 0.6,
        centerX - capWidth * 0.6,
        capY + capHeight * 0.22
      );
      context.closePath();
      context.fillStyle = capGradient;
      context.strokeStyle = species.capStroke;
      context.lineWidth = 4.5;
      context.fill();
      context.stroke();
    }

    if (species.id === "pythium-oligandrum") {
      context.beginPath();
      context.arc(centerX, capY, capWidth * 0.38, 0, Math.PI * 2);
      context.fillStyle = capGradient;
      context.strokeStyle = species.capStroke;
      context.lineWidth = 4.5;
      context.fill();
      context.stroke();

      for (let i = 0; i < 16; i += 1) {
        const a = (Math.PI * 2 * i) / 16;
        const px = centerX + Math.cos(a) * capWidth * 0.32;
        const py = capY + Math.sin(a) * capWidth * 0.25;
        context.beginPath();
        context.arc(px, py, 5 * mushroomScale, 0, Math.PI * 2);
        context.fillStyle = "rgba(255,255,255,0.85)";
        context.strokeStyle = "rgba(202,138,4,0.35)";
        context.fill();
        context.stroke();
      }
    }

    context.restore();

    const ground = context.createLinearGradient(0, height * 0.78, 0, height);
    ground.addColorStop(0, hexToRgba(species.rootColor, 0.11));
    ground.addColorStop(1, hexToRgba(species.rootColor, 0.035));
    context.fillStyle = ground;
    context.fillRect(0, height * 0.78, width, height * 0.22);
  }, [growthScore, selectedSpecies, values, hasStress]);

  const conditionTags = [
    {
      label: "Temp",
      value: `${values.temperature}°C`,
      color: "#f87171",
      status: getRangeText(
        values.temperature,
        selectedSpecies.optima.temperature,
        "cold",
        "optimal",
        "hot"
      ),
      icon: Thermometer,
    },
    {
      label: "pH",
      value: values.ph.toFixed(1),
      color: "#a855f7",
      status: getRangeText(
        values.ph,
        selectedSpecies.optima.ph,
        "acidic",
        "optimal",
        "alkaline"
      ),
      icon: FlaskConical,
    },
    {
      label: "O₂",
      value: `${values.oxygen}%`,
      color: "#14b8a6",
      status: getRangeText(
        values.oxygen,
        selectedSpecies.optima.oxygen,
        "low",
        "good",
        "high"
      ),
      icon: Wind,
    },
    {
      label: "Water",
      value: `${values.water}%`,
      color: "#60a5fa",
      status: getRangeText(
        values.water,
        selectedSpecies.optima.water,
        "dry",
        "available",
        "too wet"
      ),
      icon: Droplets,
    },
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
      icon: Sun,
    },
  ];

  return (
    <div className="space-y-6 pt-12 px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Sprout className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Fungi Garden
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Interactive fungal ecosystem simulation.
          </p>
        </div>

        <button
            type="button"
            onClick={() => {
              setHasEntered?.(false);
              setPage?.("workspace");
            }}
            className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-2 text-sm text-emerald-900 shadow-sm hover:bg-emerald-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to landing page
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
              Species
            </p>

            <div className="grid grid-cols-2 gap-3">
              {speciesOptions.map((species) => (
                <button
                  key={species.id}
                  type="button"
                  onClick={() => setSpeciesId(species.id)}
                  className={`rounded-2xl border p-4 text-center transition ${
                    speciesId === species.id
                      ? "border-emerald-300 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <SpeciesIcon species={species} />
                  <span className="mt-2 block text-xs font-semibold text-slate-900">
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
              icon={Thermometer}
              label="Temperature"
              value={values.temperature}
              unit="°C"
              min={4}
              max={50}
              step={1}
              color="#f87171"
              onChange={(temperature) =>
                setValues((prev) => ({ ...prev, temperature }))
              }
            />

            <SliderRow
              icon={FlaskConical}
              label="pH"
              value={values.ph}
              unit=""
              min={3}
              max={9}
              step={0.1}
              color="#a855f7"
              onChange={(ph) => setValues((prev) => ({ ...prev, ph }))}
            />

            <SliderRow
              icon={Wind}
              label="Oxygen / Aeration"
              value={values.oxygen}
              unit="%"
              min={0}
              max={100}
              step={1}
              color="#14b8a6"
              onChange={(oxygen) =>
                setValues((prev) => ({ ...prev, oxygen }))
              }
            />

            <SliderRow
              icon={Droplets}
              label="Water availability"
              value={values.water}
              unit="%"
              min={0}
              max={100}
              step={1}
              color="#60a5fa"
              onChange={(water) => setValues((prev) => ({ ...prev, water }))}
            />

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
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <BookOpen className="h-4 w-4" />
              Reference
            </div>
            Environmental Conditions for Fungal Growth, Mustan Siriyah University.
            https://uomustansiriyah.edu.iq/media/lectures/6/6_2017_01_21!08_17_16_PM.pdf
            <br />
            Factors used: temperature, pH, oxygen/aeration, water availability,
            and light.
          </div>
        </aside>

        <main className="space-y-5">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedSpecies.name} mycelium growth preview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Drag the slider to see the difference.
                </p>
              </div>
            </div>

            <div className="relative">
              <canvas
                ref={canvasRef}
                width={900}
                height={460}
                className="h-[460px] w-full bg-emerald-50"
              />

              <div className="absolute right-5 top-5 rounded-2xl border border-slate-200 bg-white/90 p-3 text-xs text-slate-600 shadow-sm backdrop-blur">
                <div className="mb-2 flex items-center gap-2">
                  <LegendIcon type="roots" species={selectedSpecies} />
                  <span>Mycelium roots</span>
                </div>
                <div className="flex items-center gap-2">
                  <LegendIcon type="body" species={selectedSpecies} />
                  <span>Fungal body</span>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-3 md:grid-cols-5">
            {conditionTags.map((tag) => {
              const Icon = tag.icon;

              return (
                <div
                  key={tag.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${tag.color}1f`,
                        color: tag.color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-slate-500">{tag.label}</p>
                  </div>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: tag.color }}
                  >
                    {tag.value}
                  </p>
                  <p className="text-xs text-slate-500">{tag.status}</p>
                </div>
              );
            })}
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
                      ? "#22c55e"
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
                      ? "#22c55e"
                      : growthScore > 45
                        ? "#f59e0b"
                        : "#f87171",
                }}
              >
                {growthScore}
              </p>
              <p className="mt-1 text-sm text-slate-500">{conditionLabel}</p>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                {growthScore >= 85
                  ? "The fungus is fine and conditions are close to ideal."
                  : "Conditions are not fully ideal, so growth activity may be reduced."}
              </p>
            </div>

            <MiniChart score={growthScore} color={selectedSpecies.rootColor} />
          </div>

          <div
            className={`rounded-3xl border p-5 text-sm leading-6 ${
              hasStress
                ? "border-amber-100 bg-amber-50 text-amber-900"
                : "border-emerald-100 bg-emerald-50 text-emerald-900"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 font-semibold">
              {hasStress ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <Sprout className="h-4 w-4" />
              )}
              Real-time stress explanation
            </div>

            {hasStress ? (
              <>
                <p>
                  The circle around the mushroom appears because the selected
                  environment is outside the preferred growth range.
                </p>
                <p className="mt-2 text-xs">
                  Current stress reason: {stressReasons.slice(0, 2).join(", ")}
                  {stressReasons.length > 2 ? "..." : ""}.
                </p>
              </>
            ) : (
              <p>No stress detected. The fungus is fine.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
