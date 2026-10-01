// pages/report/ui/charts/EChartView — vẽ Cột/Tròn/Đường bằng echarts.
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import type { ReportRow } from '@/entities/report';

interface Props {
  type: 'BAR' | 'PIE' | 'LINE';
  rows: ReportRow[];
  height?: number;
}

function shortLabel(label: string): string {
  return label.length > 16 ? `${label.slice(0, 15)}…` : label;
}

export function EChartView({ type, rows, height = 300 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el);
    const labels = rows.map((r) => shortLabel(r.label));

    if (type === 'PIE') {
      chart.setOption({
        tooltip: { trigger: 'item', valueFormatter: (v: unknown) => `${v}` },
        legend: { bottom: 0, type: 'scroll' },
        series: [
          {
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['50%', '44%'],
            label: { formatter: '{b}: {c}' },
            data: rows.map((r) => ({
              name: r.label,
              value: r.value,
              ...(r.color ? { itemStyle: { color: r.color } } : {}),
            })),
          },
        ],
      });
    } else if (type === 'LINE') {
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 48, right: 16, top: 24, bottom: 48 },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { rotate: labels.some((l) => l.length > 8) ? 30 : 0 },
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
          {
            type: 'line',
            smooth: true,
            symbolSize: 7,
            areaStyle: { opacity: 0.12 },
            data: rows.map((r) => r.value),
          },
        ],
      });
    } else {
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 48, right: 16, top: 24, bottom: 48 },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { rotate: labels.some((l) => l.length > 8) ? 30 : 0 },
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
          {
            type: 'bar',
            barMaxWidth: 56,
            label: { show: true, position: 'top' },
            data: rows.map((r) => ({
              value: r.value,
              ...(r.color ? { itemStyle: { color: r.color } } : {}),
            })),
          },
        ],
      });
    }

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [type, rows]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
