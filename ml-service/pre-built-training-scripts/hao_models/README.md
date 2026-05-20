# Hao's Model Guidelines: Random Forest, CNN, and LSTM

Standalone training pipeline that produces three `.pkl` model artifacts for the DECO3801 FastAPI ML-service. This repository has no runtime dependency on the backend, it reads raw ADC recordings, trains models, and exports self-contained wrappers that the backend can upload to and load from Supabase.

---

## Architecture

```
  provided-training-data.xlsx
  5 615 rows × 4 ADC channels
  Time | ADC1 | ADC2 | ADC3 | ADC4
              │
              ▼
  ┌─────────────────────────────────────────┐
  │         common_preprocessing.py         │
  │                                         │
  │  1. Parse ISO8601 → seconds_from_start  │
  │  2. Interpolate / fill missing values   │
  │  3. Chronological split  70 / 15 / 15   │
  │  4. Expand each ADC column into an      │
  │     independent  [Time, Voltage]  seq.  │
  └──────────────┬──────────────────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  RF      │ │  CNN     │ │  LSTM    │
  │ Classify │ │ Classify │ │ Forecast │
  │ patterns │ │ patterns │ │ voltage  │
  └────┬─────┘ └────┬─────┘ └────┬─────┘
       │             │             │
       ▼             ▼             ▼
  rf_pattern_  cnn_custom_  lstm_predict_
  detection    exploration  future
  .pkl         .pkl         .pkl
       │             │             │
       └─────────────┴─────────────┘
                     │
                     ▼  upload
             ┌───────────────┐
             │    Supabase   │
             │    Storage    │
             └───────┬───────┘
                     │  signed URL at request time
                     ▼
             ┌───────────────────────────────┐
             │      FastAPI ML-Service       │
             │  SklearnModelAdapter.load()   │
             │  cloudpickle → wrapper.pkl    │
             │  wrapper.run_inference()      │
             └───────────────────────────────┘
```

Each exported `.pkl` is a **bundled wrapper object**, not a raw model. The wrapper contains the trained model, scaler, label encoder, default config, and all preprocessing logic needed to accept a `Time, Voltage` DataFrame and return a backend-compatible dict. No separate config or scaler files are needed at runtime.

---

## Signal Background

Fungal mycelium generates spontaneous bioelectrical activity, trains of action-potential-like spikes measurable in the millivolt range. The recording device samples four electrodes (ADC1–4) simultaneously at roughly 1.2-second intervals. The signals are characterised by a stable baseline with intermittent bursts, occasional sustained drops, and periods of irregular oscillation.

The modelling challenge is that the backend inference API normalises input to a single `(Time, Voltage)` channel, while training data has four concurrent channels. The solution is to treat each channel as an independent single-channel signal during training. After a chronological split, each ADC column is separated into its own `[Time, Voltage]` DataFrame, and windows are constructed per-channel — never across channels. This guarantees that inference on a single channel is valid without any architectural change.

---

## Data Pipeline — `common_preprocessing.py`

### Time Parsing

The raw `Time` column contains UTC ISO 8601 strings (`2026-03-13T04:32:20.310Z`). These are parsed with `pd.to_datetime(..., utc=True)` and converted to a monotonically increasing float axis:

$$t_i = (T_i - T_0) \quad \text{[seconds elapsed since first valid sample]}$$

Rows with unparseable timestamps are dropped before the split, so there is no future leakage from timestamp imputation.

### Voltage Cleaning

For each ADC column, missing or non-numeric values are filled by linear interpolation between valid neighbours, followed by forward-fill then backward-fill for any boundary gaps. Quantile clipping is **off by default** (signal spikes are the target of detection, not noise to remove). 

### Chronological Split

The dataset is split strictly by row order (time order), never shuffled:

| Split | Fraction | Rows |
|-------|----------|------|
| Train | 70% | 3 930 |
| Validation | 15% | 842 |
| Test | 15% | 843 |

After splitting, each of the four ADC columns is extracted as an independent `[Time, Voltage]` sequence. Training windows are built from these four per-channel sequences independently, giving 4× the effective training data while preserving single-channel inference compatibility.

---

## Model 1 — Random Forest Pattern Detector

**Script:** `train_rf_pattern_detection.py`  
**Output:** `outputs/models/rf_pattern_detection.pkl`  
**Backend job:** `detect_patterns`

### Design Rationale

