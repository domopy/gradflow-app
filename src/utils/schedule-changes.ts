import type { ScheduleItem, ScheduleItemInput } from '@/types/schedule';

export function applyChangeToItem(
  current: ScheduleItem,
  change: ScheduleItemInput,
): ScheduleItemInput {
  const requirements = change.requirements?.length
    ? [...new Set([...current.requirements, ...change.requirements])]
    : current.requirements;

  return {
    sourceId: current.sourceId,
    relatedItemId: current.id,
    type: current.type,
    title: current.title,
    course: change.course ?? current.course,
    startAt:
      change.changeType === 'rescheduled'
        ? change.startAt ?? current.startAt
        : current.startAt,
    dueAt:
      change.changeType === 'extended' || change.changeType === 'rescheduled'
        ? change.dueAt ?? current.dueAt
        : current.dueAt,
    location:
      change.changeType === 'relocated'
        ? change.location ?? current.location
        : current.location,
    submissionMethod: change.submissionMethod ?? current.submissionMethod,
    requirements,
    sourceQuote: change.sourceQuote ?? current.sourceQuote,
    originalTimeText: change.originalTimeText ?? current.originalTimeText,
    confidence: change.confidence ?? current.confidence,
    uncertainFields: change.uncertainFields ?? [],
    changeType: change.changeType,
    status:
      change.changeType === 'cancelled'
        ? 'cancelled'
        : change.uncertainFields?.length
          ? 'pending_confirmation'
          : 'confirmed',
  };
}
