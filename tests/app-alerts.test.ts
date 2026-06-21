import { describe, expect, it, vi } from 'vitest';

import {
  resolveAppAlert,
  showAppAlert,
  subscribeToAppAlerts,
  type AppAlertRequest,
} from '../src/utils/alerts';

describe('应用内弹窗', () => {
  it('按顺序展示弹窗并执行中文按钮回调', () => {
    const requests: (AppAlertRequest | null)[] = [];
    const onConfirm = vi.fn();
    const unsubscribe = subscribeToAppAlerts((request) => requests.push(request));

    showAppAlert('已保存', '配置已保存。', [
      { text: '知道了', onPress: onConfirm },
    ]);
    showAppAlert('删除事项？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive' },
    ]);

    const first = requests.at(-1);
    expect(first?.title).toBe('已保存');
    resolveAppAlert(first!.buttons[0]);
    expect(onConfirm).toHaveBeenCalledOnce();

    const second = requests.at(-1);
    expect(second?.title).toBe('删除事项？');
    expect(second?.buttons.map(({ text }) => text)).toEqual(['取消', '删除']);
    resolveAppAlert(second!.buttons[0]);
    expect(requests.at(-1)).toBeNull();

    unsubscribe();
  });
});
