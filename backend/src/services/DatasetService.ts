import type { MultipartFile } from '@fastify/multipart';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { DatasetModel } from '../models/Dataset.js';
import { makeStoragePath } from '../utils/ids.js';
import mongoose from 'mongoose';
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

  async getDatasetPreviewById(id: string) {
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ dataset_id: id }, { _id: new mongoose.Types.ObjectId(id) }] }
      : { dataset_id: id };

    const dataset = await DatasetModel.findOne(query);

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    const bucket = dataset.bucket || 'datasets';

    const objectPath = dataset.storage_path;

    if (!objectPath) {
      throw new Error('Dataset storage_path is missing');
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(objectPath);

    if (error) {
      throw new Error(`Failed to download dataset from Supabase: ${error.message}`);
    }

    const text = await data.text();

    const rawRows = text
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '')
      .map((line) => line.split(',').map((cell) => cell.trim()));

    if (rawRows.length < 2) {
      throw new Error('Dataset does not contain enough rows for preview');
    }

    const headers = rawRows[0];

    const rows = rawRows.slice(1, 501).map((row) => {
      const output: Record<string, string | number> = {};

      headers.forEach((header, index) => {
        const rawValue = row[index] ?? '';
        const numericValue = Number(rawValue);

        output[header] =
          index > 0 && rawValue !== '' && !Number.isNaN(numericValue)
            ? numericValue
            : rawValue;
      });

      return output;
    });

    return {
      dataset_id: dataset.dataset_id || dataset._id.toString(),
      name: dataset.name,
      original_filename: dataset.original_filename,
      headers,
      rows,
    };
  }

  async deleteDatasetById(id: string): Promise<boolean> {
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ dataset_id: id }, { _id: new mongoose.Types.ObjectId(id) }] }
      : { dataset_id: id };

    const dataset = await DatasetModel.findOne(query);

    if (!dataset) return false;

    if (dataset.storage_path) {
      const objectPath = dataset.storage_path.replace(/^datasets\//, '');

      const { error } = await supabase.storage
        .from('datasets')
        .remove([objectPath]);

      if (error) {
        throw new Error(`Failed to delete Supabase file: ${error.message}`);
      }
    }

    await DatasetModel.deleteOne(query);

    return true;
  }
}
