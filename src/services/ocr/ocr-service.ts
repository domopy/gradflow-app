import * as FileSystem from 'expo-file-system/legacy';
import { z } from 'zod';

import { joinRecognizedSections } from '@/services/ocr/ocr-utils';
import type { EasyOcrConfig, EasyOcrImageResult } from '@/types/ocr';

const responseSchema = z.object({
  request_id: z.string().optional(),
  message: z.string().optional(),
  remaining_quota: z.number().int().optional(),
  words: z.array(
    z.object({
      text: z.string(),
      score: z.number().optional(),
    }),
  ),
});

export async function extractTextFromImages(
  uris: string[],
  config: EasyOcrConfig,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  if (!config.accessKey.trim()) {
    throw new Error('请先在设置中填写EasyOCR Access Key');
  }
  const sections: string[][] = [];
  for (const [index, uri] of uris.entries()) {
    onProgress?.(index + 1, uris.length);
    const result = await recognizeImage(uri, config);
    sections.push(result.text ? [result.text] : []);
  }
  return joinRecognizedSections(sections);
}

export async function recognizeImage(
  uri: string,
  config: EasyOcrConfig,
): Promise<EasyOcrImageResult> {
  try {
    const response = await uploadWithTimeout(
      `${config.baseUrl.trim().replace(/\/+$/, '')}/api/ocr`,
      uri,
      {
        headers: { 'X-Access-Key': config.accessKey.trim() },
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'image/jpeg',
      },
    );
    const payload = parseEasyOcrPayload(response.body);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(mapEasyOcrError(response.status, payload));
    }
    const parsed = responseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('EasyOCR返回格式不正确');
    }
    return {
      text: parsed.data.words
        .map(({ text }) => text.trim())
        .filter(Boolean)
        .join('\n'),
      requestId: parsed.data.request_id ?? null,
      remainingQuota: parsed.data.remaining_quota ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'EASYOCR_UPLOAD_TIMEOUT') {
      throw new Error('EasyOCR请求超时，请检查网络后重试');
    }
    throw error;
  }
}

async function uploadWithTimeout(
  url: string,
  uri: string,
  options: FileSystem.FileSystemUploadOptions,
): Promise<FileSystem.FileSystemUploadResult> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      FileSystem.uploadAsync(url, uri, options),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('EASYOCR_UPLOAD_TIMEOUT')), 45_000);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function parseEasyOcrPayload(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function mapEasyOcrError(status: number, payload: unknown): string {
  const detail =
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
      ? payload.message
      : null;
  if (status === 401) return 'EasyOCR Access Key无效';
  if (status === 403) return 'EasyOCR额度不足';
  if (status === 400) return detail ?? '图片格式或大小不符合EasyOCR要求';
  if (status === 503) return 'EasyOCR识别服务暂时不可用';
  return detail ?? `EasyOCR请求失败（HTTP ${status}）`;
}
