// pages/app/ui/ChecklistTemplatePage — module Ứng dụng: nhập và quản lý MẪU
// CHECKLIST. Đây là nơi duy nhất để tạo mẫu; modal Tạo công việc chỉ chọn mẫu
// rồi nạp vào bảng (bảng đó không sửa được).
//
// Cấu trúc 3 cấp:
//   Danh mục (node gốc workId null)   VD: "Checklist A — Vệ sinh văn phòng"
//     └ Nội dung cha                  VD: "Khu vực làm việc chung"
//         └ Nội dung con              VD: "Lau bàn ghế"   ← chỉ nhập dữ liệu
// Nội dung con là lá, không có nội dung con nữa. Mỗi nội dung chỉ mang
// Tên · Tiêu chuẩn kiểm tra · Loại giá trị · Số lượng; các field thực thi
// (giá trị, trạng thái Đạt/Không đạt, ảnh, ghi chú) để rỗng, nhập lúc đi
// kiểm tra.
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  useChecklistTemplates,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useUpdateChecklistItem,
  downloadChecklistCategoryExport,
  downloadChecklistExport,
} from '@/entities/work';
import type { ChecklistTreeNode } from '@/entities/work';
import { apiErrorMessage, downloadBlob } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { ChecklistTemplateCategoryImportModal } from './ChecklistTemplateCategoryImportModal';
import type { ChecklistStepKind } from './ChecklistStepImportModal';
import { ChecklistStepImportModal } from './ChecklistStepImportModal';

const { Text } = Typography;

const VALUE_TYPE_OPTIONS = [
  { value: 'BOOLEAN', label: 'Đúng / Sai' },
  { value: 'TEXT', label: 'Chữ' },
  { value: 'NUMBER', label: 'Số' },
];

// Node có field `children` → antd mặc định tự dựng bảng cây, khiến nội dung
// con bị hiện ở bảng ngoài rồi hiện lần nữa trong hàng mở rộng. Đặt
// childrenColumnName thành tên không tồn tại trong data để nội dung con chỉ
// hiện đúng một chỗ: bên trong hàng cha đã mở.
const NO_TREE = { childrenColumnName: 'noChildrenColumn' };

const VALUE_TYPE_LABEL: Record<string, string> = {
  BOOLEAN: 'Đúng / Sai',
  TEXT: 'Chữ',
  NUMBER: 'Số',
};

interface CategoryFormValues {
  title: string;
  notes?: string;
}

interface ParentFormValues {
  title: string;
}

interface ChildFormValues {
  title: string;
  standard?: string;
  valueType?: string;
  quantity?: number;
}

