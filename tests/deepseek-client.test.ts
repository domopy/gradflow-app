import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  extractScheduleFromText,
  testAiConnection,
} from '../src/services/ai/deepseek-client';

const config = {
  baseUrl: 'https://api.deepseek.com/',
  model: 'deepseek-v4-flash',
  apiKey: 'test-secret',
};

const request = {
  text: '明天下午3点组会',
  messageDate: '2026-06-21T10:00:00+08:00',
  timeZone: 'Asia/Shanghai',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DeepSeek客户端', () => {
  it('调用Chat Completions并校验JSON结果', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      type: 'meeting',
                      title: '组会',
                      course: null,
                      startAt: '2026-06-22T15:00:00+08:00',
                      dueAt: null,
                      location: null,
                      submissionMethod: null,
                      requirements: [],
                      relatedPeople: [],
                      sourceQuote: '明天下午3点组会',
                      originalTimeText: '明天下午3点',
                      confidence: 0.9,
                      uncertainFields: [],
                      changeType: 'created',
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await extractScheduleFromText(config, request);
    expect(result.items[0].title).toBe('组会');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-secret');
    const body = JSON.parse(init.body);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.messages[0].content).toContain(
      '转换为ISO 8601后必须保持原文看到的“年月日、时、分”不变',
    );
    expect(body.messages[0].content).toContain('包括夏令时变化');
  });

  it('不会接受被截断的JSON输出', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ finish_reason: 'length', message: { content: '{"items":' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    await expect(extractScheduleFromText(config, request)).rejects.toThrow('输出被截断');
  });

  it('修正模型把明确本地时间错误标记为UTC的结果', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  content: JSON.stringify({
                    items: [
                      {
                        type: 'meeting',
                        title: '提醒功能测试',
                        course: null,
                        startAt: '2026-06-21T19:04:00.000Z',
                        dueAt: null,
                        location: '实验楼507',
                        submissionMethod: null,
                        requirements: [],
                        relatedPeople: [],
                        sourceQuote: '今天19:04在实验楼507进行提醒功能测试',
                        originalTimeText: '今天19:04',
                        confidence: 1,
                        uncertainFields: [],
                        changeType: 'created',
                        relatedItemId: null,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = await extractScheduleFromText(config, {
      ...request,
      text: '今天19:04在实验楼507进行提醒功能测试',
      timeZone: 'Asia/Shanghai',
    });
    expect(result.items[0].startAt).toBe('2026-06-21T11:04:00.000Z');
  });

  it('把React Native取消请求转换为可读错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed: Fetch request has been canceled')),
    );
    await expect(extractScheduleFromText(config, request)).rejects.toThrow(
      'DeepSeek请求超时或被系统取消',
    );
  });

  it('缺少API Key时不发送网络请求', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      testAiConnection({ ...config, apiKey: '' }),
    ).rejects.toThrow('API Key');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
