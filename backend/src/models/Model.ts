import mongoose, { Schema } from 'mongoose';

const ModelSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  selection: { type: String, enum: ['rf', 'cnn', 'lstm'] },
  version: String,
  file_url: { type: String, required: true },
  storage_path: { type: String, required: true },
  bucket: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const ModelMetadataModel = mongoose.model('ModelMetadata', ModelSchema);
