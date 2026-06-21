import type { AiConfig } from '@/types/extraction';

const STORAGE_KEY = 'gradflow.ai.preview-config';

export const defaultAiConfig: AiConfig = {
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  apiKey: '',
};

export async function loadAiConfig(): Promise<AiConfig> {
  if (typeof window === 'undefined') {
    return defaultAiConfig;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultAiConfig;
  }
  try {
    return { ...defaultAiConfig, ...JSON.parse(stored) };
  } catch {
    return defaultAiConfig;
  }
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}
