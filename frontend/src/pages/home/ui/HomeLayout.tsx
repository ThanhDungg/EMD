import {
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  HomeOutlined,
  InboxOutlined,
  LayoutOutlined,
  MessageOutlined,
  ReloadOutlined,
  SendOutlined,
  SettingOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  DatabaseOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Dropdown, Menu, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDirectory, useSites, useWorksPage } from '@/entities/work';
import type { DirectoryUser, SiteItem } from '@/entities/work';
import type {
  CategoryItem,
  CompanyProfile,
  MeInfo,
  ModuleItem,
} from '../model/home';
import {
  useCategories,
  useCompanyProfile,
  useMe,
  useModules,
} from '../api/homeQueries';
import './HomeLayout.css';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  WORKFLOW: <ApartmentOutlined />,
  APPLICATIONS: <AppstoreOutlined />,
  REPORTS: <BarChartOutlined />,
  ASSETS: <DatabaseOutlined />,
  SYSTEM_ADMIN: <SettingOutlined />,
  APP_CONFIG: <ToolOutlined />,
  INTERNAL_CHAT: <MessageOutlined />,
  INVESTOR_PORTAL: <BankOutlined />,
};

/** Prefix URL của từng module — mỗi module 1 nhóm route riêng. */
const MODULE_ROOTS: Record<string, string> = {
  WORKFLOW: '/work',
  APPLICATIONS: '/app',
  REPORTS: '/report',
  ASSETS: '/assets',
  SYSTEM_ADMIN: '/admin',
  APP_CONFIG: '/config',
  INTERNAL_CHAT: '/chat',
  INVESTOR_PORTAL: '/portal',
};

function moduleOfPath(pathname: string): string {
  const found = Object.entries(MODULE_ROOTS).find(
    ([, root]) => pathname === root || pathname.startsWith(`${root}/`),
  );
  return found?.[0] ?? 'WORKFLOW';
}

// Dữ liệu dùng chung cho các trang con (qua Outlet context).
export interface HomeOutletContext {
  me: MeInfo | null;
  modules: ModuleItem[];
  categories: CategoryItem[];
  profile: CompanyProfile | null;
  sites: SiteItem[];
  directory: DirectoryUser[];
  assignedTotal: number;
  handledTotal: number;
}

// Menu trái đổi theo module đang chọn. Mỗi mục có `path` đầy đủ (kèm prefix
// module) — bấm menu sẽ navigate thẳng.
interface MenuDef {
  key: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  /** Nhóm con trong menu (VD "Loại việc"). */
  group?: boolean;
  /** Mục cha có menu con (VD "Dự án" → Danh sách dự án, Danh mục dự án). */
  children?: MenuDef[];
}

const ASSET_MENU: MenuDef[] = [
  {
    key: 'assets:list',
    path: '/assets',
    label: 'Danh sách tài sản',
    icon: <DatabaseOutlined />,
  },
  {
    key: 'assets:locations',
    path: '/assets/locations',
    label: 'Vị trí',
    icon: <EnvironmentOutlined />,
  },
  {
    key: 'assets:droplists',
    path: '/assets/droplists',
    label: 'Danh mục dữ liệu',
    icon: <AppstoreOutlined />,
  },
];

// Menu Ứng dụng chia 2 nhóm cha: khai báo master data và nội bộ IT.
// Trong "KHAI BÁO MASTER DATA" có 2 mục cha mở rộng: Dự án và
// DANH MỤC KIỂM TRA NĂNG LƯỢNG.
interface MenuGroupDef {
  key: string;
  label: string;
  items: MenuDef[];
}

