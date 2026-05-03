import { JobModel, type JobStatus, type JobType } from '../models/Job.js';
import type { JobResponseDTO } from '../dto/job.dto.js';

function toJobDTO(doc: any): JobResponseDTO {
  return {
    id: doc._id.toString(),
    type: doc.type,
    dataset_id: doc.dataset_id,
    status: doc.status,
    created_at: doc.created_at.toISOString(),
    result_id: doc.result_id ?? null,
    error: doc.error ?? null
  };
}

export class JobService {
  async createJob(input: { type: JobType; dataset_id?: string }) {
    const job = await JobModel.create({ ...input, status: 'pending' });
    return toJobDTO(job);
  }

  async getJob(id: string) {
    const job = await JobModel.findById(id);
    if (!job) return null;
    return toJobDTO(job);
  }

  async updateJobStatus(id: string, status: JobStatus, patch?: { result_id?: string; error?: string }) {
    const job = await JobModel.findByIdAndUpdate(id, { status, ...patch }, { new: true });
    if (!job) return null;
    return toJobDTO(job);
  }
}
