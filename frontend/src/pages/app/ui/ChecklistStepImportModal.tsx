// pages/app/ui/ChecklistStepImportModal — nhập mẫu checklist 3 bước bằng file
// Excel, mỗi bước 1 file nhiều dòng: B1 danh mục → B2 nội dung cha →
// B3 nội dung con. Bước sau liên kết bước trước bằng tên.
import { ASSET_IMPORT_ACCEPT, ASSET_IMPORT_MAX_SIZE } from '@/entities/asset';
import {
  downloadStepCategoriesTemplate,
  downloadStepChildrenTemplate,
  downloadStepParentsTemplate,
  useImportStepCategories,
  useImportStepChildren,
  useImportStepParents,
} from '@/entities/work';
import type {
  StepCategoriesImportResult,
  StepChildrenImportResult,
  StepParentsImportResult,
} from '@/entities/work';
import { ExcelImportModal } from '@/pages/shared';

export type ChecklistStepKind = 'categories' | 'parents' | 'children';

interface Props {
  step: ChecklistStepKind | null;
  onClose: () => void;
}

export function ChecklistStepImportModal({ step, onClose }: Props) {
  const categoriesMutation = useImportStepCategories();
  const parentsMutation = useImportStepParents();
  const childrenMutation = useImportStepChildren();

  if (step === 'parents') {
    return (
      <ExcelImportModal<StepParentsImportResult>
        open
        onClose={onClose}
        title="B2 — Nhập nội dung cha từ Excel"
        templateFileName="mau-nhap-noi-dung-cha.xlsx"
        accept={ASSET_IMPORT_ACCEPT}
        maxSize={ASSET_IMPORT_MAX_SIZE}
        infoMessage="Danh mục phải đã nhập ở bước 1, cha trùng tên trong cùng danh mục thì dùng lại."
        infoDescription="Mỗi dòng là một nội dung cha thuộc Danh mục ở cùng dòng. Nên chọn Danh mục từ dropdown trong file mẫu để khỏi sai tên."
        loadTemplate={downloadStepParentsTemplate}
        onImport={(file) => parentsMutation.mutateAsync(file)}
        renderSuccess={(result) =>
          `${result.total} dòng: ${result.categories} danh mục — ${result.created} nội dung cha mới, ${result.updated} nội dung cha dùng lại.`
        }
      />
    );
  }

  if (step === 'children') {
    return (
      <ExcelImportModal<StepChildrenImportResult>
        open
        onClose={onClose}
        title="B3 — Nhập nội dung con từ Excel"
        templateFileName="mau-nhap-noi-dung-con.xlsx"
        accept={ASSET_IMPORT_ACCEPT}
        maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage="Danh mục + Nội dung cha phải đã có (bước 1 + 2), con trùng tên trong cùng cha sẽ được cập nhật."
      infoDescription="Mỗi dòng là một nội dung con thuộc Nội dung cha + Danh mục ở cùng dòng. Chọn Danh mục trước, cột Nội dung cha sẽ hiện dropdown lọc đúng các cha của danh mục đó. Cột Loại giá trị nhập “Đúng / Sai”, “Chữ” hoặc “Số”."
        loadTemplate={downloadStepChildrenTemplate}
        onImport={(file) => childrenMutation.mutateAsync(file)}
        renderSuccess={(result) =>
          `${result.total} dòng: ${result.categories} danh mục, ${result.parents} nội dung cha — ${result.created} nội dung con mới, ${result.updated} nội dung con được cập nhật.`
        }
      />
    );
  }

  return (
    <ExcelImportModal<StepCategoriesImportResult>
      open={step !== null}
      onClose={onClose}
      title="B1 — Nhập danh mục từ Excel"
      templateFileName="mau-nhap-danh-muc.xlsx"
      accept={ASSET_IMPORT_ACCEPT}
      maxSize={ASSET_IMPORT_MAX_SIZE}
      infoMessage="Trùng tên thì dùng lại danh mục đó và cập nhật Mô tả."
      infoDescription="Mỗi dòng là một danh mục. Nhập xong bước này mới tới bước 2 (nội dung cha)."
      loadTemplate={downloadStepCategoriesTemplate}
      onImport={(file) => categoriesMutation.mutateAsync(file)}
      renderSuccess={(result) =>
        `${result.total} dòng: ${result.created} danh mục mới, ${result.updated} danh mục dùng lại/cập nhật. Xong bước này thì sang bước 2 (nội dung cha).`
      }
    />
  );
}
