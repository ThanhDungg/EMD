// pages/report/ui/ReportShareModal — chia sẻ dashboard cho người dùng / nhóm.
import { useQuery } from '@tanstack/react-query';
import { Button, Form, Modal, Select, Space, message } from 'antd';
import { useState } from 'react';
import { useShareDashboard } from '@/entities/report';
import type { ReportDashboard } from '@/entities/report';
import { fetchGroups } from '@/entities/group';
import { fetchDirectory } from '@/entities/work';
import { apiErrorMessage } from '@/shared/lib';

interface Props {
  open: boolean;
  dashboard: ReportDashboard | null;
  onClose: () => void;
}

export function ReportShareModal({ open, dashboard, onClose }: Props) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={dashboard ? `Chia sẻ — ${dashboard.title}` : 'Chia sẻ'}
      destroyOnClose
      zIndex={1200}
    >
      {dashboard && (
        <ShareForm
          key={dashboard.id}
          dashboard={dashboard}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function ShareForm({
  dashboard,
  onClose,
}: {
  dashboard: ReportDashboard;
  onClose: () => void;
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const shareMutation = useShareDashboard();
  const [userIds, setUserIds] = useState<number[]>(() =>
    (dashboard.sharedUsers ?? []).map((u) => u.id),
  );
  const [groupIds, setGroupIds] = useState<number[]>(() =>
    (dashboard.sharedGroups ?? []).map((g) => g.id),
  );

  const { data: users = [] } = useQuery({
    queryKey: ['reports', 'directory'],
    queryFn: fetchDirectory,
    staleTime: 5 * 60 * 1000,
  });
  const { data: groups = [] } = useQuery({
    queryKey: ['reports', 'groups'],
    queryFn: fetchGroups,
    staleTime: 5 * 60 * 1000,
  });

  async function handleSave() {
    try {
      await shareMutation.mutateAsync({
        id: dashboard.id,
        payload: { userIds, groupIds },
      });
      messageApi.success('Đã cập nhật chia sẻ.');
      onClose();
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Chia sẻ thất bại.'));
    }
  }

  return (
    <>
      {contextHolder}
      <Form layout="vertical">
        <Form.Item
          label="Người được xem"
          extra="Để trống cả 2 ô là chỉ mình bạn (và ADMIN) thấy bảng này."
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn người dùng"
            value={userIds}
            options={users.map((u) => ({
              value: u.id,
              label: u.fullName
                ? `${u.fullName} (${u.accountName})`
                : u.accountName,
            }))}
            onChange={setUserIds}
          />
        </Form.Item>
        <Form.Item label="Nhóm được xem">
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn nhóm"
            value={groupIds}
            options={groups
              .filter((g) => !g.isDeleted)
              .map((g) => ({ value: g.id, label: g.name }))}
            onChange={setGroupIds}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>Huỷ</Button>
            <Button
              type="primary"
              loading={shareMutation.isPending}
              onClick={handleSave}
            >
              Lưu
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </>
  );
}
