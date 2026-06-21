export interface Source {
  id: string;
  type: 'text' | 'image' | 'manual';
  originalText: string | null;
  imageUri: string | null;
  imageUris: string[];
  messageDate: string | null;
  createdAt: string;
}

export interface SourceInput {
  type: Source['type'];
  originalText?: string | null;
  imageUri?: string | null;
  imageUris?: string[];
  messageDate?: string | null;
}
