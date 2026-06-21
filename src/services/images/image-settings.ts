import * as SecureStore from 'expo-secure-store';

import type { ImageRetentionPolicy } from '@/types/image-import';

const KEY = 'gradflow.image-retention-policy';

export async function loadImageRetentionPolicy(): Promise<ImageRetentionPolicy> {
  const value = await SecureStore.getItemAsync(KEY);
  return value === 'keep_compressed' ? value : 'delete_after_parse';
}

export async function saveImageRetentionPolicy(
  policy: ImageRetentionPolicy,
): Promise<void> {
  await SecureStore.setItemAsync(KEY, policy);
}
