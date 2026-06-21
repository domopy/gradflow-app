const IMAGE_IMPORT_CONFIRM_KEY = 'gradflow.prompt.image-import-confirm.hidden';

export async function shouldSkipImageImportConfirm(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(IMAGE_IMPORT_CONFIRM_KEY) === 'true';
}

export async function saveSkipImageImportConfirm(skip: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(IMAGE_IMPORT_CONFIRM_KEY, skip ? 'true' : 'false');
}
