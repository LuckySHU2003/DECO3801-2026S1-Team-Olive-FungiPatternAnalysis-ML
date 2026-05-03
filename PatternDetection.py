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
    if mode == "detrended":
        df = baseline_stabilisation(df, voltage_col, window_val=100)
    
    df = noise_reduction(df, window_val=5)

    features = extract_features_from_data(
        df, 
        time_col=time_col,
        voltage_col=voltage_col, 
        window_size=window_size, 
        step=step)
    
    return features

def cluster_features(features, n_clusters=3):
    """Cluster the features using K-Means."""
    data_to_cluster = features[["frequency", "amplitude_mean", "spike_interval_mean"]]
    
    # scale the data using minmax scale
    scaled_data = minmax_scale(data_to_cluster)

    # initialize KMeans object with number of desired clusters
    k_means = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)

    # fit the model and predict cluster labels
    features["cluster_labels"] = k_means.fit_predict(scaled_data)

    return features

def detect_patterns(features):
    """Detect patterns in the features."""
    # get cluster averages
    cluster_summary = features.groupby("cluster_labels")[[
        "frequency",
        "amplitude_mean",
        "spike_interval_mean"
    ]].mean()

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
    recurrence = features["pattern"].value_counts(normalize=True)
    return recurrence

def run_hmm_analysis(df, signal_col, n_states=3):
    """Run HMM analysis on the data"""
    observations = create_observations(df, signal_col=signal_col)
    
    model = train_hmm(observations, n_states=n_states)
    
    states = predict_states(model, observations)
    
    results = df.iloc[1:].copy()
    results['hmm_state'] = states
    
    return results

def confidence_score_hmm(model, observations):
    """Calculate confidence score for the HMM model"""
    log_likelihood = model.score(observations)
    score = np.exp(log_likelihood / len(observations))
    return round(float(score), 2)

def confidence_score_kmean(model, df):
    data = df[["frequency", "amplitude_mean", "spike_interval_mean"]]
    scaled_data = minmax_scale(data)
    distances = model.transform(scaled_data)
    
    individual_scores = []
    for dist_vector in distances:
        sorted_dist = np.sort(dist_vector)
        d1 = sorted_dist[0]
        d2 = sorted_dist[1]

        if d2 > 0:
            score = 1 - (d1 / d2)
        else:
            score = 0.0
            
        individual_scores.append(max(0, score))

    if not individual_scores:
        return 0.0
        
    return float(np.mean(individual_scores))


def run_job2_hmm(payload):
    """Run the full analysis pipeline for Job 2 which is pattern detection"""
    file_path = payload['dataset']['path']
    time_col = payload['dataset']['columns']['time']
    voltage_col = payload['dataset']['columns']['voltage']
    window_size = payload['detection_config']['window_size']
    step = payload['detection_config'].get('min_interval', window_size)
    mode = payload['preprocessing']['mode']

    df = load_dataset(file_path)
    time_col, voltage_col = detect_columns(df)
    df = validate_dataset(df, time_col, voltage_col)
    if isinstance(time_col, list):
        time_col = time_col[0]

    if isinstance(voltage_col, list):
        voltage_col = voltage_col[0]


    # Job 2.1
    features_df = compute_attributes(
        df, 
        time_col=time_col, 
        voltage_col=voltage_col, 
        window_size=window_size, 
        step=step, 
        mode=mode
    )

    # Job 2.2
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

    # Job 2.3
    recurrence_counts = features_df["pattern_type"].value_counts().to_dict()
    total = len(features_df)
    recurrence_percentages = {}
    for pattern_name, count in recurrence_counts.items():
        ratio = count / total
        percentage = round(ratio, 2)
        recurrence_percentages[pattern_name] = percentage
    

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
    file_path = payload['dataset']['path']
    time_col = payload['dataset']['columns']['time']
    voltage_col = payload['dataset']['columns']['voltage']
    window_size = payload['detection_config']['window_size']
    step = payload['detection_config'].get('min_interval', window_size)
    mode = payload['preprocessing']['mode']

    df = load_dataset(file_path)
    time_col, voltage_col = detect_columns(df)
    df = validate_dataset(df, time_col, voltage_col)
    if isinstance(time_col, list):
        time_col = time_col[0]

    if isinstance(voltage_col, list):
        voltage_col = voltage_col[0]


    # Job 2.1
    features_df = compute_attributes(
        df, 
        time_col=time_col, 
        voltage_col=voltage_col, 
        window_size=window_size, 
        step=step, 
        mode=mode
    )

    # Job 2.2
    data_to_cluster = features_df[["frequency", "amplitude_mean", "spike_interval_mean"]]
    scaled_data = minmax_scale(data_to_cluster)  
    
    model = KMeans(n_clusters=3, random_state=42, n_init=10)
    features_df["cluster_labels"] = model.fit_predict(scaled_data)
    features_df = detect_patterns(features_df)

    # Job 2.3
    recurrence_percentages = calculate_recurrence(features_df).to_dict()
    conf = confidence_score_kmean(model, features_df)
      
    

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

