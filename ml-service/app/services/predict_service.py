from typing import Any

def mock_predict(dataset_url: str, model_url: str | None, parameters: dict[str, Any]):
    return {
        "prediction": [0.12, 0.18, 0.21],
        "confidence": 0.8,
        "dataset_url": dataset_url,
        "model_url": model_url,
        "parameters": parameters,
        "source": "python-fastapi-mock"
    }
