// pages/assets/ui/AssetImportModal — nhập tài sản bằng file Excel theo mẫu.
// Mã tài sản không nhập tay: backend tự sinh TS-0001, TS-0002...
import {
  ASSET_IMPORT_ACCEPT,
  ASSET_IMPORT_MAX_SIZE,
  downloadAssetImportTemplate,
  useImportAssets,
} from '@/entities/asset';
import type { AssetImportResult } from '@/entities/asset';
import { ExcelImportModal } from '@/pages/shared';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AssetImportModal({ open, onClose }: Props) {
  const importMutation = useImportAssets();

  return (
    <ExcelImportModal<AssetImportResult>
      open={open}
      onClose={onClose}
      title="Nhập tài sản từ Excel"
      templateFileName="mau-nhap-tai-san.xlsx"
      accept={ASSET_IMPORT_ACCEPT}
      maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage="Mã tài sản không cần nhập — hệ thống tự sinh TS-0001, TS-0002..."
      infoDescription="Mỗi cột tên có 1 cột ID đi kèm: điền ID thì lấy đúng bản ghi đó, để trống mới khớp theo tên. Nhập nhiều đợt: nhập đợt 1 rồi bấm Xuất Excel để lấy ID cho đợt 2."
      loadTemplate={downloadAssetImportTemplate}
      onImport={(file) => importMutation.mutateAsync(file)}
      renderSuccess={(result) =>
        result.created === 1
          ? `1 tài sản. Mã được sinh tự động: ${result.firstCode}`
          : `${result.created} tài sản. Mã được sinh tự động: ${result.firstCode} → ${result.lastCode}`
      }
    />
  );
}
