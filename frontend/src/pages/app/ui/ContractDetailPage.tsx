// pages/app/ui/ContractDetailPage — chi tiết hợp đồng: hồ sơ lưới 2 cột
// title: nội dung + bảng đường dẫn tài liệu bên dưới.
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Form, Result, Space, Spin, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContract, useUpdateContract } from '@/entities/contract';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';
import { toContractPayload } from '../model/contract';
import type { ContractFormValues } from '../model/contract';
import { ContractDocumentTable } from './ContractDocumentTable';
import { ContractProfileFields } from './ContractProfileFields';

const { Title, Text } = Typography;

export function ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<ContractFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const id = Number(contractId);
  const valid = Number.isInteger(id) && id > 0;
  const {
    data: contract,
    isLoading,
    isError,
    refetch,
  } = useContract(valid ? id : undefined);
  const updateMutation = useUpdateContract();

  // Nạp hồ sơ hợp đồng vào form.
  useEffect(() => {
    if (!contract) return;
    form.setFieldsValue({
      code: contract.code,
      companyName: contract.companyName,
      typeName: contract.typeName,
      contractType: contract.contractType,
      serviceTypeId: contract.serviceTypeId ?? undefined,
      startDate: contract.startDate ? dayjs(contract.startDate) : null,
      endDate: contract.endDate ? dayjs(contract.endDate) : null,
      termType: contract.termType,
      notes: contract.notes ?? undefined,
      siteIds: contract.siteLinks.map((l) => l.siteId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  if (!valid) {
    return (
      <Result
        status="404"
        title="Không tìm thấy hợp đồng"
        subTitle="Đường dẫn không hợp lệ."
        extra={
          <Button type="primary" onClick={() => navigate('/app/contracts')}>
            Về danh sách hợp đồng
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Không tải được hồ sơ hợp đồng"
        extra={
          <Space>
            <Button onClick={() => refetch()}>Thử lại</Button>
            <Button type="primary" onClick={() => navigate('/app/contracts')}>
              Về danh sách hợp đồng
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
        payload: toContractPayload(values),
      });
      messageApi.success('Đã lưu thông tin hợp đồng.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu hợp đồng thất bại.'));
    }
  }

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/app/contracts')}
        >
          Về danh sách
        </Button>
      </Space>

      {isLoading || !contract ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Đang tải hồ sơ hợp đồng…</Text>
          </div>
        </div>
      ) : (
        <>
          <BodyCard
            title="Thông tin hợp đồng"
            style={{ marginBottom: 16 }}
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
              {contract.code} · {contract.companyName}
            </Title>
            <Text
              type="secondary"
              style={{ display: 'block', marginBottom: 12 }}
            >
              Hợp đồng thuộc {contract.siteLinks.length} dự án ·{' '}
              {contract.documents.length} đường dẫn tài liệu.
            </Text>
            <Form form={form} layout="vertical" requiredMark={false}>
              <ContractProfileFields />
            </Form>
          </BodyCard>

          <ContractDocumentTable
            contractId={contract.id}
            documents={contract.documents}
          />
        </>
      )}
    </>
  );
}
