export interface EasyOcrConfig {
  baseUrl: string;
  accessKey: string;
}

export interface EasyOcrImageResult {
  text: string;
  requestId: string | null;
  remainingQuota: number | null;
}
