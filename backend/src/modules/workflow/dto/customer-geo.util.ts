import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateCustomerDto } from './create-customer.dto.js';
import { assertGeoChain3 } from './geo-chain.util.js';
import type { UpdateCustomerDto } from './update-customer.dto.js';

/** Khách hàng chỉ dùng quốc gia → tỉnh thành → phường xã (không có miền). */
export async function assertCustomerGeoChain(
  prisma: PrismaService,
  dto: CreateCustomerDto | UpdateCustomerDto,
): Promise<void> {
  await assertGeoChain3(prisma, dto);
}
