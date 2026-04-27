import argparse
import json

from jobs import (
    job_2_pattern_detection,
    job_3_custom_exploration,
    job_4_correlation,
    job_5_future_prediction
)

JOB_MAP = {
    "job2": job_2_pattern_detection,
    "job3": job_3_custom_exploration,
    "job4": job_4_correlation,
    "job5": job_5_future_prediction
}


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Internal ML Dev Tool")
    parser.add_argument("--job", required=True, choices=["job2", "job3", "job4", "job5"])
    parser.add_argument("--input", required=True)

    args = parser.parse_args()

    payload = load_json(args.input)
    result = JOB_MAP[args.job](payload)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()