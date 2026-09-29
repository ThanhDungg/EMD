import { BadRequestException, ConflictException } from '@nestjs/common';
import { MeterPhase, MeterType } from '../../generated/prisma/client.js';

// Quy tắc pha theo loại đồng hồ:
// - Nước & dầu DO: chỉ pha bình thường
// - Điện: 3 pha (bình thường/cao điểm/thấp điểm) hoặc 1 pha bình thường
export function assertPhaseAllowed(meterType: MeterType, phase: MeterPhase): void {
  if (meterType !== MeterType.ELECTRICITY && phase !== MeterPhase.NORMAL) {
    throw new BadRequestException(
      'Đồng hồ nước và dầu DO chỉ kiểm tra ở mức bình thường.',
    );
  }
}

// Tổng tiêu thụ = cuối − đầu (làm tròn 2 số lẻ), cuối phải >= đầu
export function calcTotal(startIndex: number, endIndex: number): number {
  if (endIndex < startIndex) {
    throw new BadRequestException('Chỉ số cuối phải lớn hơn hoặc bằng chỉ số đầu.');
  }
  return Math.round((endIndex - startIndex) * 100) / 100;
}

// Không trùng pha trong cùng 1 đồng hồ
export function assertNoDuplicatePhase(phases: MeterPhase[], extra?: MeterPhase): void {
  const all = extra ? [...phases, extra] : phases;
  if (new Set(all).size !== all.length) {
    throw new ConflictException('Mỗi pha chỉ được nhập 1 lần cho 1 đồng hồ.');
  }
}
