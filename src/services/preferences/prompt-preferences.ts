import * as SecureStore from 'expo-secure-store';

const IMAGE_IMPORT_CONFIRM_KEY = 'gradflow.prompt.image-import-confirm.hidden';

export async function shouldSkipImageImportConfirm(): Promise<boolean> {
  return (await SecureStore.getItemAsync(IMAGE_IMPORT_CONFIRM_KEY)) === 'true';
}

export async function saveSkipImageImportConfirm(skip: boolean): Promise<void> {
  await SecureStore.setItemAsync(IMAGE_IMPORT_CONFIRM_KEY, skip ? 'true' : 'false');
}
