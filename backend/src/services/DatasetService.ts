import { randomUUID } from 'node:crypto';
import { DatasetModel } from '../models/Dataset.js';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import type { DatasetResponseDTO } from '../dto/dataset.dto.js';

function toDatasetDTO(doc: any): DatasetResponseDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    file_url: doc.file_url,
    schema: doc.schema ?? {},
    created_at: doc.created_at.toISOString()
  };
}

export class DatasetService {
  async uploadDataset(input: { filename: string; buffer: Buffer; mimeType?: string; schema?: Record<string, unknown> }) {
    const storagePath = `${Date.now()}-${randomUUID()}-${input.filename}`;

    const { error } = await supabase.storage
      .from(env.SUPABASE_DATASETS_BUCKET)
      .upload(storagePath, input.buffer, {
        contentType: input.mimeType ?? 'application/octet-stream',
        upsert: false
      });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data } = supabase.storage.from(env.SUPABASE_DATASETS_BUCKET).getPublicUrl(storagePath);

    const created = await DatasetModel.create({
      name: input.filename,
      file_url: data.publicUrl,
      schema: input.schema ?? {}
    });

    return toDatasetDTO(created);
  }

  async listDatasets() {
    const docs = await DatasetModel.find().sort({ created_at: -1 }).lean();
    return docs.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      file_url: doc.file_url,
      schema: doc.schema ?? {},
      created_at: doc.created_at.toISOString()
    }));
  }

  async getDataset(id: string) {
    const doc = await DatasetModel.findById(id);
    if (!doc) return null;
    return toDatasetDTO(doc);
  }
}
