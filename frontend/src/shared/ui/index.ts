// shared/ui — UI kit theo API beca-ui (Becawork UI), nền antd v5 + theme riêng.
// Mỗi component là 1 slice nhỏ với public API qua index.ts của nó.
export { Button } from './button';
export type {
  ButtonProps,
  ButtonVariant,
  ButtonShape,
  ButtonStatus,
  ButtonSize,
} from './button';
export { Tag } from './tag';
export type { TagProps, TagStatus } from './tag';
export { Card, BodyCard } from './card';
export type { CardProps, BodyCardProps } from './card';
export { Input } from './input';
export type { InputProps, InputSize } from './input';
export { Table } from './table';
export type { TableProps, TableSize, ColumnsType, ColumnType } from './table';
export { EllipsisText } from './ellipsis';
export type { EllipsisTextProps } from './ellipsis';
export { AuthenticatedImage, ImageGallery } from './image-gallery';
export type { ImageGalleryProps } from './image-gallery';
export { ImageUploadField } from './image-upload';
export type { ImageUploadFieldProps } from './image-upload';
