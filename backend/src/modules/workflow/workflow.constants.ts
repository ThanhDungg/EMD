// 5 loại công việc tab Ứng dụng (module Quy trình) — seed sẵn.
// Dùng chung giữa prisma/seed.ts và code.
export interface WorkflowCategorySeed {
  code: string;
  vnName: string;
  engName: string;
}

export const WORKFLOW_CATEGORIES: WorkflowCategorySeed[] = [
  { code: 'CHECKLIST', vnName: 'Checklist', engName: 'Checklist' },
  { code: 'OFFICE_WORK', vnName: 'Công việc văn phòng', engName: 'Office Work' },
  { code: 'ENERGY_CHECK', vnName: 'Kiểm tra năng lượng', engName: 'Energy Check' },
  { code: 'MASTERPLAN', vnName: 'Masterplan', engName: 'Masterplan' },
  { code: 'INCIDENT', vnName: 'Sự cố hư hỏng', engName: 'Incident' },
];

// Shape của data_json (planData) trong MasterplanTask:
// năm → tháng (1-12) → tuần trong tháng → { plan: kế hoạch, actual: thực tế }
// Vd: { "2026": { "1": { "1": { plan: true, actual: false } } } }
export interface MasterplanWeekData {
  plan?: boolean;
  actual?: boolean;
}

export interface MasterplanData {
  [year: string]: {
    [month: string]: {
      [week: string]: MasterplanWeekData;
    };
  };
}
