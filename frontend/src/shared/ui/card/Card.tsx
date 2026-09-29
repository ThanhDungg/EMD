import { Card as AntCard } from 'antd';
import type { CardProps as AntCardProps } from 'antd';
import type { ReactNode } from 'react';

export interface CardProps extends AntCardProps {
  children?: ReactNode;
}

// Card chuẩn theo theme beca
export function Card({ children, ...rest }: CardProps) {
  return <AntCard {...rest}>{children}</AntCard>;
}

export interface BodyCardProps extends CardProps {
  title?: ReactNode;
  extra?: ReactNode;
}

// BodyCard: Card có header tiêu đề + vùng body, pattern phổ biến của beca-ui
export function BodyCard({ title, extra, children, ...rest }: BodyCardProps) {
  return (
    <AntCard title={title} extra={extra} {...rest}>
      {children}
    </AntCard>
  );
}