Bioelectrical signal events are characterised not just by absolute voltage level but by the *shape* of local activity: how steep the rise is, whether there are multiple peaks, how far the window deviates from background. A set of hand-engineered statistical features compresses each window into a compact descriptor that captures these properties, which is well-suited to a Random Forest: interpretable, robust to feature scale, and efficient on small datasets.

### Feature Extraction

For each sliding window of length $w$, a 10-dimensional feature vector is computed:

| Feature | Definition |
|---------|-----------|
| Mean | $\bar{v} = \frac{1}{w}\sum_{i} v_i$ |
| Std | $\sigma_w = \sqrt{\frac{1}{w}\sum_{i}(v_i - \bar{v})^2}$ |
| Min / Max | $\min(v),\; \max(v)$ |
| Range | $\max(v) - \min(v)$ |
| Slope | $\hat{\beta}_1$ of OLS fit on $\{(i, v_i)\}$ |
| Median | $\text{med}(v)$ |
| MAD | $\frac{1}{w}\sum_{i}|v_i - \bar{v}|$ |
| Peak count | $\bigl|\{i : v_{i-1} < v_i > v_{i+1}\}\bigr|$ |
| Energy | $\sum_{i} v_i^2$ |

Features are standardised with a `StandardScaler` fit on the training set before being passed to the forest.

### Heuristic Labelling

Without manual annotations, windows are labelled using the z-score of the window mean relative to global training statistics $(\mu_g,\, \sigma_g)$ computed across all four channels:

$$z = \frac{\bar{v} - \mu_g}{\sigma_g}$$

| Condition | Label |
|-----------|-------|
| $z > 2$ | `spike` |
| $z < -2$ | `drop` |
| $\sigma_w > 1.5\,\sigma_g$ | `unstable` |
| otherwise | `normal` |

> **Note on this recording.** In the training data, $\mu_g = -8.07$ and $\sigma_g = 107.4$, which reflects the large offset between ADC3 (~+215 mV) and the other three channels (~-20 to -70 mV). As a result, ADC3 windows are consistently labelled `spike` due to their cross-channel z-score, not because they contain event spikes within the channel. For future work, per-channel normalisation before labelling would produce semantically richer labels.

### The Forest

A `RandomForestClassifier` with 100 trees and `max_depth=10` is trained. At inference, each tree independently classifies the window and class probabilities are the fraction of trees voting for each label:

$$p(k \mid \mathbf{x}) = \frac{1}{T}\sum_{t=1}^{T} \mathbf{1}\!\left[h_t(\mathbf{x}) = k\right]$$

`TimeSeriesSplit` (3 folds) is used for cross-validation, which respects temporal order that validation windows are always drawn from a later time period than training windows within each fold.

**Trial Results:**

| Metric | Value |
|--------|-------|
| CV accuracy (3-fold TS) | 92.8% ± 10.1% |
| Validation accuracy | 93% |
| Test accuracy | 87% |
| Training windows | 484 (458 normal, 26 spike) |
| Window size | 64 steps |

---

## Model 2 — MLP Pattern Explorer (CNN-style)

**Script:** `train_cnn_custom_exploration.py`  
**Output:** `outputs/models/cnn_custom_exploration.pkl`  
**Backend job:** `custom_exploration`

### Design Rationale

Where the RF model commits to a fixed set of statistics, the MLP receives the raw voltage sequence as a flat input vector and learns its own feature hierarchy. The analogy to a 1-D CNN is intentional: a CNN over a length-64 signal with no striding is equivalent to a fully-connected layer from 64 inputs. It learns per-position weights that can detect any local pattern the training set contains. Without a GPU, the MLP is the practical equivalent.

### Network and Training

Input is the raw voltage window $\mathbf{x} = [v_0, \ldots, v_{w-1}] \in \mathbb{R}^{w}$, scaled per feature position using a `StandardScaler` fit on all training windows stacked as a matrix. The network architecture is:

$$\mathbb{R}^{64} \;\xrightarrow{\,\text{ReLU}\,}\; \mathbb{R}^{128} \;\xrightarrow{\,\text{ReLU}\,}\; \mathbb{R}^{64} \;\xrightarrow{\,\text{softmax}\,}\; \mathbb{R}^{|\mathcal{C}|}$$

Training uses L-BFGS with early stopping (patience = 10 iterations, 10% of training data held as internal validation). The same four heuristic labels apply.

