// pages/app/model/contract — chuẩn hoá form hợp đồng sang payload API
// (dùng chung cho modal thêm hợp đồng và form sửa chi tiết).
import type {
  ContractPayload,
  ContractTermType,
  ContractType,
} from '@/entities/contract';

export interface ContractFormValues {
  code?: string;
  companyName?: string;
  typeName?: string;
  contractType?: ContractType;
  serviceTypeId?: number;
  startDate?: { format: (f: string) => string } | null;
  endDate?: { format: (f: string) => string } | null;
  termType?: ContractTermType;
  notes?: string;
  /** Chọn nhiều dự án — backend tách ra lưu bảng nối contract_sites. */
  siteIds?: number[];
}

const DATE_FORMAT = 'YYYY-MM-DD';

function trim(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/** Chuẩn hoá values của form thành payload create/update hợp đồng. */
export function toContractPayload(
  values: ContractFormValues,
): Partial<ContractPayload> {
  const termType = values.termType ?? 'TERM';
  return {
    code: trim(values.code),
    companyName: trim(values.companyName) ?? '',
    typeName: trim(values.typeName) ?? '',
    contractType: values.contractType ?? 'INPUT',
    serviceTypeId: values.serviceTypeId ?? null,
    startDate: values.startDate?.format(DATE_FORMAT) ?? null,
    // Không thời hạn thì không gửi ngày kết thúc.
    endDate:
      termType === 'OPEN_ENDED'
        ? null
        : (values.endDate?.format(DATE_FORMAT) ?? null),
    termType,
    notes: trim(values.notes),
    siteIds: values.siteIds ?? [],
  };
}
