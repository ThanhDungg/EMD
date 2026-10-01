// pages/admin/ui/GroupImportModal — nhập nhóm bằng file Excel.
// Dòng có mã trùng nhóm đã có thì cập nhật.
import {
  ASSET_IMPORT_ACCEPT,
  ASSET_IMPORT_MAX_SIZE,
  downloadGroupImportTemplate,
  useImportGroups,
} from '@/entities/group';
import type { GroupImportResult } from '@/entities/group';
import { ExcelImportModal } from '@/pages/shared';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GroupImportModal({ open, onClose }: Props) {
  const importMutation = useImportGroups();

  return (
    <ExcelImportModal<GroupImportResult>
      open={open}
      onClose={onClose}
      title="Nhập nhóm từ Excel"
      templateFileName="mau-nhap-nhom.xlsx"
      accept={ASSET_IMPORT_ACCEPT}
      maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage="Dòng có mã trùng nhóm đã có sẽ được cập nhật, không mã thì luôn tạo mới."
      infoDescription="Cột Quyền nhập mã quyền cách nhau bằng dấu phẩy (xem sheet Danh mục). Cột Thành viên nhập tên đăng nhập cách nhau bằng dấu phẩy."
      loadTemplate={downloadGroupImportTemplate}
      onImport={(file) => importMutation.mutateAsync(file)}
      renderSuccess={(result) =>
        `${result.total} dòng: ${result.created} nhóm mới, ${result.updated} nhóm được cập nhật.`
      }
    />
  );
}
