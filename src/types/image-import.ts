export interface ImportImage {
  id: string;
  uri: string;
  width: number;
  height: number;
  fileName: string | null;
  fileSize: number | null;
}

export type ImageRetentionPolicy = 'delete_after_parse' | 'keep_compressed';
