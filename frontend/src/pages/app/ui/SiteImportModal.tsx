// pages/app/ui/SiteImportModal — nhập hồ sơ dự án bằng file Excel.
// Dòng có mã trùng dự án đã có thì cập nhật dự án đó thay vì tạo mới.
import { ASSET_IMPORT_ACCEPT, ASSET_IMPORT_MAX_SIZE } from '@/entities/asset';
import {
  downloadSiteImportTemplate,
  useImportSites,
} from '@/entities/site';
import type { SiteImportResult } from '@/entities/site';
import { ExcelImportModal } from '@/pages/shared';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SiteImportModal({ open, onClose }: Props) {
  const importMutation = useImportSites();

  return (
    <ExcelImportModal<SiteImportResult>
      open={open}
      onClose={onClose}
      title="Nhập dự án từ Excel"
      templateFileName="mau-nhap-du-an.xlsx"
      accept={ASSET_IMPORT_ACCEPT}
      maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage="Dòng có mã trùng dự án đã có sẽ được cập nhật, không tạo bản ghi trùng."
      infoDescription="Các cột tham chiếu nhập dạng “Tên (id)” — copy nguyên chuỗi từ sheet Danh mục hoặc file Xuất. Nên điền Mã dự án để nhập lại nhiều lần không trùng."
      loadTemplate={downloadSiteImportTemplate}
      onImport={(file) => importMutation.mutateAsync(file)}
      renderSuccess={(result) =>
        `${result.total} dòng: ${result.created} dự án mới, ${result.updated} dự án được cập nhật.`
      }
    />
  );
}
