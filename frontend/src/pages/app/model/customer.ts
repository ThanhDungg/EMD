// pages/app/model/customer — chuẩn hoá form khách hàng sang payload API
// (dùng chung cho modal thêm khách hàng và form sửa chi tiết).
import type { Customer, CustomerPayload, CustomerStatus } from '@/entities/customer';

export interface CustomerFormValues {
  code?: string;
  name?: string;
  shortName?: string;
  taxCode?: string;
  countryId?: number;
  provinceId?: number;
  wardId?: number;
  address?: string;
  hotline?: string;
  email?: string;
  status?: CustomerStatus;
  factoryId?: number;
  notes?: string;
  /** Chọn nhiều dự án — backend tách ra lưu bảng nối customer_sites. */
  siteIds?: number[];
}

function trim(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/** Chuẩn hoá values của form thành payload create/update khách hàng. */
export function toCustomerPayload(
  values: CustomerFormValues,
): Partial<CustomerPayload> {
  return {
    code: trim(values.code),
    name: trim(values.name) ?? '',
    shortName: trim(values.shortName),
    taxCode: trim(values.taxCode),
    countryId: values.countryId ?? null,
    provinceId: values.provinceId ?? null,
    wardId: values.wardId ?? null,
    address: trim(values.address),
    hotline: trim(values.hotline),
    email: trim(values.email),
    status: values.status ?? 'ACTIVE',
    factoryId: values.factoryId ?? null,
    notes: trim(values.notes),
    siteIds: values.siteIds ?? [],
  };
}

/** Nạp hồ sơ khách hàng vào form (id dự án từ siteLinks). */
export function toCustomerFormValues(customer: Customer): CustomerFormValues {
  return {
    code: customer.code,
    name: customer.name,
    shortName: customer.shortName ?? undefined,
    taxCode: customer.taxCode ?? undefined,
    countryId: customer.countryId ?? undefined,
    provinceId: customer.provinceId ?? undefined,
    wardId: customer.wardId ?? undefined,
    address: customer.address ?? undefined,
    hotline: customer.hotline ?? undefined,
    email: customer.email ?? undefined,
    status: customer.status,
    factoryId: customer.factoryId ?? undefined,
    notes: customer.notes ?? undefined,
    siteIds: customer.siteLinks.map((l) => l.siteId),
  };
}
