// pages/home/model — types dùng riêng cho trang chủ (chưa tái dùng ở 2+ nơi
// nên giữ trong page theo FSD pages-first). Type công việc dùng chung nằm ở
// @/entities/work.
import type {
  RecurrenceFrequency,
  WorkItem,
  WorkStatus,
} from '@/entities/work';

export interface MeInfo {
  id: number;
  accountName: string;
  email: string;
  fullName?: string | null;
  permissionCodes: string[];
  highestRank: number;
}

export interface ModuleItem {
  id?: number;
  code: string;
  vnName: string;
  engName?: string | null;
}

export interface CategoryItem {
  id: number;
  code?: string | null;
  vnName: string;
  engName?: string | null;
  supportsRecurrence?: boolean;
  statuses?: WorkStatus[];
}

export interface CompanyProfile {
  companyName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  appIntro?: string | null;
}

export type WorkMenuKey =
  'home' | 'assigned' | 'handled' | `category:${number}`;

export interface WorkRecurrence {
  id: number;
  title: string;
  description?: string | null;
  categoryId: number;
  frequency: RecurrenceFrequency;
  weekdays: number[];
  monthDays: number[];
  quarterlyMode?: 'START_OF_QUARTER' | 'END_OF_QUARTER' | null;
  yearMonth?: number | null;
  yearDay?: number | null;
  startDate: string;
  endDate?: string | null;
  endType: 'NEVER' | 'ON_DATE';
  isActive: boolean;
  nextRunAt?: string | null;
  owner?: { id: number; accountName: string; fullName?: string | null } | null;
}

// Adapter: work mẫu (WorkItem + schedule riêng) → shape panel Việc lặp dùng.
export function templateToRecurrence(w: WorkItem): WorkRecurrence {
  const s = w.recurrenceSchedule;
  return {
    id: w.id,
    title: w.title,
    description: (w as { description?: string | null }).description ?? null,
    categoryId: w.categoryId ?? 0,
    frequency: (s?.frequency ?? 'WEEKLY') as RecurrenceFrequency,
    weekdays: s?.weekdays ?? [],
    monthDays: s?.monthDays ?? [],
    quarterlyMode: s?.quarterlyMode ?? null,
    yearMonth: s?.yearMonth ?? null,
    yearDay: s?.yearDay ?? null,
    startDate: (s?.startDate ?? w.startDate ?? '').slice(0, 10),
    endDate: s?.endDate ? s.endDate.slice(0, 10) : null,
    endType: s?.endType ?? 'NEVER',
    isActive: s?.isActive ?? true,
    nextRunAt: s?.nextRunAt ?? null,
    owner: w.assigner
      ? {
          id: w.assigner.id,
          accountName: w.assigner.accountName,
          fullName: w.assigner.fullName,
        }
      : null,
  };
}
