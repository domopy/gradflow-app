export interface AppAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AppAlertRequest {
  id: number;
  title: string;
  message: string;
  buttons: AppAlertButton[];
}

type AlertListener = (request: AppAlertRequest | null) => void;

const listeners = new Set<AlertListener>();
const queue: AppAlertRequest[] = [];
let current: AppAlertRequest | null = null;
let nextId = 1;

export function showAppAlert(
  title: string,
  message = '',
  buttons?: AppAlertButton[],
): void {
  queue.push({
    id: nextId++,
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: '知道了' }],
  });
  showNextAlert();
}

export function subscribeToAppAlerts(listener: AlertListener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function resolveAppAlert(button: AppAlertButton): void {
  if (!current) return;
  current = null;
  notifyListeners();
  button.onPress?.();
  showNextAlert();
}

function showNextAlert(): void {
  if (current || queue.length === 0) return;
  current = queue.shift() ?? null;
  notifyListeners();
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener(current);
  }
}
