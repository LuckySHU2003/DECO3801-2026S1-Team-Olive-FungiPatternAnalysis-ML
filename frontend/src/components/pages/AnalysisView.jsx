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
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/shared/StatCard";
import SectionTitle from "@/components/shared/SectionTitle";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function PlaceholderGraph({ icon: Icon, title, description }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <Icon className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">Placeholder graph area</p>
          <p className="mt-1 text-xs text-slate-400">Backend result graph will render here.</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, placeholder }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="mt-2 text-sm text-slate-400">{placeholder}</p>
    </div>
  );
}

function InterpretationPanel({ setRegenOpen, title }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Generated text interpretation will appear here.</p>
        </div>
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={() => setRegenOpen?.(true)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate
        </Button>
      </CardHeader>
      <CardContent>
        <div className="min-h-[150px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-400">
          Placeholder interpretation text. This area should be filled by the backend-generated analysis summary for this tab.
        </div>
      </CardContent>
    </Card>
  );
}

function ResultTabLayout({ graphIcon, graphTitle, graphDescription, cards, interpretationTitle, setRegenOpen }) {
  return (
    <div className="space-y-6">
      <PlaceholderGraph icon={graphIcon} title={graphTitle} description={graphDescription} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <InterpretationPanel setRegenOpen={setRegenOpen} title={interpretationTitle} />
    </div>
  );
}

// Results Component
export default function Results({ setRegenOpen }) {
  const recognitionCards = [
    { icon: Search, label: "Detected pattern count", placeholder: "Waiting for pattern recognition result" },
    { icon: Activity, label: "Pattern confidence", placeholder: "Waiting for model confidence" },
    { icon: LineChart, label: "Detection threshold", placeholder: "Waiting for threshold summary" },
    { icon: Sparkles, label: "Recognition status", placeholder: "Waiting for completed job" },
  ];

  const explorationCards = [
    { icon: BarChart3, label: "Selected time range", placeholder: "Waiting for exploration range" },
    { icon: Activity, label: "Window size", placeholder: "Waiting for analysis config" },
    { icon: LineChart, label: "Exploration output", placeholder: "Waiting for custom exploration result" },
    { icon: Sparkles, label: "Key observation", placeholder: "Waiting for generated summary" },
  ];

  const predictionCards = [
    { icon: Brain, label: "Prediction window", placeholder: "Waiting for prediction config" },
    { icon: LineChart, label: "Forecast points", placeholder: "Waiting for predicted values" },
    { icon: Activity, label: "Prediction confidence", placeholder: "Waiting for model confidence" },
    { icon: Sparkles, label: "Forecast status", placeholder: "Waiting for completed job" },
  ];

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
          desc="Analysis results will appear here after the backend jobs complete."
        />

        <Button
          type="button"
          variant="outline"
          className="rounded-2xl"
          disabled // Placeholder - disable until export functionality is implemented
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Search} label="Pattern Recognition" placeholder="Placeholder result card" />
        <SummaryCard icon={BarChart3} label="Pattern Exploration" placeholder="Placeholder result card" />
        <SummaryCard icon={Brain} label="Predict Pattern" placeholder="Placeholder result card" />
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
            graphIcon={Search}
            graphTitle="Pattern recognition graph"
            graphDescription="Placeholder for detected pattern markers and recognition output."
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
            graphIcon={BarChart3}
            graphTitle="Pattern exploration graph"
            graphDescription="Placeholder for custom exploration graph and range-based result."
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
            graphIcon={Brain}
            graphTitle="Predict pattern graph"
            graphDescription="Placeholder for forecast graph and predicted signal behaviour."
            cards={predictionCards}
            interpretationTitle="Predict pattern interpretation"
            setRegenOpen={setRegenOpen}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Combined Analysis View
export function AnalysisView(props) {
  return (
    <div className="space-y-12">
      <Results {...props} key="results" />
    </div>
  );
}
