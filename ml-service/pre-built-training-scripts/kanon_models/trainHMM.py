import numpy as np
from hmmlearn import hmm

def create_observations(df, signal_col = 'voltage'):
    """Create observations for HMM from the signal."""
    signal = df[signal_col].values
    observations = []

    # start from the second data point to calculate the difference
    for i in range(1, len(signal)):
        value = signal[i]
        prev = signal[i - 1]

        diff = value - prev
        abs_diff = abs(diff)

        # append the value, difference, and absolute difference as features for HMM
        observations.append([value, diff, abs_diff])
    return np.array(observations)


def train_hmm(observations, n_states=3):
    """Train a Gaussian HMM on the observations."""

    # create and fit the HMM model
    model = hmm.GaussianHMM(n_components=n_states, covariance_type='diag')
    model.fit(observations)
    return model

def predict_states(model, observations):
    """Predict hidden states using the trained HMM."""
    return model.predict(observations)

