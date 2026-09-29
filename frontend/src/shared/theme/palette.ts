// Bảng màu trích từ beca-ui (Becawork UI) — thang 8 bậc mỗi họ màu.
// primary === info scale. Giữ nguyên hex để dựng theme tương đương.
export const palette = {
  info: {
    1: '#e7f1fc',
    2: '#cde3fa',
    3: '#7aace1',
    4: '#4d90d7',
    5: '#2174cd',
    6: '#2264ac',
    7: '#14467b',
    8: '#0d2e52',
  },
  success: {
    1: '#e4f4e8',
    2: '#b2d7ba',
    3: '#8cc398',
    4: '#65af75',
    5: '#3f9b53',
    6: '#327c42',
    7: '#265d32',
    8: '#193e21',
  },
  warning: {
    1: '#fef7e6',
    2: '#f9dfac',
    3: '#f7cf82',
    4: '#eeb956',
    5: '#f5b128',
    6: '#c18c26',
    7: '#91691c',
    8: '#604613',
  },
  danger: {
    1: '#ffe0e0',
    2: '#f3c1c1',
    3: '#e38080',
    4: '#df5252',
    5: '#f42020',
    6: '#c31f1f',
    7: '#7d1a1a',
    8: '#531111',
  },
  gray: {
    1: '#e7e8ea',
    2: '#cfd2d4',
    3: '#b8bbbf',
    4: '#a0a5a9',
    5: '#888e94',
    6: '#6d7276',
    7: '#525559',
    8: '#36393b',
  },
  text: {
    primary: '#10142f',
    gray: '#8f96a5',
    grayHover: '#b0b2b7',
  },
  background: {
    primary: '#f3f5f9',
    secondary: '#ffffff',
    tertiary: '#f7f7f7',
  },
} as const;

export type PaletteFamily = keyof Pick<
  typeof palette,
  'info' | 'success' | 'warning' | 'danger' | 'gray'
>;
