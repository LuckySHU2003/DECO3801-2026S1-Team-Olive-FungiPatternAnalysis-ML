import mongoose, { Schema } from 'mongoose';

const ModelSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  selection: String,
  version: String,
  file_url: { type: String, required: true },
  storage_path: { type: String, required: true },
  bucket: { type: String, required: true },
  task_type: { type: String, enum: ["detect_patterns", "custom_exploration", "predict_future"], required: true },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Composite index mirrors the lookup in ModelRegistryService.resolveModel — name + type + version + selection
ModelSchema.index({ name: 1, type: 1, version: 1, selection: 1 });

export const ModelMetadataModel = mongoose.model('ModelMetadata', ModelSchema);
