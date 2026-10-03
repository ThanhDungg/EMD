// reports.constants — metadata datasets/dimensions/metrics/chart gợi ý.
// FE import mirror ở entities/report/model.ts (giữ đồng bộ tay).
export interface DatasetField {
  key: string;
  label: string;
  kind: 'dimension' | 'metric';
  hint?: string;
}

export interface DatasetDef {
  key: string;
  label: string;
  description: string;
  dimensions: DatasetField[];
  metrics: DatasetField[];
  defaultChart: string;
  suggestedCharts: string[];
}

export const REPORT_DATASET_DEFS: DatasetDef[] = [
  {
    key: 'works',
    label: 'Công việc',
    description: 'Toàn bộ công việc (works) theo loại, trạng thái, dự án, nhân sự.',
    dimensions: [
      { key: 'category', label: 'Loại việc', kind: 'dimension' },
      { key: 'status', label: 'Trạng thái', kind: 'dimension' },
      { key: 'priority', label: 'Ưu tiên', kind: 'dimension' },
      { key: 'site', label: 'Dự án', kind: 'dimension' },
      { key: 'assigner', label: 'Người giao', kind: 'dimension' },
      { key: 'handler', label: 'Người thực hiện', kind: 'dimension' },
      { key: 'month', label: 'Tháng tạo', kind: 'dimension', hint: 'YYYY-MM theo ngày tạo' },
      { key: 'quarter', label: 'Quý tạo', kind: 'dimension', hint: 'YYYY-Qn' },
    ],
    metrics: [
      { key: 'count', label: 'Số việc', kind: 'metric' },
      { key: 'completed', label: 'Đã đóng (isClosed)', kind: 'metric' },
      { key: 'open', label: 'Đang mở', kind: 'metric' },
      { key: 'overdue', label: 'Trễ hạn', kind: 'metric' },
      { key: 'completionRate', label: 'Tỉ lệ đóng (%)', kind: 'metric' },
      { key: 'avgProgress', label: 'Tiến độ TB (%)', kind: 'metric' },
    ],
    defaultChart: 'bar',
    suggestedCharts: ['bar', 'stackedBar', 'line', 'combo', 'donut', 'funnel', 'gauge', 'heatmap', 'table', 'kpi'],
  },
  {
    key: 'incidents',
    label: 'Sự cố hư hỏng',
    description: 'Công việc loại INCIDENT + chi tiết sự cố (nguyên nhân, đơn vị, mở lại).',
    dimensions: [
      { key: 'damageType', label: 'Loại hư hỏng', kind: 'dimension' },
      { key: 'repairType', label: 'Loại sửa chữa', kind: 'dimension' },
      { key: 'picUnit', label: 'Đơn vị phụ trách', kind: 'dimension' },
      { key: 'site', label: 'Dự án', kind: 'dimension' },
      { key: 'status', label: 'Trạng thái xử lý', kind: 'dimension' },
      { key: 'month', label: 'Tháng tạo', kind: 'dimension' },
    ],
    metrics: [
      { key: 'count', label: 'Số sự cố', kind: 'metric' },
      { key: 'reopenSum', label: 'Tổng lượt mở lại', kind: 'metric' },
      { key: 'avgReopen', label: 'Mở lại TB', kind: 'metric' },
      { key: 'withSolution', label: 'Đã có giải pháp', kind: 'metric' },
      { key: 'solutionRate', label: 'Tỉ lệ có giải pháp (%)', kind: 'metric' },
    ],
    defaultChart: 'bar',
    suggestedCharts: ['bar', 'stackedBar', 'donut', 'funnel', 'line', 'combo', 'heatmap', 'table', 'kpi'],
  },
  {
    key: 'energy',
    label: 'Năng lượng',
    description: 'Chỉ số đồng hồ điện/nước/dầu DO theo pha, đồng hồ, dự án, tháng.',
    dimensions: [
      { key: 'meterType', label: 'Loại đồng hồ', kind: 'dimension' },
      { key: 'phase', label: 'Pha (điện)', kind: 'dimension' },
      { key: 'meterCode', label: 'Mã đồng hồ', kind: 'dimension' },
      { key: 'site', label: 'Dự án', kind: 'dimension' },
      { key: 'month', label: 'Tháng chốt', kind: 'dimension' },
    ],
    metrics: [
      { key: 'totalConsumption', label: 'Tổng tiêu thụ', kind: 'metric' },
      { key: 'readingCount', label: 'Số lượt ghi', kind: 'metric' },
      { key: 'meterCount', label: 'Số đồng hồ', kind: 'metric' },
      { key: 'avgConsumption', label: 'TB/lượt ghi', kind: 'metric' },
    ],
    defaultChart: 'line',
    suggestedCharts: ['line', 'area', 'bar', 'stackedBar', 'combo', 'donut', 'heatmap', 'table', 'kpi'],
  },
  {
    key: 'assets',
    label: 'Tài sản',
    description: 'Tài sản/thiết bị theo danh mục, tình trạng, trạng thái dùng, dự án.',
    dimensions: [
      { key: 'category', label: 'Danh mục', kind: 'dimension' },
      { key: 'condition', label: 'Tình trạng', kind: 'dimension' },
      { key: 'usageStatus', label: 'Trạng thái dùng', kind: 'dimension' },
      { key: 'site', label: 'Dự án', kind: 'dimension' },
    ],
    metrics: [
      { key: 'count', label: 'Số tài sản', kind: 'metric' },
      { key: 'quantitySum', label: 'Tổng số lượng', kind: 'metric' },
    ],
    defaultChart: 'donut',
    suggestedCharts: ['donut', 'bar', 'stackedBar', 'treemap', 'heatmap', 'table', 'kpi'],
  },
  {
    key: 'checklist',
    label: 'Chất lượng checklist',
    description: 'Kết quả đánh giá PASS/FAIL các dòng checklist theo công việc.',
    dimensions: [
      { key: 'result', label: 'Kết quả (Đạt/Không đạt)', kind: 'dimension' },
      { key: 'site', label: 'Dự án', kind: 'dimension' },
      { key: 'category', label: 'Loại việc', kind: 'dimension' },
      { key: 'month', label: 'Tháng tạo', kind: 'dimension' },
    ],
    metrics: [
      { key: 'count', label: 'Số dòng', kind: 'metric' },
      { key: 'pass', label: 'Số dòng Đạt', kind: 'metric' },
      { key: 'fail', label: 'Số dòng Không đạt', kind: 'metric' },
      { key: 'passRate', label: 'Tỉ lệ đạt (%)', kind: 'metric' },
    ],
    defaultChart: 'gauge',
    suggestedCharts: ['gauge', 'donut', 'bar', 'radar', 'line', 'combo', 'heatmap', 'table', 'kpi'],
  },
  {
    key: 'contracts',
    label: 'Hợp đồng',
    description: 'Hợp đồng đầu vào / đầu ra theo loại dịch vụ, thời hạn, dự án.',
    dimensions: [
      { key: 'contractType', label: 'Đầu vào / đầu ra', kind: 'dimension' },
      { key: 'serviceType', label: 'Loại hình dịch vụ', kind: 'dimension' },
      { key: 'termType', label: 'Thời hạn', kind: 'dimension' },
      { key: 'site', label: 'Dự án', kind: 'dimension' },
      { key: 'company', label: 'Công ty', kind: 'dimension' },
      { key: 'month', label: 'Tháng bắt đầu', kind: 'dimension' },
      { key: 'expiry', label: 'Nhóm thời hạn còn lại', kind: 'dimension' },
    ],
    metrics: [
      { key: 'count', label: 'Số hợp đồng', kind: 'metric' },
      { key: 'expiring90', label: 'Sắp hết hạn (≤90 ngày)', kind: 'metric' },
      { key: 'expired', label: 'Đã hết hạn', kind: 'metric' },
      { key: 'openEndless', label: 'Không xác định', kind: 'metric' },
      { key: 'avgDurationDays', label: 'Thời hạn TB (ngày)', kind: 'metric' },
    ],
    defaultChart: 'donut',
    suggestedCharts: ['donut', 'bar', 'stackedBar', 'funnel', 'line', 'heatmap', 'table', 'kpi'],
  },
  {
    key: 'personnel',
    label: 'Nhân sự',
    description: 'Nhân viên theo đơn vị, chức vụ, cấp bậc, tình trạng.',
    dimensions: [
      { key: 'department', label: 'Đơn vị', kind: 'dimension' },
      { key: 'position', label: 'Chức vụ', kind: 'dimension' },
      { key: 'level', label: 'Cấp bậc', kind: 'dimension' },
      { key: 'status', label: 'Tình trạng', kind: 'dimension' },
      { key: 'gender', label: 'Giới tính', kind: 'dimension' },
      { key: 'role', label: 'Vai trò', kind: 'dimension' },
      { key: 'hireYear', label: 'Năm vào làm', kind: 'dimension' },
    ],
    metrics: [
      { key: 'count', label: 'Số nhân sự', kind: 'metric' },
      { key: 'investorAccount', label: 'Tài khoản chủ đầu tư', kind: 'metric' },
      { key: 'managingSites', label: 'Đang quản lý dự án', kind: 'metric' },
    ],
    defaultChart: 'bar',
    suggestedCharts: ['bar', 'stackedBar', 'donut', 'treemap', 'heatmap', 'table', 'kpi'],
  },
  {
    key: 'sites',
    label: 'Dự án',
    description: 'Danh mục dự án theo chủ đầu tư, dịch vụ, địa lý, diện tích, trạng thái.',
    dimensions: [
      { key: 'site', label: 'Dự án', kind: 'dimension' },
      { key: 'investor', label: 'Chủ đầu tư', kind: 'dimension' },
      { key: 'serviceType', label: 'Loại hình dịch vụ', kind: 'dimension' },
      { key: 'service', label: 'Dịch vụ cung cấp', kind: 'dimension' },
      { key: 'province', label: 'Tỉnh thành', kind: 'dimension' },
      { key: 'operationStatus', label: 'Trạng thái vận hành', kind: 'dimension' },
      { key: 'rentalStatus', label: 'Trạng thái cho thuê', kind: 'dimension' },
      { key: 'managementStatus', label: 'Trạng thái quản lý', kind: 'dimension' },
    ],
    metrics: [
      { key: 'count', label: 'Số dự án', kind: 'metric' },
      { key: 'glaAreaSum', label: 'Tổng diện tích GLA (m²)', kind: 'metric' },
      { key: 'leasedAreaSum', label: 'Tổng diện tích cho thuê (m²)', kind: 'metric' },
      { key: 'avgLandArea', label: 'Diện tích đất TB (m²)', kind: 'metric' },
      { key: 'avgOccupancy', label: 'Tỉ lệ lấp đầy TB (%)', kind: 'metric' },
    ],
    defaultChart: 'bar',
    suggestedCharts: ['bar', 'stackedBar', 'donut', 'treemap', 'table', 'kpi'],
  },
];

