// Model Manager page — table of stored models with retrain and view actions.
import React from "react";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionTitle from "@/components/shared/SectionTitle";

// Static model registry data
const MODELS = [
  ["RF_Spike_Classifier_v4", "Classification", "Run_05", "F1 0.92",   "Active"],
  ["LSTM_Temporal_v2",       "Prediction",     "Run_04", "RMSE 4.27", "Saved"],
  ["SVM_Baseline_v1",        "Classification", "Run_02", "F1 0.84",   "Archived"],
];

export default function Models({ setRetrainOpen, setViewModelOpen }) {
  return (
    <motion.div
      key="models"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Model Manager"
        desc="View, rename, retrain, and activate stored models."
      />

      <Card className="rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 text-left">Model</th>
                  <th className="p-4 text-left">Type</th>
                  <th className="p-4 text-left">Dataset</th>
                  <th className="p-4 text-left">Metric</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-4 font-medium">{row[0]}</td>
                    <td className="p-4">{row[1]}</td>
                    <td className="p-4">{row[2]}</td>
                    <td className="p-4">{row[3]}</td>
                    <td className="p-4">
                      <Badge variant={row[4] === "Active" ? "default" : "secondary"}>
                        {row[4]}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setViewModelOpen(true)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Opens retrain dialog — model id could be passed if needed */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setRetrainOpen(true)}
                        >
                          Retrain
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}