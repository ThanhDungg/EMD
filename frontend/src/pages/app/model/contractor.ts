// pages/app/model/contractor — chuẩn hoá form nhà thầu sang payload API.
import type { Contractor, ContractorPayload, ContractorStatus } from '@/entities/contractor';

export interface ContractorFormValues {
  code?: string;
  name?: string;
  contractorTypeId?: number;
  serviceId?: number;
  taxCode?: string;
  hotline?: string;
  countryId?: number;
  provinceId?: number;
  wardId?: number;
  address?: string;
  email?: string;
  status?: ContractorStatus;
  notes?: string;
}

function trim(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export function toContractorPayload(
  values: ContractorFormValues,
): Partial<ContractorPayload> {
  return {
    code: trim(values.code),
    name: trim(values.name) ?? '',
    contractorTypeId: values.contractorTypeId ?? null,
    serviceId: values.serviceId ?? null,
    taxCode: trim(values.taxCode),
    hotline: trim(values.hotline),
    countryId: values.countryId ?? null,
    provinceId: values.provinceId ?? null,
    wardId: values.wardId ?? null,
    address: trim(values.address),
    email: trim(values.email),
    status: values.status ?? 'ACTIVE',
    notes: trim(values.notes),
  };
}

export function toContractorFormValues(
  contractor: Contractor,
): ContractorFormValues {
  return {
    code: contractor.code ?? undefined,
    name: contractor.name,
    contractorTypeId: contractor.contractorTypeId ?? undefined,
    serviceId: contractor.serviceId ?? undefined,
    taxCode: contractor.taxCode ?? undefined,
    hotline: contractor.hotline ?? undefined,
    countryId: contractor.countryId ?? undefined,
    provinceId: contractor.provinceId ?? undefined,
    wardId: contractor.wardId ?? undefined,
    address: contractor.address ?? undefined,
    email: contractor.email ?? undefined,
    status: contractor.status,
    notes: contractor.notes ?? undefined,
  };
}
