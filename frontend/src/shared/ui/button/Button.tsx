import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import type { ReactNode } from 'react';
import './button.css';

// API tương đương beca-ui Button (trích từ Button.types.d.ts)
export type ButtonVariant =
  | 'primary'
  | 'dashed'
  | 'text'
  | 'link'
  | 'filled'
  | 'filledOutlined'
  | 'outlined'
  | 'default';

export type ButtonShape = 'round' | 'default' | 'circle';
export type ButtonStatus =
  'default' | 'success' | 'info' | 'warning' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  children?: ReactNode;
  size?: ButtonSize;
  /** @deprecated Dùng variant="outlined" thay thế */
  secondary?: boolean;
  status?: ButtonStatus;
  variant?: ButtonVariant;
  /** @deprecated Dùng variant thay thế */
  type?: ButtonVariant;
  shape?: ButtonShape;
  icon?: ReactNode;
  disabled?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  block?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const sizeMap: Record<ButtonSize, AntButtonProps['size']> = {
  small: 'small',
  medium: 'middle',
  large: 'large',
};

export function Button({
  children,
  size = 'medium',
  status = 'default',
  variant = 'default',
  type,
  shape = 'default',
  className,
  ...rest
}: ButtonProps) {
  const v = type ?? variant;

  const antType: AntButtonProps['type'] =
    v === 'primary'
      ? 'primary'
      : v === 'dashed'
        ? 'dashed'
        : v === 'text'
          ? 'text'
          : v === 'link'
            ? 'link'
            : 'default';

  const antVariant: AntButtonProps['variant'] =
    v === 'filled'
      ? 'filled'
      : v === 'filledOutlined' || v === 'outlined'
        ? 'outlined'
        : undefined;

  const statusClass =
    status !== 'default' && status !== 'danger'
      ? `beca-btn-status-${status}`
      : undefined;

  return (
    <AntButton
      type={antType}
      variant={antVariant}
      danger={status === 'danger'}
      size={sizeMap[size]}
      shape={shape}
      className={
        [statusClass, className].filter(Boolean).join(' ') || undefined
      }
      {...rest}
    >
      {children}
    </AntButton>
  );
}
