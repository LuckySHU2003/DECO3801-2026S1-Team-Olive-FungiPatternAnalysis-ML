import type { MultipartFile } from '@fastify/multipart';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { DatasetModel } from '../models/Dataset.js';
import { makeStoragePath } from '../utils/ids.js';
import type { DatasetResponseDTO } from '../dto/dataset.dto.js';

function toDatasetResponse(doc: any): DatasetResponseDTO {
  return {
    dataset_id: doc._id.toString(),
    name: doc.name,
    original_filename: doc.original_filename,
    source: 'supabase',
    file_url: doc.file_url,
    storage_path: doc.storage_path,
    schema: doc.schema,
    created_at: doc.created_at.toISOString()
  };
}

export class DatasetService {
  async uploadDataset(file: MultipartFile): Promise<DatasetResponseDTO> {
    const buffer = await file.toBuffer();
    const storagePath = makeStoragePath('datasets', file.filename);

    const { error } = await supabase.storage
      .from(env.SUPABASE_DATASETS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw new Error(`Supabase dataset upload failed: ${error.message}`);

    const { data } = supabase.storage.from(env.SUPABASE_DATASETS_BUCKET).getPublicUrl(storagePath);

    const doc = await DatasetModel.create({
      name: file.filename,
      original_filename: file.filename,
      source: 'supabase',
      file_url: data.publicUrl,
      storage_path: storagePath,
      bucket: env.SUPABASE_DATASETS_BUCKET,
      dataset_schema: {
        columns: ['Time', 'Voltage'],
        expected_columns: ['Time', 'Voltage']
      },
      mime_type: file.mimetype,
      size_bytes: buffer.length
    });

    return toDatasetResponse(doc);
  }

  async listDatasets(): Promise<DatasetResponseDTO[]> {
    const docs = await DatasetModel.find().sort({ created_at: -1 });
    return docs.map(toDatasetResponse);
  }

  async getDatasetById(id: string): Promise<DatasetResponseDTO> {
    const doc = await DatasetModel.findById(id);
    if (!doc) throw new Error('Dataset not found');
    return toDatasetResponse(doc);
  }

  async deleteDatasetById(datasetId: string) {
    const dataset = await DatasetModel.findOne({ dataset_id: datasetId });
    if (!dataset) return false;
    if (dataset.storage_path) {
      const objectPath = dataset.storage_path.replace(/^datasets\//, '');

      await supabase.storage
        .from('datasets')
        .remove([objectPath]);
    }
    await DatasetModel.deleteOne({ dataset_id: datasetId });
    return true;
  }
}