### Runtime Window-Size Mismatch

The model is trained on `window_size=64` windows. If the backend sends a different `window_size` (e.g. `20` in the smoke test), the wrapper resamples the runtime window to 64 points via linear interpolation before passing it to the model:

$$v'_j = \text{interp}\!\left(\frac{j}{w'-1},\; \frac{\cdot}{w-1},\; v\right), \quad j = 0,\ldots,w'-1$$

This is a pure `numpy.interp` call (no scipy dependency) and preserves the window's shape well enough for the coarse label classification the model performs.

**Results:**

| Metric | Value |
|--------|-------|
| Validation accuracy | 84% |
| Test accuracy | 91% |
| Training windows | 484 |
| MLP iterations to converge | 13 |
| Window size (trained) | 64 steps |

---

## Model 3 — MLP Voltage Predictor (LSTM-style)

**Script:** `train_lstm_predict_future.py`  
**Output:** `outputs/models/lstm_predict_future.pkl`  
**Backend job:** `predict_future`

### Design Rationale

Voltage prediction is framed as supervised sequence-to-sequence regression: given the last $w_{in}$ voltage values, predict the next $w_{out}$ values. A `MLPRegressor` is used as the LSTM substitute. It maps the same input to the same output shape, learns the temporal structure from the training distribution, and serialises cleanly. The lack of recurrent connections means it cannot extrapolate arbitrarily far from its training context, but for short forecast horizons on periodic-ish bioelectrical signals it performs well.

### Sliding Window Construction

A `MinMaxScaler` is fit on the concatenation of all four training-channel voltages, mapping the global range to $[-1, 1]$. The scaled channels are then windowed with 75% overlap (step = $w_{in}/4$) to maximise the number of training sequences:

$$X_i = [\tilde{v}_i,\; \tilde{v}_{i+1},\; \ldots,\; \tilde{v}_{i+w_{in}-1}] \in [-1,1]^{w_{in}}$$
$$Y_i = [\tilde{v}_{i+w_{in}},\; \ldots,\; \tilde{v}_{i+w_{in}+w_{out}-1}] \in [-1,1]^{w_{out}}$$

The MLP is trained to minimise mean squared error across all output steps simultaneously:

$$\mathcal{L} = \frac{1}{N \cdot w_{out}} \sum_{i=1}^{N} \|\hat{Y}_i - Y_i\|^2_2$$

Architecture: $\mathbb{R}^{64} \to \mathbb{R}^{256} \to \mathbb{R}^{128} \to \mathbb{R}^{64} \to \mathbb{R}^{20}$ (all ReLU except output).

### Iterative Forecasting

When `prediction_window` exceeds the model's `output_window` of 20, the wrapper extends the forecast auto-regressively. After each prediction, the input window is slid forward by appending the freshly predicted values and dropping the oldest real values:

```
step 0:  [..., v_{n-64}, ..., v_{n-1}]        → predict [ŷ_0, ..., ŷ_19]
step 1:  [..., v_{n-44}, ..., v_{n-1}, ŷ_0, ..., ŷ_19]  → predict [ŷ_20, ..., ŷ_39]
...
```

The final predictions are inverse-transformed back to the original voltage scale before being returned.

### Confidence Estimation

Rather than a full predictive interval, confidence is estimated from the validation RMSE on the $[-1, 1]$ scaled space. The full scaled range is 2.0, so:

$$c_0 = \text{clip}\!\left(1 - \frac{\text{RMSE}_\text{val}}{2.0},\; 0.10,\; 0.95\right)$$

A shallow linear decay is applied per prediction step to reflect that uncertainty grows further into the future — this is consistent with how the backend `PredictionSummary` aggregates confidence.

**Results:**

| Metric | Value | Note |
|--------|-------|------|
| Val MAE | 0.00724 | scaled $[-1,1]$ |
| Val RMSE | 0.00941 | scaled $[-1,1]$ |
| Test MAE | 0.00646 | scaled $[-1,1]$ |
| Test RMSE | 0.00827 | scaled $[-1,1]$ |
| Training sequences | 964 (from 4 channels) |
| MLP iterations to converge | 51 |
| Input / output window | 64 → 20 steps |

> RMSE of 0.009 on a $[-1,1]$ scale means roughly **0.45% of the full voltage range per step**. In raw voltage terms, the recording spans ~300 mV, so typical per-step error is on the order of 1–2 mV.

