from DataPreparation import (
    load_dataset,
    detect_columns,
    validate_dataset,
    noise_reduction,
    baseline_stabilisation,
    extract_features_from_data
)

from trainHMM import (
    create_observations, 
    train_hmm, 
    predict_states
)

from sklearn.cluster import KMeans
from sklearn.preprocessing import minmax_scale

import numpy as np

def compute_attributes(df, time_col, voltage_col, window_size, step, mode):
    """Compute attributes from the signal."""
    df = validate_dataset(df, time_col=time_col, voltage_col=voltage_col)

    # if it is detrended mode, apply baseline stabilisation before noise reduction
    if mode == "detrended":
        df = baseline_stabilisation(df, voltage_col, window_val=100)
    df = noise_reduction(df, window_val=5)

    # extract features using the existing function
    features = extract_features_from_data(
        df, 
        time_col=time_col,
        voltage_col=voltage_col, 
        window_size=window_size, 
        step=step)
    
    return features


def find_optimal_k(features_df, min_k=2, max_k=10):
    """Finds the k value that produces the highest confidence score."""

    # prepare the data for clustering
    data_to_cluster = features_df[["frequency", "amplitude_mean", "spike_interval_mean"]]
    scaled_data = minmax_scale(data_to_cluster)
    
    best_k = min_k
    max_conf = -1.0

    # iterate through the range of k values and calculate confidence score for each
    for k in range(min_k, max_k + 1):
        test_model = KMeans(n_clusters=k, random_state=42, n_init=10)
        test_model.fit(scaled_data)
        
        # Calculate confidence score
        current_conf = confidence_score_kmean(test_model, features_df)
        
        # update best_k if current confidence score is higher than max_conf
        if current_conf > max_conf:
            max_conf = current_conf
            best_k = k
            
    return best_k

def detect_patterns(features):
    """Detect patterns in the features."""
    # get cluster averages
    cluster_summary = features.groupby("cluster_labels")[[
        "frequency",
        "amplitude_mean",
        "spike_interval_mean"
    ]].mean()

    # classify clusters into patterns based on their average feature values
    cluster_mapping = {}    
    for cluster in cluster_summary.index:
        freq = cluster_summary.loc[cluster, "frequency"]
        amp = cluster_summary.loc[cluster, "amplitude_mean"]
        interval = cluster_summary.loc[cluster, "spike_interval_mean"]

        # spike = strong activity
        if amp > cluster_summary["amplitude_mean"].mean():
            cluster_mapping[cluster] = "spike"
        # oscillation = regular activity
        elif interval < cluster_summary["spike_interval_mean"].mean():
            cluster_mapping[cluster] = "oscillation"
        # baseline = low activity
        else:
            cluster_mapping[cluster] = "baseline"

    features["pattern"] = features["cluster_labels"].map(cluster_mapping)
    return features
    

def calculate_recurrence(features):
    """Calculate recurrence of patterns."""

    # calculate the percentage of each pattern type in the dataset
    recurrence = features["pattern"].value_counts(normalize=True)
    return recurrence

def confidence_score_hmm(model, observations):
    """Calculate confidence score for the HMM model"""

    # calculate the log likelihood of the observations given the model 
    log_likelihood = model.score(observations)

    # normalise the log likelihood by the number of observations to get an average log likelihood per observation
    normalised = log_likelihood / len(observations)

    # convert the normalised log likelihood to a confidence score 
    score = 1 / (1 + np.exp(-normalised))
    return float(score)

def confidence_score_kmean(model, df):
    """Calculate confidence score for the K-Means model"""
    data = df[["frequency", "amplitude_mean", "spike_interval_mean"]]
    scaled_data = minmax_scale(data)
    # calculate the distance of each data point to its assigned cluster center
    distances = model.transform(scaled_data)
    
    individual_scores = []
    # calculate confidence score for each data point based on the distance to its assigned cluster center
    for dist_vector in distances:
        sorted_dist = np.sort(dist_vector)
        d1 = sorted_dist[0]
        d2 = sorted_dist[1]

        if d2 > 0:
            score = 1 - (d1 / d2)
        else:
            score = 0.0
            
        individual_scores.append(max(0, score))

    # if there are no valid scores, return a confidence score of 0.0
    if not individual_scores:
        return 0.0
        
    return float(np.mean(individual_scores))


