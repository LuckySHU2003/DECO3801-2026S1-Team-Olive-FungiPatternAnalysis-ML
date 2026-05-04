import { ResultModel } from '../models/Result.js';
import type { ResultDTO } from '../dto/result.dto.js';

function toResultResponse(doc: any): ResultDTO {
  return {
    result_id: doc._id.toString(),
    job_id: doc.job_id.toString(),
    type: doc.type,
    output: doc.output,
    summary: doc.summary,
    created_at: doc.created_at.toISOString()
  };
}

export class ResultService {
  async createResult(input: { job_id: string; type: string; output: object; summary?: object }) {
    const doc = await ResultModel.create(input);
    return toResultResponse(doc);
  }

  async getResult(id: string): Promise<ResultDTO> {
    const doc = await ResultModel.findById(id);
    if (!doc) throw new Error('Result not found');
    return toResultResponse(doc);
  }
}
