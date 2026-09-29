import { HomeLayout } from './HomeLayout';

export interface HomePageProps {
  onLogout: () => void;
}

// pages/home — trang chủ sau đăng nhập (public API của slice).
export function HomePage({ onLogout }: HomePageProps) {
  return <HomeLayout onLogout={onLogout} />;
}
