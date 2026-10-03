// pages/report — module Báo cáo kiểu Power BI: Tổng quan | Khám phá | Bảng của tôi.
import { BarChartOutlined, CompassOutlined, DashboardOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import { useState } from 'react';
import { BoardsTab } from './BoardsTab';
import { ExplorerTab } from './ExplorerTab';
import { OverviewTab } from './OverviewTab';
import './ReportPage.css';

const TAB_KEYS = ['overview', 'explorer', 'boards'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(v: string | undefined): v is TabKey {
  return !!v && (TAB_KEYS as readonly string[]).includes(v);
}

export function ReportPage({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<TabKey>(
    isTabKey(initialTab) ? initialTab : 'overview',
  );
  return (
    <div className="report-page">
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <DashboardOutlined /> Tổng quan
              </span>
            ),
            children: <OverviewTab />,
          },
          {
            key: 'explorer',
            label: (
              <span>
                <CompassOutlined /> Khám phá & tự custom
              </span>
            ),
            children: <ExplorerTab />,
          },
          {
            key: 'boards',
            label: (
              <span>
                <BarChartOutlined /> Bảng của tôi
              </span>
            ),
            children: <BoardsTab />,
          },
        ]}
      />
    </div>
  );
}
