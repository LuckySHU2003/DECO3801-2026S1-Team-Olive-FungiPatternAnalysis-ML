from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl, field_validator


class DatasetColumns(BaseModel):
    time: str = "Time"
    voltage: str = "Voltage"


class DatasetRef(BaseModel):
    source: str = "supabase"
    dataset_id: Optional[str] = None
    file_url: Optional[HttpUrl] = None
    storage_path: Optional[str] = None
    columns: DatasetColumns = Field(default_factory=DatasetColumns)


class PreprocessingConfig(BaseModel):
    mode: Literal["raw", "detrended"] = "raw"
    normalize: bool = False
    missing_value_strategy: Literal["drop", "interpolate", "forward_fill", "zero_fill"] = "interpolate"


class ModelRef(BaseModel):
    model_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    selection: Optional[str] = None
    version: Optional[str] = None
    file_url: Optional[HttpUrl] = None
    storage_path: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.lower().lstrip(".")


class BaseMlRequest(BaseModel):
    job_id: str
    job: Optional[str] = None
    dataset: DatasetRef
    preprocessing: PreprocessingConfig = Field(default_factory=PreprocessingConfig)
    model: ModelRef
    # Generic config fallback — prefer named config fields below
    config: Dict[str, Any] = Field(default_factory=dict)


class DetectPatternsRequest(BaseMlRequest):
    detection_config: Dict[str, Any] = Field(default_factory=dict)


class CustomExplorationRequest(BaseMlRequest):
    analysis_config: Dict[str, Any] = Field(default_factory=dict)
    previous_run_id: Optional[str] = None
    previous_result: Optional[Dict[str, Any]] = None


class PredictFutureRequest(BaseMlRequest):
    prediction_config: Dict[str, Any] = Field(default_factory=dict)


class PatternPoint(BaseModel):
    time: float
    voltage: float


class Pattern(BaseModel):
    pattern_id: str
    type: str
    start_time: float
    end_time: float
    snapshot: List[PatternPoint]
    frequency: float
    amplitude: float
    interval: float
    confidence_score: float


class PatternSummary(BaseModel):
    total_patterns: int
    recurrence: Dict[str, int]
    average_frequency: float
    average_amplitude: float
    average_interval: float


class DetectPatternsResponse(BaseModel):
    job: Literal["detect_patterns"] = "detect_patterns"
    status: Literal["completed"] = "completed"
    confidence_score: float
    preprocessing_used: str
    patterns: List[Pattern]
    summary: PatternSummary


class CustomExplorationResponse(BaseModel):
    job: Literal["custom_exploration"] = "custom_exploration"
    status: Literal["completed"] = "completed"
    confidence_score: float
    run_id: str
    config_used: Dict[str, Any]
    patterns: List[Pattern]
    summary: PatternSummary
    comparison: Optional[Dict[str, Any]] = None


class PredictedVoltagePoint(BaseModel):
    time: float
    predicted_voltage: float
    confidence_score: float


class PredictionSummary(BaseModel):
    start_time: float
    end_time: float
    min_predicted_voltage: float
    max_predicted_voltage: float
    average_predicted_voltage: float
    average_confidence_score: float


class PredictFutureResponse(BaseModel):
    job: Literal["predict_future"] = "predict_future"
    status: Literal["completed"] = "completed"
    confidence_score: float
    model_used: str
    prediction_window: int
    predicted_voltage_window: List[PredictedVoltagePoint]
    summary: PredictionSummary
