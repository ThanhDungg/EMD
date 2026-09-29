import { Alert, Checkbox, Form } from 'antd';
import { useState } from 'react';
import {
  clearSavedAccount,
  getSavedAccount,
  saveAccount,
  setRefreshToken,
  setToken,
} from '@/shared/auth';
import { Button, Card, Input } from '@/shared/ui';
import { login } from '../api/login';
import type { AuthResponse } from '../model/login';
import { toLoginPayload } from '../model/login';
import type { LoginFormValues } from '../model/login';
import './LoginPage.css';

export interface LoginPageProps {
  onSuccess?: (auth: AuthResponse) => void;
}

// pages/login — màn hình đăng nhập (tài khoản + mật khẩu + lưu tài khoản).
export function LoginPage({ onSuccess }: LoginPageProps) {
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedAccount = getSavedAccount();

  async function handleFinish(values: LoginFormValues) {
    setLoading(true);
    setError(null);
    try {
      // Đăng nhập qua API backend (POST /auth/login).
      // Khi backend chưa có API này, vẫn cho vào bằng tài khoản demo/demo
      // để xem giao diện sau đăng nhập.
      let auth: AuthResponse;
      try {
        auth = await login(toLoginPayload(values));
      } catch (err) {
        if (values.account.trim() === 'demo' && values.password === 'demo') {
          auth = { accessToken: 'dev-demo-token' };
        } else {
          throw err;
        }
      }

      if (values.remember) {
        saveAccount(values.account.trim());
      } else {
        clearSavedAccount();
      }
      setToken(auth.accessToken);
      if (auth.refreshToken) setRefreshToken(auth.refreshToken);
      onSuccess?.(auth);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập thất bại, vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card" bordered={false}>
        <h1 className="login-title">Đăng nhập</h1>
        <p className="login-subtitle">Chào mừng bạn quay trở lại</p>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          initialValues={{
            account: savedAccount ?? '',
            password: '',
            remember: !!savedAccount,
          }}
          onFinish={handleFinish}
          requiredMark={false}
          autoComplete="off"
        >
          <Form.Item
            label="Tài khoản"
            name="account"
            rules={[{ required: true, message: 'Vui lòng nhập tài khoản!' }]}
          >
            <Input placeholder="Nhập tài khoản..." autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              placeholder="Nhập mật khẩu..."
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item
            name="remember"
            valuePropName="checked"
            className="login-remember"
          >
            <Checkbox>Lưu tài khoản</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button variant="primary" htmlType="submit" block loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
