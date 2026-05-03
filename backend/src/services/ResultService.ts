import { ResultModel } from '../models/Result.js';
import type { ResultDTO } from '../dto/result.dto.js';

function toResultDTO(doc: any): ResultDTO {
  return {
    id: doc._id.toString(),
    job_id: doc.job_id,
    output: doc.output,
    summary: doc.summary,
    created_at: doc.created_at.toISOString()
  };
}

export class ResultService {
  async createResult(input: { job_id: string; output: Record<string, unknown>; summary?: string }) {
    const result = await ResultModel.create(input);
    return toResultDTO(result);
  }

  async getResult(id: string) {
    const result = await ResultModel.findById(id);
    if (!result) return null;
    return toResultDTO(result);
  }
}