export function ChecklistTemplatePage() {
  const [messageApi, contextHolder] = message.useMessage();

  // --- Danh mục ---
  const [categoryForm] = Form.useForm<CategoryFormValues>();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ChecklistTreeNode | null>(null);

  // Danh mục đang chọn (ô Select trong card nội dung)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  // --- Nội dung cha ---
  const [parentForm] = Form.useForm<ParentFormValues>();
  const [parentOpen, setParentOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ChecklistTreeNode | null>(
    null,
  );
  const [parentOwner, setParentOwner] = useState<ChecklistTreeNode | null>(
    null,
  );

  // --- Nội dung con ---
  const [childForm] = Form.useForm<ChildFormValues>();
  const [childOpen, setChildOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<ChecklistTreeNode | null>(
    null,
  );
  const [childOwner, setChildOwner] = useState<ChecklistTreeNode | null>(null);

  const { data: categories = [], isLoading } = useChecklistTemplates();
  const createMutation = useCreateChecklistItem();
  const updateMutation = useUpdateChecklistItem();
  const deleteMutation = useDeleteChecklistItem();
  const saving = createMutation.isPending || updateMutation.isPending;

  const [exporting, setExporting] = useState(false);

  // Nhập Excel 3 bước ở card Danh mục: B1 danh mục → B2 cha → B3 con.
  const [stepImport, setStepImport] =
    useState<ChecklistStepKind | null>(null);

  // Nhập/xuất Excel cả cha + con cho danh mục đang chọn (card Nội dung).
  const [categoryImportOpen, setCategoryImportOpen] = useState(false);
  const [exportingCategory, setExportingCategory] = useState(false);

  async function handleExportCategory() {
    if (categoryId === undefined) return;
    setExportingCategory(true);
    try {
      const blob = await downloadChecklistCategoryExport(categoryId);
      downloadBlob(blob, `danh-muc-checklist-${categoryId}.xlsx`);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xuất Excel thất bại.'));
    } finally {
      setExportingCategory(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await downloadChecklistExport();
      downloadBlob(blob, 'mau-checklist.xlsx');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xuất Excel thất bại.'));
    } finally {
      setExporting(false);
    }
  }

  const selected = categories.find((c) => c.id === categoryId) ?? null;

  // Mở màn thì chọn danh mục đầu tiên để khỏi trống.
  useEffect(() => {
    if (categoryId === undefined && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // ---------- Danh mục ----------

  function openCreateCategory() {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryOpen(true);
  }

  function openEditCategory(c: ChecklistTreeNode) {
    setEditingCategory(c);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({
      title: c.title,
      notes: c.notes ?? undefined,
    });
    setCategoryOpen(true);
  }

  async function handleSaveCategory() {
    let values: CategoryFormValues;
    try {
      values = await categoryForm.validateFields();
    } catch {
      return;
    }
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          payload: {
            title: values.title.trim(),
            notes: values.notes?.trim() || undefined,
          },
        });
        messageApi.success('Đã cập nhật danh mục.');
      } else {
        const created = await createMutation.mutateAsync({
          title: values.title.trim(),
          notes: values.notes?.trim() || undefined,
        });
        setCategoryId(created.id);
        messageApi.success(
          'Đã tạo danh mục. Thêm nội dung cho danh mục bên dưới.',
        );
      }
      setCategoryOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu danh mục thất bại.'));
    }
  }

  async function handleDeleteCategory(c: ChecklistTreeNode) {
    const parents = c.children?.length ?? 0;
    const children = (c.children ?? []).reduce(
      (sum, p) => sum + (p.children?.length ?? 0),
      0,
    );
    try {
      await deleteMutation.mutateAsync(c.id);
      setCategoryId(undefined);
      messageApi.success(
        parents > 0
          ? `Đã xoá danh mục kèm ${parents} nội dung cha và ${children} nội dung con.`
          : 'Đã xoá danh mục.',
      );
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá danh mục thất bại.'));
    }
  }

  // ---------- Nội dung cha ----------

  function openCreateParent(owner: ChecklistTreeNode) {
    setEditingParent(null);
    parentForm.resetFields();
    setParentOwner(owner);
    setParentOpen(true);
  }

  function openEditParent(p: ChecklistTreeNode) {
    setEditingParent(p);
    parentForm.resetFields();
    parentForm.setFieldsValue({ title: p.title });
    setParentOpen(true);
  }

  async function handleSaveParent() {
    if (!parentOwner) return;
    let values: ParentFormValues;
    try {
      values = await parentForm.validateFields();
    } catch {
      return;
    }
    try {
      if (editingParent) {
        await updateMutation.mutateAsync({
          id: editingParent.id,
          payload: { title: values.title.trim() },
        });
        messageApi.success('Đã cập nhật nội dung cha.');
      } else {
        await createMutation.mutateAsync({
          title: values.title.trim(),
          parentId: parentOwner.id,
          sortOrder: parentOwner.children?.length ?? 0,
        });
        messageApi.success('Đã thêm nội dung cha.');
      }
      setParentOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu nội dung cha thất bại.'));
    }
  }

  async function handleDeleteParent(p: ChecklistTreeNode) {
    const count = p.children?.length ?? 0;
    try {
      await deleteMutation.mutateAsync(p.id);
      messageApi.success(
        count > 0
          ? `Đã xoá kèm ${count} nội dung con.`
          : 'Đã xoá nội dung cha.',
      );
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá nội dung cha thất bại.'));
    }
  }

  // ---------- Nội dung con (chỉ nhập dữ liệu) ----------

  function openCreateChild(owner: ChecklistTreeNode) {
    setEditingChild(null);
    childForm.resetFields();
    // Mặc định Đúng/Sai — chọn lại loại nếu nội dung cần chữ/số.
    childForm.setFieldsValue({ valueType: 'BOOLEAN' });
    setChildOwner(owner);
    setChildOpen(true);
  }

  function openEditChild(c: ChecklistTreeNode) {
    setEditingChild(c);
    childForm.resetFields();
    childForm.setFieldsValue({
      title: c.title,
      standard: c.standard ?? undefined,
      valueType: (c.valueType as string) ?? undefined,
      quantity:
        c.quantity === null || c.quantity === undefined
          ? undefined
          : Number(c.quantity),
    });
    setChildOpen(true);
  }

  async function handleSaveChild() {
    if (!childOwner) return;
    let values: ChildFormValues;
    try {
      values = await childForm.validateFields();
    } catch {
      return;
    }
    const payload = {
      title: values.title.trim(),
      standard: values.standard?.trim() || undefined,
      valueType: values.valueType,
      quantity: values.quantity,
    };
    try {
      if (editingChild) {
        await updateMutation.mutateAsync({ id: editingChild.id, payload });
        messageApi.success('Đã cập nhật nội dung con.');
      } else {
        await createMutation.mutateAsync({
          ...payload,
          parentId: childOwner.id,
          sortOrder: childOwner.children?.length ?? 0,
        });
        messageApi.success('Đã thêm nội dung con.');
      }
      setChildOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu nội dung con thất bại.'));
    }
  }

  async function handleDeleteChild(c: ChecklistTreeNode) {
    try {
      await deleteMutation.mutateAsync(c.id);
      messageApi.success('Đã xoá nội dung con.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá nội dung con thất bại.'));
    }
  }

  // ---------- bảng nội dung con (nằm trong hàng nội dung cha) ----------
  const childColumns: ColumnsType<ChecklistTreeNode> = [
    {
      title: 'Tên nội dung',
      dataIndex: 'title',
      key: 'title',
      width: 260,
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Tiêu chuẩn kiểm tra',
      dataIndex: 'standard',
      key: 'standard',
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Loại giá trị',
      dataIndex: 'valueType',
      key: 'valueType',
      width: 150,
      render: (v: string | null) =>
        v ? (
          <Tag style={{ borderRadius: 3 }}>{VALUE_TYPE_LABEL[v] ?? v}</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      align: 'right',
      render: (v: string | number | null) =>
        v === null || v === undefined || v === ''
          ? '—'
          : Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, c) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label={`Sửa ${c.title}`}
            onClick={() => openEditChild(c)}
          />
          <Popconfirm
            title={`Xoá "${c.title}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDeleteChild(c)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá ${c.title}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ---------- bảng danh mục ----------
  const categoryColumns: ColumnsType<ChecklistTreeNode> = [
    {
      title: 'Tên danh mục',
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'notes',
      key: 'notes',
      width: 260,
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Số nội dung',
      key: 'count',
      width: 130,
      align: 'right',
      render: (_, c) => {
        const parents = c.children?.length ?? 0;
        const children = (c.children ?? []).reduce(
          (sum, p) => sum + (p.children?.length ?? 0),
          0,
        );
        return `${parents} cha / ${children} con`;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, c) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label={`Sửa danh mục ${c.title}`}
            onClick={() => openEditCategory(c)}
          />
          <Popconfirm
            title={`Xoá danh mục "${c.title}"?`}
            description="Toàn bộ nội dung cha và nội dung con bên trong cũng bị xoá."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDeleteCategory(c)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá danh mục ${c.title}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ---------- bảng nội dung cha (của danh mục đang chọn) ----------
  const parentColumns: ColumnsType<ChecklistTreeNode> = [
    {
      title: 'Nội dung cha',
      dataIndex: 'title',
      key: 'title',
      width: 260,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Số nội dung con',
      key: 'count',
      width: 130,
      align: 'right',
      render: (_, p) => p.children?.length ?? 0,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_, p) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => openCreateChild(p)}
          >
            Thêm nội dung con
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label={`Sửa nội dung cha ${p.title}`}
            onClick={() => openEditParent(p)}
          />
          <Popconfirm
            title={`Xoá "${p.title}"?`}
            description="Toàn bộ nội dung con của nhóm này cũng bị xoá."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDeleteParent(p)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá nội dung cha ${p.title}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      {/* Card 1 — Danh mục */}
      <BodyCard
        title="Danh mục mẫu checklist"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'categories',
                    label: 'B1 — Nhập danh mục',
                  },
                  {
                    key: 'parents',
                    label: 'B2 — Nhập nội dung cha',
                  },
                  {
                    key: 'children',
                    label: 'B3 — Nhập nội dung con',
                  },
                ],
                onClick: ({ key }) =>
                  setStepImport(key as ChecklistStepKind),
              }}
            >
              <Button size="small" icon={<CloudUploadOutlined />}>
                Nhập Excel <DownOutlined />
              </Button>
            </Dropdown>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={handleExport}
            >
              Xuất Excel
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={openCreateCategory}
            >
              Thêm danh mục
            </Button>
          </Space>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Mẫu là bộ tiêu chí dùng sẵn cho công việc loại Checklist. Nhập hàng
          loạt từ file theo 3 bước: B1 nhập hết danh mục → B2 nhập nội dung cha
          của các danh mục → B3 nhập nội dung con của các nội dung cha.
        </Text>
        <Table<ChecklistTreeNode>
          columns={categoryColumns}
          dataSource={categories}
          rowKey="id"
          size="small"
          loading={isLoading}
          pagination={false}
          {...NO_TREE}
          locale={{ emptyText: 'Chưa có danh mục nào — bấm “Thêm danh mục”' }}
          rowClassName={(c) =>
            c.id === categoryId ? 'ant-table-row-selected' : ''
          }
          onRow={(c) => ({
            onClick: () => setCategoryId(c.id),
            style: { cursor: 'pointer' },
          })}
        />
      </BodyCard>

      {/* Card 2 — Nội dung của danh mục đang chọn */}
      {selected && (
        <BodyCard
          title={`Nội dung — ${selected.title}`}
          extra={
            <Space>
              <Select
                style={{ width: 240 }}
                placeholder="Chọn danh mục"
                value={categoryId}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.title,
                }))}
                onChange={setCategoryId}
              />
              <Button
                size="small"
                icon={<CloudUploadOutlined />}
                onClick={() => setCategoryImportOpen(true)}
              >
                Nhập Excel
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={exportingCategory}
                onClick={handleExportCategory}
              >
                Xuất Excel
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => openCreateParent(selected)}
              >
                Thêm nội dung cha
              </Button>
            </Space>
          }
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Bấm mũi tên ▸ ở nội dung cha để xem các nội dung con — hoặc bấm
            “Nhập Excel” để nhập cả nội dung cha lẫn con từ file.
          </Text>
          <Table<ChecklistTreeNode>
            columns={parentColumns}
            dataSource={selected.children ?? []}
            rowKey="id"
            size="small"
            pagination={false}
            {...NO_TREE}
            locale={{
              emptyText: 'Chưa có nội dung cha — bấm “Thêm nội dung cha”',
            }}
            expandable={{
              expandedRowRender: (p) => (
                <Table<ChecklistTreeNode>
                  columns={childColumns}
                  dataSource={p.children ?? []}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  locale={{ emptyText: 'Chưa có nội dung con' }}
                  {...NO_TREE}
                />
              ),
            }}
          />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              Mỗi nội dung mang sẵn <strong>Tên</strong>,{' '}
              <strong>Tiêu chuẩn kiểm tra</strong>,{' '}
              <strong>Loại giá trị</strong> và <strong>Số lượng</strong>. Khi
              nạp vào công việc, các cột còn lại (Giá trị · Đính kèm ·
              Checkpoint · Trạng thái Đạt/Không đạt · Ghi chú) để rỗng — nhập
              lúc đi kiểm tra.
            </Text>
          </div>
        </BodyCard>
      )}

      {/* --- Modal nhập liệu --- */}

      <Modal
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
        open={categoryOpen}
        onCancel={() => setCategoryOpen(false)}
        onOk={handleSaveCategory}
        okText={editingCategory ? 'Lưu' : 'Thêm'}
        confirmLoading={saving}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={categoryForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Tên danh mục"
            name="title"
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục.' }]}
          >
            <Input placeholder="VD: Checklist A — Vệ sinh văn phòng" />
          </Form.Item>
          <Form.Item label="Mô tả" name="notes">
            <Input.TextArea
              rows={2}
              placeholder="Danh mục dùng cho việc gì, tần suất ra sao..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          editingParent
            ? 'Sửa nội dung cha'
            : `Thêm nội dung cha — ${parentOwner?.title ?? ''}`
        }
        open={parentOpen}
        onCancel={() => setParentOpen(false)}
        onOk={handleSaveParent}
        okText={editingParent ? 'Lưu' : 'Thêm'}
        confirmLoading={saving}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={parentForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Tên nội dung cha"
            name="title"
            rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
            extra="Nhóm nội dung, khi nạp vào công việc chỉ hiện tiêu đề; các
                    tiêu chuẩn nằm ở nội dung con bên dưới."
          >
            <Input placeholder="VD: Khu vực làm việc chung" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          editingChild
            ? 'Sửa nội dung con'
            : `Thêm nội dung con — ${childOwner?.title ?? ''}`
        }
        open={childOpen}
        onCancel={() => setChildOpen(false)}
        onOk={handleSaveChild}
        okText={editingChild ? 'Lưu' : 'Thêm'}
        confirmLoading={saving}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={childForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Tên nội dung con"
            name="title"
            rules={[{ required: true, message: 'Vui lòng nhập tên nội dung.' }]}
          >
            <Input placeholder="VD: Lau bàn ghế" />
          </Form.Item>
          <Form.Item label="Tiêu chuẩn kiểm tra" name="standard">
            <Input placeholder="VD: Mặt bàn ghế không bụi bẩn, sắp xếp gọn gàng" />
          </Form.Item>
          <Form.Item
            label="Loại giá trị"
            name="valueType"
            help="Quyết định kiểu dữ liệu của cột Giá trị khi đi kiểm tra"
          >
            <Select
              allowClear
              placeholder="Chọn loại giá trị"
              options={VALUE_TYPE_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            label="Số lượng"
            name="quantity"
            rules={[
              {
                validator: (_, v) =>
                  v === undefined || v === null || v === '' || Number(v) >= 0
                    ? Promise.resolve()
                    : Promise.reject(new Error('Số lượng không được âm.')),
              },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <ChecklistStepImportModal
        step={stepImport}
        onClose={() => setStepImport(null)}
      />

      <ChecklistTemplateCategoryImportModal
        category={categoryImportOpen ? selected : null}
        onClose={() => setCategoryImportOpen(false)}
      />
    </>
  );
}
