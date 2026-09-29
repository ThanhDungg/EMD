// pages/app/ui/CreateProjectModal — modal thêm dự án: nhập ngay toàn bộ thông
// tin cơ bản của dự án (trừ 5 bảng thông tin bên dưới, thêm sau ở trang chi tiết).
import { Form, Modal, Typography, message } from 'antd';
import { useCreateSite } from '@/entities/site';
import type { SiteProfile } from '@/entities/site';
import { apiErrorMessage } from '@/shared/lib';
import { toSitePayload } from '../model/project';
import type { ProjectFormValues } from '../model/project';
import { ProjectProfileFields } from './ProjectProfileFields';

const { Text } = Typography;

export interface CreateProjectModalProps {
  open: boolean;
  onCancel: () => void;
  /** Tạo xong → trả site mới (dùng mở trang chi tiết). */
  onCreated: (site: SiteProfile) => void;
}

export function CreateProjectModal({
  open,
  onCancel,
  onCreated,
}: CreateProjectModalProps) {
  const [form] = Form.useForm<ProjectFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const createMutation = useCreateSite();

  async function handleOk() {
    let values: ProjectFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      const created = await createMutation.mutateAsync(toSitePayload(values));
      form.resetFields();
      onCreated(created);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Thêm dự án thất bại.'));
    }
  }

  return (
    <Modal
      title="Thêm dự án"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      okText="Thêm"
      cancelText="Huỷ"
      confirmLoading={createMutation.isPending}
      width={1000}
      styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
      destroyOnClose
      zIndex={1200}
    >
      {contextHolder}
      <Text type="secondary">
        Nhập thông tin dự án. Các bảng thông tin chi tiết (nhân viên, nhà cung
        cấp, nhà thầu, đối tác, Unit) sẽ nhập tiếp ở trang chi tiết dự án.
      </Text>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginTop: 12 }}
      >
        <ProjectProfileFields />
      </Form>
    </Modal>
  );
}
