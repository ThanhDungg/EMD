// pages/app/ui/CustomerProfileFields — bộ field khách hàng dạng lưới 2 cột
// "title: nội dung", dùng chung cho modal thêm khách hàng và trang chi tiết.
// Khách hàng thuộc NHIỀU dự án → ô "Dự án" chọn nhiều (mode="multiple"), backend
// tách mảng id ra lưu bảng nối customer_sites.
// Địa lý: quốc gia → tỉnh thành → phường xã (đổi tầng trên sẽ xoá tầng dưới).
import { Form, Input, Select } from 'antd';
import { CUSTOMER_STATUS_LABEL } from '@/entities/customer';
import type { CustomerStatus } from '@/entities/customer';
import { useDroplist } from '@/entities/droplist';
import { useGeoList } from '@/entities/geo';
import { useSiteProfiles } from '@/entities/site';
import './CustomerProfileFields.css';

function options<T extends { id: number; name: string }>(list: T[]) {
  return list.map((x) => ({ value: x.id, label: x.name }));
}

export function CustomerProfileFields() {
  const form = Form.useFormInstance();
  const countryId = Form.useWatch('countryId', form) as number | undefined;
  const provinceId = Form.useWatch('provinceId', form) as number | undefined;

  const { data: countries = [] } = useGeoList('country');
  // Tỉnh thành lọc theo quốc gia (không qua miền), phường xã lọc theo tỉnh.
  const { data: provinces = [] } = useGeoList(
    'province',
    undefined,
    !!countryId,
    countryId,
  );
  const { data: wards = [] } = useGeoList(
    'ward',
    provinceId,
    !!provinceId,
  );
  const { data: factories = [] } = useDroplist('factory');
  const { data: sites = [] } = useSiteProfiles();

  return (
    <div className="customer-profile-grid-wrap">
      <div className="customer-profile-grid">
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Mã khách hàng:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã khách hàng.' }]}
          >
            <Input placeholder="VD: KH0001" />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Tên khách hàng:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng.' }]}
          >
            <Input placeholder="VD: Công ty CP Đầu tư Tân Đại Lộc" />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Tên viết tắt:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="shortName"
          >
            <Input placeholder="VD: Tân Đại Lộc (TDL)" />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Mã số thuế:</span>
          <Form.Item className="customer-profile-grid__control" name="taxCode">
            <Input placeholder="VD: 0101234567" />
          </Form.Item>
        </div>

        {/* Địa lý: quốc gia → tỉnh thành → phường xã */}
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Quốc gia:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="countryId"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn quốc gia"
              options={options(countries)}
              onChange={() =>
                form.setFieldsValue({
                  provinceId: undefined,
                  wardId: undefined,
                })
              }
            />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Tỉnh thành:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="provinceId"
          >
            <Select
              allowClear
              showSearch
              disabled={!countryId}
              optionFilterProp="label"
              placeholder={countryId ? 'Chọn tỉnh thành' : 'Chọn quốc gia trước'}
              options={options(provinces)}
              onChange={() => form.setFieldValue('wardId', undefined)}
            />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Phường xã:</span>
          <Form.Item className="customer-profile-grid__control" name="wardId">
            <Select
              allowClear
              showSearch
              disabled={!provinceId}
              optionFilterProp="label"
              placeholder={provinceId ? 'Chọn phường xã' : 'Chọn tỉnh thành trước'}
              options={options(wards)}
            />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Số nhà:</span>
          <Form.Item className="customer-profile-grid__control" name="address">
            <Input placeholder="VD: Số 10 Trung Kính" />
          </Form.Item>
        </div>

        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Hotline:</span>
          <Form.Item className="customer-profile-grid__control" name="hotline">
            <Input placeholder="VD: 1900 6868" />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Email:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="email"
            rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}
          >
            <Input placeholder="VD: lienhe@congty.com" />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Trạng thái:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="status"
            initialValue="ACTIVE"
          >
            <Select
              options={Object.entries(CUSTOMER_STATUS_LABEL).map(
                ([value, label]) => ({ value: value as CustomerStatus, label }),
              )}
            />
          </Form.Item>
        </div>
        <div className="customer-profile-grid__item">
          <span className="customer-profile-grid__label">Nhà xưởng:</span>
          <Form.Item className="customer-profile-grid__control" name="factoryId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn nhà xưởng"
              options={options(factories)}
            />
          </Form.Item>
        </div>

        {/* Chọn nhiều dự án (quan hệ nhiều-nhiều) */}
        <div className="customer-profile-grid__item customer-profile-grid__item--full customer-profile-grid__item--top">
          <span className="customer-profile-grid__label">Dự án:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="siteIds"
            extra="Chọn nhiều dự án — 1 khách hàng có thể ở nhiều dự án và 1 dự án có nhiều khách hàng."
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn dự án khách hàng đang ở"
              maxTagCount="responsive"
              options={sites.map((s) => ({
                value: s.id,
                label: s.code ? `${s.code} · ${s.name}` : s.name,
              }))}
            />
          </Form.Item>
        </div>

        <div className="customer-profile-grid__item customer-profile-grid__item--full">
          <span className="customer-profile-grid__label">Ghi chú:</span>
          <Form.Item
            className="customer-profile-grid__control"
            name="notes"
          >
            <Input.TextArea
              rows={2}
              placeholder="Ghi chú về khách hàng"
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}
