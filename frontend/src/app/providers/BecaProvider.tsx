import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import type { ReactNode } from 'react';
import { becaTheme } from '@/shared/theme';

export type Language = 'vi' | 'en';

export interface BecaProviderProps {
  children: ReactNode;
  language?: Language;
}

// Tương đương ConfigProvider của beca-ui: bọc antd ConfigProvider + theme + ngôn ngữ
export function BecaProvider({ children, language = 'vi' }: BecaProviderProps) {
  return (
    <ConfigProvider theme={becaTheme} locale={language === 'vi' ? viVN : enUS}>
      {children}
    </ConfigProvider>
  );
}
