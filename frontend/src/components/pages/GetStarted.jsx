import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Float,
  OrbitControls,
  Stars,
  MeshDistortMaterial,
} from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  UploadCloud,
  LineChart,
  SlidersHorizontal,
  Sparkles,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    id: "upload",
    title: "Upload dataset",
    short: "Start with CSV or Excel files.",
    detail:
      "Upload fungal bioelectric recordings from an experiment. Olive stores the dataset and prepares it for preview.",
    icon: UploadCloud,
    color: "emerald",
  },
  {
    id: "preview",
    title: "Preview signal",
    short: "Explore the raw signal first.",
    detail:
      "Choose X and Y axes, adjust ranges, zoom into areas, and click spike points to inspect local signal behaviour.",
    icon: LineChart,
    color: "blue",
  },
  {
    id: "configure",
    title: "Configure analysis",
    short: "Set only what matters.",
    detail:
      "Use simple analysis settings such as window size, detrending, model selection, and prediction summary.",
    icon: SlidersHorizontal,
    color: "teal",
  },
  {
    id: "interpret",
    title: "Understand results",
    short: "Turn signals into meaning.",
    detail:
      "Review detected activity, prediction outputs, and interpretation summaries to understand what the signal suggests.",
    icon: Sparkles,
    color: "amber",
  },
];

function colorClasses(color, active) {
  const map = {
    emerald: active
      ? "border-emerald-300 bg-emerald-50/90 text-emerald-800"
      : "border-emerald-100 bg-white/70 text-slate-700",
    blue: active
      ? "border-blue-300 bg-blue-50/90 text-blue-800"
      : "border-blue-100 bg-white/70 text-slate-700",
    teal: active
      ? "border-teal-300 bg-teal-50/90 text-teal-800"
      : "border-teal-100 bg-white/70 text-slate-700",
    amber: active
      ? "border-amber-300 bg-amber-50/90 text-amber-800"
      : "border-amber-100 bg-white/70 text-slate-700",
  };

  return map[color] || map.emerald;
}

