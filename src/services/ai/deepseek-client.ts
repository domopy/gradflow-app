import {
  deepSeekResponseSchema,
  extractionResultSchema,
} from '@/schemas/extraction';
import { buildExtractionMessages } from '@/services/ai/prompt';
import type { AiConfig, ExtractionRequest, ExtractionResult } from '@/types/extraction';
import { normalizeExtractionDateTimes } from '@/utils/extraction-datetime';

const REQUEST_TIMEOUT_MS = 120_000;

function chatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  return normalized.endsWith('/chat/completions')
    ? normalized
    : `${normalized}/chat/completions`;
}

export async function extractScheduleFromText(
  config: AiConfig,
  request: ExtractionRequest,
): Promise<ExtractionResult> {
  if (!config.apiKey.trim()) {
    throw new Error('请先在设置中填写DeepSeek API Key');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model.trim(),
        messages: buildExtractionMessages(request),
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        temperature: 0.1,
        max_tokens: 4096,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(mapHttpError(response.status));
    }

    const envelope = deepSeekResponseSchema.parse(await response.json());
    const choice = envelope.choices[0];
    if (choice.finish_reason === 'length') {
      throw new Error('模型输出被截断，请缩短通知文字后重试');
    }
    if (
      choice.finish_reason === 'content_filter' ||
      choice.finish_reason === 'insufficient_system_resource'
    ) {
      throw new Error('模型未能完成本次识别，请稍后重试');
    }

    const content = choice.message.content?.trim();
    if (!content) {
      throw new Error('模型返回了空内容，请重试');
    }

    const result = extractionResultSchema.parse(
      JSON.parse(stripCodeFence(content)),
    );
    return normalizeExtractionDateTimes(request, result);
  } catch (error) {
    if (isRequestCanceled(error)) {
      throw new Error('DeepSeek请求超时或被系统取消，请检查网络后重试');
    }
    if (error instanceof SyntaxError) {
      throw new Error('模型返回的JSON无法解析，请重试');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function testAiConnection(config: AiConfig): Promise<void> {
  await extractScheduleFromText(config, {
    text: '这是一条连接测试，不包含任何日程。',
    messageDate: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

function isRequestCanceled(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    error.name === 'AbortError' ||
    message.includes('fetch request has been canceled') ||
    message.includes('fetch request has been cancelled')
  );
}

function stripCodeFence(content: string): string {
  return content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function mapHttpError(status: number): string {
  if (status === 401 || status === 403) {
    return 'API Key无效或无权访问该模型';
  }
  if (status === 402) {
    return 'DeepSeek账户余额不足';
  }
  if (status === 429) {
    return '请求过于频繁，请稍后重试';
  }
  if (status >= 500) {
    return 'DeepSeek服务暂时不可用，请稍后重试';
  }
  return `模型请求失败（HTTP ${status}）`;
}
