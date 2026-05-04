export interface DatasetResponseDTO {
  dataset_id: string;
  name: string;
  original_filename: string;
  source: 'supabase';
  file_url: string;
  storage_path: string;
  schema: {
    columns: string[];
    expected_columns: ['Time', 'Voltage'];
  };
  created_at: string;
}
