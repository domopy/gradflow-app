import type { ScheduleItemType } from '@/types/schedule';

export const colors = {
  background: '#F7F4ED',
  surface: '#FFFCF7',
  surfaceMuted: '#F0ECE3',
  text: '#172A42',
  textMuted: '#657083',
  border: '#E4DED2',
  primary: '#285E9E',
  primarySoft: '#E7EFF8',
  accent: '#C96F4B',
  accentSoft: '#F7E7DE',
  success: '#66845A',
  successSoft: '#E9F0E5',
  warning: '#C28A2C',
  warningSoft: '#F8EED5',
  danger: '#C9544D',
  dangerSoft: '#F9E4E1',
  white: '#FFFFFF',
  overlay: 'rgba(23, 42, 66, 0.46)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  title: 30,
  heading: 22,
  subheading: 17,
  body: 15,
  caption: 13,
  tiny: 11,
} as const;

export const typeMeta: Record<
  ScheduleItemType,
  { label: string; color: string; softColor: string; icon: string }
> = {
  exam: { label: '考试', color: '#C95F45', softColor: '#F8E6DE', icon: '考' },
  assignment: { label: '作业', color: '#58799C', softColor: '#E7EDF4', icon: '作' },
  meeting: { label: '组会', color: '#6B885C', softColor: '#E9F0E5', icon: '会' },
  experiment: { label: '实验', color: '#8A6AA8', softColor: '#EEE7F4', icon: '实' },
  course: { label: '课程', color: '#3F8492', softColor: '#E2F0F1', icon: '课' },
  defense: { label: '答辩', color: '#9E665C', softColor: '#F2E8E5', icon: '辩' },
  lecture: { label: '讲座', color: '#B17B2E', softColor: '#F6ECD9', icon: '讲' },
  other: { label: '其他', color: '#697384', softColor: '#E9EBEF', icon: '其' },
};
