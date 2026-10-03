// pages/app/ui/ChecklistTemplateCategoryImportModal — nhập cả nội dung cha +
// con cho 1 danh mục bằng file Excel (không cần cột Danh mục).
// Nội dung cha trùng tên thì dùng lại, nội dung con trùng tên trong cùng cha
// thì được cập nhật (so khớp không phân biệt hoa/dấu).
import { ASSET_IMPORT_ACCEPT, ASSET_IMPORT_MAX_SIZE } from '@/entities/asset';
import {
  downloadChecklistCategoryTemplate,
  useImportChecklistCategory,
} from '@/entities/work';
import type {
  ChecklistCategoryImportResult,
  ChecklistTreeNode,
} from '@/entities/work';
import { ExcelImportModal } from '@/pages/shared';

interface Props {
  category: ChecklistTreeNode | null;
  onClose: () => void;
}

export function ChecklistTemplateCategoryImportModal({
  category,
  onClose,
}: Props) {
  const importMutation = useImportChecklistCategory();

  return (
    <ExcelImportModal<ChecklistCategoryImportResult>
      open={category !== null}
      onClose={onClose}
      title={category ? `Nhập nội dung — ${category.title}` : 'Nhập nội dung'}
      templateFileName="mau-nhap-cha-con-checklist.xlsx"
      accept={ASSET_IMPORT_ACCEPT}
      maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage="Nội dung cha trùng tên thì dùng lại, nội dung con trùng tên trong cùng cha sẽ được cập nhật."
      infoDescription="Mỗi dòng là một nội dung con kèm Nội dung cha, thuộc danh mục trên. Cột Nội dung cha có dropdown các cha đã có — muốn thêm cha mới thì gõ tên mới trực tiếp. Cột Loại giá trị nhập “Đúng / Sai”, “Chữ” hoặc “Số”. Dòng để trống Tên nội dung con thì chỉ tạo Nội dung cha."
      loadTemplate={() =>
        downloadChecklistCategoryTemplate(category?.id as number)
      }
      onImport={(file) =>
        importMutation.mutateAsync({
          categoryId: category?.id as number,
          file,
        })
      }
      renderSuccess={(result) =>
        `${result.total} dòng: ${result.parents} nội dung cha — ${result.created} nội dung con mới, ${result.updated} nội dung con được cập nhật.`
      }
    />
  );
}
