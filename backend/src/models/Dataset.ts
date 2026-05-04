import mongoose, { Schema } from 'mongoose';

const DatasetSchema = new Schema({
  name: { type: String, required: true },
  original_filename: { type: String, required: true },
  source: { type: String, default: 'supabase' },
  file_url: { type: String, required: true },
  storage_path: { type: String, required: true },
  bucket: { type: String, required: true },
  schema: {
    columns: [{ type: String }],
    expected_columns: [{ type: String }]
  },
  mime_type: String,
  size_bytes: Number
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const DatasetModel = mongoose.model('Dataset', DatasetSchema);
