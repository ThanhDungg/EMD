import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  ChecklistTemplatePage,
  ContractDetailPage,
  ContractListPage,
  ContractorDetailPage,
  ContractorListPage,
  ContractorTypePage,
  ContractorTypeTable,
  CustomerDetailPage,
  CustomerListPage,
  InvestorDetailPage,
  InvestorGroupPage,
  InvestorListPage,
  InputDataCountryPage,
  InputDataProvincePage,
  InputDataRegionPage,
  InputDataWardPage,
  IncidentDroplistPage,
  ProjectDetailPage,
  ProjectDroplistPage,
  ProjectPage,
} from '@/pages/app';
import {
  EmployeeListPage,
  GroupListPage,
  HrCatalogPage,
  InvestorAccountPage,
  RequireAdmin,
} from '@/pages/admin';
import {
  AssetListPage,
  AssetDroplistPage,
  SiteLocationPage,
} from '@/pages/assets';
import {
  CategoryWorksPage,
  HomeDashboard,
  HomePage,
  ScopeWorksPage,
} from '@/pages/home';
import { ModulePlaceholderPage } from '@/pages/placeholder';
import { WorkDetailPage } from '@/pages/work-detail';
import { LoginPage } from '@/pages/login';
import { apiClient } from '@/shared/api';
import { clearToken, getToken } from '@/shared/auth';
import { AppProviders } from './providers';
import 'antd/dist/reset.css';
import '@/shared/theme/variables.css';
import './styles/app.css';
import './styles/auth-shell.css';

// app/ — composition root: cổng đăng nhập + routes sau đăng nhập.
// Mỗi module 1 prefix URL riêng (xem MODULE_ROOTS trong HomeLayout):
//   /work (Quy trình) · /app (Ứng dụng) · /assets (Tài sản) ·
//   /report (Báo cáo) · /admin (Quản trị hệ thống) · /config (Cấu hình) ·
//   /chat (Chat nội bộ) · /portal (Portal chủ đầu tư).
// Module chưa có màn hình → ModulePlaceholderPage.
function Shell() {
  const [authed, setAuthed] = useState<boolean>(() => getToken() !== null);

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />;
  }

  async function handleLogout() {
    // Thu hồi refresh token ở server (best-effort), rồi mới xoá local
    const token = getToken();
    if (token) {
      await apiClient.post('/auth/logout', {}, token).catch(() => undefined);
    }
    clearToken();
    setAuthed(false);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/work" replace />} />
        <Route path="/work" element={<HomePage onLogout={handleLogout} />}>
          {/* Quy trình */}
          <Route index element={<HomeDashboard />} />
          <Route
            path="assigned"
            element={<ScopeWorksPage scope="assigned" />}
          />
          <Route path="handled" element={<ScopeWorksPage scope="handled" />} />
          <Route
            path="categories/:categoryId"
            element={<CategoryWorksPage />}
          />
          <Route path=":id" element={<WorkDetailPage />} />
        </Route>

        {/* Ứng dụng: card nhập dữ liệu droplist cho sự cố hư hỏng */}
        <Route path="/app" element={<HomePage onLogout={handleLogout} />}>
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<ProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="project-droplists" element={<ProjectDroplistPage />} />
          <Route path="contracts" element={<ContractListPage />} />
          <Route
            path="contracts/:contractId"
            element={<ContractDetailPage />}
          />
          <Route path="contractors" element={<ContractorListPage />} />
          <Route
            path="contractors/:contractorId"
            element={<ContractorDetailPage />}
          />
          <Route
            path="contractor-types"
            element={
              <>
                <ContractorTypePage />
                <ContractorTypeTable />
              </>
            }
          />
          <Route path="input-data/countries" element={<InputDataCountryPage />} />
          <Route
            path="input-data/regions"
            element={<InputDataRegionPage />}
          />
          <Route
            path="input-data/provinces"
            element={<InputDataProvincePage />}
          />
          <Route path="input-data/wards" element={<InputDataWardPage />} />
          <Route path="investors" element={<InvestorListPage />} />
          <Route
            path="investors/:investorId"
            element={<InvestorDetailPage />}
          />
          <Route path="investor-groups" element={<InvestorGroupPage />} />
          <Route path="customers" element={<CustomerListPage />} />
          <Route
            path="customers/:customerId"
            element={<CustomerDetailPage />}
          />
          <Route
            path="checklist-templates"
            element={<ChecklistTemplatePage />}
          />
          <Route path="incident-droplists" element={<IncidentDroplistPage />} />
        </Route>

        {/* Tài sản */}
        <Route path="/assets" element={<HomePage onLogout={handleLogout} />}>
          <Route index element={<AssetListPage />} />
          <Route path="locations" element={<SiteLocationPage />} />
          <Route path="droplists" element={<AssetDroplistPage />} />
        </Route>

        {/* Module chưa phát triển */}
        <Route path="/report" element={<HomePage onLogout={handleLogout} />}>
          <Route
            index
            element={
              <ModulePlaceholderPage
                moduleName="Báo cáo"
                description="Các báo cáo tổng hợp theo dự án, tài sản và sự cố sẽ có ở đây."
              />
            }
          />
        </Route>
        <Route path="/admin" element={<HomePage onLogout={handleLogout} />}>
          <Route index element={<Navigate to="employees" replace />} />
          <Route
            path="employees"
            element={
              <RequireAdmin>
                <EmployeeListPage />
              </RequireAdmin>
            }
          />
          <Route
            path="groups"
            element={
              <RequireAdmin>
                <GroupListPage />
              </RequireAdmin>
            }
          />
          <Route
            path="investor-accounts"
            element={
              <RequireAdmin>
                <InvestorAccountPage />
              </RequireAdmin>
            }
          />
          <Route
            path="catalogs"
            element={
              <RequireAdmin>
                <HrCatalogPage />
              </RequireAdmin>
            }
          />
        </Route>
        <Route path="/config" element={<HomePage onLogout={handleLogout} />}>
          <Route
            index
            element={
              <ModulePlaceholderPage
                moduleName="Cấu hình ứng dụng"
                description="Cấu hình tham số, biểu mẫu và trạng thái hiển thị sẽ có ở đây."
              />
            }
          />
        </Route>
        <Route path="/chat" element={<HomePage onLogout={handleLogout} />}>
          <Route
            index
            element={
              <ModulePlaceholderPage
                moduleName="Chat nội bộ"
                description="Nhắn tin nội bộ theo phòng ban và trao đổi nhanh sẽ có ở đây."
              />
            }
          />
        </Route>
        <Route path="/portal" element={<HomePage onLogout={handleLogout} />}>
          <Route
            index
            element={
              <ModulePlaceholderPage
                moduleName="Portal chủ đầu tư"
                description="Không gian riêng của chủ đầu tư sẽ có ở đây."
              />
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/work" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// app/ — chỉ ráp pages + providers, không chứa business logic.
export function App() {
  return (
    <AppProviders>
      <Shell />
    </AppProviders>
  );
}