def run_job2_hmm(payload):
    """Run the full analysis pipeline for Job 2 which is pattern detection"""

    # extract necessary information from the payload
    file_path = payload['dataset']['path']
    time_col = payload['dataset']['columns']['time']
    voltage_col = payload['dataset']['columns']['voltage']
    window_size = payload['detection_config']['window_size']
    step = payload['detection_config'].get('min_interval', window_size)
    mode = payload['preprocessing']['mode']

    # load and validate the dataset
    df = load_dataset(file_path)
    time_col, voltage_col = detect_columns(df)
    df = validate_dataset(df, time_col, voltage_col)
    if isinstance(time_col, list):
        time_col = time_col[0]

    if isinstance(voltage_col, list):
        voltage_col = voltage_col[0]


    # Job 2.1 (compute attributes from the signal)
    features_df = compute_attributes(
        df, 
        time_col=time_col, 
        voltage_col=voltage_col, 
        window_size=window_size, 
        step=step, 
        mode=mode
    )

    # Job 2.2 (train HMM and predict states)
    obs_col = ["frequency", "amplitude_max", "spike_interval_mean"]
    observations = features_df[obs_col].values
    model = train_hmm(observations, n_states=3)
    features_df["state_label"] = predict_states(model, observations)

    state_means = features_df.groupby("state_label")["amplitude_max"].mean().sort_values()
    mapping = {
        state_means.index[0]: "baseline",
        state_means.index[-1]: "spike",
    }

    for state in state_means.index:
        if state not in mapping:
            mapping[state] = "oscillation"

    features_df["pattern_type"] = features_df["state_label"].map(mapping)

    # Job 2.3 (calculate recurrence and confidence score)
    recurrence_counts = features_df["pattern_type"].value_counts().to_dict()
    total = len(features_df)
    recurrence_percentages = {}
    for pattern_name, count in recurrence_counts.items():
        ratio = count / total
        percentage = round(ratio, 2)
        recurrence_percentages[pattern_name] = percentage
    
    # create output patterns 
    patterns = []
    for idx, row in features_df.iterrows():
        window_slice = df.iloc[int(row['start_index']):int(row['end_index'])]
        current_pattern_values = row[obs_col].values.astype(float).reshape(1, -1)
        patterns.append({
            "pattern_id": f"P-{idx}",
            "type": row["pattern_type"],
            "start_time": float(row["start_time"].timestamp()),
            "end_time": float(row["end_time"].timestamp()),
            "snapshot": window_slice[[time_col, voltage_col]].rename(
                columns={time_col: "time", voltage_col: "voltage"}).to_dict(
                    orient="records"),
            "frequency": float(row["frequency"]),
            "amplitude": float(row["amplitude_max"]),
            "interval": float(row["spike_interval_mean"]),
            "confidence_score": confidence_score_hmm(model, current_pattern_values)
        })
        
        if not features_df.empty:
            average_freq = float(features_df["frequency"].mean())
            average_amp = float(features_df["amplitude_max"].mean())
            average_int = float(features_df["spike_interval_mean"].mean())
        else:
            average_freq = 0.0
            average_amp = 0.0
            average_int = 0.0
            
    output = {
        "job": payload["job"],
        "status": "success",
        "confidence_score": confidence_score_hmm(model, observations),
        "preprocessing_used": mode,
        "patterns": patterns,
        "summary": {
            "total_patterns": len(patterns),
            "recurrence": recurrence_percentages,
            "average_frequency": average_freq,
            "average_amplitude": average_amp,
            "average_interval": average_int
        }
    }
    return output

