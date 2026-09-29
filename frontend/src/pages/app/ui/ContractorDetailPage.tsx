// pages/app/ui/ContractorDetailPage — chi tiết nhà thầu (khai báo master data).
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Form, Result, Space, Spin, Typography, message } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContractor, useUpdateContractor } from '@/entities/contractor';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';
import { toContractorFormValues, toContractorPayload } from '../model/contractor';
import type { ContractorFormValues } from '../model/contractor';
import { ContractorProfileFields } from './ContractorProfileFields';

const { Title, Text } = Typography;

export function ContractorDetailPage() {
  const { contractorId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<ContractorFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const id = Number(contractorId);
  const valid = Number.isInteger(id) && id > 0;
  const { data: contractor, isLoading, isError, refetch } = useContractor(
    valid ? id : undefined,
  );
  const updateMutation = useUpdateContractor();

  useEffect(() => {
    if (contractor) form.setFieldsValue(toContractorFormValues(contractor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractor]);

  if (!valid) {
    return (
      <Result
        status="404"
        title="Không tìm thấy nhà thầu"
        subTitle="Đường dẫn không hợp lệ."
        extra={
          <Button type="primary" onClick={() => navigate('/app/contractors')}>
            Về danh sách nhà thầu
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Không tải được hồ sơ nhà thầu"
        extra={
          <Space>
            <Button onClick={() => refetch()}>Thử lại</Button>
            <Button
              type="primary"
              onClick={() => navigate('/app/contractors')}
            >
              Về danh sách nhà thầu
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
        payload: toContractorPayload(values),
      });
      messageApi.success('Đã lưu thông tin nhà thầu.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu nhà thầu thất bại.'));
    }
  }

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/app/contractors')}
        >
          Về danh sách
        </Button>
      </Space>

      {isLoading || !contractor ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Đang tải hồ sơ nhà thầu…</Text>
          </div>
        </div>
      ) : (
        <BodyCard
          title="Thông tin nhà thầu"
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
            {contractor.code ?? '—'} · {contractor.name}
          </Title>
          <Form form={form} layout="vertical" requiredMark={false}>
            <ContractorProfileFields />
          </Form>
        </BodyCard>
      )}
    </>
  );
}
