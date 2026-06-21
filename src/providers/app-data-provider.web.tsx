import type { PropsWithChildren } from 'react';

import { ScheduleProvider } from '@/providers/schedule-provider';

export function AppDataProvider({ children }: PropsWithChildren) {
  return <ScheduleProvider>{children}</ScheduleProvider>;
}
