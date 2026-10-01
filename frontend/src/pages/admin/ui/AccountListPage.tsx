// pages/admin/ui/AccountListPage — danh sách tài khoản dùng chung cho
// 2 tab: nhân viên (isInvestor=false) và tài khoản chủ đầu tư (true).
// Có thêm/sửa/xoá + nhập Excel (trùng tên đăng nhập thì cập nhật).
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useGroups } from '@/entities/group';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUserReferences,
  useUsers,
} from '@/entities/user';
import type { AccountUser, UserPayload } from '@/entities/user';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import type { AccountFormValues } from './AccountFormFields';
import { AccountFormFields } from './AccountFormFields';
import { UserImportModal } from './UserImportModal';

const { Text } = Typography;
const PAGE_SIZE = 20;

interface Props {
  isInvestor: boolean;
}

export function AccountListPage({ isInvestor }: Props) {
  const kind = isInvestor ? 'tài khoản chủ đầu tư' : 'nhân viên';
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountUser | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form] = Form.useForm<AccountFormValues>();

  const { data: users = [], isLoading } = useUsers(isInvestor);
  const { data: references } = useUserReferences();
  const { data: groups = [] } = useGroups();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(user: AccountUser) {
    setEditing(user);
    form.setFieldsValue({
      accountName: user.accountName,
      email: user.email,
      fullName: user.fullName ?? undefined,
      gender: user.gender ?? undefined,
      birthday: user.birthday ? dayjs(user.birthday) : undefined,
      address: user.address ?? undefined,
      internalPhone: user.internalPhone ?? undefined,
      phone: user.phone ?? undefined,
      hireDate: user.hireDate ? dayjs(user.hireDate) : undefined,
      userLevelId: user.userLevelId ?? undefined,
      positionId: user.positionId ?? undefined,
      departmentId: user.departmentId ?? undefined,
      coDepartmentId: user.coDepartmentId ?? undefined,
      statusId: user.statusId ?? undefined,
      managerId: user.managerId ?? undefined,
      groupIds: (user.groups ?? []).map((g) => g.id),
    });
    setModalOpen(true);
  }

  function toPayload(values: AccountFormValues): UserPayload {
    return {
      accountName: values.accountName,
      email: values.email,
      ...(values.password ? { password: values.password } : {}),
      fullName: values.fullName || undefined,
      gender: values.gender ?? undefined,
      birthday: values.birthday
        ? values.birthday.format('YYYY-MM-DD')
        : undefined,
      address: values.address || undefined,
      internalPhone: values.internalPhone || undefined,
      phone: values.phone || undefined,
      hireDate: values.hireDate
        ? values.hireDate.format('YYYY-MM-DD')
        : undefined,
      userLevelId: values.userLevelId ?? undefined,
      positionId: values.positionId ?? undefined,
      departmentId: values.departmentId ?? undefined,
      coDepartmentId: values.coDepartmentId ?? undefined,
      statusId: values.statusId ?? undefined,
      managerId: values.managerId ?? undefined,
      groupIds: values.groupIds ?? [],
      isInvestor,
    };
  }

  async function handleSubmit() {
    let values: AccountFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: toPayload(values),
        });
        messageApi.success(`Đã cập nhật ${kind}.`);
      } else {
        await createMutation.mutateAsync(toPayload(values));
        messageApi.success(`Đã thêm ${kind}.`);
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      messageApi.error(apiErrorMessage(err, `Lưu ${kind} thất bại.`));
    }
  }

  async function handleDelete(user: AccountUser) {
    try {
      await deleteMutation.mutateAsync(user.id);
      messageApi.success(`Đã xoá ${kind}.`);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, `Xoá ${kind} thất bại.`));
    }
  }

  const columns: ColumnsType<AccountUser> = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 150,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 190,
      render: (v: string | null) => (v ? <EllipsisText text={v} /> : '—'),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Chức vụ',
      dataIndex: ['position', 'name'],
      key: 'position',
      width: 150,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Cấp bậc',
      dataIndex: ['userLevel', 'name'],
      key: 'userLevel',
      width: 130,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Đơn vị',
      dataIndex: ['department', 'name'],
      key: 'department',
      width: 170,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Nhóm',
      dataIndex: 'groups',
      key: 'groups',
      width: 200,
      render: (list: Array<{ id: number; name: string }> | undefined) =>
        !list || list.length === 0 ? (
          '—'
        ) : (
          <Space size={4} wrap>
            {list.map((g) => (
              <Tag key={g.id}>{g.name}</Tag>
            ))}
          </Space>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, user) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => openEdit(user)}>
            Sửa
          </Button>
          <Popconfirm
            title={`Xoá ${kind} "${user.accountName}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(user)}
          >
            <Button type="text" danger size="small" aria-label={`Xoá ${kind}`}>
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
        title={`Danh sách ${kind}`}
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
              {`Thêm ${kind}`}
            </Button>
          </Space>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {isInvestor
            ? 'Tài khoản đăng nhập dành cho chủ đầu tư — cùng cấu trúc như nhân viên, phân biệt bằng loại tài khoản.'
            : 'Tài khoản đăng nhập của nhân viên nội bộ — gán nhóm để có quyền.'}
        </Text>
        <Table<AccountUser>
          columns={columns}
          dataSource={users}
          rowKey="id"
          size="small"
          loading={isLoading}
          locale={{ emptyText: `Chưa có ${kind} nào` }}
          pagination={{
            pageSize: PAGE_SIZE,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} ${kind}`,
            hideOnSinglePage: false,
          }}
        />
      </BodyCard>

      <Modal
        title={editing ? `Sửa ${kind}` : `Thêm ${kind}`}
        open={modalOpen}
        onCancel={() => {
          form.resetFields();
          setModalOpen(false);
        }}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        cancelText="Huỷ"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={860}
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        destroyOnClose
        zIndex={1200}
      >
        <Form<AccountFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          preserve={false}
        >
          <AccountFormFields
            isCreate={!editing}
            references={references}
            managers={users.filter((u) => !editing || u.id !== editing.id)}
            groups={groups}
          />
        </Form>
      </Modal>

      <UserImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        isInvestor={isInvestor}
      />
    </>
  );
}