// Chart catalogue cho FE (giữ đồng bộ với ReportChart.tsx).
export interface ChartDef {
  key: string;
  label: string;
  description: string;
  needsDimension: boolean;
}

export const REPORT_CHARTS: ChartDef[] = [
  { key: 'kpi', label: 'KPI', description: 'Thẻ số tổng: tổng việc, tỉ lệ hoàn thành…', needsDimension: false },
  { key: 'bar', label: 'Cột', description: 'So sánh giữa các nhóm (dự án, loại việc).', needsDimension: true },
  { key: 'stackedBar', label: 'Cột chồng', description: 'Cơ cấu 2 chiều: trạng thái trong từng dự án.', needsDimension: true },
  { key: 'line', label: 'Đường', description: 'Xu hướng theo thời gian (tháng/tuần).', needsDimension: true },
  { key: 'area', label: 'Vùng', description: 'Xu hướng có tô nền — hợp tiêu thụ năng lượng.', needsDimension: true },
  { key: 'donut', label: 'Tròn/Donut', description: 'Cơ cấu phần trăm: trạng thái, loại đồng hồ.', needsDimension: true },
  { key: 'pie', label: 'Tròn đặc', description: 'Biến thể donut đặc ruột.', needsDimension: true },
  { key: 'funnel', label: 'Phễu', description: 'Pipeline: tiếp nhận → xử lý → đóng sự cố.', needsDimension: true },
  { key: 'gauge', label: 'Đồng hồ', description: 'Tỉ lệ đơn: % hoàn thành, % đạt checklist.', needsDimension: false },
  { key: 'radar', label: 'Radar', description: 'So đa chiều: chất lượng theo dự án/tiêu chí.', needsDimension: true },
  { key: 'treemap', label: 'Treemap', description: 'Cơ cấu tài sản phân cấp theo diện tích số lượng.', needsDimension: true },
  { key: 'table', label: 'Bảng', description: 'Chi tiết từng dòng nhóm + số liệu.', needsDimension: true },
  {
    key: 'combo',
    label: 'Cột + đường (2 trục)',
    description: 'Số lượng (cột) đi kèm tỉ lệ (đường, trục phải) — VD số việc + % hoàn thành.',
    needsDimension: true,
  },
  {
    key: 'heatmap',
    label: 'Heatmap',
    description: 'Ma trận 2 chiều: dòng = chiều 1, cột = chiều 2, màu = chỉ số.',
    needsDimension: true,
  },
];
