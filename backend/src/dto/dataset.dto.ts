export type DatasetUploadDTO = {
  name: string;
  schema?: Record<string, unknown>;
};

export type DatasetResponseDTO = {
  id: string;
  name: string;
  file_url: string;
  schema: Record<string, unknown>;
  created_at: string;
};
