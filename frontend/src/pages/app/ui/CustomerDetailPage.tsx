// pages/app/ui/CustomerDetailPage — chi tiết khách hàng (danh mục kiểm tra năng
// lượng): hồ sơ lưới 2 cột title: nội dung + ô chọn nhiều dự án.
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Result, Space, Spin, Typography, message } from 'antd';
import { useEffect } from 'react';
import { Form } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomer, useUpdateCustomer } from '@/entities/customer';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';
import { toCustomerFormValues, toCustomerPayload } from '../model/customer';
import type { CustomerFormValues } from '../model/customer';
import { CustomerProfileFields } from './CustomerProfileFields';

const { Title, Text } = Typography;

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<CustomerFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const id = Number(customerId);
  const valid = Number.isInteger(id) && id > 0;
  const { data: customer, isLoading, isError, refetch } = useCustomer(
    valid ? id : undefined,
  );
  const updateMutation = useUpdateCustomer();

  // Nạp hồ sơ khách hàng vào form (kể cả danh sách id dự án).
  useEffect(() => {
    if (customer) form.setFieldsValue(toCustomerFormValues(customer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  if (!valid) {
    return (
      <Result
        status="404"
        title="Không tìm thấy khách hàng"
        subTitle="Đường dẫn không hợp lệ."
        extra={
          <Button
            type="primary"
            onClick={() => navigate('/app/customers')}
          >
            Về danh sách khách hàng
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Không tải được hồ sơ khách hàng"
        extra={
          <Space>
            <Button onClick={() => refetch()}>Thử lại</Button>
            <Button
              type="primary"
              onClick={() => navigate('/app/customers')}
            >
              Về danh sách khách hàng
            </Button>
          </Space>
        }
      />
    );
  }

  async function handleSave() {
    const values = await form.validateFields();
    try {
      await updateMutation.mutateAsync({
        id,
        payload: toCustomerPayload(values),
      });
      messageApi.success('Đã lưu thông tin khách hàng.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu khách hàng thất bại.'));
    }
  }

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/app/customers')}
        >
          Về danh sách
        </Button>
      </Space>

      {isLoading || !customer ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Đang tải hồ sơ khách hàng…</Text>
          </div>
        </div>
      ) : (
        <BodyCard
          title="Thông tin khách hàng"
          extra={
            <Button
              type="primary"
              loading={updateMutation.isPending}
              onClick={handleSave}
            >
              Lưu thông tin
            </Button>
          }
        >
          <Title level={4} style={{ marginTop: 0 }}>
            {customer.code} · {customer.name}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Khách hàng đang ở {customer.siteLinks.length} dự án.
          </Text>
          <Form form={form} layout="vertical" requiredMark={false}>
            <CustomerProfileFields />
          </Form>
        </BodyCard>
      )}
    </>
  );
}