---

## Performance at a Glance

`Note: These performance results may vary based on hardware of training machine i.e. your computer, and can be different amongst different training sessions`

| | RF | CNN | LSTM |
|--|--|--|--|
| Task | classify pattern type | classify pattern type | regress future voltage |
| Algorithm | RandomForestClassifier | MLPClassifier | MLPRegressor |
| Input representation | 10 statistical features | raw window (64 values) | raw window (64 values) |
| Val accuracy / RMSE | 93% | 84% | RMSE 0.0094 |
| Artifact size | 63 KB | 401 KB | 1.4 MB |
| Load time (smoke test) | 715 ms | 12 ms | 11 ms |
| Inference time (120 rows) | 33 ms | 2 ms | 2 ms |

The RF artifact is larger at load time due to joblib-unpickling the 100 decision trees; subsequent inference is fast. The CNN artifact is large because the `StandardScaler` stores a 64-position mean/std vector alongside the MLP weights.

---

## Usage

### Environment Setup

```bash
conda activate your-env   # all required packages already in requirements.txt
```

All commands are run from the the root of these files.

`sample_time_voltage.csv is given as data for usage (not training data).`

### Training

```bash
python training/train_rf_pattern_detection.py \
    --input "provided-training-data.xlsx"

python training/train_cnn_custom_exploration.py \
    --input "provided-training-data.xlsx"

python training/train_lstm_predict_future.py \
    --input "provided-training-data.xlsx"
```

All three share the same optional CLI flags:

| Flag | Applies to | Default | Description |
|------|-----------|---------|-------------|
| `--input` | all | *(required)* | Path to training `.xlsx` |
| `--output-dir` | all | `outputs` | Root directory for all outputs |
| `--window-size` | all | `64` | Sliding window length in samples |
| `--prediction-window` | LSTM only | `20` | Number of future steps to predict |
| `--clip-outliers` | all | `false` | Apply 1st/99th percentile clip to voltages |

Each script writes its artifact to `outputs/models/` and a metrics JSON to `outputs/reports/`. The metrics files are for local analysis only. Do not upload them to Supabase.

### Smoke Test

```bash
python training/smoke_test_models.py --sample-input sample_time_voltage.csv
```

The smoke test loads each `.pkl`, calls `wrapper.run_inference(frame, config)` with the configs below, and saves the resulting JSON payloads to `outputs/smoke_tests/`. Load time, inference time, and output shape are printed to stdout. These efficiency metrics do not appear inside the JSON outputs. The backend payloads are clean.

| Artifact | Config passed | Output file |
|----------|--------------|-------------|
| `rf_pattern_detection.pkl` | `{"window_size": 20, "threshold": 0.5}` | `rf_smoke_output.json` |
| `cnn_custom_exploration.pkl` | `{"window_size": 20, "threshold": 0.5, "model_selection": "cnn"}` | `cnn_smoke_output.json` |
| `lstm_predict_future.pkl` | `{"window_size": 20, "prediction_window": 20}` | `lstm_smoke_output.json` |

> The CNN smoke test uses `window_size=20` intentionally — this exercises the linear resampling path (20 → 64) to confirm the model does not crash on a mismatched window size.

The smoke test also accepts `--model-dir` and `--output-dir` to point at non-default paths. If `sample_time_voltage.xlsx` is passed but only `.csv` exists, the script falls back automatically.

---

## Project Layout

```
hao_models/
├── training/
│   ├── common_preprocessing.py          # All shared data-handling logic
│   ├── train_rf_pattern_detection.py    # Model 1 training + RFPatternWrapper
│   ├── train_cnn_custom_exploration.py  # Model 2 training + CNNPatternWrapper
│   ├── train_lstm_predict_future.py     # Model 3 training + LSTMPredictWrapper
│   └── smoke_test_models.py             # End-to-end compatibility test
│
├── outputs/                             # Generated — not committed to git
│   ├── models/                          # ← upload these three to Supabase
│   ├── reports/                         # Local metrics only
│   └── smoke_tests/                     # Backend-compatible output samples
│
├── provided-training-data.xlsx          # Training Data (private)
└── sample_time_voltage.csv              # Single-channel inference sample
```

---

## Dependencies

No packages beyond what the ML-service already declares in `requirements.txt`.

