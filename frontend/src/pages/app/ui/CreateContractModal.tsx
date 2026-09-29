// pages/app/ui/CreateContractModal — modal thêm hợp đồng: nhập thông tin
// hợp đồng + chọn nhiều dự án.
import { Form, Modal, Typography, message } from 'antd';
import { useCreateContract } from '@/entities/contract';
import type { Contract, ContractPayload } from '@/entities/contract';
import { apiErrorMessage } from '@/shared/lib';
import { toContractPayload } from '../model/contract';
import type { ContractFormValues } from '../model/contract';
import { ContractProfileFields } from './ContractProfileFields';

const { Text } = Typography;

export interface CreateContractModalProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (contract: Contract) => void;
}

export function CreateContractModal({
  open,
  onCancel,
  onCreated,
}: CreateContractModalProps) {
  const [form] = Form.useForm<ContractFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const createMutation = useCreateContract();

  async function handleOk() {
    let values: ContractFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      const created = await createMutation.mutateAsync(
        toContractPayload(values) as ContractPayload,
      );
      form.resetFields();
      onCreated(created);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Thêm hợp đồng thất bại.'));
    }
  }

  return (
    <Modal
      title="Thêm hợp đồng"
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
        Hợp đồng có thể thuộc nhiều dự án cùng lúc — chọn nhiều dự án ở ô “Dự
        án”. Đường dẫn tài liệu nhập tiếp ở trang chi tiết hợp đồng.
      </Text>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginTop: 12 }}
        initialValues={{ contractType: 'INPUT', termType: 'TERM' }}
      >
        <ContractProfileFields />
      </Form>
    </Modal>
  );
}
