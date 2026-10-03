// shared/ui/chart — wrapper ECharts dùng chung cho module báo cáo.
// Chỉ đăng ký chart/component cần dùng (tree-shaking) để giảm bundle.
// Render mọi loại visual Power BI: kpi/gauge/table tự vẽ, còn lại qua ECharts.
import { Table } from 'antd';
import * as echarts from 'echarts/core';
import {
  BarChart,
  FunnelChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  TreemapChart,
} from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';
import type { ChartDrillInfo, ChartKey, QueryReportResult } from '@/entities/report';
import './ReportChart.css';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  FunnelChart,
  GaugeChart,
  RadarChart,
  TreemapChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

const PALETTE = [
  '#2174cd',
  '#12b76a',
  '#f79009',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#64748b',
  '#f59e0b',
];

interface Props {
  chartType: ChartKey;
  data: QueryReportResult;
  height?: number;
  showLabels?: boolean;
  /**
   * Drill-through: bấm vào 1 cột / điểm / segment sẽ báo lên trên để mở danh
   * sách bản ghi gốc. Bỏ trống = không drill.
   */
  onDrill?: (info: ChartDrillInfo) => void;
}

function fmtNum(v: string | number): string {
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

export function ReportChart({
  chartType,
  data,
  height = 300,
  showLabels = true,
  onDrill,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => data.rows ?? [], [data]);
  const dim = data.dimensions[0];
  const metric = data.metrics[0] ?? 'count';
  const metricSeries = useMemo(
  () => (data.metrics.length > 0 ? data.metrics : ['count']),
  [data.metrics],
);
  const cats = useMemo(
    () => rows.map((r) => String(r[dim] ?? '(Chưa phân loại)')),
    [rows, dim],
  );

  // Nhãn lát cắt của từng điểm dữ liệu: gắn vào item để khi click, ECharts trả
  // lại đúng giá trị chiều mà không phụ thuộc thứ tự series.
  const point = (value: number, label: string) => ({ value, __drill: label });
  // Handler mới nhất (tránh re-init biểu đồ mỗi lần parent render lại).
  const drillRef = useRef(onDrill);
  useEffect(() => {
    drillRef.current = onDrill;
  }, [onDrill]);

  // Nhãn trục X của heatmap (dùng cho cả option lẫn xử lý click).
  const heatCols = useMemo(() => {
    if (chartType !== 'heatmap') return [] as string[];
    const dim2 = data.dimensions[1];
    return dim2
      ? [...new Set(rows.map((r) => String(r[dim2] ?? '(Khác)')))]
      : metricSeries;
  }, [chartType, rows, data.dimensions, metricSeries]);

  const option = useMemo<echarts.EChartsCoreOption | null>(() => {
    if (rows.length === 0) return null;
    const labelOpt = showLabels
      ? { show: true, position: 'top' as const }
      : { show: false };
    const grid = { left: 8, right: 16, bottom: 8, top: 32, containLabel: true };
    switch (chartType) {
      case 'bar':
        return {
          color: PALETTE,
          tooltip: { trigger: 'axis' },
          grid,
          xAxis: { type: 'category', data: cats },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'bar',
              data: rows.map((r) => point(Number(r[metric] ?? 0), String(r[dim] ?? ''))),
              label: labelOpt,
              barMaxWidth: 56,
            },
          ],
        };
      case 'stackedBar':
        return {
          color: PALETTE,
          tooltip: { trigger: 'axis' },
          legend: { top: 0 },
          grid,
          xAxis: { type: 'category', data: cats },
          yAxis: { type: 'value' },
          series: metricSeries.map((m) => ({
            name: m,
            type: 'bar' as const,
            stack: 'total',
            data: rows.map((r) => point(Number(r[m] ?? 0), String(r[dim] ?? ''))),
            label: labelOpt,
            barMaxWidth: 56,
          })),
        };
      case 'line':
        return {
          color: PALETTE,
          tooltip: { trigger: 'axis' },
          legend: metricSeries.length > 1 ? { top: 0 } : undefined,
          grid,
          xAxis: { type: 'category', boundaryGap: false, data: cats },
          yAxis: { type: 'value' },
          series: metricSeries.map((m) => ({
            name: m,
            type: 'line' as const,
            smooth: true,
            symbolSize: 6,
            data: rows.map((r) => point(Number(r[m] ?? 0), String(r[dim] ?? ''))),
            label: labelOpt,
          })),
        };
      case 'area':
        return {
          color: PALETTE,
          tooltip: { trigger: 'axis' },
          legend: metricSeries.length > 1 ? { top: 0 } : undefined,
          grid,
          xAxis: { type: 'category', boundaryGap: false, data: cats },
          yAxis: { type: 'value' },
          series: metricSeries.map((m) => ({
            name: m,
            type: 'line' as const,
            smooth: true,
            areaStyle: { opacity: 0.25 },
            data: rows.map((r) => point(Number(r[m] ?? 0), String(r[dim] ?? ''))),
          })),
        };
      case 'donut':
      case 'pie':
        return {
          color: PALETTE,
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend: { bottom: 0, type: 'scroll' },
          series: [
            {
              type: 'pie',
              radius: chartType === 'donut' ? ['45%', '70%'] : '65%',
              label: showLabels ? { formatter: '{b}\n{c} ({d}%)' } : { show: false },
              data: rows.map((r) => ({
                name: String(r[dim] ?? '(Khác)'),
                value: Number(r[metric] ?? 0),
                __drill: String(r[dim] ?? ''),
              })),
            },
          ],
        };
      case 'funnel':
        return {
          color: PALETTE,
          tooltip: { trigger: 'item', formatter: '{b}: {c}' },
          series: [
            {
              type: 'funnel',
              left: '10%',
              width: '80%',
              label: { show: true, formatter: '{b}: {c}' },
              data: [...rows]
                .sort((a, b) => Number(b[metric] ?? 0) - Number(a[metric] ?? 0))
                .map((r) => ({
                  name: String(r[dim] ?? ''),
                  value: Number(r[metric] ?? 0),
                  __drill: String(r[dim] ?? ''),
                })),
            },
          ],
        };
      case 'radar': {
        const max =
          Math.max(...rows.map((x) => Number(x[metric] ?? 0)), 0) * 1.2 || 1;
        return {
          color: PALETTE,
          tooltip: { trigger: 'item' },
          radar: { indicator: cats.map((n) => ({ name: n, max })) },
          series: [
            {
              type: 'radar',
              areaStyle: { opacity: 0.2 },
              data: [
                { value: rows.map((r) => Number(r[metric] ?? 0)), name: metric },
              ],
            },
          ],
        };
      }
      case 'treemap':
        return {
          color: PALETTE,
          tooltip: { formatter: '{b}: {c}' },
          series: [
            {
              type: 'treemap',
              label: { show: true, formatter: '{b}\n{c}' },
              data: rows.map((r) => ({
                name: String(r[dim] ?? ''),
                value: Number(r[metric] ?? 0),
                __drill: String(r[dim] ?? ''),
              })),
            },
          ],
        };
      case 'combo':
        // Chỉ số 1 vẽ cột (trục trái), chỉ số 2 vẽ đường (trục phải) — chuẩn
        // Power BI: số lượng + tỉ lệ đi cùng nhau.
        return {
          color: PALETTE,
          tooltip: { trigger: 'axis' },
          legend: { top: 0 },
          grid: { left: 8, right: 8, bottom: 8, top: 32, containLabel: true },
          xAxis: { type: 'category', data: cats },
          yAxis: [
            { type: 'value', name: metricSeries[0] },
            { type: 'value', name: metricSeries[1], position: 'right', splitLine: { show: false } },
          ],
          series: [
            {
              name: metricSeries[0],
              type: 'bar',
              data: rows.map((r) =>
                point(Number(r[metricSeries[0]] ?? 0), String(r[dim] ?? '')),
              ),
              barMaxWidth: 48,
            },
            ...(metricSeries[1]
              ? [
                  {
                    name: metricSeries[1],
                    type: 'line' as const,
                    yAxisIndex: 1,
                    smooth: true,
                    data: rows.map((r) =>
                      point(Number(r[metricSeries[1]] ?? 0), String(r[dim] ?? '')),
                    ),
                  },
                ]
              : []),
          ],
        };
      case 'heatmap': {
        const dim2 = data.dimensions[1];
        const cols = heatCols;
        const rowKeys = dim2 ? cats : ['(Tất cả)'];
        const points: [number, number, number][] = [];
        rowKeys.forEach((rowKey, y) => {
          const row = dim2 ? rows.find((r) => String(r[dim] ?? '') === rowKey) : rows[0];
          cols.forEach((colKey, x) => {
            const value = dim2
              ? Number(row?.[colKey] ?? 0)
              : Number(row?.[colKey] ?? 0);
            points.push([x, y, Number.isFinite(value) ? value : 0]);
          });
        });
        return {
          tooltip: {
            position: 'top',
            formatter: (p: { data: [number, number, number] }) =>
              `${cols[p.data[0]]} · ${rowKeys[p.data[1]]}: ${fmtNum(p.data[2])}`,
          },
          grid: { left: 8, right: 16, bottom: 8, top: 32, containLabel: true },
          xAxis: { type: 'category', data: cols, splitArea: { show: true } },
          yAxis: { type: 'category', data: rowKeys, splitArea: { show: true } },
          visualMap: {
            min: 0,
            max: Math.max(...points.map((p) => p[2]), 1),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
          },
          series: [
            {
              type: 'heatmap',
              data: points,
              label: { show: true, formatter: (p: { data: [number, number, number] }) => fmtNum(p.data[2]) },
            },
          ],
        };
      }
      default:
        return null;
    }
  }, [chartType, rows, cats, dim, metric, metricSeries, showLabels, data.dimensions, heatCols]);

  const gaugeOption = useMemo<echarts.EChartsCoreOption | null>(() => {
    if (chartType !== 'gauge' || rows.length === 0) return null;
    // Đồng hồ chỉ hiển thị tỉ lệ 0–100: chỉ số dạng "rate" dùng trực tiếp,
    // ngược lại quy đổi tỉ lệ trên tổng các nhóm.
    const isRate = /rate/i.test(metric);
    const total = rows.reduce((s, r) => s + Number(r[metric] ?? 0), 0);
    const value = isRate
      ? Number(rows[0][metric] ?? 0)
      : rows.length === 1
        ? 100
        : (Number(rows[0][metric] ?? 0) / (total || 1)) * 100;
    return {
      series: [
        {
          type: 'gauge',
          progress: { show: true, width: 14 },
          axisLine: { lineStyle: { width: 14 } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: false },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            fontSize: 28,
            fontWeight: 'bold',
          },
          data: [{ value: Math.round(value * 10) / 10, name: metric }],
        },
      ],
    };
  }, [chartType, rows, metric]);

  useEffect(() => {
    if (!ref.current || !option) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    // Drill-through: click vào điểm dữ liệu → lấy nhãn chiều đã gắn sẵn.
    if (drillRef.current && chartType !== 'radar' && chartType !== 'table') {
      chart.on('click', (params) => {
        const cb = drillRef.current;
        if (!cb || !dim) return;
        const p = params as unknown as {
          data?: { __drill?: string } | [number, number, number];
          name?: string;
        };
        let outDim = dim;
        let value = '';
        if (chartType === 'heatmap' && Array.isArray(p.data)) {
          // Ô heatmap mang nhãn của CHIỀU 2 (trục X) → drill theo chiều đó.
          outDim = data.dimensions[1] ?? dim;
          value = heatCols[p.data[0]] ?? '';
        } else if (p.data && !Array.isArray(p.data)) {
          value = p.data.__drill ?? '';
        }
        if (!value) value = p.name ?? '';
        if (!value) return;
        cb({ dim: outDim, value });
      });
      // Con trỏ tay + gợi ý drill.
      chart.getDom().style.cursor = 'pointer';
    }
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [option, chartType, dim, data.dimensions, heatCols]);

  if (rows.length === 0) {
    return <div className="report-chart-empty">Chưa có dữ liệu cho lát cắt này.</div>;
  }

  if (chartType === 'kpi') {
    const total = rows.reduce((s, r) => s + Number(r[metric] ?? 0), 0);
    const top = rows[0];
    return (
      <div className="report-kpi">
        <div className="report-kpi-value">
          {fmtNum(Math.round(total * 100) / 100)}
        </div>
        <div className="report-kpi-sub">
          {rows.length} nhóm · Top: {String(top[dim] ?? '')} ({fmtNum(top[metric] ?? 0)})
        </div>
      </div>
    );
  }

  if (chartType === 'gauge' && gaugeOption) {
    return <EChartCanvas option={gaugeOption} height={height} />;
  }

  if (chartType === 'table') {
    const cols = [...data.dimensions, ...data.metrics].map((k) => ({
      title: k,
      dataIndex: k,
      key: k,
      render: (v: string | number) => (typeof v === 'number' ? fmtNum(v) : String(v)),
    }));
    return (
      <Table
        size="small"
        columns={cols}
        dataSource={rows.map((r, i) => ({ key: i, ...r }))}
        pagination={{ pageSize: 6, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
      />
    );
  }

  return <div ref={ref} className="report-chart-canvas" style={{ height }} />;
}

function EChartCanvas({
  option,
  height,
}: {
  option: echarts.EChartsCoreOption;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [option]);
  return <div ref={ref} className="report-chart-canvas" style={{ height }} />;
}
