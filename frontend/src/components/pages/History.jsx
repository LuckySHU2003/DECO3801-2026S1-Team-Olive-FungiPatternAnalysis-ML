// Experiment History page — searchable table of past runs.
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SectionTitle from "@/components/shared/SectionTitle";

// Static experiment history data
const EXPERIMENTS = [
  ["EXP-019-A", "Run_05", "Butterworth-256", "RF + LSTM",  "2026-03-19", "Completed"],
  ["EXP-019-B", "Run_04", "Wavelet-128",     "SVM + LSTM", "2026-03-17", "Completed"],
  ["EXP-019-C", "Run_03", "Butterworth-512", "RF only",    "2026-03-15", "Failed"],
];

export default function History({ setCompareOpen, setPage }) {
  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Experiment History"
        desc="Track previous runs and compare reproducible workflows."
      />

      {/* Search bar and compare button */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-sm rounded-2xl"
          placeholder="Search experiment ID or dataset"
        />
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={() => setCompareOpen(true)}
        >
          Compare selected
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 text-left">Experiment ID</th>
                  <th className="p-4 text-left">Dataset</th>
                  <th className="p-4 text-left">Config</th>
                  <th className="p-4 text-left">Model</th>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {EXPERIMENTS.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-4 font-medium">{row[0]}</td>
                    <td className="p-4">{row[1]}</td>
                    <td className="p-4">{row[2]}</td>
                    <td className="p-4">{row[3]}</td>
                    <td className="p-4">{row[4]}</td>
                    <td className="p-4">
                      <Badge className={`${
                        row[5] === "Completed" ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                        'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}>
                        {row[5]}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setPage("analysis")}>
                        View Analysis
                      </Button>
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