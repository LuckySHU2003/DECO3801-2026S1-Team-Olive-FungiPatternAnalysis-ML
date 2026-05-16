// Model Manager page — table of stored models with retrain and view actions.
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, GitCompare, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import SectionTitle from "@/components/shared/SectionTitle";

// Static model registry data with full metrics
export const MODELS_DATA = [
  {
    id: "rf_spike_classifier_v4",
    name: "RF_Spike_Classifier_v4",
    type: "Classification",
    dataset: "Run_05",
    metric: "F1 0.92",
    status: "Active",
    f1: 0.92,
    spikeCount: 11,
    rmse: 4.27,
  },
  {
    id: "lstm_temporal_v2",
    name: "LSTM_Temporal_v2",
    type: "Prediction",
    dataset: "Run_04",
    metric: "RMSE 4.27",
    status: "Saved",
    f1: null,
    spikeCount: null,
    rmse: 4.27,
  },
  {
    id: "svm_baseline_v1",
    name: "SVM_Baseline_v1",
    type: "Classification",
    dataset: "Run_02",
    metric: "F1 0.84",
    status: "Archived",
    f1: 0.84,
    spikeCount: 9,
    rmse: 5.11,
  },
];

export default function Models({ setRetrainOpen, setViewModelOpen, setModelCompareOpen, setSelectedModels, setViewingModel }) {
  const [selected, setSelected] = useState([]);
  const [compareMode, setCompareMode] = useState(false);

  const handleSelect = (modelId) => {
    if (!compareMode) return;
    
    if (selected.includes(modelId)) {
      setSelected(selected.filter(id => id !== modelId));
    } else if (selected.length < 2) {
      setSelected([...selected, modelId]);
    }
  };

  const handleStartCompare = () => {
    setCompareMode(true);
    setSelected([]);
  };

  const handleCancelCompare = () => {
    setCompareMode(false);
    setSelected([]);
  };

  const handleConfirm = () => {
    const selectedModelsData = MODELS_DATA.filter(m => selected.includes(m.id));
    setSelectedModels(selectedModelsData);
    setModelCompareOpen(true);
    setCompareMode(false);
    setSelected([]);
  };

  const selectedModelsData = MODELS_DATA.filter(m => selected.includes(m.id));

  return (
    <motion.div
      key="models"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className="flex items-center justify-between mb-6">
        <SectionTitle
          title="Model Manager"
          desc="View, rename, retrain, and activate stored models."
        />
        
        {!compareMode ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={handleStartCompare}
          >
            <GitCompare className="h-4 w-4" />
            Compare Models
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              Selected: {selected.length}/2
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              onClick={handleCancelCompare}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {compareMode && selected.length === 2 && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">
                Ready to compare:
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {selectedModelsData[0]?.name} vs {selectedModelsData[1]?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={handleCancelCompare}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirm}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {compareMode && (
        <div className="mb-4 p-3 rounded-xl bg-slate-100">
          <p className="text-sm text-slate-600">
            <strong>Tip:</strong> Select two models to compare their performance metrics.
          </p>
        </div>
      )}

      <Card className="rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 text-left w-12">
                    {compareMode && (
                      <Checkbox 
                        checked={selected.length === 2} 
                        onCheckedChange={(checked) => {
                          if (checked && selected.length < 2) {
                            const unselected = MODELS_DATA.filter(m => !selected.includes(m.id)).slice(0, 2 - selected.length);
                            setSelected([...selected, ...unselected.map(m => m.id)]);
                          } else if (!checked) {
                            setSelected([]);
                          }
                        }}
                      />
                    )}
                  </th>
                  <th className="p-4 text-left">Model</th>
                  <th className="p-4 text-left">Type</th>
                  <th className="p-4 text-left">Dataset</th>
                  <th className="p-4 text-left">Metric</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {MODELS_DATA.map((model, i) => (
                  <tr key={i} className={`border-t ${selected.includes(model.id) ? 'bg-emerald-50' : ''}`}>
                    <td className="p-4">
                      {compareMode && (
                        <Checkbox
                          checked={selected.includes(model.id)}
                          onCheckedChange={() => handleSelect(model.id)}
                          disabled={selected.length >= 2 && !selected.includes(model.id)}
                        />
                      )}
                    </td>
                    <td className="p-4 font-medium">{model.name}</td>
                    <td className="p-4">{model.type}</td>
                    <td className="p-4">{model.dataset}</td>
                    <td className="p-4">{model.metric}</td>
                    <td className="p-4">
                      <Badge className={`${
                        model.status === "Active" ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                        model.status === "Saved" ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                        'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                        {model.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                          setViewingModel(model);
                          setViewModelOpen(true);
                        }}>
                        <Eye className="h-4 w-4" />
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
