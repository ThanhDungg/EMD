// reports/report-presets — khai báo 3 NHÓM BÁO CÁO CHA và các BÁO CÁO CON.
// Nội dung khai báo ở đây (không hard-code trong FE) nên thêm báo cáo mới chỉ
// cần thêm 1 entry, FE tự render theo preset.
//
//   1. Báo cáo hằng ngày — theo từng loại công việc (checklist, sự cố, năng
//      lượng, masterplan, việc văn phòng, tất cả việc).
//   2. Báo cáo hoạt động — theo hợp đồng (đầu vào / đầu ra / tất cả).
//   3. Báo cáo tổng quan — theo thiết bị, nhân sự, dự án.

export interface PresetChartDef {
  title: string;
  chartType: string;
  dimensions: string[];
  metrics: string[];
  /** Độ rộng trên lưới 24 cột (mặc định 12 = nửa hàng). */
  span?: number;
}

export interface PresetKpiDef {
  label: string;
  /** Metric của dataset dùng làm thẻ số. */
  metric: string;
  suffix?: string;
}

export interface PresetDef {
  key: string;
  title: string;
  description: string;
  dataset: string;
  /** Khoá bộ lọc cố định (VD categoryCodes: ['INCIDENT']). */
  filters?: Record<string, string[]>;
  kpis?: PresetKpiDef[];
  charts: PresetChartDef[];
}

export interface PresetGroupDef {
  key: string;
  label: string;
  description: string;
  items: PresetDef[];
}

// Bộ lọc dùng chung cho loại việc.
const byCategory = (code: string): Record<string, string[]> => ({ categoryCodes: [code] });

