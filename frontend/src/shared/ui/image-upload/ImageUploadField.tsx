// shared/ui/image-upload — ô chọn nhiều ảnh cho 1 dòng bảng.
// Chọi file là tải thẳng lên API (POST /uploads/images), xong trả về path
// để caller đưa vào mảng `attachments` khi tạo dòng đó.
import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Image,
  Popconfirm,
  Space,
  Spin,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  UPLOAD_ACCEPT,
  UPLOAD_MAX_FILES,
  UPLOAD_MAX_FILE_SIZE,
  uploadImages,
} from '@/shared/api';
import type { UploadImageMeta } from '@/shared/api';
import { apiErrorMessage } from '@/shared/lib';
import { AuthenticatedImage } from '@/shared/ui/image-gallery';

const { Text } = Typography;

type ItemStatus = 'uploading' | 'done' | 'error';

interface UploadItem {
  uid: string;
  name: string;
  status: ItemStatus;
  /** object URL cục bộ — hiện ngay khi vừa chọn, khỏi chờ tải lại từ API. */
  preview?: string;
  /** Path lưu trên server, chỉ có khi status = 'done'. */
  path?: string;
}

function isDone(item: UploadItem): boolean {
  return item.status === 'done' && item.path !== undefined;
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export interface ImageUploadFieldProps {
  /** Danh sách path đã lưu (attachments của dòng). */
  value?: string[];
  onChange?: (paths: string[]) => void;
  /** lat/lng + giờ chụp gửi kèm lên API (client tự lấy, web không có GPS). */
  meta?: UploadImageMeta;
  disabled?: boolean;
  /** Kích thước thumbnail px */
  size?: number;
}

export function ImageUploadField({
  value,
  onChange,
  meta,
  disabled = false,
  size = 44,
}: ImageUploadFieldProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const uidRef = useRef(0);
  const [messageApi, contextHolder] = message.useMessage();

  // Đọc/cập nhật qua ref để commit() luôn thấy danh sách mới nhất.
  function commit(next: UploadItem[]) {
    itemsRef.current = next;
    setItems(next);
    onChange?.(next.filter(isDone).map((i) => i.path as string));
  }

  // Nạp lại khi value đổi từ ngoài (reset form, nạp mẫu...). Bỏ qua lúc
  // đang upload để không mất ảnh vừa chọn.
  const valueKey = (value ?? []).join('|');
  useEffect(() => {
    const current = itemsRef.current
      .filter(isDone)
      .map((i) => i.path as string);
    if (sameOrder(current, value ?? [])) return;
    commit(
      (value ?? []).map((p) => ({
        uid: `db-${p}`,
        name: p.split('/').pop() ?? p,
        status: 'done' as const,
        path: p,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  async function handleUpload(file: File) {
    uidRef.current += 1;
    const uid = `up-${uidRef.current}`;
    const preview = URL.createObjectURL(file);
    commit([
      ...itemsRef.current,
      { uid, name: file.name, status: 'uploading', preview },
    ]);

    try {
      const [saved] = await uploadImages([file], meta ?? {});
      commit(
        itemsRef.current.map((i) =>
          i.uid === uid ? { ...i, status: 'done', path: saved.path } : i,
        ),
      );
    } catch (err) {
      commit(
        itemsRef.current.map((i) =>
          i.uid === uid ? { ...i, status: 'error' } : i,
        ),
      );
      URL.revokeObjectURL(preview);
      messageApi.error(apiErrorMessage(err, 'Tải ảnh lên thất bại.'));
    }
  }

  function handleRemove(uid: string) {
    const target = itemsRef.current.find((i) => i.uid === uid);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    commit(itemsRef.current.filter((i) => i.uid !== uid));
  }

  const uploadProps: UploadProps = {
    accept: UPLOAD_ACCEPT,
    multiple: true,
    disabled: disabled || items.length >= UPLOAD_MAX_FILES,
    showUploadList: false,
    // Chặn file quá lớn / không phải ảnh ngay ở client cho nhanh.
    beforeUpload: (file) => {
      if (file.size > UPLOAD_MAX_FILE_SIZE) {
        messageApi.error(
          `Ảnh "${file.name}" vượt quá ${Math.round(UPLOAD_MAX_FILE_SIZE / 1024 / 1024)}MB.`,
        );
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: ({ file, onError, onSuccess }) => {
      handleUpload(file as File).then(
        () => onSuccess?.({}),
        (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
      );
    },
  };

  return (
    <Space size={6} wrap style={{ alignItems: 'flex-start' }}>
      {contextHolder}
      {items.map((item) => (
        <div key={item.uid} style={{ position: 'relative', lineHeight: 0 }}>
          {item.status === 'uploading' ? (
            <div
              style={{
                width: size,
                height: size,
                borderRadius: 4,
                background: '#f3f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Spin size="small" />
            </div>
          ) : item.status === 'error' ? (
            <div
              style={{
                width: size,
                height: size,
                borderRadius: 4,
                border: '1px dashed #f42020',
                color: '#f42020',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 2,
              }}
            >
              Lỗi
            </div>
          ) : item.preview ? (
            // Ảnh vừa tải xong: dùng object URL cục bộ, không phải gọi lại API.
            <Image
              src={item.preview}
              width={size}
              height={size}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <AuthenticatedImage path={item.path as string} size={size} />
          )}
          {!disabled && (
            <Popconfirm
              title="Xoá ảnh này?"
              okText="Xoá"
              cancelText="Huỷ"
              onConfirm={() => handleRemove(item.uid)}
            >
              <Button
                size="small"
                danger
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  padding: 0,
                  minWidth: 20,
                  height: 20,
                  lineHeight: '18px',
                }}
                aria-label={`Xoá ảnh ${item.name}`}
              >
                ×
              </Button>
            </Popconfirm>
          )}
        </div>
      ))}
      <Upload {...uploadProps}>
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={disabled || items.length >= UPLOAD_MAX_FILES}
        >
          Ảnh
        </Button>
      </Upload>
      {items.length >= UPLOAD_MAX_FILES && (
        <Text type="secondary" style={{ fontSize: 12, alignSelf: 'center' }}>
          Tối đa {UPLOAD_MAX_FILES} ảnh
        </Text>
      )}
    </Space>
  );
}
