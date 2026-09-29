import { Tooltip } from 'antd';
import type { ReactNode } from 'react';

export interface EllipsisTextProps {
  text: string;
}

// Text 1 dòng + ellipsis + tooltip khi hover (theo đặc tả bảng).
export function EllipsisText({ text }: EllipsisTextProps): ReactNode {
  if (!text) return '—';
  return (
    <Tooltip title={text}>
      <span
        style={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </Tooltip>
  );
}
