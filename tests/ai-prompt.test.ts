import { describe, expect, it } from 'vitest';

import { buildExtractionMessages } from '../src/services/ai/prompt';

describe('DeepSeek提取提示词', () => {
  it('包含时间基准、时区和禁止虚构规则', () => {
    const messages = buildExtractionMessages({
      text: '明天下午三点组会',
      messageDate: '2026-06-21T10:00:00+08:00',
      timeZone: 'Asia/Shanghai',
    });
    expect(messages[0].content).toContain('不得虚构');
    expect(messages[0].content).toContain('合法JSON');
    expect(messages[0].content).toContain('relatedItemId');
    expect(messages[1].content).toContain('Asia/Shanghai');
    expect(messages[1].content).toContain('明天下午三点组会');
  });
});
