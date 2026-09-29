// entities/droplist — public API của slice droplist dùng chung (FSD).
export type { DroplistItem, DroplistKey, ModuleCode } from './model';
export {
  ASSET_DROPLIST_KEYS,
  DROPLIST_META,
  ENERGY_DROPLIST_KEYS,
  INCIDENT_DROPLIST_KEYS,
  INVESTOR_DROPLIST_KEYS,
  PROJECT_DROPLIST_KEYS,
} from './model';
export {
  createDroplist,
  deleteDroplist,
  fetchDroplist,
  updateDroplist,
} from './api';
export {
  droplistKeys,
  useCreateDroplist,
  useDeleteDroplist,
  useDroplist,
  useUpdateDroplist,
} from './queries';
