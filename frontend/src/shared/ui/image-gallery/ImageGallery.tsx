// shared/ui/image-gallery — hiển thị ảnh/tệp đính kèm.
// Ảnh lưu ngoài public nên mỗi ảnh phải tải qua API (có Bearer token) rồi
// mới hiện; tệp không phải ảnh thì bấm để mở tab mới.
import { FileOutlined } from '@ant-design/icons';
import { Image, Space, Spin, Typography, message } from 'antd';
import type { ReactNode } from 'react';
import {
  apiErrorMessage,
  isImageFile,
  openStoredFile,
  useFileUrl,
} from '@/shared/lib';

const { Text } = Typography;

const BLANK_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export interface ImageGalleryProps {
  /** Danh sách path lưu trong DB (checklist.attachments, incident.before_images…) */
  files: string[] | null | undefined;
  /** Kích thước thumbnail px */
  size?: number;
  /** Chuỗi hiện khi chưa có tệp nào */
  emptyText?: string;
}

// 1 thumbnail: tải ảnh qua API, đang tải thì hiện spinner.
export function AuthenticatedImage({
  path,
  size = 40,
}: {
  path: string;
  size?: number;
}) {
  const src = useFileUrl(path);
  if (!src) {
    return (
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
    );
  }
  return (
    <Image
      src={src}
      width={size}
      height={size}
      style={{ objectFit: 'cover', borderRadius: 4 }}
      fallback={BLANK_IMAGE}
    />
  );
}

function FileLink({ path }: { path: string }) {
  const name = path.split('/').pop() ?? path;
  return (
    <a
      role="button"
      tabIndex={0}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
      onClick={(e) => {
        e.preventDefault();
        openStoredFile(path).catch((err) =>
          message.error(apiErrorMessage(err, 'Không mở được tệp đính kèm.')),
        );
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openStoredFile(path).catch((err) =>
          message.error(apiErrorMessage(err, 'Không mở được tệp đính kèm.')),
        );
      }}
    >
      <FileOutlined />
      {name}
    </a>
  );
}

export function ImageGallery({
  files,
  size = 40,
  emptyText,
}: ImageGalleryProps): ReactNode {
  const list = files ?? [];
  if (list.length === 0)
    return <Text type="secondary">{emptyText ?? '—'}</Text>;

  const images = list.filter(isImageFile);
  const others = list.filter((f) => !isImageFile(f));

  return (
    <Space size={6} wrap>
      {images.length > 0 && (
        <Image.PreviewGroup>
          {images.map((f) => (
            <AuthenticatedImage key={f} path={f} size={size} />
          ))}
        </Image.PreviewGroup>
      )}
      {others.map((f) => (
        <FileLink key={f} path={f} />
      ))}
    </Space>
  );
}
