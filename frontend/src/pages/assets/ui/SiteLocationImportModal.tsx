// pages/assets/ui/SiteLocationImportModal — nhập cây vị trí bằng file Excel.
// Vị trí cha nhận theo đường dẫn; nếu dự án + cha + tên đã tồn tại thì cập
// nhật bản ghi cũ thay vì tạo mới.
import {
  ASSET_IMPORT_ACCEPT,
  ASSET_IMPORT_MAX_SIZE,
  downloadLocationImportTemplate,
  useImportSiteLocations,
} from '@/entities/asset';
import type { LocationImportResult } from '@/entities/asset';
import { ExcelImportModal } from '@/pages/shared';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SiteLocationImportModal({ open, onClose }: Props) {
  const importMutation = useImportSiteLocations();

  return (
    <ExcelImportModal<LocationImportResult>
      open={open}
      onClose={onClose}
      title="Nhập vị trí từ Excel"
      templateFileName="mau-nhap-vi-tri.xlsx"
      accept={ASSET_IMPORT_ACCEPT}
      maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage="Vị trí đã có (cùng dự án + cùng vị trí cha + cùng tên) sẽ được cập nhật, không tạo bản ghi trùng."
      infoDescription="Cột Vị trí cha nhập dạng “đường dẫn (id)” — copy nguyên chuỗi từ sheet Danh mục hoặc file Xuất. Nhập nhiều đợt: nhập cha đợt 1 rồi bấm Xuất Excel để lấy “Tên (id)” cho đợt 2."
      loadTemplate={downloadLocationImportTemplate}
      onImport={(file) => importMutation.mutateAsync(file)}
      renderSuccess={(result) =>
        `${result.total} dòng: ${result.created} vị trí mới, ${result.updated} vị trí được cập nhật.`
      }
    />
  );
}
