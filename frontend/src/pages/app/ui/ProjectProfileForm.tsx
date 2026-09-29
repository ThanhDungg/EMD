// pages/app/ui/ProjectProfileForm — sửa hồ sơ dự án (trang chi tiết).
// Dùng chung bộ field với modal thêm dự án (ProjectProfileFields) + nút Lưu.
import { Button, Form, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useUpdateSiteProfile } from '@/entities/site';
import type { SiteProfile } from '@/entities/site';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';
import { toNumberInput, toSitePayload } from '../model/project';
import type { ProjectFormValues } from '../model/project';
import { ProjectProfileFields } from './ProjectProfileFields';

export interface ProjectProfileFormProps {
  site: SiteProfile;
}

export function ProjectProfileForm({ site }: ProjectProfileFormProps) {
  const [form] = Form.useForm<ProjectFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const updateMutation = useUpdateSiteProfile();

  // Nạp dữ liệu hồ sơ vào form.
  useEffect(() => {
    form.setFieldsValue({
      code: site.code ?? undefined,
      name: site.name,
      lot: site.lot ?? undefined,
      stage: site.stage ?? undefined,
      countryId: site.countryId ?? undefined,
      regionId: site.regionId ?? undefined,
      provinceId: site.provinceId ?? undefined,
      wardId: site.wardId ?? undefined,
      address: site.address ?? undefined,
      geoPoints: site.geoPoints ?? undefined,
      investorId: site.investorId ?? undefined,
      floors: site.floors ?? undefined,
      serviceTypeId: site.serviceTypeId ?? undefined,
      serviceId: site.serviceId ?? undefined,
      landArea: toNumberInput(site.landArea),
      gfaArea: toNumberInput(site.gfaArea),
      glaArea: toNumberInput(site.glaArea),
      roadArea: toNumberInput(site.roadArea),
      leasedArea: toNumberInput(site.leasedArea),
      greenArea: toNumberInput(site.greenArea),
      occupancyRate: toNumberInput(site.occupancyRate),
      receivedAt: site.receivedAt ? dayjs(site.receivedAt) : null,
      operationStatus: site.operationStatus ?? undefined,
      rentalStatus: site.rentalStatus ?? undefined,
      managementStatus: site.managementStatus ?? undefined,
      notes: site.notes ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site]);

  async function handleSave() {
    const values = await form.validateFields();
    try {
      await updateMutation.mutateAsync({
        id: site.id,
        payload: toSitePayload(values),
      });
      messageApi.success('Đã lưu hồ sơ dự án.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu hồ sơ dự án thất bại.'));
    }
  }

  return (
    <BodyCard
      title="Hồ sơ dự án"
      style={{ marginBottom: 16 }}
      extra={
        <Button
          type="primary"
          loading={updateMutation.isPending}
          onClick={handleSave}
        >
          Lưu hồ sơ
        </Button>
      }
    >
      {contextHolder}
      <Form form={form} layout="vertical" requiredMark={false}>
        <ProjectProfileFields />
      </Form>
    </BodyCard>
  );
}