| Package | Role |
|---------|------|
| `pandas` | xlsx loading, timestamp parsing, DataFrame operations |
| `numpy` | windowing, feature extraction, array maths |
| `scikit-learn` | RandomForest, MLPClassifier, MLPRegressor, StandardScaler, MinMaxScaler |
| `cloudpickle` | Serialises wrapper objects including closures |
| `openpyxl` | Excel file reading backend for pandas |

---

## References

**Random Forests and Decision Trees**

[1] Breiman, L. (2001). Random Forests. *Machine Learning*, 45(1), 5–32. https://doi.org/10.1023/A:1010933404324

[2] Breiman, L., Friedman, J. H., Olshen, R. A., & Stone, C. J. (1984). *Classification and Regression Trees*. Wadsworth & Brooks/Cole.

The Random Forest algorithm (Model 1) builds an ensemble of CART decision trees [2], each trained on a bootstrap sample with random feature subsets. Node splits are chosen by minimising Gini impurity. Class probabilities are estimated as the fraction of trees voting for each class [1].

---

**Multi-Layer Perceptron and Backpropagation**

[3] Rumelhart, D. E., Hinton, G. E., & Williams, R. J. (1986). Learning representations by back-propagating errors. *Nature*, 323, 533–536. https://doi.org/10.1038/323533a0

[4] Liu, D. C., & Nocedal, J. (1989). On the limited memory BFGS method for large scale optimization. *Mathematical Programming*, 45(1–3), 503–528. https://doi.org/10.1007/BF01589116

Both the MLP classifier (Model 2) and MLP regressor (Model 3) are trained by backpropagation [3]. The L-BFGS optimiser [4] is used by scikit-learn's `MLPClassifier` and `MLPRegressor`, it approximates the inverse Hessian using a limited memory buffer rather than computing it exactly, which is practical for the moderately sized networks used here.

---

**Time Series Cross-Validation**

[5] Hyndman, R. J., & Athanasopoulos, G. (2021). *Forecasting: Principles and Practice* (3rd ed.). OTexts. https://otexts.com/fpp3/

The `TimeSeriesSplit` strategy used for RF cross-validation follows the rolling-origin evaluation described in Chapter 5 of [5]. Unlike k-fold, each fold's validation set is strictly later in time than its training set, preventing any future data from leaking into a training fold.

---

**Multi-Step Ahead Forecasting**

[6] Ben Taieb, S., Bontempi, G., Atiya, A. F., & Sorjamaa, A. (2012). A review and comparison of strategies for multi-step ahead time series forecasting based on the NN5 forecasting competition. *Expert Systems with Applications*, 39(8), 7067–7083. https://doi.org/10.1016/j.eswa.2012.01.039

The iterative (recursive) forecasting strategy in Model 3 — where each predicted step is fed back as input for the next — is one of the four strategies surveyed in [6]. It accumulates error over longer horizons, which motivates the per-step confidence decay applied in the wrapper.

---

**Feature Engineering for Time Series**

[7] Fulcher, B. D., & Jones, N. S. (2017). hctsa: A Computational Framework for Automated Time-Series Phenotyping Using Massive Feature Extraction. *Cell Systems*, 5(5), 527–531. https://doi.org/10.1016/j.cels.2017.10.001

The ten statistical features used in Model 1 (mean, std, range, slope, MAD, peak count, energy, etc.) belong to the class of hand-crafted time-series features surveyed and catalogued in [7]. These features were selected as a minimal subset that captures the signal characteristics most relevant to bioelectrical pattern classification: central tendency (mean, median), dispersion (std, range, MAD), directionality (slope), local structure (peak count), and signal power (energy).

---

**Fungal Bioelectrical Signals**

[8] Adamatzky, A. (2022). On spiking behaviour of oyster fungi *Pleurotus djamor*. *Scientific Reports*, 12, 3253. https://doi.org/10.1038/s41598-022-07301-5

[9] Adamatzky, A. (2021). Towards fungal computer. *Interface Focus*, 8(6), 20180029. https://doi.org/10.1098/rsfs.2018.0029

The signal morphology this pipeline is designed to classify, baseline activity interrupted by spike trains, occasional sustained voltage drops, and periods of oscillatory instability, is characterised in [8] and [9]. These papers also establish that fungal action potentials can propagate along mycelial networks, motivating the use of multiple electrodes (ADC1–4) to capture spatially distributed activity from the same organism.