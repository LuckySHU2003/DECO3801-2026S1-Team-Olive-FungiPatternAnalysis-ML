import { randomUUID } from 'node:crypto';

export function makeStoragePath(prefix: string, filename: string) {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${prefix}/${Date.now()}-${randomUUID()}-${clean}`;
}
