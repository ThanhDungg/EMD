// pages/admin/ui/AccountFormFields — field dùng chung cho modal
// thêm/sửa nhân viên và tài khoản chủ đầu tư.
// Bố cục 2 cột theo nhóm: Tài khoản | Thông tin cá nhân | Công việc.
import { Col, DatePicker, Divider, Form, Input, Row, Select } from 'antd';
import { GENDER_LABEL } from '@/entities/user';
import type { AccountUser, Gender, UserReferences } from '@/entities/user';

export interface AccountFormValues {
  accountName: string;
  email: string;
  password?: string;
  fullName?: string;
  gender?: Gender | null;
  birthday?: import('dayjs').Dayjs | null;
  address?: string;
  internalPhone?: string;
  phone?: string;
  hireDate?: import('dayjs').Dayjs | null;
  userLevelId?: number | null;
  positionId?: number | null;
  departmentId?: number | null;
  coDepartmentId?: number | null;
  statusId?: number | null;
  managerId?: number | null;
  groupIds?: number[];
}

interface Props {
  /** true = thêm mới (mật khẩu bắt buộc), false = sửa (bỏ trống giữ cũ). */
  isCreate: boolean;
  references?: UserReferences;
  managers: AccountUser[];
  groups: Array<{ id: number; name: string }>;
}

export function AccountFormFields({
  isCreate,
  references,
  managers,
  groups,
}: Props) {
  return (
    <>
      <Divider orientation="left" orientationMargin={0}>
        Tài khoản
      </Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="accountName"
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập.' }]}
          >
            <Input placeholder="vd: nv001" disabled={!isCreate} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email.' },
              { type: 'email', message: 'Email không đúng định dạng.' },
            ]}
          >
            <Input placeholder="vd: nv001@congty.vn" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: isCreate, message: 'Vui lòng nhập mật khẩu.' },
              { min: 6, message: 'Mật khẩu phải từ 6 ký tự.' },
            ]}
            extra={isCreate ? undefined : 'Để trống để giữ mật khẩu cũ.'}
          >
            <Input.Password
              placeholder={isCreate ? 'Từ 6 ký tự' : 'Bỏ trống = giữ cũ'}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="groupIds" label="Nhóm">
            <Select mode="multiple" allowClear placeholder="Chọn nhóm">
              {groups.map((g) => (
                <Select.Option key={g.id} value={g.id}>
                  {g.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>
        Thông tin cá nhân
      </Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="fullName" label="Họ tên">
            <Input placeholder="vd: Nguyễn Văn A" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="gender" label="Giới tính">
            <Select allowClear placeholder="Chọn giới tính">
              {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
                <Select.Option key={g} value={g}>
                  {GENDER_LABEL[g]}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="birthday" label="Ngày sinh">
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Chọn ngày sinh"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="vd: 0901234567" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="internalPhone" label="SĐT nội bộ">
            <Input placeholder="vd: 101" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Địa chỉ liên hệ" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>
        Công việc
      </Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="hireDate" label="Ngày vào làm">
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Chọn ngày vào làm"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="statusId" label="Trạng thái">
            <Select allowClear placeholder="Chọn trạng thái">
              {(references?.statuses ?? []).map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="positionId" label="Chức vụ">
            <Select allowClear placeholder="Chọn chức vụ">
              {(references?.positions ?? []).map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="userLevelId" label="Cấp bậc">
            <Select allowClear placeholder="Chọn cấp bậc">
              {(references?.userLevels ?? []).map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="departmentId" label="Đơn vị">
            <Select allowClear placeholder="Chọn đơn vị">
              {(references?.departments ?? []).map((d) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="coDepartmentId" label="Đơn vị kiêm nhiệm">
            <Select allowClear placeholder="Chọn đơn vị kiêm nhiệm">
              {(references?.departments ?? []).map((d) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="managerId" label="Quản lý trực tiếp">
            <Select
              allowClear
              placeholder="Chọn quản lý"
              showSearch
              optionFilterProp="label"
            >
              {managers.map((m) => (
                <Select.Option
                  key={m.id}
                  value={m.id}
                  label={`${m.accountName} ${m.fullName ?? ''}`}
                >
                  {m.fullName
                    ? `${m.fullName} (${m.accountName})`
                    : m.accountName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
