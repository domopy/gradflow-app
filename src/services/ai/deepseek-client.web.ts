import type { AiConfig, ExtractionRequest, ExtractionResult } from '@/types/extraction';

export async function extractScheduleFromText(
  _config: AiConfig,
  request: ExtractionRequest,
): Promise<ExtractionResult> {
  // Web只用于界面预览，避免把API Key暴露给浏览器及处理跨域差异。
  const firstSentence = request.text.split(/[。！!\n]/).find(Boolean)?.trim() ?? '待确认事项';
  return {
    items: [
      {
        type: request.text.includes('作业') ? 'assignment' : 'meeting',
        title: firstSentence.slice(0, 36),
        course: null,
        startAt: null,
        dueAt: null,
        location: null,
        submissionMethod: null,
        requirements: [],
        relatedPeople: [],
        sourceQuote: firstSentence,
        originalTimeText: null,
        confidence: 0.62,
        uncertainFields: ['startAt'],
        changeType: 'created',
        relatedItemId: null,
      },
    ],
  };
}

export async function testAiConnection(_config: AiConfig): Promise<void> {}
