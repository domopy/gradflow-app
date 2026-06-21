import type { Action } from 'expo-image-manipulator';

import type { ImportImage } from '@/types/image-import';

export const MAX_IMAGE_EDGE = 1600;

export function buildResizeActions(image: Pick<ImportImage, 'width' | 'height'>): Action[] {
  const longestEdge = Math.max(image.width, image.height);
  if (longestEdge <= MAX_IMAGE_EDGE) {
    return [];
  }
  return [
    {
      resize:
        image.width >= image.height
          ? { width: MAX_IMAGE_EDGE }
          : { height: MAX_IMAGE_EDGE },
    },
  ];
}
