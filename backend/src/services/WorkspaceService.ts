import { workspaceQueue } from '../queue/workspace.queue.js';
import { DatasetModel } from '../models/Dataset.js';
import { JobService } from './JobService.js';
import type { CustomExplorationRequestDTO, DetectPatternsRequestDTO, PredictFutureRequestDTO } from '../dto/workspace.dto.js';
import type { JobResponseDTO } from '../dto/job.dto.js';

export class WorkspaceService {
  constructor(private readonly jobService = new JobService()) {}

  async createDetectPatternsJob(dto: DetectPatternsRequestDTO): Promise<JobResponseDTO> {
    return this.createWorkspaceJob(dto.job, dto.dataset.dataset_id, dto);
  }

  async createCustomExplorationJob(dto: CustomExplorationRequestDTO): Promise<JobResponseDTO> {
    return this.createWorkspaceJob(dto.job, dto.dataset.dataset_id, dto);
  }

  async createPredictFutureJob(dto: PredictFutureRequestDTO): Promise<JobResponseDTO> {
    return this.createWorkspaceJob(dto.job, dto.dataset.dataset_id, dto);
  }

  private async createWorkspaceJob(type: 'detect_patterns' | 'custom_exploration' | 'predict_future', datasetId: string, payload: object) {
    const dataset = await DatasetModel.findById(datasetId);
    if (!dataset) throw new Error('Dataset not found');

    const job = await this.jobService.createJob({ type, dataset_id: datasetId, request_payload: payload });
    await workspaceQueue.add(type, { job_id: job.job_id, type }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1500 },
      removeOnComplete: true,
      removeOnFail: false
    });

    return job;
  }
}
