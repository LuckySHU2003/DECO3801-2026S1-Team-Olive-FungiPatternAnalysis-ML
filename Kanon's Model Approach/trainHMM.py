import numpy as np
import pandas as pd
from pyhhmm.gaussian import GaussianHMM

def create_observations(df, signal_col = 'voltage'):
    signal = df[signal_col].values
    observations = []
    for i in range(1, len(signal)):
        value = signal[i]
        prev = signal[i - 1]

        diff = value - prev
        abs_diff = abs(diff)

        observations.append([value, diff, abs_diff])
    return np.array(observations)

def train_hmm(observations, n_states=3):
    model = GaussianHMM(n_components=n_states, covariance_type='diag')
    model.fit(observations)
    return model

def predict_states(model, observations):
    return model.predict(observations)
