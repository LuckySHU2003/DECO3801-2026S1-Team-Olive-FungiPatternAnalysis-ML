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
    id: "hao_rf_pattern_detection",
    name: "Random Forest Pattern Detector",
    category: "Pattern Detection",
    status: "Reference",
    trainedBy: "Hao",
    shortDescription:
      "Detects fungal voltage activity patterns using statistical features and a Random Forest classifier.",
    bestUsedFor:
      "Fast baseline pattern detection for spike, drop, unstable, and normal activity windows.",
    inputFormat:
      "Single-channel Time and Voltage sequence. The wrapper handles preprocessing and feature extraction.",
    outputFormat:
      "Detected pattern labels, class probabilities, and backend-compatible pattern summary values.",
    modelNotes:
      "Uses hand-engineered window features such as mean, range, slope, peak count, and energy. It is efficient and interpretable, but the labels are heuristic rather than manually annotated.",
    parameters: [
      "window_size: sliding window length used for feature extraction",
      "threshold: minimum confidence level for accepting detected patterns",
      "mode: raw signal mode by default",
    ],
  },
  {
    id: "hao_cnn_custom_exploration",
    name: "CNN-style Pattern Explorer",
    category: "Pattern Exploration",
    status: "Reference",
    trainedBy: "Hao",
    shortDescription:
      "Explores local signal shapes using a neural classifier trained on raw voltage windows.",
    bestUsedFor:
      "Custom exploration where the model should learn pattern shape directly rather than rely only on fixed statistical features.",
    inputFormat:
      "Single-channel Time and Voltage sequence, converted into voltage windows for inference.",
    outputFormat:
      "Predicted activity pattern class and confidence values for analysed windows.",
    modelNotes:
      "Implemented as an MLPClassifier serving as a lightweight CNN-style substitute. Runtime windows are resampled to the trained length when needed.",
    parameters: [
      "window_size: runtime analysis window; resampled internally if required",
      "threshold: confidence cutoff for reporting recognised patterns",
      "model_selection: cnn for this exploration model",
    ],
  },
  {
    id: "hao_lstm_predict_future",
    name: "LSTM-style Voltage Predictor",
    category: "Prediction",
    status: "Reference",
    trainedBy: "Hao",
    shortDescription:
      "Forecasts future fungal voltage values from recent signal history.",
    bestUsedFor:
      "Short-horizon voltage prediction when the frontend needs future trend estimates.",
    inputFormat:
      "Single-channel Time and Voltage sequence with enough recent samples to form an input window.",
    outputFormat:
      "Future voltage predictions with step-level confidence estimates.",
    modelNotes:
      "Implemented as an MLPRegressor LSTM-style substitute. It supports iterative forecasting when the requested prediction window is longer than the model output window.",
    parameters: [
      "window_size: number of recent samples used as prediction context",
      "prediction_window: number of future voltage points to forecast",
      "mode: raw signal mode by default",
    ],
  },
  {
    id: "kanon_kmeans_pattern_detection",
    name: "K-Means Pattern Detector",
    category: "Pattern Detection",
    status: "Reference",
    trainedBy: "Kanon",
    shortDescription:
      "Clusters extracted voltage-window features into baseline, oscillation, and spike-like activity patterns.",
    bestUsedFor:
      "Unsupervised pattern detection when clear labelled training data is unavailable.",
    inputFormat:
      "Time-series voltage data from CSV or XLSX, cleaned and split into sliding windows.",
    outputFormat:
      "Cluster-based pattern labels, percentage distribution, and confidence based on centroid distance.",
    modelNotes:
      "Uses moving-average smoothing, rolling-mean baseline stabilisation, and features such as frequency, amplitude, and spike interval.",
    parameters: [
      "window_size: sliding window length for feature extraction",
      "min_interval: minimum distance between detected peaks",
      "null_filter: remove invalid or null values before analysis",
    ],
  },
  {
    id: "kanon_hmm_pattern_detection",
    name: "HMM Temporal Pattern Detector",
    category: "Pattern Exploration",
    status: "Reference",
    trainedBy: "Kanon",
    shortDescription:
      "Models hidden fungal activity states and transitions across the voltage signal over time.",
    bestUsedFor:
      "Temporal pattern detection where state switching and activity sequence behaviour matter.",
    inputFormat:
      "Voltage observations transformed into value, difference, and absolute-difference features.",
    outputFormat:
      "Predicted hidden states, transition behaviour, and normalised likelihood-based confidence.",
    modelNotes:
      "Uses a Gaussian HMM to learn hidden states such as spike, oscillation, and baseline. It also supports time-filtered reruns and comparison with past run history.",
    parameters: [
      "window_size: segment length for temporal analysis",
      "min_interval: peak interval setting used in feature preparation",
      "time_filter: optional time range for rerunning analysis",
    ],
  },
  {
    id: "kanon_lstm_prediction",
    name: "K-Fold LSTM Prediction Model",
    category: "Prediction",
    status: "Reference",
    trainedBy: "Kanon",
    shortDescription:
      "Predicts future fungal signal behaviour using an LSTM workflow with K-fold training.",
    bestUsedFor:
      "Prediction tasks that need an averaged forecast across multiple trained folds.",
    inputFormat:
      "Preprocessed time-series voltage windows from the cleaned signal pipeline.",
    outputFormat:
      "Averaged future prediction result with confidence estimated from prediction consistency.",
    modelNotes:
      "The data is split into five folds, predictions are averaged, and confidence is calculated from the standard deviation across fold outputs.",
    parameters: [
      "sequence_length: number of historical steps used by the LSTM",
      "prediction_window: number of future steps to predict",
      "null_filter: validate and clean missing values before prediction",
    ],
  },
  {
    id: "lucky_kmeans_pkl",
    name: "K-Means Clustering Model",
    category: "Pattern Detection",
    status: "Reference",
    trainedBy: "Lucky",
    shortDescription:
      "Groups fungal bioelectric signal windows into baseline, active fluctuation, oscillation, and burst/spike patterns.",
    bestUsedFor:
      "Comparing similar waveform behaviours across different time windows.",
    inputFormat:
      "Scaled spike, statistical, and FFT-based features extracted from sliding windows.",
    outputFormat:
      "Cluster assignment mapped to fungal activity pattern categories.",
    modelNotes:
      "Uses kmeans.pkl with scaler.pkl for consistent preprocessing before clustering. It is useful for broad pattern grouping rather than precise supervised classification.",
    parameters: [
      "window_size: feature extraction window length",
      "cluster_count: four activity clusters",
      "scaler: StandardScaler fitted on extracted signal features",
    ],
  },
  {
    id: "lucky_hmm_model_pkl",
    name: "Gaussian HMM State Model",
    category: "Pattern Exploration",
    status: "Reference",
    trainedBy: "Lucky",
    shortDescription:
      "Analyses temporal transitions between hidden fungal electrical activity states.",
    bestUsedFor:
      "Understanding pattern switching, state duration, and stability of fungal signal behaviour.",
    inputFormat:
      "Sequential signal features prepared from spike and statistical measurements.",
    outputFormat:
      "Hidden state sequence, transition probabilities, and state-level activity interpretation.",
    modelNotes:
      "Uses hmm_model.pkl to represent states such as resting baseline, moderate activity, high-energy burst, and transition state.",
    parameters: [
      "state_count: four hidden activity states",
      "sequence_length: number of ordered observations passed to the HMM",
      "scaler: preprocessing object used before state modelling",
    ],
  },
  {
    id: "lucky_lstm_model_pth",
    name: "PyTorch LSTM Pattern Predictor",
    category: "Prediction",
    status: "Reference",
    trainedBy: "Lucky",
    shortDescription:
      "Predicts the next fungal electrical activity pattern from previous pattern sequences.",
    bestUsedFor:
      "Sequential pattern forecasting based on cluster labels and extracted spike features.",
    inputFormat:
      "Cluster labels, maximum spike amplitude, mean inter-spike interval, and FFT dominant frequency.",
    outputFormat:
      "Predicted next activity pattern state from the trained PyTorch LSTM weights.",
    modelNotes:
      "Uses lstm_model.pth with config.pkl to reconstruct the model. The workflow includes sliding sequence generation, time-series cross-validation, weighted loss, and dropout regularisation.",
    parameters: [
      "seq_len: sequence length saved in config.pkl",
      "hidden_size: LSTM hidden layer size saved in config.pkl",
      "prediction_window: next-step or short-horizon pattern prediction target",
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