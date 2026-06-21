import { describe, expect, it } from 'vitest';

import { extractionResultSchema } from '../src/schemas/extraction';

describe('AI提取结果校验', () => {
  it('接受可追溯的结构化事项', () => {
    const result = extractionResultSchema.parse({
      items: [
        {
          type: 'meeting',
          title: '课题组组会',
          course: null,
          startAt: '2026-06-22T15:00:00+08:00',
          dueAt: null,
          location: '实验楼507',
          submissionMethod: null,
          requirements: ['准备5页以内PPT'],
          relatedPeople: [],
          sourceQuote: '明天下午3点在实验楼507组会',
          originalTimeText: '明天下午3点',
          confidence: 0.96,
          uncertainFields: [],
          changeType: 'created',
        },
      ],
    });
    expect(result.items[0].type).toBe('meeting');
  });

  it('拒绝缺少原文证据的结果', () => {
    expect(() =>
      extractionResultSchema.parse({
        items: [{ type: 'meeting', title: '组会', sourceQuote: '' }],
      }),
    ).toThrow();
  });

  it('把非法可选字段降级为安全默认值', () => {
    const result = extractionResultSchema.parse({
      items: [
        {
          type: 'unknown',
          title: '待判断事项',
          sourceQuote: '下周找时间聊一下',
          confidence: 8,
          requirements: '无',
        },
      ],
    });
    expect(result.items[0].type).toBe('other');
    expect(result.items[0].confidence).toBe(0);
    expect(result.items[0].requirements).toEqual([]);
  });
});
