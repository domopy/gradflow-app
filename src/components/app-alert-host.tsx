import { useEffect, useMemo, useState } from 'react';

import { AppDialog } from '@/components/app-dialog';
import {
  type AppAlertButton,
  type AppAlertRequest,
  resolveAppAlert,
  subscribeToAppAlerts,
} from '@/utils/alerts';

export function AppAlertHost() {
  const [request, setRequest] = useState<AppAlertRequest | null>(null);

  useEffect(() => subscribeToAppAlerts(setRequest), []);

  const { cancelButton, confirmButton } = useMemo(
    () => splitButtons(request?.buttons ?? []),
    [request?.buttons],
  );

  if (!request || !confirmButton) {
    return null;
  }

  return (
    <AppDialog
      badge={getBadge(request.title, confirmButton)}
      cancelLabel={cancelButton?.text ?? '取消'}
      confirmLabel={confirmButton.text ?? '知道了'}
      confirmVariant={confirmButton.style === 'destructive' ? 'danger' : 'primary'}
      description={request.message}
      onCancel={cancelButton ? () => resolveAppAlert(cancelButton) : undefined}
      onConfirm={() => resolveAppAlert(confirmButton)}
      title={request.title}
      visible
    />
  );
}

function splitButtons(buttons: AppAlertButton[]): {
  cancelButton: AppAlertButton | null;
  confirmButton: AppAlertButton | null;
} {
  const cancelButton = buttons.find((button) => button.style === 'cancel') ?? null;
  const confirmButton =
    [...buttons].reverse().find((button) => button !== cancelButton) ??
    cancelButton;
  return { cancelButton: cancelButton === confirmButton ? null : cancelButton, confirmButton };
}

function getBadge(title: string, button: AppAlertButton): string {
  if (button.style === 'destructive') return '删';
  if (/成功|已保存|已恢复|完成/.test(title)) return '成';
  if (/失败|错误|无法|不存在/.test(title)) return '!';
  return '提';
}
