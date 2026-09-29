// pages/app/ui/InvestorDetailPage — chi tiết chủ đầu tư (khai báo master data).
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Form, Result, Space, Spin, Typography, message } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInvestor, useUpdateInvestor } from '@/entities/investor';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';
import { toInvestorFormValues, toInvestorPayload } from '../model/investor';
import type { InvestorFormValues } from '../model/investor';
import { InvestorProfileFields } from './InvestorProfileFields';

const { Title, Text } = Typography;

export function InvestorDetailPage() {
  const { investorId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<InvestorFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const id = Number(investorId);
  const valid = Number.isInteger(id) && id > 0;
  const {
    data: investor,
    isLoading,
    isError,
    refetch,
  } = useInvestor(valid ? id : undefined);
  const updateMutation = useUpdateInvestor();

  // Nạp hồ sơ chủ đầu tư vào form.
  useEffect(() => {
    if (investor) form.setFieldsValue(toInvestorFormValues(investor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investor]);

  if (!valid) {
    return (
      <Result
        status="404"
        title="Không tìm thấy chủ đầu tư"
        subTitle="Đường dẫn không hợp lệ."
        extra={
          <Button type="primary" onClick={() => navigate('/app/investors')}>
            Về danh sách chủ đầu tư
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Không tải được hồ sơ chủ đầu tư"
        extra={
          <Space>
            <Button onClick={() => refetch()}>Thử lại</Button>
            <Button type="primary" onClick={() => navigate('/app/investors')}>
              Về danh sách chủ đầu tư
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
        payload: toInvestorPayload(values),
      });
      messageApi.success('Đã lưu thông tin chủ đầu tư.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu chủ đầu tư thất bại.'));
    }
  }

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/app/investors')}
        >
          Về danh sách
        </Button>
      </Space>

      {isLoading || !investor ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Đang tải hồ sơ chủ đầu tư…</Text>
          </div>
        </div>
      ) : (
        <BodyCard
          title="Thông tin chủ đầu tư"
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
            {investor.code ?? '—'} · {investor.name}
          </Title>
          <Form form={form} layout="vertical" requiredMark={false}>
            <InvestorProfileFields />
          </Form>
        </BodyCard>
      )}
    </>
  );
}
