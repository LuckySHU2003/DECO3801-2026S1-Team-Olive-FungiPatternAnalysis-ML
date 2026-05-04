import { describe, expect, it } from 'vitest';
import { detectPatternsRequestSchema, predictFutureRequestSchema } from '../../../src/dto/workspace.dto.js';

describe('workspace DTO validation', () => {
  it('validates detect patterns payload', () => {
    const parsed = detectPatternsRequestSchema.parse({
      job: 'detect_patterns',
      dataset: { dataset_id: 'abc', source: 'supabase', columns: { time: 'Time', voltage: 'Voltage' } },
      preprocessing: { mode: 'raw', normalize: true, missing_value_strategy: 'interpolate' },
      detection_config: { pattern_types: ['spike'], threshold: 0.5, window_size: 10, min_interval: 2 },
      model: { name: 'rf-pattern', selection: 'rf', type: 'pkl', version: 'v1' }
    });
    expect(parsed.job).toBe('detect_patterns');
  });

  it('rejects unsupported model selection', () => {
    expect(() => predictFutureRequestSchema.parse({
      job: 'predict_future',
      dataset: { dataset_id: 'abc', source: 'supabase', columns: { time: 'Time', voltage: 'Voltage' } },
      preprocessing: { mode: 'raw', normalize: false, missing_value_strategy: 'interpolate' },
      prediction_config: { prediction_window: 10, model_selection: 'svm' },
      model: { name: 'bad', type: 'pkl' }
    })).toThrow();
  });
});