const APPLICATION_MENU_GROUPS: MenuGroupDef[] = [
  {
    key: 'group-app-masterdata',
    label: 'KHAI BÁO MASTER DATA',
    items: [
      {
        key: 'app:projects',
        path: '/app/projects',
        label: 'Dự án',
        icon: <BankOutlined />,
        children: [
          {
            key: 'app:projects-list',
            path: '/app/projects',
            label: 'Danh sách dự án',
            icon: <ProfileOutlined />,
          },
          {
            key: 'app:project-droplists',
            path: '/app/project-droplists',
            label: 'Danh mục dự án',
            icon: <AppstoreOutlined />,
          },
        ],
      },
      {
        key: 'app:energy',
        path: '/app/customers',
        label: 'DANH MỤC KIỂM TRA NĂNG LƯỢNG',
        icon: <ThunderboltOutlined />,
        children: [
          {
            key: 'app:customers-list',
            path: '/app/customers',
            label: 'Danh sách khách hàng',
            icon: <ThunderboltOutlined />,
          },
        ],
      },
      {
        key: 'app:investors',
        path: '/app/investors',
        label: 'DANH MỤC CHỦ ĐẦU TƯ',
        icon: <BankOutlined />,
        children: [
          {
            key: 'app:investors-list',
            path: '/app/investors',
            label: 'Danh sách chủ đầu tư',
            icon: <ProfileOutlined />,
          },
          {
            key: 'app:investor-groups',
            path: '/app/investor-groups',
            label: 'Danh mục chủ đầu tư cha',
            icon: <AppstoreOutlined />,
          },
        ],
      },
      {
        key: 'app:contractors',
        path: '/app/contractors',
        label: 'NHÀ THẦU',
        icon: <ToolOutlined />,
        children: [
          {
            key: 'app:contractors-list',
            path: '/app/contractors',
            label: 'Danh sách nhà thầu',
            icon: <ProfileOutlined />,
          },
          {
            key: 'app:contractor-types',
            path: '/app/contractor-types',
            label: 'Danh mục loại nhà thầu',
            icon: <AppstoreOutlined />,
          },
        ],
      },
      {
        key: 'app:contracts-list',
        path: '/app/contracts',
        label: 'Danh sách hợp đồng',
        icon: <FileProtectOutlined />,
      },
      {
        key: 'app:incident-droplists',
        path: '/app/incident-droplists',
        label: 'Danh mục sự cố hư hỏng',
        icon: <FileTextOutlined />,
      },
    ],
  },
  {
    key: 'group-app-it',
    label: 'NỘI BỘ IT',
    items: [
      {
        key: 'app:input-data',
        path: '/app/input-data/countries',
        label: 'Dữ liệu input',
        icon: <DatabaseOutlined />,
        children: [
          {
            key: 'app:input-countries',
            path: '/app/input-data/countries',
            label: 'Danh sách quốc gia',
            icon: <ProfileOutlined />,
          },
          {
            key: 'app:input-regions',
            path: '/app/input-data/regions',
            label: 'Danh sách miền',
            icon: <ProfileOutlined />,
          },
          {
            key: 'app:input-provinces',
            path: '/app/input-data/provinces',
            label: 'Danh sách tỉnh thành',
            icon: <ProfileOutlined />,
          },
          {
            key: 'app:input-wards',
            path: '/app/input-data/wards',
            label: 'Danh sách phường xã',
            icon: <ProfileOutlined />,
          },
        ],
      },
      {
        key: 'app:checklist-templates',
        path: '/app/checklist-templates',
        label: 'Mẫu checklist',
        icon: <ProfileOutlined />,
      },
    ],
  },
];

// Dạng phẳng — chỉ lấy mục LÁ để highlight key và tra key -> path.
const APPLICATION_MENU: MenuDef[] = APPLICATION_MENU_GROUPS.flatMap((g) =>
  g.items.flatMap((m) => (m.children ? m.children : [m])),
);

