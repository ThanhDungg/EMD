// pages/shared/index.ts — public API của slice dùng chung cho nhiều module.
export { DroplistCard } from './ui/DroplistCard';
export type { DroplistCardProps } from './ui/DroplistCard';
export { ExcelImportModal } from './ui/ExcelImportModal';
export type { ExcelImportModalProps } from './ui/ExcelImportModal';
export {
  buildIncidentColumns,
  formatDay,
  statusTag,
  INCIDENT_COL_WIDTH,
} from './ui/IncidentColumns';
export { AssetLocationMap } from './ui/AssetLocationMap';
export type {
  AssetLocationMapProps,
  LatLngPoint,
} from './ui/AssetLocationMap';
