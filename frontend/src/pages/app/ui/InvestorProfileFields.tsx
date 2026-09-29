// pages/app/ui/InvestorProfileFields — bộ field chủ đầu tư dạng lưới 2 cột
// "title: nội dung", dùng chung cho modal thêm và trang chi tiết.
// Chủ đầu tư cha + địa lý đều lấy từ droplist (chủ đầu tư cha, quốc gia,
// tỉnh thành, phường xã).
import { Form, Input, Select } from 'antd';
import { useDroplist } from '@/entities/droplist';
import { useGeoList } from '@/entities/geo';
import './InvestorProfileFields.css';

function options<T extends { id: number; name: string }>(list: T[]) {
  return list.map((x) => ({ value: x.id, label: x.name }));
}

export function InvestorProfileFields() {
  const form = Form.useFormInstance();
  const countryId = Form.useWatch('countryId', form) as number | undefined;
  const provinceId = Form.useWatch('provinceId', form) as number | undefined;

  const { data: groups = [] } = useDroplist('investorGroup');
  const { data: countries = [] } = useGeoList('country');
  const { data: provinces = [] } = useGeoList(
    'province',
    undefined,
    !!countryId,
    countryId,
  );
  const { data: wards = [] } = useGeoList('ward', provinceId, !!provinceId);

  return (
    <div className="investor-profile-grid-wrap">
      <div className="investor-profile-grid">
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Mã chủ đầu tư:</span>
          <Form.Item
            className="investor-profile-grid__control"
            name="code"
            rules={[
              { required: true, message: 'Vui lòng nhập mã chủ đầu tư.' },
            ]}
          >
            <Input placeholder="VD: CTY_TDL" />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Tên chủ đầu tư:</span>
          <Form.Item
            className="investor-profile-grid__control"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập tên chủ đầu tư.' },
            ]}
          >
            <Input placeholder="VD: Công ty CP Đầu tư Tân Đại Lộc" />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">
            Thuộc chủ đầu tư cha:
          </span>
          <Form.Item
            className="investor-profile-grid__control"
            name="investorGroupId"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn chủ đầu tư cha"
              options={groups.map((g) => ({
                value: g.id,
                label: g.code ? `${g.code} · ${g.name}` : g.name,
              }))}
            />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Mã số thuế:</span>
          <Form.Item className="investor-profile-grid__control" name="taxCode">
            <Input placeholder="VD: 0101234567" />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">
            Đại diện pháp nhân:
          </span>
          <Form.Item
            className="investor-profile-grid__control"
            name="legalRepresentative"
          >
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Quốc gia:</span>
          <Form.Item
            className="investor-profile-grid__control"
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
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Tỉnh thành:</span>
          <Form.Item
            className="investor-profile-grid__control"
            name="provinceId"
          >
            <Select
              allowClear
              showSearch
              disabled={!countryId}
              optionFilterProp="label"
              placeholder={
                countryId ? 'Chọn tỉnh thành' : 'Chọn quốc gia trước'
              }
              options={options(provinces)}
              onChange={() => form.setFieldValue('wardId', undefined)}
            />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Phường xã:</span>
          <Form.Item className="investor-profile-grid__control" name="wardId">
            <Select
              allowClear
              showSearch
              disabled={!provinceId}
              optionFilterProp="label"
              placeholder={
                provinceId ? 'Chọn phường xã' : 'Chọn tỉnh thành trước'
              }
              options={options(wards)}
            />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">
            Số nhà, tên đường:
          </span>
          <Form.Item className="investor-profile-grid__control" name="address">
            <Input placeholder="VD: Số 1 Đê La Thành" />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Email:</span>
          <Form.Item
            className="investor-profile-grid__control"
            name="email"
            rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}
          >
            <Input placeholder="VD: lienhe@congty.com" />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item">
          <span className="investor-profile-grid__label">Hotline:</span>
          <Form.Item className="investor-profile-grid__control" name="hotline">
            <Input placeholder="VD: 1900 6868" />
          </Form.Item>
        </div>
        <div className="investor-profile-grid__item investor-profile-grid__item--full">
          <span className="investor-profile-grid__label">Ghi chú:</span>
          <Form.Item className="investor-profile-grid__control" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú về chủ đầu tư" />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}
