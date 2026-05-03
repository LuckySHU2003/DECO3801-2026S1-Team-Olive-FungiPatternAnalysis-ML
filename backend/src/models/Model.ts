import mongoose from 'mongoose';

const ModelSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    version: { type: String, required: true },
    file_url: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { versionKey: false }
);

export const MLModel = mongoose.model('Model', ModelSchema, 'models');
