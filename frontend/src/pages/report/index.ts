// pages/report — public API của module Báo cáo.
// Lazy: ECharts khá nặng, chỉ nạp khi người dùng mở module Báo cáo.
import { lazy } from 'react';

export const ReportPage = lazy(() =>
  import('./ui/ReportPage').then((m) => ({ default: m.ReportPage })),
);

// Trang báo cáo con theo preset (3 nhóm: hằng ngày / hoạt động / tổng quan).
export const PresetReportPage = lazy(() =>
  import('./ui/PresetReportPage').then((m) => ({ default: m.PresetReportPage })),
);
