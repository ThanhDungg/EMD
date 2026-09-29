import type { ThemeConfig } from 'antd';
import { palette } from './palette';

// Font mặc định của beca-ui (themeConfig dùng APPLE_FONT)
export const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
export const INTER_FONT = '"Inter", sans-serif';
export const BVP_FONT = '"BeVietnamPro", sans-serif';
export const LEXEND_FONT = '"Lexend", sans-serif';

// Token dùng chung cho form controls (tương đương FORM_CONTROL_TOKEN của beca-ui)
const formControlToken = {
  colorPrimary: palette.info[5],
  colorSuccess: palette.success[5],
  colorWarning: palette.warning[5],
  colorError: palette.danger[5],
  colorInfo: palette.info[5],
  hoverBorderColor: palette.info[5],
  activeBorderColor: palette.info[5],
  activeShadow: '0 0 0 2px rgba(113, 181, 255, 0.32)',
  zIndexPopup: 1051,
};

// Tái hiện themeConfig của beca-ui trên antd v5
export const becaTheme: ThemeConfig = {
  token: {
    colorPrimary: palette.info[5],
    colorSuccess: palette.success[5],
    colorWarning: palette.warning[5],
    colorError: palette.danger[5],
    colorInfo: palette.info[5],
    fontFamily: APPLE_FONT,
    colorText: palette.text.primary,
    colorTextDisabled: palette.text.gray,
    colorBgContainer: palette.background.secondary,
    colorBgElevated: palette.background.tertiary,
    colorBgLayout: palette.background.primary,
    controlItemBgActive: palette.info[5],
    colorTextDescription: palette.text.gray,
    controlOutline: 'transparent',
  },
  components: {
    Button: {
      primaryShadow: `0 0 0 0 ${palette.info[3]}`,
    },
    Typography: {
      colorLink: palette.info[5],
      colorLinkHover: palette.info[4],
      colorLinkActive: palette.info[6],
    },
    Menu: {
      itemSelectedBg: palette.info[1],
    },
    Steps: {
      controlItemBgActive: palette.info[1],
      colorTextLabel: palette.text.primary,
    },
    Dropdown: {
      ...formControlToken,
      controlItemBgActive: palette.info[1],
    },
    Form: {
      ...formControlToken,
      labelRequiredMarkColor: palette.danger[5],
      labelColor: palette.text.gray,
    },
    Input: { ...formControlToken },
    InputNumber: { ...formControlToken },
    Select: { ...formControlToken },
    DatePicker: { ...formControlToken },
  },
};
