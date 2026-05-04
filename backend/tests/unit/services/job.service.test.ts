import { describe, expect, it, vi } from 'vitest';
import { JobService } from '../../../src/services/JobService.js';
import { JobModel } from '../../../src/models/Job.js';

vi.mock('../../../src/models/Job.js', () => ({
  JobModel: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn()
  }
}));

describe('JobService', () => {
  it('creates a pending job', async () => {
    vi.mocked(JobModel.create).mockResolvedValueOnce({
      _id: { toString: () => 'job-id' },
      type: 'detect_patterns',
      status: 'pending',
      dataset_id: { toString: () => 'dataset-id' },
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01')
    } as any);

    const result = await new JobService().createJob({
      type: 'detect_patterns',
      dataset_id: 'dataset-id',
      request_payload: {}
    });

    expect(result.job_id).toBe('job-id');
    expect(result.status).toBe('pending');
  });
});
