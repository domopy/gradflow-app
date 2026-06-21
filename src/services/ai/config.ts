import * as SecureStore from 'expo-secure-store';

import type { AiConfig } from '@/types/extraction';

const CONFIG_KEY = 'gradflow.ai.config';
const API_KEY = 'gradflow.ai.api-key';

export const defaultAiConfig: AiConfig = {
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  apiKey: '',
};

export async function loadAiConfig(): Promise<AiConfig> {
  const [storedConfig, apiKey] = await Promise.all([
    SecureStore.getItemAsync(CONFIG_KEY),
    SecureStore.getItemAsync(API_KEY),
  ]);

  let publicConfig: Partial<Omit<AiConfig, 'apiKey'>> = {};
  if (storedConfig) {
    try {
      publicConfig = JSON.parse(storedConfig);
    } catch {
      publicConfig = {};
    }
  }

  return {
    baseUrl: publicConfig.baseUrl?.trim() || defaultAiConfig.baseUrl,
    model: publicConfig.model?.trim() || defaultAiConfig.model,
    apiKey: apiKey ?? '',
  };
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  const publicConfig = {
    baseUrl: config.baseUrl.trim().replace(/\/+$/, ''),
    model: config.model.trim(),
  };
  await Promise.all([
    SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(publicConfig)),
    SecureStore.setItemAsync(API_KEY, config.apiKey.trim()),
  ]);
}
