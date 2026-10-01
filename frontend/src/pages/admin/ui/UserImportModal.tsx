// pages/admin/ui/UserImportModal — nhập tài khoản bằng file Excel.
// Dòng có tên đăng nhập trùng thì cập nhật, mật khẩu để trống giữ nguyên.
import {
  ASSET_IMPORT_ACCEPT,
  ASSET_IMPORT_MAX_SIZE,
  downloadUserImportTemplate,
  useImportUsers,
} from '@/entities/user';
import type { UserImportResult } from '@/entities/user';
import { ExcelImportModal } from '@/pages/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  isInvestor: boolean;
}

export function UserImportModal({ open, onClose, isInvestor }: Props) {
  const kind = isInvestor ? 'tài khoản chủ đầu tư' : 'nhân viên';
  const importMutation = useImportUsers(isInvestor);

  return (
    <ExcelImportModal<UserImportResult>
      open={open}
      onClose={onClose}
      title={`Nhập ${kind} từ Excel`}
      templateFileName={
        isInvestor ? 'mau-nhap-tai-khoan-cdt.xlsx' : 'mau-nhap-nhan-vien.xlsx'
      }
      accept={ASSET_IMPORT_ACCEPT}
      maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage={`Dòng có tên đăng nhập trùng ${kind} đã có sẽ được cập nhật, tài khoản mới bắt buộc có mật khẩu.`}
      infoDescription="Các cột tham chiếu nhập dạng “Tên (id)” — copy nguyên chuỗi từ sheet Danh mục. Cột Nhóm nhập nhiều nhóm cách nhau bằng dấu phẩy."
      loadTemplate={() => downloadUserImportTemplate(isInvestor)}
      onImport={(file) => importMutation.mutateAsync(file)}
      renderSuccess={(result) =>
        `${result.total} dòng: ${result.created} tài khoản mới, ${result.updated} tài khoản được cập nhật.`
      }
    />
  );
}