def run_job2_kmean(payload):
    """Run the full analysis pipeline for Job 2 which is pattern detection"""

    # extract necessary information from the payload
    file_path = payload['dataset']['path']
    time_col = payload['dataset']['columns']['time']
    voltage_col = payload['dataset']['columns']['voltage']
    window_size = payload['detection_config']['window_size']
    step = payload['detection_config'].get('min_interval', window_size)
    mode = payload['preprocessing']['mode']

    # load and validate the dataset
    df = load_dataset(file_path)
    time_col, voltage_col = detect_columns(df)
    df = validate_dataset(df, time_col, voltage_col)
    if isinstance(time_col, list):
        time_col = time_col[0]

    if isinstance(voltage_col, list):
        voltage_col = voltage_col[0]


    # Job 2.1 (compute attributes from the signal)
    features_df = compute_attributes(
        df, 
        time_col=time_col, 
        voltage_col=voltage_col, 
        window_size=window_size, 
        step=step, 
        mode=mode
    )

    # Job 2.2  (train K-Means, find optimal k, predict clusters, and detect patterns)
    best_k = find_optimal_k(features_df, min_k=2, max_k=10) 
    data_to_cluster = features_df[["frequency", "amplitude_mean", "spike_interval_mean"]]
    scaled_data = minmax_scale(data_to_cluster)  
    
    model = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    features_df["cluster_labels"] = model.fit_predict(scaled_data)
    features_df = detect_patterns(features_df)

    # Job 2.3 (calculate recurrence and confidence score)
    recurrence_percentages = calculate_recurrence(features_df).to_dict()
    conf = confidence_score_kmean(model, features_df)

    # create output patterns
    patterns = []
    for idx, row in features_df.iterrows():
        window_slice = df.iloc[int(row['start_index']):int(row['end_index'])]
        patterns.append({
            "pattern_id": f"P-{idx}",
            "type": row["pattern"],
            "start_time": float(row["start_time"].timestamp()),
            "end_time": float(row["end_time"].timestamp()),
            "snapshot": window_slice[[time_col, voltage_col]].rename(
                columns={time_col: "time", voltage_col: "voltage"}).to_dict(
                    orient="records"),
            "frequency": float(row["frequency"]),
            "amplitude": float(row["amplitude_max"]),
            "interval": float(row["spike_interval_mean"]),
            "confidence_score": conf
        })
        
        if not features_df.empty:
            average_freq = float(features_df["frequency"].mean())
            average_amp = float(features_df["amplitude_max"].mean())
            average_int = float(features_df["spike_interval_mean"].mean())
        else:
            average_freq = 0.0
            average_amp = 0.0
            average_int = 0.0
            
    output = {
        "job": payload["job"],
        "status": "success",
        "confidence_score": conf,
        "preprocessing_used": mode,
        "patterns": patterns,
        "summary": {
            "total_patterns": len(patterns),
            "recurrence": recurrence_percentages,
            "average_frequency": average_freq,
            "average_amplitude": average_amp,
            "average_interval": average_int
        }
    }
    return output

payload = {
    "job": "Lions Mane Pattern Analysis",
    "dataset": {
        "path": "record-mfs2-2026-03-13-04-32-17 Lions mane c2000-Studio3.xlsx", 
        "columns": {
            "time": "time",       
            "voltage": [
                "ADC1 (green)",
                "ADC2 (yellow)",
                "ADC3 (orange)",
                "ADC4 (red)"
                ]
        }
    },
    "detection_config": {
        "window_size": 20,       
        "min_interval": 10        
    },
    "preprocessing": {
        "mode": "detrended"       
    }
}

print("Running HMM Analysis")
results_hmm = run_job2_hmm(payload)
    
print("Analysis Summary")
print(f"Status: {results_hmm['status']}")
print(f"Total Patterns Detected: {results_hmm['summary']['total_patterns']}")
print(f"Confidence Score: {results_hmm['confidence_score']}")
print(f"Recurrence: {results_hmm['summary']['recurrence']}")

