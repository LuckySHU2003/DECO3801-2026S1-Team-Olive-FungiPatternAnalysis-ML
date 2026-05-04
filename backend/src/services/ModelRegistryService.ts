import { ModelMetadataModel } from '../models/Model.js';

export class ModelRegistryService {
  async resolveModel(input: { name: string; type: string; selection?: string; version?: string }) {
    const query: Record<string, string> = { name: input.name, type: input.type };
    if (input.selection) query.selection = input.selection;
    if (input.version) query.version = input.version;

    const doc = await ModelMetadataModel.findOne(query).sort({ created_at: -1 });

    if (doc) {
      return {
        name: doc.name,
        type: doc.type,
        selection: doc.selection,
        version: doc.version,
        file_url: doc.file_url,
        storage_path: doc.storage_path
      };
    }

    // Development fallback. Real production should seed MongoDB models collection.
    return {
      name: input.name,
      type: input.type,
      selection: input.selection,
      version: input.version,
      file_url: '',
      storage_path: ''
    };
  }
}
