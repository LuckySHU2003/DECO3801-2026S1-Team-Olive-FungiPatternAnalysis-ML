import { JobModel } from '../models/Job.js';
import type { JobResponseDTO, JobStatus, QueueJobType } from '../dto/job.dto.js';

function toJobResponse(doc: any): JobResponseDTO {
  return {
    job_id: doc._id.toString(),
    type: doc.type,
    status: doc.status,
    dataset_id: doc.dataset_id?.toString(),
    result_id: doc.result_id?.toString(),
    error: doc.error,
    created_at: doc.created_at?.toISOString(),
    updated_at: doc.updated_at?.toISOString()
  };
}

export class JobService {
  async createJob(input: { type: QueueJobType; dataset_id?: string; request_payload: object }) {
    const doc = await JobModel.create({
      type: input.type,
      dataset_id: input.dataset_id,
      request_payload: input.request_payload,
      status: 'pending'
    });
    return toJobResponse(doc);
  }

  async getJob(id: string): Promise<JobResponseDTO> {
    const doc = await JobModel.findById(id);
    if (!doc) throw new Error('Job not found');
    return toJobResponse(doc);
  }

  async updateStatus(id: string, status: JobStatus, patch: { result_id?: string; error?: string } = {}) {
    const doc = await JobModel.findByIdAndUpdate(id, { status, ...patch }, { new: true });
    if (!doc) throw new Error('Job not found');
    return toJobResponse(doc);
  }

  async getJobs() {
    const jobs = await JobModel.find()
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    return { jobs };
  }
}
