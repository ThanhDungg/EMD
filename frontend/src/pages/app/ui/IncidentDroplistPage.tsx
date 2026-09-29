// pages/app/ui/IncidentDroplistPage — module Ứng dụng: card nhập dữ liệu cho
// các droplist dùng ở chi tiết sự cố hư hỏng (phân loại sửa chữa, phân loại
// hư hỏng, đơn vị phụ trách). Dùng chung component DroplistCard.
import { INCIDENT_DROPLIST_KEYS } from '@/entities/droplist';
import { DroplistCard } from '@/pages/shared';

export function IncidentDroplistPage() {
  return (
    <>
      {INCIDENT_DROPLIST_KEYS.map((key) => (
        <DroplistCard key={key} droplistKey={key} />
      ))}
    </>
  );
}
