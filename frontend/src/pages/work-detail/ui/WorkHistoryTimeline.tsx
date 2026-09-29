import { Empty, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import { useWorkHistories } from '@/entities/work';
import { BodyCard } from '@/shared/ui';

const { Paragraph } = Typography;

function actorName(a: {
  accountName: string;
  fullName?: string | null;
}): string {
  return a.fullName?.trim() || a.accountName;
}

// pages/work-detail — card Lịch sử dùng chung mọi loại công việc.
// Mỗi lần tạo/đổi trạng thái backend tự ghi 1 mốc (bảng work_status_histories).
export function WorkHistoryTimeline({ workId }: { workId: number }) {
  const { data: histories = [], isLoading } = useWorkHistories(workId);

  return (
    <BodyCard title="Lịch sử">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : histories.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có lịch sử"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {histories.map((h) => {
            const at = dayjs(h.createdAt);
            return (
              <div
                key={h.id}
                style={{ display: 'flex', alignItems: 'stretch' }}
              >
                <div
                  style={{
                    background: '#075ac4',
                    color: '#fff',
                    width: 78,
                    minHeight: 60,
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  <span>{at.format('DD-MM-')}</span>
                  <span>{at.format('YYYY')}</span>
                  <span>{at.format('HH:mm:ss')}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0 12px',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: '2px solid #075ac4',
                      background: '#fff',
                      marginTop: 24,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ width: 2, flex: 1, background: '#ebedf0' }} />
                </div>
                <div
                  style={{
                    border: '1px solid #dfe3e8',
                    borderRadius: 6,
                    padding: '8px 12px',
                    flex: 1,
                    background: '#fff',
                  }}
                >
                  <div style={{ color: '#0969da', fontWeight: 600 }}>
                    {actorName(h.changedBy)}
                  </div>
                  {h.fromStatus ? (
                    <Paragraph style={{ margin: '4px 0 0' }}>
                      Cập nhật Trạng thái: Trạng thái trước: {h.fromStatus.name}
                      , Trạng thái sau: {h.toStatus?.name ?? '—'}.
                    </Paragraph>
                  ) : (
                    <Paragraph style={{ margin: '4px 0 0' }}>
                      Tạo công việc
                      {h.toStatus ? ` với trạng thái ${h.toStatus.name}` : ''}.
                    </Paragraph>
                  )}
                  {h.note && (
                    <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                      {h.note}
                    </Paragraph>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BodyCard>
  );
}
