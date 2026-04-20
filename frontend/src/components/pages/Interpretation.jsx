// Text Interpretation page — generated research narrative and follow-up actions.
import React from "react";
import { motion } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SectionTitle from "@/components/shared/SectionTitle";

export default function Interpretation({ setPage, setRegenOpen }) {
  return (
    <motion.div
      key="interpretation"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <SectionTitle
        title="Text Interpretation"
        desc="Research-friendly explanation of signal behaviour and model results."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setRegenOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />Regenerate
            </Button>
            <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700">
              Copy summary
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">

        {/* ── Generated interpretation text ─────────────────────── */}
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Generated interpretation</CardTitle></CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-slate-700">
            <p>
              <span className="font-semibold">Signal quality summary: </span>
              The uploaded fungal electrical recording is structurally usable after preprocessing,
              with no missing values and manageable baseline drift.
            </p>
            <p>
              <span className="font-semibold">Spike behaviour summary: </span>
              The system detected 11 spike-like events, with several recurring peaks above the
              adaptive threshold, suggesting non-random temporal structure.
            </p>
            <p>
              <span className="font-semibold">Prediction summary: </span>
              The temporal model forecasts the next likely spike at approximately 32.4 seconds,
              with moderate-to-high confidence.
            </p>
            <p>
              <span className="font-semibold">Biological interpretation: </span>
              These patterns may reflect coordinated signalling behaviour, nutrient response,
              or adaptive environmental sensing in the mycelial network.
            </p>
            <p>
              <span className="font-semibold">Limitations: </span>
              The interpretation remains hypothesis-supporting only and should be checked against
              species variation, recording conditions, and larger datasets.
            </p>
          </CardContent>
        </Card>

        {/* ── Sidebar: next steps + actions ─────────────────────── */}
        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader><CardTitle>Suggested next steps</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">Compare this run with low-humidity recordings.</div>
              <div className="rounded-2xl bg-slate-50 p-4">Export the feature summary for lab notes.</div>
              <div className="rounded-2xl bg-slate-50 p-4">Retrain the classifier with more labelled spike windows.</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="rounded-2xl">
                <Download className="mr-2 h-4 w-4" />Download report
              </Button>
              <Button variant="outline" className="rounded-2xl">
                Add to experiment notes
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setPage("history")}
              >
                Open experiment history
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}