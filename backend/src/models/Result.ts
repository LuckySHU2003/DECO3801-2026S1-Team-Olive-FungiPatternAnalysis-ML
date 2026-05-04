import mongoose, { Schema } from 'mongoose';

const ResultSchema = new Schema({
  job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  type: { type: String, required: true },
  output: { type: Schema.Types.Mixed, required: true },
  summary: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const ResultModel = mongoose.model('Result', ResultSchema);
