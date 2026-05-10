import type { MultipartFile } from '@fastify/multipart';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { ModelMetadataModel } from '../models/Model.js';
import { makeStoragePath } from '../utils/ids.js';
import type { ModelResponseDTO } from '../dto/model.dto.js';

function toModelResponse(doc: any): ModelResponseDTO {
  return {
    model_id: doc._id.toString(),
    name: doc.name,
    type: doc.type,
    selection: doc.selection,
    version: doc.version,
    task_type: doc.task_type,
    source: 'supabase',
    file_url: doc.file_url,
    storage_path: doc.storage_path,
    bucket: doc.bucket,
    metadata: doc.metadata,
    created_at: doc.created_at.toISOString()
  };
}

export class ModelService {
  async uploadModel(file: MultipartFile, metadata: { name: string; type: string; task_type: string; selection?: string; version?: string; metadata?: object }): Promise<ModelResponseDTO> {
    const buffer = await file.toBuffer();
    const storagePath = makeStoragePath('', file.filename);

    const { error } = await supabase.storage
      .from(env.SUPABASE_MODELS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false
      });

    if (error) throw new Error(`Supabase model upload failed: ${error.message}`);

    const { data } = supabase.storage.from(env.SUPABASE_MODELS_BUCKET).getPublicUrl(storagePath);

    const doc = await ModelMetadataModel.create({
      name: metadata.name,
      type: metadata.type,
      task_type: metadata.task_type,
      selection: metadata.selection,
      version: metadata.version,
      file_url: data.publicUrl,
      storage_path: storagePath,
      bucket: env.SUPABASE_MODELS_BUCKET,
      metadata: metadata.metadata ?? {},
    });

    return toModelResponse(doc);
  }

  async listModels(): Promise<ModelResponseDTO[]> {
    const docs = await ModelMetadataModel.find().sort({ created_at: -1 });
    return docs.map(toModelResponse);
  }

  async getModelById(id: string): Promise<ModelResponseDTO> {
    const doc = await ModelMetadataModel.findById(id);
    if (!doc) throw new Error('Model not found');
    return toModelResponse(doc);
  }
}
