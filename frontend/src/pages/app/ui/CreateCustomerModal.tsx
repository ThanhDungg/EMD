// pages/app/ui/CreateCustomerModal — modal thêm khách hàng (danh mục kiểm tra
// năng lượng): nhập thông tin khách hàng + chọn nhiều dự án.
import { Form, Modal, Typography, message } from 'antd';
import { useCreateCustomer } from '@/entities/customer';
import type { Customer } from '@/entities/customer';
import { apiErrorMessage } from '@/shared/lib';
import { toCustomerPayload } from '../model/customer';
import type { CustomerFormValues } from '../model/customer';
import { CustomerProfileFields } from './CustomerProfileFields';

const { Text } = Typography;

export interface CreateCustomerModalProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (customer: Customer) => void;
}

export function CreateCustomerModal({
  open,
  onCancel,
  onCreated,
}: CreateCustomerModalProps) {
  const [form] = Form.useForm<CustomerFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const createMutation = useCreateCustomer();

  async function handleOk() {
    let values: CustomerFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      const created = await createMutation.mutateAsync(
        toCustomerPayload(values) as Parameters<typeof createMutation.mutateAsync>[0],
      );
      form.resetFields();
      onCreated(created);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Thêm khách hàng thất bại.'));
    }
  }

  return (
    <Modal
      title="Thêm khách hàng"
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
        Khách hàng có thể thuộc nhiều dự án cùng lúc — chọn nhiều dự án ở ô
        “Dự án”.
      </Text>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginTop: 12 }}
      >
        <CustomerProfileFields />
      </Form>
    </Modal>
  );
}
