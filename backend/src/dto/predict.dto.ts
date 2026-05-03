export type PredictRequestDTO = {
  model_id?: string;
  prediction_window?: number;
  parameters?: Record<string, unknown>;
};

export type MLWorkerPredictPayloadDTO = {
  job_id: string;
  dataset_id: string;
  dataset_url: string;
  model_url?: string;
  parameters?: Record<string, unknown>;
};
