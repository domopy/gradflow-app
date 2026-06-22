import React from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  openAndroidPicker: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('react-native', () => ({
  Modal: 'Modal',
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
}));

vi.mock('@react-native-community/datetimepicker', () => ({
  default: 'DateTimePicker',
  DateTimePickerAndroid: { open: mocks.openAndroidPicker },
}));

vi.mock('@/utils/alerts', () => ({
  showAppAlert: mocks.showAlert,
}));

import { DateTimeInput } from '@/components/date-time-input';

function findButton(root: ReactTestInstance, label: string): ReactTestInstance {
  return root.findAll((node) => String(node.type) === 'Pressable').find((pressable) =>
    pressable
      .findAll((node) => String(node.type) === 'Text')
      .some((text) => text.children.includes(label)),
  )!;
}

describe('日期时间输入组件', () => {
  beforeEach(() => {
    mocks.openAndroidPicker.mockReset();
    mocks.showAlert.mockReset();
  });

  it('手动输入不完整时不打开选择器，避免覆盖原值', () => {
    const onChangeText = vi.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <DateTimeInput onChangeText={onChangeText} value="2026-06-2" />,
      );
    });

    act(() => findButton(renderer!.root, '选日期').props.onPress());

    expect(mocks.openAndroidPicker).not.toHaveBeenCalled();
    expect(onChangeText).not.toHaveBeenCalled();
    expect(mocks.showAlert).toHaveBeenCalledWith(
      '时间格式尚未完成',
      expect.stringContaining('YYYY-MM-DD HH:mm'),
    );
  });

  it('Android取消系统选择器时不修改文本', () => {
    const onChangeText = vi.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <DateTimeInput onChangeText={onChangeText} value="2026-06-22 08:30" />,
      );
    });

    act(() => findButton(renderer!.root, '选时间').props.onPress());
    const options = mocks.openAndroidPicker.mock.calls[0][0];
    act(() => options.onChange({ type: 'dismissed' }, undefined));

    expect(onChangeText).not.toHaveBeenCalled();
  });

  it('Android确认时间时保留原日期', () => {
    const onChangeText = vi.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <DateTimeInput onChangeText={onChangeText} value="2026-06-22 08:30" />,
      );
    });

    act(() => findButton(renderer!.root, '选时间').props.onPress());
    const options = mocks.openAndroidPicker.mock.calls[0][0];
    act(() => options.onChange({ type: 'set' }, new Date(2030, 0, 1, 19, 45)));

    expect(onChangeText).toHaveBeenCalledWith('2026-06-22 19:45');
  });
});
