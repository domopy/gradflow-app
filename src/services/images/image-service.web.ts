import type { ImportImage } from '@/types/image-import';

export async function pickImages(): Promise<ImportImage[]> {
  throw new Error('Web预览暂不支持图片选择，请在Android或iOS端使用EasyOCR');
}

export async function takePhoto(): Promise<ImportImage | null> {
  throw new Error('Web预览暂不支持拍照，请在Android或iOS端使用EasyOCR');
}

export async function compressImages(images: ImportImage[]): Promise<string[]> {
  return images.map((image) => image.uri);
}

export async function persistImages(uris: string[]): Promise<string[]> {
  return uris;
}

export async function deleteImageFiles(_uris: string[]): Promise<void> {}
