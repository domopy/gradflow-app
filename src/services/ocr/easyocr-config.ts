import * as SecureStore from 'expo-secure-store';

import type { EasyOcrConfig } from '@/types/ocr';

const CONFIG_KEY = 'gradflow.easyocr.config';
const ACCESS_KEY = 'gradflow.easyocr.access-key';

export const defaultEasyOcrConfig: EasyOcrConfig = {
  baseUrl: 'https://console.easyocr.org',
  accessKey: '',
};

export async function loadEasyOcrConfig(): Promise<EasyOcrConfig> {
  const [storedConfig, accessKey] = await Promise.all([
    SecureStore.getItemAsync(CONFIG_KEY),
    SecureStore.getItemAsync(ACCESS_KEY),
  ]);
  let baseUrl = defaultEasyOcrConfig.baseUrl;
  if (storedConfig) {
    try {
      const parsed: unknown = JSON.parse(storedConfig);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'baseUrl' in parsed &&
        typeof parsed.baseUrl === 'string'
      ) {
        baseUrl = parsed.baseUrl.trim() || baseUrl;
      }
    } catch {
      // 损坏的非敏感配置降级为官方地址，密钥仍单独保存在SecureStore。
    }
  }
  return { baseUrl, accessKey: accessKey ?? '' };
}

export async function saveEasyOcrConfig(config: EasyOcrConfig): Promise<void> {
  const baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
  await Promise.all([
    SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify({ baseUrl })),
    SecureStore.setItemAsync(ACCESS_KEY, config.accessKey.trim()),
  ]);
}
