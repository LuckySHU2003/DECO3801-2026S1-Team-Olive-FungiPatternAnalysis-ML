import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Search,
  Info,
  Activity,
  Database,
  SlidersHorizontal,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionTitle from "@/components/shared/SectionTitle";

// This is standalone reference page for pre-built models only 
// Hence, this will be hard-coded for referencing purpose only

const MODEL_INFO_PLACEHOLDERS = [
  {
    id: "model_placeholder_1",
    name: "Pre-built Model Placeholder 1",
    category: "Pattern Detection",
    status: "Reference",
    shortDescription:
      "Placeholder description for what this model is designed to detect.",
    bestUsedFor:
      "Placeholder use case. Replace with the correct model purpose later.",
    inputFormat:
      "Placeholder input format, for example time-voltage sequence data.",
    outputFormat:
      "Placeholder output format, for example detected pattern objects and summary values.",
    modelNotes:
      "Placeholder explanation of model behaviour, assumptions, strengths, and limitations.",
    parameters: [
      "window_size: placeholder explanation",
      "min_interval: placeholder explanation",
      "threshold: placeholder explanation",
    ],
  },
  {
    id: "model_placeholder_2",
    name: "Pre-built Model Placeholder 2",
    category: "Pattern Exploration",
    status: "Reference",
    shortDescription:
      "Placeholder description for exploratory pattern analysis.",
    bestUsedFor:
      "Placeholder use case. Replace this with practical guidance later.",
    inputFormat:
      "Placeholder input format.",
    outputFormat:
      "Placeholder output format.",
    modelNotes:
      "Placeholder explanation card content for future documentation.",
    parameters: [
      "window_size: placeholder explanation",
      "pattern_type: placeholder explanation",
      "filter_mode: placeholder explanation",
    ],
  },
  {
    id: "model_placeholder_3",
    name: "Pre-built Model Placeholder 3",
    category: "Prediction",
    status: "Reference",
    shortDescription:
      "Placeholder description for future voltage or pattern prediction.",
    bestUsedFor:
      "Placeholder use case. Replace with the intended prediction scenario.",
    inputFormat:
      "Placeholder input format.",
    outputFormat:
      "Placeholder output format.",
    modelNotes:
      "Placeholder explanation of forecast behaviour and expected constraints.",
    parameters: [
      "prediction_window: placeholder explanation",
      "sequence_length: placeholder explanation",
      "sampling_rate: placeholder explanation",
    ],
  },
];

function DetailBlock({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <div className="text-sm leading-6 text-slate-600">{children}</div>
    </div>
  );
}

export default function Models() {
  const [query, setQuery] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(
    MODEL_INFO_PLACEHOLDERS[0]?.id
  );

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return MODEL_INFO_PLACEHOLDERS;

    return MODEL_INFO_PLACEHOLDERS.filter((model) =>
      [model.name, model.category, model.shortDescription]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const selectedModel =
    MODEL_INFO_PLACEHOLDERS.find((model) => model.id === selectedModelId) ||
    filteredModels[0] ||
    MODEL_INFO_PLACEHOLDERS[0];

  return (
    <motion.div
      key="model-information"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionTitle
          title="Model Information"
          desc="Reference page for pre-built model descriptions, inputs, outputs, and usage notes."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-900">
                Pre-built Models
              </p>
            </div>

            <div className="space-y-3">
              {filteredModels.map((model) => {
                const active = selectedModel?.id === model.id;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModelId(model.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {model.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {model.category}
                        </p>
                      </div>
                      <ChevronRight
                        className={`mt-1 h-4 w-4 ${
                          active ? "text-emerald-600" : "text-slate-300"
                        }`}
                      />
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                      {model.shortDescription}
                    </p>
                  </button>
                );
              })}

              {!filteredModels.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No placeholder model matched your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                      <Brain className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">
                        {selectedModel.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedModel.shortDescription}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {selectedModel.category}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                      {selectedModel.status}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Pre-built
                    </Badge>
                  </div>
                </div>

                <Button variant="outline" className="rounded-2xl" disabled>
                  Placeholder Action
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailBlock icon={Info} title="Best Used For">
              {selectedModel.bestUsedFor}
            </DetailBlock>

            <DetailBlock icon={Database} title="Input Format">
              {selectedModel.inputFormat}
            </DetailBlock>

            <DetailBlock icon={Activity} title="Output Format">
              {selectedModel.outputFormat}
            </DetailBlock>

            <DetailBlock icon={SlidersHorizontal} title="Main Parameters">
              <ul className="list-disc space-y-1 pl-5">
                {selectedModel.parameters.map((param) => (
                  <li key={param}>{param}</li>
                ))}
              </ul>
            </DetailBlock>
          </div>

          <DetailBlock icon={FileText} title="Model Explanation Notes">
            {selectedModel.modelNotes}
          </DetailBlock>
        </div>
      </div>
    </motion.div>
  );
}