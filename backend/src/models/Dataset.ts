import mongoose from 'mongoose';

const DatasetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    file_url: { type: String, required: true },
    schema: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export const DatasetModel = mongoose.model('Dataset', DatasetSchema, 'datasets');
