import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, LoaderCircle, Database, BrainCircuit, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import SectionTitle from "@/components/shared/SectionTitle";

const DEFAULT_STEPS = [
  { progress: 18, label: "Dataset loaded" },
  { progress: 30, label: "Preprocessing" },
  { progress: 46, label: "Spike detection" },
  { progress: 63, label: "Feature extraction" },
  { progress: 79, label: "Model inference" },
  { progress: 100, label: "Results generated" },
];

export default function Processing({
  progress,
  datasetName,
  selectedSheet,
  processingSteps = [],
  processingLogs = [],
  classifier,
  sequenceModel,
  predictionEnabled,
  setPage,
}) {
  const steps = processingSteps.length ? processingSteps : DEFAULT_STEPS;

  const currentStep =
    [...steps].reverse().find((step) => progress >= step.progress)?.label || "Preparing";

  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Processing Status"
        desc="Live execution state for the current analysis run."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Analysis progress</CardTitle>
            <CardDescription>
              {datasetName || "Dataset"}
              {selectedSheet ? ` · ${selectedSheet}` : ""}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <Database className="h-4 w-4" />
                  <span className="text-sm">Current stage</span>
                </div>
                <p className="font-medium text-slate-900">{currentStep}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <BrainCircuit className="h-4 w-4" />
                  <span className="text-sm">Classifier</span>
                </div>
                <p className="font-medium text-slate-900">{classifier}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-sm">Prediction</span>
                </div>
                <p className="font-medium text-slate-900">
                  {predictionEnabled ? sequenceModel : "Disabled"}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>Overall progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="grid gap-3">
              {steps.map((step, index) => {
                const done = progress >= step.progress;
                const active =
                  !done &&
                  (index === 0 ? progress < step.progress : progress >= steps[index - 1].progress);

                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-2xl border p-4 ${
                      done
                        ? "border-emerald-100 bg-emerald-50"
                        : active
                          ? "border-sky-200 bg-sky-50"
                          : "bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        done
                          ? "bg-emerald-600 text-white"
                          : active
                            ? "bg-sky-600 text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : active ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{step.label}</p>
                      <p className="text-sm text-slate-500">
                        {done
                          ? "Completed"
                          : active
                            ? "Currently running"
                            : "Waiting"}
                      </p>
                    </div>

                    <div className="text-sm text-slate-400">{step.progress}%</div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setPage("configure")}
                disabled={progress > 0 && progress < 100}
              >
                Back to config
              </Button>

              <Button
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                disabled={progress < 100}
                onClick={() => setPage("results")}
              >
                View results
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Live logs</CardTitle>
            <CardDescription>
              Log messages appear as each real processing stage completes.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            {processingLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-400">
                Waiting for analysis to start...
              </div>
            ) : (
              processingLogs.map((log) => (
                <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-slate-900">{log.step}</p>
                    <span className="text-xs text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="leading-6 text-slate-600">{log.text}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}