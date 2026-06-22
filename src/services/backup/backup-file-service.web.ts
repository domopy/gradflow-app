function backupFileName(): string {
  return `gradflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function shareBackupFile(json: string): Promise<string> {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName();
  link.click();
  URL.revokeObjectURL(url);
  return url;
}

export async function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > 5_000_000) {
        reject(new Error('备份超过5MB，请确认文件是否来自研程'));
        return;
      }
      resolve(await file.text());
    };
    input.click();
  });
}
