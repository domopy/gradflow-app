import type { EasyOcrConfig } from '@/types/ocr';

const STORAGE_KEY = 'gradflow.easyocr.preview-config';

export const defaultEasyOcrConfig: EasyOcrConfig = {
  baseUrl: 'https://console.easyocr.org',
  accessKey: '',
};

export async function loadEasyOcrConfig(): Promise<EasyOcrConfig> {
  if (typeof window === 'undefined') return defaultEasyOcrConfig;
  try {
    return {
      ...defaultEasyOcrConfig,
      ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}'),
    };
  } catch {
    return defaultEasyOcrConfig;
  }
}

export async function saveEasyOcrConfig(config: EasyOcrConfig): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}
