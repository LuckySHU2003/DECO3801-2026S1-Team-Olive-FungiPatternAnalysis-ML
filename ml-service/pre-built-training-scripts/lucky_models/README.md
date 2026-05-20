# Model and File Descriptions

This document describes the saved model and preprocessing files used in the fungal bioelectric signal analysis workflow.

## kmeans.pkl

Stores the trained K-Means clustering model used for fungal bioelectric pattern classification.

The model analyses extracted spike, statistical, and FFT-based features from sliding windows of the signal and groups them into different activity patterns.

Detected pattern types include:

- Cluster 0: Baseline pattern
- Cluster 1: Active fluctuation pattern
- Cluster 2: Oscillation pattern
- Cluster 3: Burst/spike pattern

The model helps identify similar waveform behaviours across different time windows.

## hmm_model.pkl

Stores the trained Gaussian Hidden Markov Model (HMM).

The HMM is used to model temporal transitions between hidden fungal electrical activity states over time.

Detected hidden states include:

- State 0: Resting/Baseline state
- State 1: Moderate active state
- State 2: High-energy burst state
- State 3: Transition state

The HMM helps analyse:

- When pattern switching occurs
- State transition probabilities
- Duration and stability of biological activity states
- Sequential temporal behaviour of fungal signals

## scaler.pkl

Stores the fitted StandardScaler preprocessing object used before clustering and prediction.

This scaler standardises extracted features such as:

- Spike count
- Spike interval
- Maximum amplitude
- Signal energy
- FFT dominant frequency

The scaler ensures all features are normalised consistently before being passed into the machine learning and deep learning models.

## config.pkl

Stores important configuration settings used for the LSTM prediction model.

Saved configuration information includes:

- Sequence length (seq_len)
- Input feature size
- Hidden layer size
- Number of output classes
- Selected feature column names

This file ensures the LSTM model can be reconstructed correctly during inference or future training.

## lstm_model.pth

Stores the trained PyTorch LSTM model weights for sequential pattern prediction.

The LSTM model uses previous fungal signal pattern sequences to predict the next pattern state.

Input features include:

- Cluster labels
- Maximum spike amplitude
- Mean inter-spike interval
- FFT dominant frequency

The model learns temporal dependencies and sequential behaviour in fungal bioelectric signals.

The LSTM workflow includes:

- Sliding sequence generation
- Time-series cross-validation
- Weighted loss for rare spike/burst patterns
- Dropout regularisation to reduce overfitting

The prediction task focuses on forecasting the next fungal electrical activity pattern based on historical signal behaviour.
