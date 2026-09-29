// pages/app/ui/ContractProfileFields — bộ field hợp đồng dạng lưới 2 cột
// "title: nội dung", dùng chung cho modal thêm hợp đồng và trang chi tiết.
// Hợp đồng thuộc NHIỀU dự án → ô "Dự án" chọn nhiều (mode="multiple").
import { DatePicker, Form, Input, Select } from 'antd';
import { CONTRACT_TERM_LABEL, CONTRACT_TYPE_LABEL } from '@/entities/contract';
import type { ContractTermType, ContractType } from '@/entities/contract';
import { useDroplist } from '@/entities/droplist';
import { useSiteProfiles } from '@/entities/site';
import './ContractProfileFields.css';

const DATE_FORMAT = 'DD/MM/YYYY';

function options<T extends { id: number; name: string }>(list: T[]) {
  return list.map((x) => ({ value: x.id, label: x.name }));
}

export function ContractProfileFields() {
  const form = Form.useFormInstance();
  // Loại thời gian quyết định có bắt buộc ngày kết thúc hay không.
  const termType = Form.useWatch('termType', form) as
    ContractTermType | undefined;
  const hasTerm = !termType || termType === 'TERM';

  const { data: serviceTypes = [] } = useDroplist('serviceType');
  const { data: sites = [] } = useSiteProfiles();

  return (
    <div className="contract-profile-grid-wrap">
      <div className="contract-profile-grid">
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">Mã hợp đồng:</span>
          <Form.Item
            className="contract-profile-grid__control"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã hợp đồng.' }]}
          >
            <Input placeholder="VD: HD0001" />
          </Form.Item>
        </div>
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">Tên công ty:</span>
          <Form.Item
            className="contract-profile-grid__control"
            name="companyName"
            rules={[{ required: true, message: 'Vui lòng nhập tên công ty.' }]}
          >
            <Input placeholder="VD: Công ty CP Tân Đại Lộc" />
          </Form.Item>
        </div>
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">
            Tên loại hợp đồng:
          </span>
          <Form.Item
            className="contract-profile-grid__control"
            name="typeName"
            rules={[
              { required: true, message: 'Vui lòng nhập tên loại hợp đồng.' },
            ]}
          >
            <Input placeholder="VD: Hợp đồng dịch vụ bảo trì" />
          </Form.Item>
        </div>
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">Loại hợp đồng:</span>
          <Form.Item
            className="contract-profile-grid__control"
            name="contractType"
            rules={[
              { required: true, message: 'Vui lòng chọn loại hợp đồng.' },
            ]}
          >
            <Select
              options={Object.entries(CONTRACT_TYPE_LABEL).map(
                ([value, label]) => ({
                  value: value as ContractType,
                  label,
                }),
              )}
            />
          </Form.Item>
        </div>
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">
            Loại hình dịch vụ:
          </span>
          <Form.Item
            className="contract-profile-grid__control"
            name="serviceTypeId"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn loại hình dịch vụ"
              options={options(serviceTypes)}
            />
          </Form.Item>
        </div>
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">
            Loại thời gian hợp đồng:
          </span>
          <Form.Item
            className="contract-profile-grid__control"
            name="termType"
            rules={[
              {
                required: true,
                message: 'Vui lòng chọn loại thời gian hợp đồng.',
              },
            ]}
          >
            <Select
              options={Object.entries(CONTRACT_TERM_LABEL).map(
                ([value, label]) => ({
                  value: value as ContractTermType,
                  label,
                }),
              )}
            />
          </Form.Item>
        </div>
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">Ngày bắt đầu:</span>
          <Form.Item
            className="contract-profile-grid__control"
            name="startDate"
          >
            <DatePicker format={DATE_FORMAT} placeholder="DD/MM/YYYY" />
          </Form.Item>
        </div>
        <div className="contract-profile-grid__item">
          <span className="contract-profile-grid__label">Ngày kết thúc:</span>
          <Form.Item
            className="contract-profile-grid__control"
            name="endDate"
            rules={
              hasTerm
                ? [
                    {
                      required: true,
                      message: 'Hợp đồng có thời hạn phải có ngày kết thúc.',
                    },
                  ]
                : []
            }
          >
            <DatePicker
              format={DATE_FORMAT}
              placeholder={hasTerm ? 'DD/MM/YYYY' : 'Hợp đồng không thời hạn'}
              disabled={!hasTerm}
            />
          </Form.Item>
        </div>

        {/* Chọn nhiều dự án (quan hệ nhiều-nhiều) */}
        <div className="contract-profile-grid__item contract-profile-grid__item--full contract-profile-grid__item--top">
          <span className="contract-profile-grid__label">Dự án:</span>
          <Form.Item
            className="contract-profile-grid__control"
            name="siteIds"
            extra="Chọn nhiều dự án — 1 hợp đồng có thể thuộc nhiều dự án và 1 dự án có nhiều hợp đồng."
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn dự án của hợp đồng"
              maxTagCount="responsive"
              options={sites.map((s) => ({
                value: s.id,
                label: s.code ? `${s.code} · ${s.name}` : s.name,
              }))}
            />
          </Form.Item>
        </div>

        <div className="contract-profile-grid__item contract-profile-grid__item--full">
          <span className="contract-profile-grid__label">Ghi chú:</span>
          <Form.Item className="contract-profile-grid__control" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú về hợp đồng" />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}
