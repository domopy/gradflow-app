import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { ImportImage } from '@/types/image-import';
import { createId } from '@/utils/id';
import { buildResizeActions } from '@/services/images/image-utils';

const MAX_IMAGES = 5;

export async function pickImages(): Promise<ImportImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_IMAGES,
    quality: 1,
    exif: false,
    base64: false,
  });
  return result.canceled ? [] : result.assets.slice(0, MAX_IMAGES).map(toImportImage);
}

export async function takePhoto(): Promise<ImportImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('未获得相机权限');
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
    base64: false,
  });
  return result.canceled ? null : toImportImage(result.assets[0]);
}

export async function compressImages(images: ImportImage[]): Promise<string[]> {
  const compressed: string[] = [];
  try {
    for (const image of images) {
      const result = await manipulateAsync(image.uri, buildResizeActions(image), {
        compress: 0.78,
        format: SaveFormat.JPEG,
      });
      compressed.push(result.uri);
    }
    return compressed;
  } catch (error) {
    await deleteImageFiles(compressed);
    throw error;
  }
}

export async function persistImages(uris: string[]): Promise<string[]> {
  const directory = new Directory(Paths.document, 'sources');
  directory.create({ idempotent: true, intermediates: true });
  const persisted: string[] = [];

  try {
    for (const uri of uris) {
      const source = new File(uri);
      const destination = new File(directory, `${createId('source-image')}.jpg`);
      await source.copy(destination);
      persisted.push(destination.uri);
    }
    return persisted;
  } catch (error) {
    await deleteImageFiles(persisted);
    throw error;
  }
}

export async function deleteImageFiles(uris: string[]): Promise<void> {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // 文件可能已被系统缓存清理，删除操作保持幂等。
    }
  }
}

function toImportImage(asset: ImagePicker.ImagePickerAsset): ImportImage {
  return {
    id: createId('picked-image'),
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName ?? null,
    fileSize: asset.fileSize ?? null,
  };
}