export const REPORT_PRESET_GROUPS: PresetGroupDef[] = [
  {
    key: 'daily',
    label: 'Báo cáo hằng ngày',
    description:
      'Diễn biến công việc theo từng loại trong ngày / tháng: checklist, sự cố, năng lượng, masterplan, việc văn phòng.',
    items: [
      {
        key: 'daily-checklist',
        title: 'Checklist hằng ngày',
        description: 'Số lượng đầu việc, tiến độ và tỉ lệ đạt của checklist theo trạng thái và dự án.',
        dataset: 'works',
        filters: byCategory('CHECKLIST'),
        kpis: [
          { label: 'Tổng việc', metric: 'count' },
          { label: 'Đã đóng', metric: 'completed' },
          { label: 'Đang mở', metric: 'open' },
          { label: 'Trễ hạn', metric: 'overdue' },
          { label: 'Tiến độ TB (%)', metric: 'avgProgress', suffix: '%' },
        ],
        charts: [
          { title: 'Việc theo trạng thái', chartType: 'donut', dimensions: ['status'], metrics: ['count'] },
          { title: 'Việc theo dự án', chartType: 'bar', dimensions: ['site'], metrics: ['count'], span: 24 },
          { title: 'Tiến độ theo tháng', chartType: 'line', dimensions: ['month'], metrics: ['avgProgress', 'count'] },
          { title: 'Ưu tiên xử lý', chartType: 'funnel', dimensions: ['priority'], metrics: ['count'] },
          { title: 'Tỉ lệ đã đóng (%)', chartType: 'gauge', dimensions: [], metrics: ['completionRate'] },
        ],
      },
      {
        key: 'daily-incident',
        title: 'Sự cố hư hỏng hằng ngày',
        description: 'Số sự cố theo loại hư hỏng, đơn vị phụ trách, tình trạng xử lý và tỉ lệ mở lại.',
        dataset: 'incidents',
        kpis: [
          { label: 'Tổng sự cố', metric: 'count' },
          { label: 'Lượt mở lại', metric: 'reopenSum' },
          { label: 'Đã có giải pháp', metric: 'withSolution' },
          { label: 'Tỉ lệ có giải pháp (%)', metric: 'solutionRate', suffix: '%' },
        ],
        charts: [
          { title: 'Sự cố theo loại hư hỏng', chartType: 'bar', dimensions: ['damageType'], metrics: ['count', 'solutionRate'] },
          { title: 'Theo đơn vị phụ trách', chartType: 'donut', dimensions: ['picUnit'], metrics: ['count'] },
          { title: 'Theo loại sửa chữa', chartType: 'stackedBar', dimensions: ['repairType'], metrics: ['count', 'reopenSum'] },
          { title: 'Xu hướng sự cố theo tháng', chartType: 'line', dimensions: ['month'], metrics: ['count'], span: 24 },
        ],
      },
      {
        key: 'daily-energy',
        title: 'Kiểm tra năng lượng hằng ngày',
        description: 'Tiêu thụ điện / nước / dầu DO theo đồng hồ, pha và dự án.',
        dataset: 'energy',
        kpis: [
          { label: 'Tổng tiêu thụ', metric: 'totalConsumption' },
          { label: 'Số lượt ghi', metric: 'readingCount' },
          { label: 'Số đồng hồ', metric: 'meterCount' },
          { label: 'TB mỗi lượt ghi', metric: 'avgConsumption' },
        ],
        charts: [
          { title: 'Tiêu thụ theo tháng', chartType: 'area', dimensions: ['month'], metrics: ['totalConsumption'], span: 24 },
          { title: 'Theo loại đồng hồ', chartType: 'donut', dimensions: ['meterType'], metrics: ['totalConsumption', 'meterCount'] },
          { title: 'Điện theo pha', chartType: 'bar', dimensions: ['phase'], metrics: ['totalConsumption'] },
          { title: 'Top đồng hồ tiêu thụ', chartType: 'bar', dimensions: ['meterCode'], metrics: ['totalConsumption'], span: 24 },
        ],
      },
      {
        key: 'daily-masterplan',
        title: 'Masterplan hằng ngày',
        description: 'Tiến độ công việc masterplan theo loại việc, trạng thái và dự án.',
        dataset: 'works',
        filters: byCategory('MASTERPLAN'),
        kpis: [
          { label: 'Tổng việc', metric: 'count' },
          { label: 'Đã đóng', metric: 'completed' },
          { label: 'Đang mở', metric: 'open' },
          { label: 'Hoàn thành (%)', metric: 'completionRate', suffix: '%' },
        ],
        charts: [
          { title: 'Tiến độ theo trạng thái', chartType: 'combo', dimensions: ['status'], metrics: ['count', 'avgProgress'] },
          { title: 'Theo dự án', chartType: 'stackedBar', dimensions: ['site'], metrics: ['count', 'completed'], span: 24 },
          { title: 'Xu hướng theo tháng', chartType: 'line', dimensions: ['month'], metrics: ['count', 'completed'] },
        ],
      },
      {
        key: 'daily-office',
        title: 'Công việc văn phòng hằng ngày',
        description: 'Khối lượng công việc văn phòc theo người giao, người thực hiện và trạng thái.',
        dataset: 'works',
        filters: byCategory('OFFICE_WORK'),
        kpis: [
          { label: 'Tổng việc', metric: 'count' },
          { label: 'Đang mở', metric: 'open' },
          { label: 'Trễ hạn', metric: 'overdue' },
          { label: 'Tiến độ TB (%)', metric: 'avgProgress', suffix: '%' },
        ],
        charts: [
          { title: 'Theo người giao', chartType: 'bar', dimensions: ['assigner'], metrics: ['count'], span: 24 },
          { title: 'Theo người thực hiện', chartType: 'bar', dimensions: ['handler'], metrics: ['count'], span: 24 },
          { title: 'Theo trạng thái', chartType: 'donut', dimensions: ['status'], metrics: ['count'] },
        ],
      },
      {
        key: 'daily-all-works',
        title: 'Tất cả công việc trong ngày',
        description: 'Toàn bộ công việc mọi loại: theo loại việc, trạng thái, dự án và xu hướng theo tháng.',
        dataset: 'works',
        kpis: [
          { label: 'Tổng việc', metric: 'count' },
          { label: 'Đã đóng', metric: 'completed' },
          { label: 'Đang mở', metric: 'open' },
          { label: 'Trễ hạn', metric: 'overdue' },
          { label: 'Hoàn thành (%)', metric: 'completionRate', suffix: '%' },
        ],
        charts: [
          { title: 'Theo loại việc', chartType: 'bar', dimensions: ['category'], metrics: ['count', 'completionRate'] },
          { title: 'Theo trạng thái', chartType: 'donut', dimensions: ['status'], metrics: ['count'] },
          { title: 'Theo dự án', chartType: 'bar', dimensions: ['site'], metrics: ['count'], span: 24 },
          { title: 'Xu hướng theo tháng', chartType: 'line', dimensions: ['month'], metrics: ['count', 'completed', 'overdue'], span: 24 },
          { title: 'Ma trận dự án × trạng thái', chartType: 'heatmap', dimensions: ['site', 'status'], metrics: ['count'], span: 24 },
        ],
      },
    ],
  },
  {
    key: 'activity',
    label: 'Báo cáo hoạt động',
    description:
      'Hoạt động theo hợp đồng: hợp đồng đầu vào, đầu ra, theo dịch vụ, dự án và cảnh báo sắp hết hạn.',
    items: [
      {
        key: 'activity-contract-input',
        title: 'Hợp đồng đầu vào',
        description: 'Các hợp đồng mua vào/nhập cung cấp dịch vụ theo dự án và thời hạn.',
        dataset: 'contracts',
        filters: { contractTypes: ['INPUT'] },
        kpis: [
          { label: 'Số hợp đồng', metric: 'count' },
          { label: 'Sắp hết hạn (≤90 ngày)', metric: 'expiring90' },
          { label: 'Đã hết hạn', metric: 'expired' },
          { label: 'Thời hạn TB (ngày)', metric: 'avgDurationDays' },
        ],
        charts: [
          { title: 'Theo dự án', chartType: 'bar', dimensions: ['site'], metrics: ['count'], span: 24 },
          { title: 'Theo loại dịch vụ', chartType: 'donut', dimensions: ['serviceType'], metrics: ['count'] },
          { title: 'Nhóm thời hạn còn lại', chartType: 'funnel', dimensions: ['expiry'], metrics: ['count'] },
          { title: 'Số hợp đồng theo tháng bắt đầu', chartType: 'line', dimensions: ['month'], metrics: ['count'], span: 24 },
        ],
      },
      {
        key: 'activity-contract-output',
        title: 'Hợp đồng đầu ra',
        description: 'Các hợp đồng dịch vụ bán ra cho khách hàng theo dự án và thời hạn.',
        dataset: 'contracts',
        filters: { contractTypes: ['OUTPUT'] },
        kpis: [
          { label: 'Số hợp đồng', metric: 'count' },
          { label: 'Sắp hết hạn (≤90 ngày)', metric: 'expiring90' },
          { label: 'Đã hết hạn', metric: 'expired' },
          { label: 'Thời hạn TB (ngày)', metric: 'avgDurationDays' },
        ],
        charts: [
          { title: 'Theo khách hàng / công ty', chartType: 'bar', dimensions: ['company'], metrics: ['count'], span: 24 },
          { title: 'Theo dự án', chartType: 'bar', dimensions: ['site'], metrics: ['count'], span: 24 },
          { title: 'Theo loại dịch vụ', chartType: 'donut', dimensions: ['serviceType'], metrics: ['count'] },
          { title: 'Nhóm thời hạn còn lại', chartType: 'funnel', dimensions: ['expiry'], metrics: ['count'] },
        ],
      },
      {
        key: 'activity-contract-all',
        title: 'Tất cả hợp đồng',
        description: 'Toàn bộ hợp đồng đầu vào + đầu ra, theo dịch vụ, tỉnh thành và thời hạn.',
        dataset: 'contracts',
        kpis: [
          { label: 'Tổng hợp đồng', metric: 'count' },
          { label: 'Sắp hết hạn (≤90 ngày)', metric: 'expiring90' },
          { label: 'Đã hết hạn', metric: 'expired' },
          { label: 'Không xác định', metric: 'openEndless' },
        ],
        charts: [
          { title: 'Đầu vào vs đầu ra', chartType: 'donut', dimensions: ['contractType'], metrics: ['count'] },
          { title: 'Theo loại dịch vụ', chartType: 'stackedBar', dimensions: ['serviceType'], metrics: ['count'] },
          { title: 'Theo dự án', chartType: 'bar', dimensions: ['site'], metrics: ['count'], span: 24 },
          { title: 'Ma trận dịch vụ × dự án', chartType: 'heatmap', dimensions: ['serviceType', 'site'], metrics: ['count'], span: 24 },
        ],
      },
    ],
  },
  {
    key: 'summary',
    label: 'Báo cáo tổng quan',
    description: 'Bức tranh tổng thể: thiết bị / tài sản, nhân sự và danh mục dự án.',
    items: [
      {
        key: 'summary-assets',
        title: 'Thiết bị & tài sản',
        description: 'Tổng số tài sản theo danh mục, tình trạng, trạng thái dùng và dự án.',
        dataset: 'assets',
        kpis: [
          { label: 'Số tài sản', metric: 'count' },
          { label: 'Tổng số lượng', metric: 'quantitySum' },
        ],
        charts: [
          { title: 'Theo danh mục tài sản', chartType: 'donut', dimensions: ['category'], metrics: ['count', 'quantitySum'] },
          { title: 'Theo tình trạng', chartType: 'treemap', dimensions: ['condition'], metrics: ['count'] },
          { title: 'Theo trạng thái sử dụng', chartType: 'bar', dimensions: ['usageStatus'], metrics: ['count'] },
          { title: 'Theo dự án', chartType: 'bar', dimensions: ['site'], metrics: ['count', 'quantitySum'], span: 24 },
        ],
      },
      {
        key: 'summary-personnel',
        title: 'Nhân sự',
        description: 'Quy mô và cơ cấu nhân sự theo đơn vị, chức vụ, cấp bậc và tình trạng.',
        dataset: 'personnel',
        kpis: [
          { label: 'Tổng nhân sự', metric: 'count' },
          { label: 'Tài khoản chủ đầu tư', metric: 'investorAccount' },
          { label: 'Đang quản lý dự án', metric: 'managingSites' },
        ],
        charts: [
          { title: 'Theo đơn vị', chartType: 'bar', dimensions: ['department'], metrics: ['count'], span: 24 },
          { title: 'Theo chức vụ', chartType: 'bar', dimensions: ['position'], metrics: ['count'] },
          { title: 'Theo tình trạng', chartType: 'donut', dimensions: ['status'], metrics: ['count'] },
          { title: 'Theo cấp bậc', chartType: 'treemap', dimensions: ['level'], metrics: ['count'] },
          { title: 'Ma trận đơn vị × chức vụ', chartType: 'heatmap', dimensions: ['department', 'position'], metrics: ['count'], span: 24 },
        ],
      },
      {
        key: 'summary-sites',
        title: 'Dự án',
        description: 'Danh mục dự án theo chủ đầu tư, dịch vụ, địa bàn, diện tích và trạng thái.',
        dataset: 'sites',
        kpis: [
          { label: 'Số dự án', metric: 'count' },
          { label: 'Tổng GLA (m²)', metric: 'glaAreaSum', suffix: ' m²' },
          { label: 'Tổng diện tích cho thuê (m²)', metric: 'leasedAreaSum', suffix: ' m²' },
          { label: 'Lấp đầy TB (%)', metric: 'avgOccupancy', suffix: '%' },
        ],
        charts: [
          { title: 'Theo chủ đầu tư', chartType: 'bar', dimensions: ['investor'], metrics: ['count', 'glaAreaSum'], span: 24 },
          { title: 'Theo loại hình dịch vụ', chartType: 'donut', dimensions: ['serviceType'], metrics: ['count'] },
          { title: 'Theo trạng thái quản lý', chartType: 'stackedBar', dimensions: ['managementStatus'], metrics: ['count'] },
          { title: 'Theo tỉnh thành', chartType: 'bar', dimensions: ['province'], metrics: ['count', 'glaAreaSum'] },
          { title: 'Diện tích theo dự án', chartType: 'bar', dimensions: ['site'], metrics: ['glaAreaSum'], span: 24 },
        ],
      },
    ],
  },
];
