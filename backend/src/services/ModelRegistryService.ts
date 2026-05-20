import { ModelMetadataModel } from '../models/Model.js';

export interface ResolvedModelMetadata {
  name: string;
  type: string;
  selection?: string;
  version?: string;
  file_url?: string;
  storage_path?: string;
  bucket?: string;
  metadata?: object;
}

export class ModelRegistryService {
  async resolveModel(input: { name: string; type: string; selection?: string; version?: string; file_url?: string; storage_path?: string; metadata?: object }): Promise<ResolvedModelMetadata> {
    // If the caller already supplies a direct URL, skip the MongoDB lookup entirely
    if (input.file_url || input.storage_path) {
      return {
        name: input.name,
        type: input.type,
        selection: input.selection,
        version: input.version,
        file_url: input.file_url,
        storage_path: input.storage_path,
        metadata: input.metadata ?? {}
      };
    }

    const query: Record<string, string> = { name: input.name, type: input.type };
    if (input.selection) query.selection = input.selection;
    if (input.version) query.version = input.version;

    // Sort descending so re-uploaded models automatically supersede older versions
    const doc = await ModelMetadataModel.findOne(query).sort({ created_at: -1 });
    if (!doc) {
      throw new Error(`Model metadata not found for name=${input.name}, type=${input.type}${input.version ? `, version=${input.version}` : ''}. Upload/register the model first.`);
    }
    if (!doc.file_url && !doc.storage_path) {
      throw new Error(`Model metadata ${doc._id.toString()} has no file_url or storage_path.`);
    }

    return {
      name: doc.name,
      type: doc.type,
      selection: doc.selection ?? undefined,
      version: doc.version ?? undefined,
      file_url: doc.file_url ?? undefined,
      storage_path: doc.storage_path ?? undefined,
      bucket: doc.bucket ?? undefined,
      metadata: doc.metadata ?? {}
    };
  }
}
