import { describe, expect, it } from 'vitest';

import { parseImageUris } from '../src/db/repositories/sources';
import {
  buildResizeActions,
  MAX_IMAGE_EDGE,
} from '../src/services/images/image-utils';
import { joinRecognizedSections } from '../src/services/ocr/ocr-utils';

describe('图片导入', () => {
  it('只缩放超过边长限制的图片并保持方向', () => {
    expect(buildResizeActions({ width: 1200, height: 900 })).toEqual([]);
    expect(buildResizeActions({ width: 2400, height: 1200 })).toEqual([
      { resize: { width: MAX_IMAGE_EDGE } },
    ]);
    expect(buildResizeActions({ width: 1200, height: 2400 })).toEqual([
      { resize: { height: MAX_IMAGE_EDGE } },
    ]);
  });

  it('按图片顺序合并OCR结果并跳过空白图片', () => {
    expect(
      joinRecognizedSections([
        [' 明天下午三点组会 ', '', '实验楼507'],
        ['   '],
        ['作业周五截止'],
      ]),
    ).toBe('【图片1】\n明天下午三点组会\n实验楼507\n\n【图片3】\n作业周五截止');
  });

  it('安全解析来源图片列表', () => {
    expect(parseImageUris('["file:///a.jpg","file:///b.jpg"]')).toEqual([
      'file:///a.jpg',
      'file:///b.jpg',
    ]);
    expect(parseImageUris('{"uri":"file:///a.jpg"}')).toEqual([]);
    expect(parseImageUris('not-json')).toEqual([]);
  });
});
