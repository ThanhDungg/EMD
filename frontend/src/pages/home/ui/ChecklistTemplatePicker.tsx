// pages/home/ui/ChecklistTemplatePicker — dialog chọn mẫu checklist trong
// modal Tạo công việc (mở bằng nút + ở khối Danh sách tiêu chí).
// Mẫu chỉ có 2 cấp (cha = danh mục mẫu, con = nội dung) nên chỉ cần chọn
// danh mục mẫu rồi nạp toàn bộ nội dung con. Mẫu được tạo ở module
// Ứng dụng → Mẫu checklist; dialog này không sửa / thêm / lưu mẫu.
import { Button, Modal, Select, TreeSelect, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { normalizeValueType, useChecklistTemplates } from '@/entities/work';
import type { ChecklistTreeNode, ChecklistValueType } from '@/entities/work';

const { Text } = Typography;

// 1 dòng nạp vào bảng tạo việc (key là id mẫu dạng string, parentKey tự map
// sang uid draft khi append).
export interface TemplateChecklistItem {
  key: string;
  name: string;
  standard?: string;
  valueType?: ChecklistValueType;
  parentKey?: string | null;
}

export interface ChecklistTemplatePickerProps {
  open: boolean;
  onClose: () => void;
  // Nạp các dòng đã chọn vào bảng
  onAppend: (items: TemplateChecklistItem[]) => void;
}

// Gom các nội dung cha được tick + toàn bộ nội dung con của chúng, theo thứ
// tự cha → con. Chỉ copy field cấu trúc của mẫu (tên, tiêu chuẩn kiểm tra,
// loại giá trị); các field thực thi (số lượng, giá trị, trạng thái Đạt/Không
// đạt, ảnh, ghi chú) để rỗng, nhập lúc đi kiểm tra.
function collectContents(
  root: ChecklistTreeNode,
  checkedParents: Set<string>,
): TemplateChecklistItem[] {
  const out: TemplateChecklistItem[] = [];
  const emit = (node: ChecklistTreeNode, parentKey: string | null): void => {
    out.push({
      key: String(node.id),
      name: node.title,
      standard: node.standard?.trim() || undefined,
      valueType: normalizeValueType(node.valueType) ?? undefined,
      parentKey,
    });
    for (const c of node.children ?? []) emit(c, String(node.id));
  };
  for (const parent of root.children ?? []) {
    if (checkedParents.has(String(parent.id))) emit(parent, null);
  }
  return out;
}

export function ChecklistTemplatePicker({
  open,
  onClose,
  onAppend,
}: ChecklistTemplatePickerProps) {
  const { data: templates = [], isLoading } = useChecklistTemplates(open);
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTemplateId(undefined);
      setCheckedKeys([]);
    }
  }, [open]);

  const picked = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );
  // Cây chỉ show cấp nội dung cha (bỏ danh mục gốc, không show con)
  const parentTree = (picked?.children ?? []).map((p) => ({
    title: p.title,
    value: String(p.id),
    key: String(p.id),
  }));
  // Số dòng sẽ nạp = nhóm được tick + toàn bộ con của chúng
  const previewCount = useMemo(
    () => (picked ? collectContents(picked, new Set(checkedKeys)).length : 0),
    [picked, checkedKeys],
  );

  function handlePickTemplate(v: number | undefined) {
    setTemplateId(v);
    // Auto chọn hết nội dung cha của danh mục vừa chọn
    const root = templates.find((t) => t.id === v) ?? null;
    setCheckedKeys((root?.children ?? []).map((p) => String(p.id)));
  }

  function handleAppend() {
    if (!picked || previewCount === 0) return;
    onAppend(collectContents(picked, new Set(checkedKeys)));
    onClose();
  }

  return (
    <Modal
      title="Chọn mẫu checklist"
      open={open}
      onCancel={onClose}
      centered
      width={560}
      destroyOnClose
      zIndex={1250}
      aria-label="Chọn mẫu checklist"
      footer={[
        <Button
          key="append"
          type="primary"
          disabled={!picked || previewCount === 0}
          onClick={handleAppend}
        >
          Thêm vào bảng
          {previewCount > 0 ? ` (${previewCount} dòng)` : ''}
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Danh mục mẫu</div>
        <Select<number>
          showSearch
          allowClear
          placeholder="Chọn danh mục mẫu (VD: Checklist A)"
          loading={isLoading}
          value={templateId}
          optionFilterProp="label"
          style={{ width: '100%' }}
          options={templates.map((t) => ({
            value: t.id,
            label: t.title,
            // Danh mục chưa có nội dung cha thì không cho chọn
            disabled: (t.children?.length ?? 0) === 0,
          }))}
          onChange={handlePickTemplate}
        />
        {!isLoading && templates.length === 0 && (
          <Text type="secondary">
            Chưa có mẫu nào — tạo mẫu ở module{' '}
            <strong>Ứng dụng → Mẫu checklist</strong> rồi quay lại đây chọn.
          </Text>
        )}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Nội dung cha</div>
        <TreeSelect
          treeCheckable
          allowClear
          disabled={!picked}
          placeholder={
            picked
              ? 'Bỏ tick nội dung cha nào thì bỏ luôn cả nội dung con'
              : 'Chọn danh mục mẫu trước'
          }
          value={checkedKeys}
          treeData={parentTree}
          style={{ width: '100%' }}
          maxTagCount="responsive"
          onChange={(v) => setCheckedKeys(v as string[])}
        />
        {picked && (picked.children?.length ?? 0) === 0 && (
          <Text type="secondary">
            Danh mục này chưa có nội dung cha, hãy thêm ở module Ứng dụng.
          </Text>
        )}
      </div>
      <Text type="secondary">
        Mẫu mang sẵn <strong>Tên</strong>, <strong>Tiêu chuẩn kiểm tra</strong>{' '}
        và <strong>Loại giá trị</strong> (Đúng/Sai · Chữ · Số) — Loại giá trị
        quyết định kiểu dữ liệu của cột Giá trị. Số lượng, Giá trị, Đính kèm,
        Checkpoint, Trạng thái Đạt/Không đạt và Ghi chú để rỗng, nhập lúc đi
        kiểm tra.
      </Text>
    </Modal>
  );
}
