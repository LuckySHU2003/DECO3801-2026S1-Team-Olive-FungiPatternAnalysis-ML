export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type QueueJobType = 'detect_patterns' | 'custom_exploration' | 'predict_future' | 'chat';

export interface JobResponseDTO {
  job_id: string;
  type: QueueJobType;
  status: JobStatus;
  dataset_id?: string;
  result_id?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkerJobDTO {
  job_id: string;
  type: QueueJobType;
}
