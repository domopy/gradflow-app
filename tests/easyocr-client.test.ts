import { afterEach, describe, expect, it, vi } from 'vitest';

import { recognizeImage } from '../src/services/ocr/ocr-service';

const uploadAsyncMock = vi.hoisted(() => vi.fn());

vi.mock('expo-file-system/legacy', () => ({
  uploadAsync: uploadAsyncMock,
  FileSystemUploadType: {
    BINARY_CONTENT: 0,
    MULTIPART: 1,
  },
}));

const config = {
  baseUrl: 'https://console.easyocr.org/',
  accessKey: 'test-access-key',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('EasyOCR客户端', () => {
  it('上传multipart图片并合并文字块', async () => {
    uploadAsyncMock.mockResolvedValueOnce({
      status: 200,
      headers: {},
      mimeType: 'application/json',
      body: JSON.stringify({
        request_id: 'request-1',
        remaining_quota: 99,
        words: [
          { text: '明天下午三点组会', score: 0.98 },
          { text: '实验楼507', score: 0.96 },
        ],
      }),
    });

    const result = await recognizeImage('file:///cache/notice.jpg', config);
    expect(result.text).toBe('明天下午三点组会\n实验楼507');
    expect(result.requestId).toBe('request-1');
    expect(result.remainingQuota).toBe(99);

    const [url, fileUri, options] = uploadAsyncMock.mock.calls[0];
    expect(url).toBe('https://console.easyocr.org/api/ocr');
    expect(fileUri).toBe('file:///cache/notice.jpg');
    expect(options).toEqual({
      headers: { 'X-Access-Key': 'test-access-key' },
      httpMethod: 'POST',
      uploadType: 1,
      fieldName: 'file',
      mimeType: 'image/jpeg',
    });
  });

  it('把无效密钥转换为可读错误', async () => {
    uploadAsyncMock.mockResolvedValueOnce({
      status: 401,
      headers: {},
      mimeType: 'application/json',
      body: JSON.stringify({ message: 'invalid_access_key' }),
    });
    await expect(
      recognizeImage('file:///cache/notice.jpg', config),
    ).rejects.toThrow('Access Key无效');
  });

  it('拒绝结构异常的成功响应', async () => {
    uploadAsyncMock.mockResolvedValueOnce({
      status: 200,
      headers: {},
      mimeType: 'application/json',
      body: JSON.stringify({ message: 'ok' }),
    });
    await expect(
      recognizeImage('file:///cache/notice.jpg', config),
    ).rejects.toThrow('返回格式不正确');
  });
});
