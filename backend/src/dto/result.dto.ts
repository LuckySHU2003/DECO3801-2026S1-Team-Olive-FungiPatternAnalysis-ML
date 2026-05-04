export interface ResultDTO {
  result_id: string;
  job_id: string;
  type: string;
  output: object;
  summary?: object;
  created_at: string;
}
