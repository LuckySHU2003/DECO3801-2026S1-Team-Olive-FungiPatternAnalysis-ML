import type { JobStatus, JobType } from '../models/Job.js';

export type JobResponseDTO = {
  id: string;
  type: JobType;
  dataset_id?: string;
  status: JobStatus;
  created_at: string;
  result_id?: string | null;
  error?: string | null;
};
