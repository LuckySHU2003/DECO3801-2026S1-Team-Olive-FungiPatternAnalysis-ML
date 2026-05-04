import { describe, expect, it, vi } from 'vitest';
import { ResultService } from '../../../src/services/ResultService.js';
import { ResultModel } from '../../../src/models/Result.js';

vi.mock('../../../src/models/Result.js', () => ({
  ResultModel: {
    create: vi.fn(),
    findById: vi.fn()
  }
}));

describe('ResultService', () => {
  it('stores result output', async () => {
    vi.mocked(ResultModel.create).mockResolvedValueOnce({
      _id: { toString: () => 'result-id' },
      job_id: { toString: () => 'job-id' },
      type: 'predict_future',
      output: { job: 'predict_future' },
      summary: {},
      created_at: new Date('2026-01-01')
    } as any);

    const result = await new ResultService().createResult({
      job_id: 'job-id',
      type: 'predict_future',
      output: { job: 'predict_future' },
      summary: {}
    });

    expect(result.result_id).toBe('result-id');
    expect(result.type).toBe('predict_future');
  });
});
