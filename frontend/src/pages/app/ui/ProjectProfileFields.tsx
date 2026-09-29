// pages/app/ui/ProjectProfileFields — bộ field hồ sơ dự án dạng lưới 2 cột
// "title: nội dung", dùng chung cho modal thêm dự án và form sửa hồ sơ.
// Địa lý phân cấp nối tiếp: đổi tầng trên sẽ xoá lựa chọn các tầng dưới vì
// không còn thuộc tầng trên (state đọc trực tiếp từ form, không cần copy).
import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import { useDroplist } from '@/entities/droplist';
import { useGeoList } from '@/entities/geo';
import {
  SITE_MANAGEMENT_STATUS_LABEL,
  SITE_OPERATION_STATUS_LABEL,
  SITE_RENTAL_STATUS_LABEL,
} from '@/entities/site';
import './ProjectProfileForm.css';

const DATE_FORMAT = 'DD/MM/YYYY';

function options<T extends { id: number; name: string }>(list: T[]) {
  return list.map((x) => ({ value: x.id, label: x.name }));
}

export function ProjectProfileFields() {
  const form = Form.useFormInstance();
  // 4 tầng địa lý: tầng sau chỉ lấy theo tầng trên đang chọn.
  const countryId = Form.useWatch('countryId', form) as number | undefined;
  const regionId = Form.useWatch('regionId', form) as number | undefined;
  const provinceId = Form.useWatch('provinceId', form) as number | undefined;

  const { data: countries = [] } = useGeoList('country');
  const { data: regions = [] } = useGeoList('region', countryId, !!countryId);
  const { data: provinces = [] } = useGeoList('province', regionId, !!regionId);
  const { data: wards = [] } = useGeoList('ward', provinceId, !!provinceId);
  const { data: investors = [] } = useDroplist('investor');
  const { data: serviceTypes = [] } = useDroplist('serviceType');
  const { data: services = [] } = useDroplist('service');

  return (
    <div className="project-profile-grid-wrap">
      <div className="project-profile-grid">
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Mã dự án:</span>
          <Form.Item className="project-profile-grid__control" name="code">
            <Input placeholder="TOA" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Tên dự án:</span>
          <Form.Item
            className="project-profile-grid__control"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên dự án.' }]}
          >
            <Input placeholder="Tòa A - Khu văn phòng" />
          </Form.Item>
        </div>

        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Lô:</span>
          <Form.Item className="project-profile-grid__control" name="lot">
            <Input placeholder="Lô A1-2" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Giai đoạn:</span>
          <Form.Item className="project-profile-grid__control" name="stage">
            <Input placeholder="Giai đoạn 2" />
          </Form.Item>
        </div>

        {/* Địa lý phân cấp */}
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Quốc gia:</span>
          <Form.Item className="project-profile-grid__control" name="countryId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn quốc gia"
              options={options(countries)}
              onChange={() =>
                form.setFieldsValue({
                  regionId: undefined,
                  provinceId: undefined,
                  wardId: undefined,
                })
              }
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Miền:</span>
          <Form.Item className="project-profile-grid__control" name="regionId">
            <Select
              allowClear
              showSearch
              disabled={!countryId}
              optionFilterProp="label"
              placeholder={countryId ? 'Chọn miền' : 'Chọn quốc gia trước'}
              options={options(regions)}
              onChange={() =>
                form.setFieldsValue({
                  provinceId: undefined,
                  wardId: undefined,
                })
              }
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Tỉnh thành:</span>
          <Form.Item
            className="project-profile-grid__control"
            name="provinceId"
          >
            <Select
              allowClear
              showSearch
              disabled={!regionId}
              optionFilterProp="label"
              placeholder={regionId ? 'Chọn tỉnh thành' : 'Chọn miền trước'}
              options={options(provinces)}
              onChange={() => form.setFieldValue('wardId', undefined)}
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Phường xã:</span>
          <Form.Item className="project-profile-grid__control" name="wardId">
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

        {/* Nội dung dài → chiếm trọn 1 hàng */}
        <div className="project-profile-grid__item project-profile-grid__item--full">
          <span className="project-profile-grid__label">
            Số nhà, tên đường:
          </span>
          <Form.Item className="project-profile-grid__control" name="address">
            <Input placeholder="Số 1 Nguyễn Văn Linh" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item project-profile-grid__item--full">
          <span className="project-profile-grid__label">Định vị:</span>
          <Form.Item
            className="project-profile-grid__control"
            name="geoPoints"
            extra='Các điểm cách nhau bằng dấu ";", VD: 10.7769,106.7009;10.7771,106.7012 — client sẽ khoanh vùng trên bản đồ'
          >
            <Input placeholder="10.7769,106.7009;10.7771,106.7012" />
          </Form.Item>
        </div>

        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Chủ đầu tư:</span>
          <Form.Item
            className="project-profile-grid__control"
            name="investorId"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn chủ đầu tư"
              options={options(investors)}
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Số tầng:</span>
          <Form.Item className="project-profile-grid__control" name="floors">
            <InputNumber min={0} placeholder="12" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Loại hình dịch vụ:
          </span>
          <Form.Item
            className="project-profile-grid__control"
            name="serviceTypeId"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn loại hình"
              options={options(serviceTypes)}
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Dịch vụ cung cấp:</span>
          <Form.Item className="project-profile-grid__control" name="serviceId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn dịch vụ"
              options={options(services)}
            />
          </Form.Item>
        </div>

        {/* Diện tích */}
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Diện tích đất (m²):
          </span>
          <Form.Item className="project-profile-grid__control" name="landArea">
            <InputNumber min={0} placeholder="0" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Tổng GFA (m²):</span>
          <Form.Item className="project-profile-grid__control" name="gfaArea">
            <InputNumber min={0} placeholder="0" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Tổng GLA (m²):</span>
          <Form.Item className="project-profile-grid__control" name="glaArea">
            <InputNumber min={0} placeholder="0" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Diện tích đường bộ (m²):
          </span>
          <Form.Item className="project-profile-grid__control" name="roadArea">
            <InputNumber min={0} placeholder="0" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Diện tích đã thuê (m²):
          </span>
          <Form.Item
            className="project-profile-grid__control"
            name="leasedArea"
          >
            <InputNumber min={0} placeholder="0" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Diện tích mảng xanh (m²):
          </span>
          <Form.Item className="project-profile-grid__control" name="greenArea">
            <InputNumber min={0} placeholder="0" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Phần trăm lắp đầy (%):
          </span>
          <Form.Item
            className="project-profile-grid__control"
            name="occupancyRate"
          >
            <InputNumber min={0} placeholder="0" />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Ngày tiếp nhận dự án:
          </span>
          <Form.Item
            className="project-profile-grid__control"
            name="receivedAt"
          >
            <DatePicker format={DATE_FORMAT} placeholder="DD/MM/YYYY" />
          </Form.Item>
        </div>

        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Tình trạng dự án:</span>
          <Form.Item
            className="project-profile-grid__control"
            name="operationStatus"
          >
            <Select
              allowClear
              placeholder="Chọn tình trạng"
              options={Object.entries(SITE_OPERATION_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Trạng thái cho thuê:
          </span>
          <Form.Item
            className="project-profile-grid__control"
            name="rentalStatus"
          >
            <Select
              allowClear
              placeholder="Chọn trạng thái"
              options={Object.entries(SITE_RENTAL_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">
            Trạng thái quản lý:
          </span>
          <Form.Item
            className="project-profile-grid__control"
            name="managementStatus"
          >
            <Select
              allowClear
              placeholder="Chọn trạng thái"
              options={Object.entries(SITE_MANAGEMENT_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Form.Item>
        </div>
        <div className="project-profile-grid__item">
          <span className="project-profile-grid__label">Ghi chú:</span>
          <Form.Item className="project-profile-grid__control" name="notes">
            <Input placeholder="Ghi chú về dự án" />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}
