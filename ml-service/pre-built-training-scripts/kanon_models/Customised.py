import uuid
import pandas as pd

from DataPreparation import (
    load_dataset,
    detect_columns,
    validate_dataset,
)

from PatternDetection import (
    compute_attributes,
    train_hmm,
    confidence_score_hmm,
    predict_states
)


HISTORY_LOG = {}
def run_job3(payload):

    # read user inputs
    file_path = payload['dataset']['path']
    mode = payload['preprocessing']['mode']
    config = payload['analysis_config']
    step = config.get('step', config['window_size'])
    run_id = f"{uuid.uuid4()}"

    # load and clean dataset
    df = load_dataset(file_path)
    time_col, voltage_col = detect_columns(df)
    df = validate_dataset(df, time_col, voltage_col)
    if isinstance(time_col, list):
        time_col = time_col[0]

    if isinstance(voltage_col, list):
        voltage_col = voltage_col[0]

    # time filtering
    df[time_col] = pd.to_datetime(df[time_col], utc=True)
    start_time = pd.to_datetime(config['time_range']['start'], unit='s', utc=True)
    end_time = pd.to_datetime(config['time_range']['end'], unit='s', utc=True)
    df = df[(df[time_col] >= start_time) & (df[time_col] <= end_time)].copy()

    features_df = compute_attributes(
        df, 
        time_col=time_col, 
        voltage_col=voltage_col, 
        window_size=config['window_size'], 
        step=step, 
        mode=mode
    )

    # train HMM, predict states, and classify patterns
    obs_col = ["frequency", "amplitude_max", "spike_interval_mean"]
    observations = features_df[obs_col].values
    model = train_hmm(observations, n_states=3)
    features_df["state_label"] = predict_states(model, observations)

    # classify patterns based on state means
    state_means = features_df.groupby("state_label")["amplitude_max"].mean().sort_values()
    mapping = {
        state_means.index[0]: "baseline",
        state_means.index[-1]: "spike",
    }

    # map "oscillation" to any state that is not classified as "baseline" or "spike"
    for state in state_means.index:
        if state not in mapping:
            mapping[state] = "oscillation"

    # add pattern type to features_df
    features_df["pattern_type"] = features_df["state_label"].map(mapping)

    # calculate recurrence percentages
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
    
    # calculate confidence score for the HMM model and compare with previous run if applicable
    conf = confidence_score_hmm(model, observations)
    if "previous_run_id" in payload:
        previous_id = payload["previous_run_id"]
    else:
        previous_id = "None"
    comparison = {
        "previous_run_id": previous_id,
        "pattern_count_change": 0,
        "average_confidence_change": 0.0
    }

    # compare with previous run if applicable
    if config.get("compare_with_previous_run") and payload.get("previous_run_id") in HISTORY_LOG:
        prev = HISTORY_LOG[payload["previous_run_id"]]
        comparison["pattern_count_change"] = len(patterns) - prev["count"]
        comparison["average_confidence_change"] = round(conf - prev["conf"], 2)
    HISTORY_LOG[run_id] = {"count": len(patterns), "conf": conf}

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
        "run_id": run_id,
        "config_used": {
            "threshold": config["threshold"],
            "window_size": config["window_size"],
            "model_selection": config["model_selection"],
            "preprocessing_mode": mode
        },
        "patterns": patterns,
        "summary": {
            "total_patterns": len(patterns),
            "recurrence": recurrence_percentages,
            "average_frequency": average_freq,
            "average_amplitude": average_amp,
            "average_interval": average_int
        },
        "comparison": comparison
    }
    return output

