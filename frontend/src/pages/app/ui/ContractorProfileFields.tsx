// pages/app/ui/ContractorProfileFields — bộ field nhà thầu dạng lưới 2 cột
// "title: nội dung", dùng chung cho modal thêm và trang chi tiết.
// Loại nhà thầu + dịch vụ cung cấp lấy từ droplist (dịch vụ dùng chung với
// danh mục dự án), địa lý 3 tầng từ droplist địa lý.
import { Form, Input, Select } from 'antd';
import { CONTRACTOR_STATUS_LABEL } from '@/entities/contractor';
import type { ContractorStatus } from '@/entities/contractor';
import { useDroplist } from '@/entities/droplist';
import { useGeoList } from '@/entities/geo';
import './ContractorProfileFields.css';

function options<T extends { id: number; name: string }>(list: T[]) {
  return list.map((x) => ({ value: x.id, label: x.name }));
}

export function ContractorProfileFields() {
  const form = Form.useFormInstance();
  const countryId = Form.useWatch('countryId', form) as number | undefined;
  const provinceId = Form.useWatch('provinceId', form) as number | undefined;

  const { data: contractorTypes = [] } = useDroplist('contractorType');
  const { data: services = [] } = useDroplist('service');
  const { data: countries = [] } = useGeoList('country');
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

  return (
    <div className="contractor-profile-grid-wrap">
      <div className="contractor-profile-grid">
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Mã nhà thầu:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã nhà thầu.' }]}
          >
            <Input placeholder="VD: NT0001" />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Tên nhà thầu:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhà thầu.' }]}
          >
            <Input placeholder="VD: Công ty CP Xây dựng An Phú" />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Loại nhà thầu:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="contractorTypeId"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn loại nhà thầu"
              options={contractorTypes.map((t) => ({
                value: t.id,
                label: t.code ? `${t.code} · ${t.name}` : t.name,
              }))}
            />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">
            Dịch vụ cung cấp:
          </span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="serviceId"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn dịch vụ cung cấp"
              options={options(services)}
            />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Mã số thuế:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="taxCode"
          >
            <Input placeholder="VD: 0101234567" />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Hotline:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="hotline"
          >
            <Input placeholder="VD: 090 123 4567" />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Quốc gia:</span>
          <Form.Item
            className="contractor-profile-grid__control"
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
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Tỉnh thành:</span>
          <Form.Item
            className="contractor-profile-grid__control"
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
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Phường xã:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="wardId"
          >
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
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Số nhà, tên đường:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="address"
          >
            <Input placeholder="VD: Số 5 Ngõ 10" />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Email:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="email"
            rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}
          >
            <Input placeholder="VD: lienhe@congty.com" />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item">
          <span className="contractor-profile-grid__label">Trạng thái:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="status"
            initialValue="ACTIVE"
          >
            <Select
              options={Object.entries(CONTRACTOR_STATUS_LABEL).map(
                ([value, label]) => ({
                  value: value as ContractorStatus,
                  label,
                }),
              )}
            />
          </Form.Item>
        </div>
        <div className="contractor-profile-grid__item contractor-profile-grid__item--full">
          <span className="contractor-profile-grid__label">Ghi chú:</span>
          <Form.Item
            className="contractor-profile-grid__control"
            name="notes"
          >
            <Input.TextArea rows={2} placeholder="Ghi chú về nhà thầu" />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}
