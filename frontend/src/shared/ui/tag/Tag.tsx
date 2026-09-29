import { Tag as AntTag } from 'antd';
import type { TagProps as AntTagProps } from 'antd';
import type { ReactNode } from 'react';

export type TagStatus = 'default' | 'success' | 'info' | 'warning' | 'danger';

export interface TagProps {
  children?: ReactNode;
  status?: TagStatus;
  closable?: boolean;
  onClose?: (e: React.MouseEvent<HTMLElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  style?: React.CSSProperties;
  className?: string;
}

const statusMap: Record<TagStatus, AntTagProps['color']> = {
  default: 'default',
  success: 'success',
  info: 'processing',
  warning: 'warning',
  danger: 'error',
};

export function Tag({ children, status = 'default', ...rest }: TagProps) {
  return (
    <AntTag color={statusMap[status]} {...rest}>
      {children}
    </AntTag>
  );
}
