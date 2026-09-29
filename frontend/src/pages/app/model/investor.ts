// pages/app/model/investor — chuẩn hoá form chủ đầu tư sang payload API.
import type { Investor, InvestorPayload } from '@/entities/investor';

export interface InvestorFormValues {
  code?: string;
  name?: string;
  investorGroupId?: number;
  taxCode?: string;
  legalRepresentative?: string;
  countryId?: number;
  provinceId?: number;
  wardId?: number;
  address?: string;
  email?: string;
  hotline?: string;
  notes?: string;
}

function trim(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/** Chuẩn hoá values của form thành payload create/update chủ đầu tư. */
export function toInvestorPayload(
  values: InvestorFormValues,
): Partial<InvestorPayload> {
  return {
    code: trim(values.code),
    name: trim(values.name) ?? '',
    investorGroupId: values.investorGroupId ?? null,
    taxCode: trim(values.taxCode),
    legalRepresentative: trim(values.legalRepresentative),
    countryId: values.countryId ?? null,
    provinceId: values.provinceId ?? null,
    wardId: values.wardId ?? null,
    address: trim(values.address),
    email: trim(values.email),
    hotline: trim(values.hotline),
    notes: trim(values.notes),
  };
}

/** Nạp hồ sơ chủ đầu tư vào form. */
export function toInvestorFormValues(investor: Investor): InvestorFormValues {
  return {
    code: investor.code ?? undefined,
    name: investor.name,
    investorGroupId: investor.investorGroupId ?? undefined,
    taxCode: investor.taxCode ?? undefined,
    legalRepresentative: investor.legalRepresentative ?? undefined,
    countryId: investor.countryId ?? undefined,
    provinceId: investor.provinceId ?? undefined,
    wardId: investor.wardId ?? undefined,
    address: investor.address ?? undefined,
    email: investor.email ?? undefined,
    hotline: investor.hotline ?? undefined,
    notes: investor.notes ?? undefined,
  };
}
