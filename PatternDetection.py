from SignalPreparation import (
    load_dataset,
    validate_dataset,
    noise_reduction,
    baseline_stabilisation,
    extract_features_from_signal
)

from sklearn.cluster import KMeans
from sklearn.preprocessing import minmax_scale

def compute_attributes(df, time_col="time", signal_col="voltage"):
    """Compute attributes from the signal."""
    df = validate_dataset(df, time_col, signal_col)
    df = noise_reduction(df, signal_col)
    df = baseline_stabilisation(df, signal_col)
    
    features = extract_features_from_signal(df, time_col, signal_col)
    
    return features

def cluster_features(features, n_clusters=3):

    data_to_cluster = features[["frequency", "amplitude_mean", "interval_mean"]]
    
    # scale the data using minmax scale
    scaled_data = minmax_scale(data_to_cluster)

    # initialize KMeans object with number of desired clusters
    k_means = KMeans(n_clusters=n_clusters, random_state=42)

    # fit the model and predict cluster labels
    features["cluster_labels"] = k_means.fit_predict(scaled_data)

    return features

def detect_patterns(features):
    """Detect patterns in the features."""
    # get cluster-wise averages
    cluster_summary = features.groupby("cluster_labels")[[
        "frequency",
        "amplitude_mean",
        "interval_mean"
    ]].mean()

    cluster_mapping = {}    
    for cluster in cluster_summary.index:
        freq = cluster_summary.loc[cluster, "frequency"]
        amp = cluster_summary.loc[cluster, "amplitude_mean"]
        interval = cluster_summary.loc[cluster, "interval_mean"]

        # spike = strong activity
        if amp > cluster_summary["amplitude_mean"].mean():
            cluster_mapping[cluster] = "spike"
        # oscillation = regular activity
        elif interval < cluster_summary["interval_mean"].mean():
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

