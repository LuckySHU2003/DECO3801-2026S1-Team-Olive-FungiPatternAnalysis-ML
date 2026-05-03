import { DatasetService } from './DatasetService.js';
import { JobService } from './JobService.js';
import { jobQueue } from '../queue/job.queue.js';
import { MLModel } from '../models/Model.js';
import type { PredictRequestDTO, MLWorkerPredictPayloadDTO } from '../dto/predict.dto.js';
import { logger } from '../utils/logger.js';

export class InferenceService {
  private datasetService = new DatasetService();
  private jobService = new JobService();

  async requestPrediction(datasetId: string, dto: PredictRequestDTO) {
    const dataset = await this.datasetService.getDataset(datasetId);
    if (!dataset) throw new Error('Dataset not found');

    let modelUrl: string | undefined;
    if (dto.model_id) {
      const model = await MLModel.findById(dto.model_id).lean();
      if (!model) throw new Error('Model not found');
      modelUrl = model.file_url;
    }

    const job = await this.jobService.createJob({ type: 'predict', dataset_id: datasetId });

    const payload: MLWorkerPredictPayloadDTO = {
      job_id: job.id,
      dataset_id: datasetId,
      dataset_url: dataset.file_url,
      model_url: modelUrl,
      parameters: dto.parameters ?? { prediction_window: dto.prediction_window ?? 10 }
    };

    await jobQueue.add('predict', payload, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 }
    });

    logger.info({ job_id: job.id, dataset_id: datasetId }, 'Prediction job created');
    return job;
  }
}
