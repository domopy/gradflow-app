import type { ExtractionRequest, ExtractionResult } from '@/types/extraction';

export function normalizeExtractionDateTimes(
  request: ExtractionRequest,
  result: ExtractionResult,
): ExtractionResult {
  return {
    items: result.items.map((item) => {
      const evidence = item.originalTimeText || item.sourceQuote;
      return {
        ...item,
        startAt: normalizeExplicitLocalTime(item.startAt, evidence, request.timeZone),
        dueAt: normalizeExplicitLocalTime(item.dueAt, evidence, request.timeZone),
      };
    }),
  };
}

function normalizeExplicitLocalTime(
  value: string | null,
  evidence: string,
  timeZone: string,
): string | null {
  if (!value?.endsWith('Z')) return value;
  const explicitTime = extractExplicitTime(evidence);
  if (!explicitTime) return value;

  const parsed = new Date(value);
  if (
    parsed.getUTCHours() !== explicitTime.hour ||
    parsed.getUTCMinutes() !== explicitTime.minute
  ) {
    return value;
  }

  const zoned = getZonedParts(parsed, timeZone);
  if (zoned.hour === explicitTime.hour && zoned.minute === explicitTime.minute) {
    return value;
  }

  return zonedLocalToIso(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
    explicitTime.hour,
    explicitTime.minute,
    timeZone,
  );
}

function extractExplicitTime(
  value: string,
): { hour: number; minute: number } | null {
  const match = value.match(/(?:^|[^\d])([01]?\d|2[0-3])(?:[:：]|点)([0-5]\d)(?:分)?/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

function zonedLocalToIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  const wallTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wallTimeAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = getZonedParts(new Date(instant), timeZone);
    const representedWallTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    instant += wallTimeAsUtc - representedWallTime;
  }
  return new Date(instant).toISOString();
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}
