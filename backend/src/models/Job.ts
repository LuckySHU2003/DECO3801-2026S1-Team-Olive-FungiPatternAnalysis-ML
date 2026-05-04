import mongoose, { Schema } from 'mongoose';

const JobSchema = new Schema({
  type: { type: String, required: true, enum: ['detect_patterns', 'custom_exploration', 'predict_future', 'chat'] },
  dataset_id: { type: Schema.Types.ObjectId, ref: 'Dataset' },
  status: { type: String, required: true, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  request_payload: { type: Schema.Types.Mixed, required: true },
  result_id: { type: Schema.Types.ObjectId, ref: 'Result' },
  error: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const JobModel = mongoose.model('Job', JobSchema);
