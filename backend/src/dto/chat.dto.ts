export type ChatRequestDTO = {
  dataset_id?: string;
  message: string;
};

export type ChatResponseDTO = {
  reply: string;
};
