import { z } from 'zod';

export const preprocessingModeSchema = z.enum(['raw', 'detrended']);
export const missingValueStrategySchema = z.enum(['drop', 'interpolate', 'forward_fill', 'zero_fill']).default('interpolate');
export const modelTypeSchema = z.enum(['pkl', 'pt', 'onnx', 'joblib', 'other']);
export const modelSelectionSchema = z.enum(['rf', 'cnn', 'lstm']);

const datasetSchema = z.object({
  dataset_id: z.string().min(1),
  source: z.literal('supabase').default('supabase'),
  columns: z.object({
    time: z.string().min(1).default('Time'),
    voltage: z.string().min(1).default('Voltage')
  })
});

const preprocessingSchema = z.object({
  mode: preprocessingModeSchema,
  normalize: z.boolean().default(false),
  missing_value_strategy: missingValueStrategySchema
});

const modelSchema = z.object({
  name: z.string().min(1),
  selection: modelSelectionSchema.optional(),
  type: modelTypeSchema,
  version: z.string().optional()
});

export const detectPatternsRequestSchema = z.object({
  job: z.literal('detect_patterns'),
  dataset: datasetSchema,
  preprocessing: preprocessingSchema,
  detection_config: z.object({
    pattern_types: z.array(z.string()).default([]),
    threshold: z.number(),
    window_size: z.number().int().positive(),
    min_interval: z.number().int().nonnegative()
  }),
  model: modelSchema
});

export const customExplorationRequestSchema = z.object({
  job: z.literal('custom_exploration'),
  dataset: datasetSchema,
  preprocessing: preprocessingSchema,
  analysis_config: z.object({
    threshold: z.number(),
    window_size: z.number().int().positive(),
    time_range: z.object({ start: z.number(), end: z.number() }),
    model_selection: modelSelectionSchema,
    compare_with_previous_run: z.boolean().default(false)
  }),
  previous_run_id: z.string().nullable().optional()
});

export const predictFutureRequestSchema = z.object({
  job: z.literal('predict_future'),
  dataset: datasetSchema,
  preprocessing: preprocessingSchema,
  prediction_config: z.object({
    prediction_window: z.number().int().positive(),
    model_selection: modelSelectionSchema
  }),
  model: modelSchema
});

export type DetectPatternsRequestDTO = z.infer<typeof detectPatternsRequestSchema>;
export type CustomExplorationRequestDTO = z.infer<typeof customExplorationRequestSchema>;
export type PredictFutureRequestDTO = z.infer<typeof predictFutureRequestSchema>;
export type WorkspaceRequestDTO = DetectPatternsRequestDTO | CustomExplorationRequestDTO | PredictFutureRequestDTO;

export type WorkspaceJobType = WorkspaceRequestDTO['job'];

export interface PatternPointDTO {
  time: number;
  voltage: number;
}

export interface PatternDTO {
  pattern_id: string;
  type: string;
  start_time: number;
  end_time: number;
  snapshot: PatternPointDTO[];
  frequency: number;
  amplitude: number;
  interval: number;
  confidence_score: number;
}

export interface PatternSummaryDTO {
  total_patterns: number;
  recurrence: Record<string, number>;
  average_frequency: number;
  average_amplitude: number;
  average_interval: number;
}

export interface DetectPatternsResultDTO {
  job: 'detect_patterns';
  status: string;
  confidence_score: number;
  preprocessing_used: string;
  patterns: PatternDTO[];
  summary: PatternSummaryDTO;
}

export interface CustomExplorationResultDTO {
  job: 'custom_exploration';
  status: string;
  confidence_score: number;
  run_id: string;
  config_used: {
    threshold: number;
    window_size: number;
    model_selection: string;
    preprocessing_mode: string;
    normalize: boolean;
    missing_value_strategy: string;
  };
  patterns: PatternDTO[];
  summary: PatternSummaryDTO;
  comparison?: {
    previous_run_id: string;
    pattern_count_change: number;
    average_confidence_change: number;
  };
}

export interface PredictedVoltagePointDTO {
  time: number;
  predicted_voltage: number;
  confidence_score: number;
}

export interface PredictFutureResultDTO {
  job: 'predict_future';
  status: string;
  confidence_score: number;
  model_used: string;
  prediction_window: number;
  predicted_voltage_window: PredictedVoltagePointDTO[];
  summary: {
    start_time: number;
    end_time: number;
    min_predicted_voltage: number;
    max_predicted_voltage: number;
    average_predicted_voltage: number;
    average_confidence_score: number;
  };
}

export type WorkspaceResultDTO = DetectPatternsResultDTO | CustomExplorationResultDTO | PredictFutureResultDTO;