// Module chưa có màn hình riêng → 1 mục menu trỏ về màn placeholder.
const SINGLE_MENU: Record<string, MenuDef> = {
  REPORTS: {
    key: 'report:index',
    path: '/report',
    label: 'Báo cáo',
    icon: <BarChartOutlined />,
  },
  SYSTEM_ADMIN: {
    key: 'admin:index',
    path: '/admin',
    label: 'Quản trị hệ thống',
    icon: <SettingOutlined />,
  },
  APP_CONFIG: {
    key: 'config:index',
    path: '/config',
    label: 'Cấu hình ứng dụng',
    icon: <ToolOutlined />,
  },
  INTERNAL_CHAT: {
    key: 'chat:index',
    path: '/chat',
    label: 'Chat nội bộ',
    icon: <MessageOutlined />,
  },
  INVESTOR_PORTAL: {
    key: 'portal:index',
    path: '/portal',
    label: 'Portal chủ đầu tư',
    icon: <BankOutlined />,
  },
};

export interface HomeLayoutProps {
  onLogout: () => void;
}

// pages/home — layout sau đăng nhập: rail module | menu việc | content (route con).
// Sidebar luôn hiển thị ở mọi trang (kể cả detail), highlight theo URL.
export function HomeLayout({ onLogout }: HomeLayoutProps) {
  const queryClient = useQueryClient();
  const fetchingCount = useIsFetching();
  const { data: me, isLoading: meLoading } = useMe();
  const { data: modules = [], isLoading: modulesLoading } = useModules();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { data: profile, isLoading: profileLoading } = useCompanyProfile();
  const { data: sites = [] } = useSites();
  const { data: directory = [] } = useDirectory();
  // Tổng Tôi giao/thực hiện chỉ lấy total (limit 1) cho badge menu.
  const assignedTotalParams = useMemo(
    () => ({ scope: 'assigned' as const, limit: 1 }),
    [],
  );
  const handledTotalParams = useMemo(
    () => ({ scope: 'handled' as const, limit: 1 }),
    [],
  );
  const { data: assignedPage } = useWorksPage(assignedTotalParams);
  const { data: handledPage } = useWorksPage(handledTotalParams);
  const assignedTotal = assignedPage?.total ?? 0;
  const handledTotal = handledPage?.total ?? 0;

  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Module lấy theo URL; rail chỉ highlight, không tự đổi module.
  const activeModule = moduleOfPath(pathname);
  // Trang đã xem gần nhất của module Quy trình (để quay lại đúng chỗ).
  const [lastWorkPath, setLastWorkPath] = useState('/work');
  // Mục cha đang mở (VD "Dự án") — dùng để tự mở khi vào thẳng trang con.
  const [openMenuKeys, setOpenMenuKeys] = useState<string[]>([]);

  useEffect(() => {
    if (pathname.startsWith('/work') && !/^\/work\/\d+$/.test(pathname)) {
      setLastWorkPath(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    if (modules.length > 0 && !modules.some((m) => m.code === activeModule)) {
      navigate(MODULE_ROOTS[modules[0].code] ?? '/work', { replace: true });
    }
  }, [modules, activeModule, navigate]);

  // Nút Tải lại: refetch toàn bộ query đang có.
  async function handleReload() {
    await queryClient.invalidateQueries();
  }

  // Bấm module ở rail: nhảy sang trang đầu tiên của module đó (nếu đang ở
  // module khác); bấm lại module hiện tại thì về trang gốc của module.
  function handleModuleClick(code: string) {
    const root = MODULE_ROOTS[code] ?? '/work';
    if (activeModule === code) {
      navigate(code === 'WORKFLOW' ? lastWorkPath : root);
      return;
    }
    navigate(root);
  }

  const workMenuItems: MenuProps['items'] = useMemo(() => {
    const categoryItems: MenuProps['items'] = categories.map((c) => ({
      key: `work:category:${c.id}`,
      icon: <TagsOutlined />,
      label: c.vnName,
    }));
    return [
      { key: 'work:home', icon: <HomeOutlined />, label: 'Trang chủ' },
      {
        key: 'work:assigned',
        icon: <SendOutlined />,
        label: `Việc tôi giao (${assignedTotal})`,
      },
      {
        key: 'work:handled',
        icon: <InboxOutlined />,
        label: `Việc tôi thực hiện (${handledTotal})`,
      },
      { type: 'divider' },
      {
        key: 'group-work',
        label: 'Loại việc',
        type: 'group',
        children: categoryItems,
      },
    ];
  }, [assignedTotal, handledTotal, categories]);

  const assetMenuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'group-assets',
        label: 'Tài sản',
        type: 'group',
        children: ASSET_MENU.map((m) => ({
          key: m.key,
          icon: m.icon,
          label: m.label,
        })),
      },
    ],
    [],
  );

  const applicationMenuItems: MenuProps['items'] = useMemo(
    () =>
      APPLICATION_MENU_GROUPS.map((g) => ({
        key: g.key,
        label: g.label,
        type: 'group' as const,
        children: g.items.map((m) =>
          m.children
            ? {
                key: m.key,
                icon: m.icon,
                label: m.label,
                children: m.children.map((c) => ({
                  key: c.key,
                  label: c.label,
                })),
              }
            : { key: m.key, icon: m.icon, label: m.label },
        ),
      })),
    [],
  );

  const singleMenuItems: MenuProps['items'] = useMemo(() => {
    const def = SINGLE_MENU[activeModule];
    if (!def) return [];
    return [{ key: def.key, icon: def.icon, label: def.label }];
  }, [activeModule]);

  // Menu trái theo module đang chọn.
  const menuItems: MenuProps['items'] =
    activeModule === 'WORKFLOW'
      ? workMenuItems
      : activeModule === 'ASSETS'
        ? assetMenuItems
        : activeModule === 'APPLICATIONS'
          ? applicationMenuItems
          : singleMenuItems;

  const menuTitle =
    modules.find((m) => m.code === activeModule)?.vnName ?? 'Công việc';

  // Key đang highlight: ưu tiên path khớp, trang work detail dùng key gốc.
  const selectedKey = useMemo(() => {
    const defs: MenuDef[] =
      activeModule === 'WORKFLOW'
        ? [
            { key: 'work:home', path: '/work', label: '', icon: null },
            {
              key: 'work:assigned',
              path: '/work/assigned',
              label: '',
              icon: null,
            },
            {
              key: 'work:handled',
              path: '/work/handled',
              label: '',
              icon: null,
            },
            ...categories.map((c) => ({
              key: `work:category:${c.id}`,
              path: `/work/categories/${c.id}`,
              label: '',
              icon: null,
            })),
          ]
        : activeModule === 'ASSETS'
          ? ASSET_MENU
          : activeModule === 'APPLICATIONS'
            ? APPLICATION_MENU
            : SINGLE_MENU[activeModule]
              ? [SINGLE_MENU[activeModule]]
              : [];
    const matched = defs.find((m) => m.path === pathname);
    if (matched) return matched.key;
    if (
      activeModule === 'APPLICATIONS' &&
      /^\/app\/projects\/\d+$/.test(pathname)
    ) {
      return 'app:projects-list';
    }
    if (
      activeModule === 'APPLICATIONS' &&
      /^\/app\/customers\/\d+$/.test(pathname)
    ) {
      return 'app:customers-list';
    }
    if (
      activeModule === 'APPLICATIONS' &&
      /^\/app\/contracts\/\d+$/.test(pathname)
    ) {
      return 'app:contracts-list';
    }
    if (
      activeModule === 'APPLICATIONS' &&
      /^\/app\/investors\/\d+$/.test(pathname)
    ) {
      return 'app:investors-list';
    }
    if (
      activeModule === 'APPLICATIONS' &&
      /^\/app\/contractors\/\d+$/.test(pathname)
    ) {
      return 'app:contractors-list';
    }
    if (activeModule === 'WORKFLOW' && /^\/work\/\d+$/.test(pathname)) {
      return lastWorkPath === '/work/assigned'
        ? 'work:assigned'
        : lastWorkPath === '/work/handled'
          ? 'work:handled'
          : 'work:home';
    }
    return defs[0]?.key ?? '';
  }, [activeModule, categories, lastWorkPath, pathname]);

  // Mở mục cha khi đang ở 1 trang con của mục đó (VD vào /app/project-droplists
  // thì "Dự án" tự mở).
  useEffect(() => {
    if (!selectedKey) return;
    const parent = APPLICATION_MENU_GROUPS.flatMap((g) => g.items).find((m) =>
      m.children?.some((c) => c.key === selectedKey),
    );
    if (!parent) return;
    setOpenMenuKeys((keys) =>
      keys.includes(parent.key) ? keys : [...keys, parent.key],
    );
  }, [selectedKey]);

  // key menu -> path để navigate
  const pathByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of ASSET_MENU) map.set(m.key, m.path);
    for (const m of APPLICATION_MENU) map.set(m.key, m.path);
    // Mục cha (VD "Dự án") → trang con đầu tiên.
    for (const g of APPLICATION_MENU_GROUPS) {
      for (const m of g.items) {
        if (m.children?.length) map.set(m.key, m.children[0].path);
      }
    }
    for (const m of Object.values(SINGLE_MENU)) map.set(m.key, m.path);
    map.set('work:home', '/work');
    map.set('work:assigned', '/work/assigned');
    map.set('work:handled', '/work/handled');
    for (const c of categories) {
      map.set(`work:category:${c.id}`, `/work/categories/${c.id}`);
    }
    return map;
  }, [categories]);

  const displayName = me?.fullName?.trim() || me?.accountName || 'Người dùng';
  const avatarLetter = (displayName.charAt(0) || 'U').toUpperCase();

  const loading =
    meLoading || modulesLoading || categoriesLoading || profileLoading;

  const context: HomeOutletContext = {
    me: me ?? null,
    modules,
    categories,
    profile: profile ?? null,
    sites,
    directory,
    assignedTotal,
    handledTotal,
  };

  if (loading) {
    return (
      <div
        className="home-layout"
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="home-layout">
      {/* Cột 1: danh sách module thẳng đứng */}
      <aside className="module-rail">
        <div className="module-rail-logo">EMD</div>
        <nav className="module-rail-list">
          {modules.map((m) => (
            <button
              key={m.code}
              type="button"
              className={`module-rail-item${activeModule === m.code ? ' active' : ''}`}
              onClick={() => handleModuleClick(m.code)}
              title={m.engName ?? m.vnName}
            >
              {MODULE_ICONS[m.code] ?? <LayoutOutlined />}
              <span>{m.vnName}</span>
            </button>
          ))}
        </nav>
        <div className="module-rail-bottom">
          <Badge
            count={assignedTotal + handledTotal}
            overflowCount={99}
            size="small"
            offset={[-2, 2]}
          >
            <button
              type="button"
              className="rail-bell"
              title="Thông báo"
              onClick={() => navigate('/work/assigned')}
            >
              <BellOutlined />
            </button>
          </Badge>
          <Dropdown
            menu={{
              items: [
                { key: 'name', label: displayName, disabled: true },
                { type: 'divider' },
                { key: 'logout', label: 'Đăng xuất', onClick: onLogout },
              ],
            }}
            placement="topRight"
            trigger={['click']}
          >
            <span title={displayName}>
              <Avatar className="rail-avatar">{avatarLetter}</Avatar>
            </span>
          </Dropdown>
        </div>
      </aside>

      {/* Cột 2: menu công việc (mỗi mục là 1 route riêng) */}
      <aside className="work-menu">
        <div
          className="work-menu-title"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{menuTitle}</span>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            loading={fetchingCount > 0}
            onClick={handleReload}
            title="Tải lại danh sách"
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={openMenuKeys}
          onOpenChange={(keys) => setOpenMenuKeys(keys as string[])}
          items={menuItems}
          onClick={({ key }) => {
            const path = pathByKey.get(key);
            if (path) navigate(path);
          }}
        />
      </aside>

      {/* Cột 3: content theo route con */}
      <main className="home-main">
        <Outlet context={context} />
      </main>
    </div>
  );
}
