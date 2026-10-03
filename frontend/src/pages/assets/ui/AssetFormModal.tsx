// pages/assets/ui/AssetFormModal — thêm / sửa 1 tài sản.
// Flow: chọn Dự án (site) → Vị trí (cây vị trí thuộc site đó) → Tài sản.
import {
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  TreeSelect,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import {
  useCreateAsset,
  useSiteLocations,
  useUpdateAsset,
} from '@/entities/asset';
import { useDroplist } from '@/entities/droplist';
import type { AssetItem, SiteLocationNode } from '@/entities/asset';
import { useSites } from '@/entities/work';
import { apiErrorMessage } from '@/shared/lib';
import { AssetLocationMap } from '@/pages/shared';

const DATE_FORMAT = 'DD/MM/YYYY';

interface AssetFormValues {
  code: string;
  name: string;
  usageDate?: Dayjs | null;
  usageStatusId?: number;
  categoryId?: number;
  locationId?: number;
  supplier?: string;
  origin?: string;
  model?: string;
  quantity?: number | null;
  unitId?: number;
  warrantyEnd?: Dayjs | null;
  conditionId?: number;
  remarks?: string;
  detail?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AssetFormModalProps {
  open: boolean;
  /** null = thêm mới, có id = sửa */
  asset: AssetItem | null;
  onClose: () => void;
}

/** Đệ quy cây vị trí → treeData của TreeSelect. */
interface LocationTreeNode {
  title: string;
  value: number;
  key: number;
  children: LocationTreeNode[];
}

function toTreeData(nodes: SiteLocationNode[]): LocationTreeNode[] {
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    key: n.id,
    children: toTreeData(n.children ?? []),
  }));
}

