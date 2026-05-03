import mongoose from 'mongoose';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobType = 'predict' | 'plot' | 'chat';

const JobSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['predict', 'plot', 'chat'], required: true },
    dataset_id: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    created_at: { type: Date, default: Date.now },
    result_id: { type: String, default: null },
    error: { type: String, default: null }
  },
  { versionKey: false }
);

export const JobModel = mongoose.model('Job', JobSchema, 'jobs');
