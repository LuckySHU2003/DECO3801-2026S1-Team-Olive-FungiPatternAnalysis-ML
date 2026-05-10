import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';

export class StorageUrlService {
  async createSignedUrl(bucket: string, storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, env.SUPABASE_SIGNED_URL_EXPIRES_SECONDS);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create Supabase signed URL for ${bucket}/${storagePath}: ${error?.message ?? 'missing signedUrl'}`);
    }
    return data.signedUrl;
  }
}
