// pages/app/ui/ContractDocumentTable — bảng đường dẫn tài liệu của hợp đồng.
// Cột: STT · Tên tài liệu · Đường dẫn tài liệu (sau khi lưu hiển thị bằng
// thẻ <a> có title "Link"; khi sửa nhập lại đúng url gốc) · Thao tác.
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import {
  useCreateContractDocument,
  useDeleteContractDocument,
  useUpdateContractDocument,
} from '@/entities/contract';
import type { ContractDocument } from '@/entities/contract';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';

const { Text } = Typography;

interface DocumentFormValues {
  name?: string;
  path?: string;
}

export interface ContractDocumentTableProps {
  contractId: number;
  documents: ContractDocument[];
}

export function ContractDocumentTable({
  contractId,
  documents,
}: ContractDocumentTableProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContractDocument | null>(null);
  const [form] = Form.useForm<DocumentFormValues>();
  const createMutation = useCreateContractDocument(contractId);
  const updateMutation = useUpdateContractDocument();
  const deleteMutation = useDeleteContractDocument();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(doc: ContractDocument) {
    setEditing(doc);
    // Sửa thì nhập lại đúng url gốc, không phải nhãn Link.
    form.resetFields();
    form.setFieldsValue({ name: doc.name, path: doc.path });
    setOpen(true);
  }

  async function handleSubmit() {
    let values: DocumentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      name: values.name?.trim() ?? '',
      path: values.path?.trim() ?? '',
      ...(editing ? {} : { sortOrder: documents.length + 1 }),
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success('Đã cập nhật đường dẫn tài liệu.');
      } else {
        await createMutation.mutateAsync(payload);
        messageApi.success('Đã thêm đường dẫn tài liệu.');
      }
      setOpen(false);
    } catch (err) {
      messageApi.error(
        apiErrorMessage(err, 'Lưu đường dẫn tài liệu thất bại.'),
      );
    }
  }

  async function handleDelete(doc: ContractDocument) {
    try {
      await deleteMutation.mutateAsync(doc.id);
      messageApi.success('Đã xoá đường dẫn tài liệu.');
    } catch (err) {
      messageApi.error(
        apiErrorMessage(err, 'Xoá đường dẫn tài liệu thất bại.'),
      );
    }
  }

  const columns: ColumnsType<ContractDocument> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'right',
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: 'Tên tài liệu',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Đường dẫn tài liệu',
      dataIndex: 'path',
      key: 'path',
      render: (v: string) => (
        <a href={v} target="_blank" rel="noreferrer noopener" title="Link">
          Link
        </a>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, doc) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label="Sửa đường dẫn"
            onClick={() => openEdit(doc)}
          />
          <Popconfirm
            title={`Xoá "${doc.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(doc)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xoá đường dẫn"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title="Đường dẫn tài liệu"
      extra={
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
        >
          Thêm
        </Button>
      }
    >
      {contextHolder}
      <Table<ContractDocument>
        columns={columns}
        dataSource={documents}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: 'Chưa có đường dẫn tài liệu' }}
      />

      <Modal
        title={editing ? 'Sửa đường dẫn tài liệu' : 'Thêm đường dẫn tài liệu'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Tên tài liệu"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên tài liệu.' }]}
          >
            <Input placeholder="VD: Hợp đồng ký 2026" />
          </Form.Item>
          <Form.Item
            label="Đường dẫn tài liệu"
            name="path"
            extra="Nhập url gốc (VD: https://... hoặc /uploads/2026/01/hop-dong.pdf). Bảng sẽ hiển thị bằng thẻ “Link”."
            rules={[
              { required: true, message: 'Vui lòng nhập đường dẫn tài liệu.' },
            ]}
          >
            <Input placeholder="https://example.com/hop-dong-2026.pdf" />
          </Form.Item>
        </Form>
      </Modal>
    </BodyCard>
  );
}