export function AssetFormModal({ open, asset, onClose }: AssetFormModalProps) {
  const [form] = Form.useForm<AssetFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();

  const { data: sites = [] } = useSites();
  const { data: locations = [] } = useSiteLocations(siteId, open);
  const { data: categories = [] } = useDroplist('category', open);
  const { data: units = [] } = useDroplist('unit', open);
  const { data: usageStatuses = [] } = useDroplist('usageStatus', open);
  const { data: conditions = [] } = useDroplist('condition', open);

  const locationTree = useMemo(() => toTreeData(locations), [locations]);

  // Toạ độ đang nhập (bấm trên bản đồ sẽ set vào 2 field này).
  const watchLatitude = Form.useWatch('latitude', form);
  const watchLongitude = Form.useWatch('longitude', form);

  // Mở modal: nạp giá trị hiện tại (nếu sửa) và suy ra site của vị trí đang có.
  useEffect(() => {
    if (!open) return;
    const locSiteId = asset?.location?.siteId;
    setSiteId(locSiteId ?? sites[0]?.id);
    form.resetFields();
    if (asset) {
      form.setFieldsValue({
        code: asset.code,
        name: asset.name,
        usageDate: asset.usageDate ? dayjs(asset.usageDate) : null,
        usageStatusId: asset.usageStatusId ?? undefined,
        categoryId: asset.categoryId ?? undefined,
        locationId: asset.locationId ?? undefined,
        supplier: asset.supplier ?? undefined,
        origin: asset.origin ?? undefined,
        model: asset.model ?? undefined,
        quantity:
          asset.quantity === null || asset.quantity === undefined
            ? undefined
            : Number(asset.quantity),
        unitId: asset.unitId ?? undefined,
        warrantyEnd: asset.warrantyEnd ? dayjs(asset.warrantyEnd) : null,
        conditionId: asset.conditionId ?? undefined,
        remarks: asset.remarks ?? undefined,
        detail: asset.detail ?? undefined,
        latitude:
          asset.latitude === null || asset.latitude === undefined
            ? undefined
            : Number(asset.latitude),
        longitude:
          asset.longitude === null || asset.longitude === undefined
            ? undefined
            : Number(asset.longitude),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset]);

  // Đổi dự án thì vị trí đã chọn có thể không còn thuộc site mới → xoá.
  function handleSiteChange(v: number) {
    setSiteId(v);
    form.setFieldValue('locationId', undefined);
  }

  async function handleSubmit() {
    let values: AssetFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      usageDate: values.usageDate?.format('YYYY-MM-DD'),
      warrantyEnd: values.warrantyEnd?.format('YYYY-MM-DD'),
      usageStatusId: values.usageStatusId ?? null,
      categoryId: values.categoryId ?? null,
      locationId: values.locationId ?? null,
      supplier: values.supplier?.trim() || undefined,
      origin: values.origin?.trim() || undefined,
      model: values.model?.trim() || undefined,
      quantity: values.quantity ?? null,
      unitId: values.unitId ?? null,
      conditionId: values.conditionId ?? null,
      remarks: values.remarks?.trim() || undefined,
      detail: values.detail?.trim() || undefined,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
    };
    try {
      if (asset) {
        await updateMutation.mutateAsync({ id: asset.id, payload });
        messageApi.success('Đã cập nhật tài sản.');
      } else {
        await createMutation.mutateAsync(payload);
        messageApi.success('Đã thêm tài sản.');
      }
      onClose();
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu tài sản thất bại.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={asset ? `Sửa tài sản — ${asset.code}` : 'Thêm tài sản'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={asset ? 'Lưu' : 'Thêm'}
      confirmLoading={saving}
      width={900}
      destroyOnClose
      zIndex={1200}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      {contextHolder}
      <Form form={form} layout="vertical" requiredMark="optional">
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Mã tài sản"
              name="code"
              rules={[{ required: true, message: 'Vui lòng nhập mã tài sản.' }]}
            >
              <Input placeholder="VD: AC-001" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              label="Tên tài sản"
              name="name"
              rules={[
                { required: true, message: 'Vui lòng nhập tên tài sản.' },
              ]}
            >
              <Input placeholder="VD: Điều hoà 2 chiều 18000BTU" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Dự án"
              help="Dùng để lọc danh sách vị trí bên dưới"
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn dự án"
                optionFilterProp="label"
                value={siteId}
                options={sites.map((s) => ({ value: s.id, label: s.name }))}
                onChange={(v) => handleSiteChange(v)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              label="Vị trí"
              name="locationId"
              help={
                siteId ? undefined : 'Chọn dự án trước để lọc vị trí theo site'
              }
            >
              <TreeSelect
                showSearch
                allowClear
                disabled={!siteId}
                placeholder={
                  siteId ? 'Chọn vị trí' : 'Chọn dự án trước để lọc vị trí'
                }
                treeData={locationTree}
                treeDefaultExpandAll
                treeNodeFilterProp="title"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Ngày sử dụng" name="usageDate">
              <DatePicker format={DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Trạng thái dùng" name="usageStatusId">
              <Select
                allowClear
                placeholder="Chọn trạng thái"
                options={usageStatuses.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Danh mục tài sản" name="categoryId">
              <Select
                allowClear
                showSearch
                placeholder="Chọn danh mục"
                optionFilterProp="label"
                options={categories.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Nhà cung cấp" name="supplier">
              <Input placeholder="VD: Daikin" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Xuất xứ" name="origin">
              <Input placeholder="VD: Nhật Bản" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Model" name="model">
              <Input placeholder="VD: FTV-B50" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Số lượng" name="quantity">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Đơn vị tính" name="unitId">
              <Select
                allowClear
                placeholder="Chọn đơn vị"
                options={units.map((d) => ({ value: d.id, label: d.name }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Hạn bảo hành" name="warrantyEnd">
              <DatePicker format={DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Tình trạng" name="conditionId">
              <Select
                allowClear
                placeholder="Chọn tình trạng"
                options={conditions.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Remarks" name="remarks">
              <Input placeholder="Ghi chú ngắn về tài sản" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Vĩ độ"
              name="latitude"
              help="Bấm trên bản đồ để đặt tài sản, hoặc nhập tay"
            >
              <InputNumber
                min={-90}
                max={90}
                step={0.0000001}
                placeholder="VD: 21.0278000"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Kinh độ"
              name="longitude"
              help="Bấm trên bản đồ để đặt tài sản, hoặc nhập tay"
            >
              <InputNumber
                min={-180}
                max={180}
                step={0.0000001}
                placeholder="VD: 105.8342000"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Bản đồ vị trí tài sản">
          <AssetLocationMap
            latitude={watchLatitude}
            longitude={watchLongitude}
            editable
            height={300}
            onPick={(point) => {
              form.setFieldsValue({
                latitude: Number(point.latitude.toFixed(7)),
                longitude: Number(point.longitude.toFixed(7)),
              });
            }}
          />
        </Form.Item>

        <Form.Item label="Thông tin chi tiết" name="detail">
          <Input.TextArea
            rows={3}
            placeholder="Thông số kỹ thuật, lịch bảo trì, ghi chú vận hành..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
