import type { ImageRetentionPolicy } from '@/types/image-import';

const KEY = 'gradflow.image-retention-policy';

export async function loadImageRetentionPolicy(): Promise<ImageRetentionPolicy> {
  if (typeof window === 'undefined') {
    return 'delete_after_parse';
  }
  return window.localStorage.getItem(KEY) === 'keep_compressed'
    ? 'keep_compressed'
    : 'delete_after_parse';
}

export async function saveImageRetentionPolicy(
  policy: ImageRetentionPolicy,
): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, policy);
  }
}
