import mongoose from 'mongoose';

const ResultSchema = new mongoose.Schema(
  {
    job_id: { type: String, required: true },
    output: { type: mongoose.Schema.Types.Mixed, required: true },
    summary: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export const ResultModel = mongoose.model('Result', ResultSchema, 'results');
