// pages/admin/ui/GroupListPage — tab Nhóm: tên, mã, quyền, thành viên.
// Có thêm/sửa/xoá + nhập Excel (trùng mã thì cập nhật).
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { useUsers } from '@/entities/user';
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  usePermissions,
  useUpdateGroup,
} from '@/entities/group';
import type { GroupPayload, UserGroup } from '@/entities/group';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { GroupImportModal } from './GroupImportModal';

const { Text } = Typography;
const PAGE_SIZE = 20;

interface GroupFormValues {
  name: string;
  code?: string;
  permissionIds?: number[];
  userIds?: number[];
}

export function GroupListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserGroup | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form] = Form.useForm<GroupFormValues>();

  const { data: groups = [], isLoading } = useGroups();
  const { data: permissions = [] } = usePermissions();
  const { data: employees = [] } = useUsers(false);
  const { data: investors = [] } = useUsers(true);
  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();
  const deleteMutation = useDeleteGroup();

  const members = [...employees, ...investors];

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(group: UserGroup) {
    setEditing(group);
    form.setFieldsValue({
      name: group.name,
      code: group.code ?? undefined,
      permissionIds: group.permissions.map((p) => p.id),
      userIds: group.users.map((u) => u.id),
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    let values: GroupFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload: GroupPayload = {
      name: values.name,
      code: values.code || undefined,
      permissionIds: values.permissionIds ?? [],
      userIds: values.userIds ?? [],
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success('Đã cập nhật nhóm.');
      } else {
        await createMutation.mutateAsync(payload);
        messageApi.success('Đã thêm nhóm.');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu nhóm thất bại.'));
    }
  }

  async function handleDelete(group: UserGroup) {
    try {
      await deleteMutation.mutateAsync(group.id);
      messageApi.success('Đã xoá nhóm.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá nhóm thất bại.'));
    }
  }

  const columns: ColumnsType<UserGroup> = [
    {
      title: 'Mã nhóm',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (v: string | null) => <Text strong>{v ?? '—'}</Text>,
    },
    {
      title: 'Tên nhóm',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Quyền',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (list: Array<{ id: number; code: string }> | undefined) =>
        !list || list.length === 0 ? (
          '—'
        ) : (
          <Space size={4} wrap>
            {list.map((p) => (
              <Tag key={p.id} color="blue">
                {p.code}
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      title: 'Thành viên',
      dataIndex: 'users',
      key: 'users',
      width: 260,
      render: (
        list: Array<{ id: number; accountName: string }> | undefined,
      ) =>
        !list || list.length === 0 ? (
          '—'
        ) : (
          <Space size={4} wrap>
            {list.slice(0, 5).map((u) => (
              <Tag key={u.id}>{u.accountName}</Tag>
            ))}
            {list.length > 5 && <Tag>+{list.length - 5}</Tag>}
          </Space>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, group) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => openEdit(group)}>
            Sửa
          </Button>
          <Popconfirm
            title={`Xoá nhóm "${group.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(group)}
          >
            <Button type="text" danger size="small" aria-label="Xoá nhóm">
              Xoá
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <BodyCard
        title="Danh sách nhóm"
        extra={
          <Space>
            <Button
              size="small"
              icon={<ImportOutlined />}
              onClick={() => setImportOpen(true)}
            >
              Nhập Excel
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={openCreate}
            >
              Thêm nhóm
            </Button>
          </Space>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Nhóm gom quyền và thành viên — gán tài khoản vào nhóm để phân quyền.
        </Text>
        <Table<UserGroup>
          columns={columns}
          dataSource={groups}
          rowKey="id"
          size="small"
          loading={isLoading}
          locale={{ emptyText: 'Chưa có nhóm nào' }}
          pagination={{
            pageSize: PAGE_SIZE,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} nhóm`,
            hideOnSinglePage: false,
          }}
        />
      </BodyCard>

      <Modal
        title={editing ? 'Sửa nhóm' : 'Thêm nhóm'}
        open={modalOpen}
        onCancel={() => {
          form.resetFields();
          setModalOpen(false);
        }}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        cancelText="Huỷ"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={640}
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        destroyOnClose
        zIndex={1200}
      >
        <Form<GroupFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            name="name"
            label="Tên nhóm"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhóm.' }]}
          >
            <Input placeholder="vd: Ban quản lý" />
          </Form.Item>
          <Form.Item name="code" label="Mã nhóm">
            <Input placeholder="vd: BQL (để trống nếu chưa có)" />
          </Form.Item>
          <Form.Item name="permissionIds" label="Quyền">
            <Select mode="multiple" allowClear placeholder="Chọn quyền">
              {permissions.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="userIds" label="Thành viên">
            <Select
              mode="multiple"
              allowClear
              placeholder="Chọn thành viên"
              showSearch
              optionFilterProp="label"
            >
              {members.map((m) => (
                <Select.Option
                  key={m.id}
                  value={m.id}
                  label={`${m.accountName} ${m.fullName ?? ''}`}
                >
                  {m.fullName
                    ? `${m.fullName} (${m.accountName})`
                    : m.accountName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <GroupImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
