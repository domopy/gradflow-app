import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function backupFileName(): string {
  return `gradflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function shareBackupFile(json: string): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备不支持系统文件分享');
  }
  const directory = new Directory(Paths.cache, 'backups');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, backupFileName());
  file.write(json);
  await Sharing.shareAsync(file.uri, {
    dialogTitle: '导出研程备份',
    mimeType: 'application/json',
  });
  return file.uri;
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) {
    return null;
  }
  const asset = result.assets[0];
  if (asset.size != null && asset.size > 5_000_000) {
    throw new Error('备份超过5MB，请确认文件是否来自研程');
  }
  return new File(asset.uri).text();
}
