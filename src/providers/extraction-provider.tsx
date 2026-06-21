import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

import type { ExtractionRequest, ExtractionResult } from '@/types/extraction';
import type { SourceInput } from '@/types/source';

export interface ExtractionSession {
  request: ExtractionRequest;
  result: ExtractionResult;
  source: SourceInput;
  temporaryImageUris?: string[];
  retainImages?: boolean;
}

interface ExtractionContextValue {
  session: ExtractionSession | null;
  setSession: (session: ExtractionSession | null) => void;
}

const ExtractionContext = createContext<ExtractionContextValue | null>(null);

export function ExtractionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<ExtractionSession | null>(null);
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <ExtractionContext.Provider value={value}>{children}</ExtractionContext.Provider>;
}

export function useExtraction() {
  const context = useContext(ExtractionContext);
  if (!context) {
    throw new Error('useExtraction必须在ExtractionProvider内使用');
  }
  return context;
}
