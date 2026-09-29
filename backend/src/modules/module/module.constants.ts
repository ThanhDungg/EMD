// 8 module core của hệ thống — seed sẵn, admin thêm mới tự do qua API.
// Dùng chung giữa prisma/seed.ts và code.
export interface CoreModule {
  code: string;
  vnName: string;
  engName: string;
}

export const CORE_MODULES: CoreModule[] = [
  { code: 'WORKFLOW', vnName: 'Quy trình', engName: 'Workflow' },
  { code: 'APPLICATIONS', vnName: 'Ứng dụng', engName: 'Applications' },
  { code: 'REPORTS', vnName: 'Báo cáo', engName: 'Reports' },
  { code: 'ASSETS', vnName: 'Tài sản', engName: 'Assets' },
  { code: 'SYSTEM_ADMIN', vnName: 'Quản trị hệ thống', engName: 'System Administration' },
  { code: 'APP_CONFIG', vnName: 'Cấu hình ứng dụng', engName: 'Application Configuration' },
  { code: 'INTERNAL_CHAT', vnName: 'Chat nội bộ', engName: 'Internal Chat' },
  { code: 'INVESTOR_PORTAL', vnName: 'Portal chủ đầu tư', engName: 'Investor Portal' },
];
