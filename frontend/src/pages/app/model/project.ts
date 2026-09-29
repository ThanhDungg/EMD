// pages/app/model/project — chuẩn hoá form hồ sơ dự án sang payload API
// (dùng chung cho sửa hồ sơ và thêm mới dự án).
import type { SitePayload } from '@/entities/site';

const DATE_FORMAT = 'YYYY-MM-DD';

/** Giá trị của các field hồ sơ trong form (số/ngày do dayjs giữ). */
export interface ProjectFormValues {
  code?: string;
  name?: string;
  lot?: string;
  stage?: string;
  countryId?: number;
  regionId?: number;
  provinceId?: number;
  wardId?: number;
  address?: string;
  geoPoints?: string;
  investorId?: number;
  floors?: number;
  serviceTypeId?: number;
  serviceId?: number;
  landArea?: number;
  gfaArea?: number;
  glaArea?: number;
  roadArea?: number;
  leasedArea?: number;
  greenArea?: number;
  occupancyRate?: number;
  receivedAt?: { format: (f: string) => string } | null;
  operationStatus?: SitePayload['operationStatus'];
  rentalStatus?: SitePayload['rentalStatus'];
  managementStatus?: SitePayload['managementStatus'];
  notes?: string;
}

function trim(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/** Chuẩn hoá values của form thành payload create/update site. */
export function toSitePayload(values: ProjectFormValues): SitePayload {
  return {
    code: trim(values.code),
    name: trim(values.name) ?? '',
    lot: trim(values.lot),
    stage: trim(values.stage),
    countryId: values.countryId ?? null,
    regionId: values.regionId ?? null,
    provinceId: values.provinceId ?? null,
    wardId: values.wardId ?? null,
    address: trim(values.address),
    geoPoints: trim(values.geoPoints),
    investorId: values.investorId ?? null,
    floors: values.floors ?? null,
    serviceTypeId: values.serviceTypeId ?? null,
    serviceId: values.serviceId ?? null,
    landArea: values.landArea ?? null,
    gfaArea: values.gfaArea ?? null,
    glaArea: values.glaArea ?? null,
    roadArea: values.roadArea ?? null,
    leasedArea: values.leasedArea ?? null,
    greenArea: values.greenArea ?? null,
    occupancyRate: values.occupancyRate ?? null,
    receivedAt: values.receivedAt?.format(DATE_FORMAT),
    operationStatus: values.operationStatus ?? null,
    rentalStatus: values.rentalStatus ?? null,
    managementStatus: values.managementStatus ?? null,
    notes: trim(values.notes),
  };
}

/** Đổi số/string của API (Decimal) về number cho form. */
export function toNumberInput(
  v: string | number | null | undefined,
): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