function FungalOrb({ selectedStep }) {
  const color =
    selectedStep === "preview"
      ? "#93c5fd"
      : selectedStep === "configure"
        ? "#5eead4"
        : selectedStep === "interpret"
          ? "#fde68a"
          : "#a7f3d0";

  return (
    <Float speed={1.7} rotationIntensity={0.8} floatIntensity={1.5}>
      <mesh>
        <sphereGeometry args={[1.7, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.22}
          roughness={0.35}
          metalness={0.08}
          distort={0.42}
          speed={1.7}
        />
      </mesh>
    </Float>
  );
}

function SignalRing({ selectedStep }) {
  const speed = selectedStep === "preview" ? 1.8 : 1.1;

  return (
    <Float speed={speed} rotationIntensity={1} floatIntensity={0.9}>
      <mesh rotation={[1.2, 0.2, 0.5]}>
        <torusGeometry args={[2.35, 0.025, 16, 160]} />
        <meshStandardMaterial
          color="#34d399"
          emissive="#34d399"
          emissiveIntensity={0.75}
        />
      </mesh>

      <mesh rotation={[1.4, -0.7, 1.1]}>
        <torusGeometry args={[2.85, 0.018, 16, 160]} />
        <meshStandardMaterial
          color="#93c5fd"
          emissive="#93c5fd"
          emissiveIntensity={0.5}
        />
      </mesh>
    </Float>
  );
}

function ParticleDots({ selectedStep }) {
  const activeMore = selectedStep === "interpret" || selectedStep === "preview";

  return (
    <>
      {Array.from({ length: activeMore ? 44 : 30 }).map((_, i) => (
        <Float
          key={i}
          speed={1 + (i % 5) * 0.15}
          rotationIntensity={0.4}
          floatIntensity={1.3}
        >
          <mesh
            position={[
              Math.sin(i * 1.7) * 3.9,
              Math.cos(i * 1.2) * 2.4,
              Math.sin(i * 0.8) * 2.3,
            ]}
          >
            <sphereGeometry args={[0.035 + (i % 4) * 0.012, 16, 16]} />
            <meshStandardMaterial
              color={i % 4 === 0 ? "#ef4444" : "#10b981"}
              emissive={i % 4 === 0 ? "#ef4444" : "#10b981"}
              emissiveIntensity={0.9}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function ThreeScene({ selectedStep }) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 5, 6]} intensity={1.6} />
      <pointLight position={[-4, -2, 4]} intensity={0.8} color="#a7f3d0" />
      <Stars radius={60} depth={30} count={450} factor={3} fade speed={0.6} />
      <FungalOrb selectedStep={selectedStep} />
      <SignalRing selectedStep={selectedStep} />
      <ParticleDots selectedStep={selectedStep} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.7}
      />
    </Canvas>
  );
}

function AnimatedSignalPanel({ selectedStep }) {
  const spikeCount =
    selectedStep === "preview"
      ? 4
      : selectedStep === "configure"
        ? 4
        : selectedStep === "interpret"
          ? 4
          : 4;

  const points =
    "0,72 45,70 90,78 135,34 180,84 235,60 285,66 330,24 370,80 430,56 480,64 530,30 590,72 650,52 720,58";

  return (
    <motion.div
      layout
      className="rounded-[32px] border border-emerald-100 bg-white/70 p-5 shadow-xl backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Interactive signal preview
          </p>
          <p className="text-xs text-slate-500">
            Current mode: {steps.find((s) => s.id === selectedStep)?.title}
          </p>
        </div>

        <motion.div
          key={selectedStep}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700"
        >
          {spikeCount} active points
        </motion.div>
      </div>

      <svg viewBox="0 0 720 120" className="w-full">
        <motion.polyline
          key={selectedStep}
          points={points}
          fill="none"
          stroke="#059669"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />

        {[135, 330, 530, 590].slice(0, spikeCount).map((x, i) => (
          <motion.circle
            key={`${selectedStep}-${x}`}
            cx={x}
            cy={i === 0 ? 34 : i === 1 ? 24 : i === 2 ? 30 : 72}
            r="7"
            fill="#ef4444"
            animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

function WorkflowCard({ step, index, active, onClick }) {
  const Icon = step.icon;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`group rounded-3xl border p-5 text-left shadow-sm backdrop-blur-xl transition ${colorClasses(
        step.color,
        active
      )}`}
      initial={{ opacity: 0, y: 26, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.06 + index * 0.05, duration: 0.22 }}
      whileHover={{ y: -6, scale: 1.025, rotateX: 2, rotateY: -2, transition: { duration: 0.12, ease: "easeOut" }}}
      whileTap={{ scale: 0.98 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
          <Icon className="h-6 w-6" />
        </div>

        <span className="rounded-full bg-white/70 px-3 py-1 text-xs">
          0{index + 1}
        </span>
      </div>

      <h3 className="font-semibold">{step.title}</h3>
      <p className="mt-2 text-sm leading-6 opacity-80">{step.short}</p>
    </motion.button>
  );
}

export default function GetStarted({ onEnter }) {
  const [selectedStep, setSelectedStep] = useState("upload");
  const [highlightHow, setHighlightHow] = useState(false);

  const activeStep = steps.find((step) => step.id === selectedStep) || steps[0];

  const scrollToHowItWorks = () => {
    const section = document.getElementById("how-it-works");

    section?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setHighlightHow(true);

    setTimeout(() => {
      setHighlightHow(false);
    }, 1800);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f4fff8] via-white to-[#eef7ff] text-slate-900">
      <div className="absolute inset-0 opacity-75">
        <ThreeScene selectedStep={selectedStep} />
      </div>

      <div className="absolute left-[-120px] top-[-120px] h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="absolute bottom-[-140px] right-[-100px] h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3 rounded-3xl border border-white/60 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-xl"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-lg font-semibold">Olive</p>
              <p className="text-xs text-slate-500">
                Fungal Bioelectric Signal Explorer
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Button
              onClick={() => onEnter("garden")}
              className="rounded-2xl bg-emerald-600 px-5 hover:bg-emerald-700"
            >
              Kid's Space
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </header>

        <main className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1fr_0.95fr]">
          <motion.section
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="rounded-[40px] border border-white/60 bg-white/55 p-8 shadow-xl backdrop-blur-2xl"
          >
            <div className="mb-5 inline-flex rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-sm text-emerald-700">
              Interactive fungal signal exploration
            </div>

            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
              Explore the hidden electrical language of fungi.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Olive helps users upload fungal bioelectric recordings, preview
              signal behaviour, configure analysis, inspect spikes, and interpret
              results through one guided workflow.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                  onClick={() => onEnter("workspace")}
                  className="rounded-2xl bg-emerald-600 px-6 py-6 text-base hover:bg-emerald-700"
                >
                  Enter Workspace
                  <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
      

              <Button
                variant="outline"
                onClick={scrollToHowItWorks}
                className="rounded-2xl bg-white/70 px-6 py-6 text-base"
              >
                How it works
              </Button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="h-[360px] overflow-hidden rounded-[40px] border border-white/60 bg-white/45 p-4 shadow-2xl backdrop-blur-2xl">
              <ThreeScene selectedStep={selectedStep} />
            </div>

            <AnimatedSignalPanel selectedStep={selectedStep} />
          </motion.section>
        </main>

        <motion.section
          id="how-it-works"
          className="pb-12"
          animate={
            highlightHow
              ? {
                  scale: 1.04,
                  filter:
                    "drop-shadow(0 24px 40px rgba(16,185,129,0.25))",
                }
              : {
                  scale: 1,
                  filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
                }
          }
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <motion.div
            className="mb-6 rounded-[32px] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-start gap-3">
              <Search className="mt-1 h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-3xl font-semibold">How Olive works</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Select each step to see what the page does, why it matters,
                  and how users interact with it.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <WorkflowCard
                key={step.id}
                step={step}
                index={index}
                active={selectedStep === step.id}
                onClick={() => setSelectedStep(step.id)}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              className="mt-5 rounded-[32px] border border-white/60 bg-white/75 p-6 shadow-lg backdrop-blur-xl"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-600">
                Selected step
              </p>

              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {activeStep.title}
              </h3>

              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
                {activeStep.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
}
