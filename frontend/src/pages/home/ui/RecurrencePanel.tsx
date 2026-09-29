import {
  CalendarOutlined,
  EyeOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { BodyCard } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { previewRecurrence } from '../api/home';
import {
  useCreateRecurrence,
  useDeleteRecurrence,
  useGenerateRecurrence,
  useRecurrences,
  useToggleRecurrence,
} from '../api/homeQueries';
import type { RecurrenceFrequency } from '@/entities/work';
import type { WorkRecurrence } from '../model/home';

const { Text, Paragraph } = Typography;

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  WEEKLY: 'Hàng tuần',
  MONTHLY: 'Hàng tháng',
  QUARTERLY: 'Hàng quý',
  YEARLY: 'Hàng năm',
};

function ruleText(r: WorkRecurrence): string {
  switch (r.frequency) {
    case 'WEEKLY':
      return `Hàng tuần (${r.weekdays.map((w) => WEEKDAY_LABELS[w - 1]).join(', ')})`;
    case 'MONTHLY':
      return `Hàng tháng (ngày ${r.monthDays.join(', ')})`;
    case 'QUARTERLY':
      return `Hàng quý (${r.quarterlyMode === 'START_OF_QUARTER' ? 'đầu quý' : 'cuối quý'})`;
    case 'YEARLY':
      return `Hàng năm (ngày ${r.yearDay}/${r.yearMonth})`;
  }
}

interface RecurrencePanelProps {
  categoryId: number;
  categoryName: string;
}

interface RecurrenceFormValues {
  title: string;
  description?: string;
  frequency: RecurrenceFrequency;
  weekdays?: number[];
  monthDays?: number[];
  quarterlyMode?: 'START_OF_QUARTER' | 'END_OF_QUARTER';
  yearMonth?: number;
  yearDay?: number;
  startDate?: dayjs.Dayjs | null;
  endType?: 'NEVER' | 'ON_DATE';
  endDate?: dayjs.Dayjs | null;
}

// Tab Việc lặp trong màn hình loại việc (checklist + kiểm tra năng lượng):
// danh sách lịch + thêm lịch + xem trước ngày sinh + sinh ngay + bật/tắt.
export function RecurrencePanel({
  categoryId,
  categoryName,
}: RecurrencePanelProps) {
  const { data: items = [], isLoading: loading } = useRecurrences(categoryId);
  const createMutation = useCreateRecurrence(categoryId);
  const toggleMutation = useToggleRecurrence(categoryId);
  const deleteMutation = useDeleteRecurrence(categoryId);
  const generateMutation = useGenerateRecurrence();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<RecurrenceFormValues>();
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('WEEKLY');
  const [endType, setEndType] = useState<'NEVER' | 'ON_DATE'>('NEVER');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewDates, setPreviewDates] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  function handleCreate(values: RecurrenceFormValues) {
    const recurrence: Record<string, unknown> = { frequency: values.frequency };
    if (values.frequency === 'WEEKLY')
      recurrence.weekdays = values.weekdays ?? [];
    if (values.frequency === 'MONTHLY')
      recurrence.monthDays = values.monthDays ?? [];
    if (values.frequency === 'QUARTERLY')
      recurrence.quarterlyMode = values.quarterlyMode;
    if (values.frequency === 'YEARLY') {
      recurrence.yearMonth = values.yearMonth;
      recurrence.yearDay = values.yearDay;
    }
    if (values.startDate)
      recurrence.startDate = values.startDate.format('YYYY-MM-DD');
    recurrence.endType = values.endType ?? 'NEVER';
    if (values.endType === 'ON_DATE' && values.endDate) {
      recurrence.endDate = values.endDate.format('YYYY-MM-DD');
    }
    createMutation.mutate(
      {
        title: values.title.trim(),
        description: values.description?.trim(),
        categoryId,
        isRecurrence: true,
        recurrence: recurrence as never,
      },
      {
        onSuccess: () => {
          messageApi.success('Đã tạo lịch lặp.');
          setModalOpen(false);
          form.resetFields();
        },
        onError: (err) =>
          messageApi.error(
            err instanceof Error ? err.message : 'Tạo lịch lặp thất bại.',
          ),
      },
    );
  }

  async function handlePreview(id: number) {
    setPreviewId(id);
    setPreviewLoading(true);
    try {
      const res = await previewRecurrence(id, 8);
      setPreviewDates(res.dates);
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : 'Không xem trước được.',
      );
      setPreviewId(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleGenerate(id: number) {
    generateMutation.mutate(id, {
      onSuccess: (res) =>
        messageApi.success(`Đã sinh ${res.created} công việc.`),
      onError: (err) =>
        messageApi.error(
          err instanceof Error ? err.message : 'Sinh việc thất bại.',
        ),
    });
  }

  function handleToggle(id: number, isActive: boolean) {
    toggleMutation.mutate(
      { id, isActive },
      {
        onError: (err) =>
          messageApi.error(
            err instanceof Error ? err.message : 'Đổi trạng thái thất bại.',
          ),
      },
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => messageApi.success('Đã xoá lịch lặp.'),
      onError: (err) =>
        messageApi.error(err instanceof Error ? err.message : 'Xoá thất bại.'),
    });
  }

  const columns: ColumnsType<WorkRecurrence> = [
    { title: 'Lịch lặp', dataIndex: 'title', key: 'title' },
    {
      title: 'Tần suất',
      key: 'frequency',
      width: 230,
      render: (_, r) => ruleText(r),
    },
    {
      title: 'Kết thúc',
      key: 'endType',
      width: 140,
      render: (_, r) =>
        r.endType === 'ON_DATE' && r.endDate
          ? r.endDate.slice(0, 10)
          : 'Không kết thúc',
    },
    {
      title: 'Bật',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (v: boolean, r) => (
        <Switch
          checked={v}
          onChange={(checked) => handleToggle(r.id, checked)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 260,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(r.id)}
          >
            Xem trước
          </Button>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => handleGenerate(r.id)}
          >
            Sinh ngay
          </Button>
          <Button size="small" danger onClick={() => handleDelete(r.id)}>
            Xoá
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title={`Việc lặp — ${categoryName}`}
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setFrequency('WEEKLY');
            setEndType('NEVER');
            setModalOpen(true);
          }}
        >
          Thêm lịch lặp
        </Button>
      }
    >
      {contextHolder}
      <Paragraph type="secondary">
        Mỗi mẫu là 1 công việc thật — cron mỗi giờ tự copy nó thành công việc
        con theo tần suất. Tắt công tắc để tạm dừng 1 mẫu mà không xoá.
      </Paragraph>
      <Table<WorkRecurrence>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title="Thêm lịch lặp"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Tạo lịch"
        cancelText="Huỷ"
      >
        <Form<RecurrenceFormValues>
          form={form}
          layout="vertical"
          initialValues={{ frequency: 'WEEKLY' }}
          onValuesChange={(changed) => {
            if (changed.frequency) setFrequency(changed.frequency);
            if (changed.endType) setEndType(changed.endType);
          }}
          onFinish={handleCreate}
        >
          <Form.Item
            label="Tên công việc lặp"
            name="title"
            rules={[{ required: true, message: 'Nhập tên công việc!' }]}
          >
            <Input placeholder="VD: Checklist phòng server" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} placeholder="Mô tả chung cho các kỳ..." />
          </Form.Item>
          <Form.Item
            label="Lặp theo"
            name="frequency"
            rules={[{ required: true, message: 'Chọn tần suất!' }]}
          >
            <Select
              options={(
                Object.keys(FREQUENCY_LABELS) as RecurrenceFrequency[]
              ).map((f) => ({
                value: f,
                label: FREQUENCY_LABELS[f],
              }))}
            />
          </Form.Item>

          {frequency === 'WEEKLY' && (
            <Form.Item
              label="Lặp vào các thứ"
              name="weekdays"
              rules={[{ required: true, message: 'Chọn ít nhất 1 thứ!' }]}
            >
              <Checkbox.Group
                options={WEEKDAY_LABELS.map((label, i) => ({
                  label,
                  value: i + 1,
                }))}
              />
            </Form.Item>
          )}

          {frequency === 'MONTHLY' && (
            <Form.Item
              label="Lặp vào các ngày trong tháng"
              name="monthDays"
              rules={[{ required: true, message: 'Chọn ít nhất 1 ngày!' }]}
            >
              <Select
                mode="multiple"
                placeholder="Chọn ngày 1-31 (tháng thiếu ngày thì bỏ qua)"
                options={Array.from({ length: 31 }, (_, i) => ({
                  value: i + 1,
                  label: `Ngày ${i + 1}`,
                }))}
              />
            </Form.Item>
          )}

          {frequency === 'QUARTERLY' && (
            <Form.Item
              label="Lặp vào"
              name="quarterlyMode"
              rules={[
                { required: true, message: 'Chọn đầu quý hoặc cuối quý!' },
              ]}
            >
              <Radio.Group
                options={[
                  {
                    value: 'START_OF_QUARTER',
                    label: 'Đầu quý (1/1, 1/4, 1/7, 1/10)',
                  },
                  { value: 'END_OF_QUARTER', label: 'Cuối quý' },
                ]}
              />
            </Form.Item>
          )}

          {frequency === 'YEARLY' && (
            <Space>
              <Form.Item
                label="Tháng"
                name="yearMonth"
                rules={[{ required: true, message: 'Chọn tháng!' }]}
              >
                <Select
                  style={{ width: 130 }}
                  placeholder="Tháng"
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: i + 1,
                    label: `Tháng ${i + 1}`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                label="Ngày"
                name="yearDay"
                rules={[{ required: true, message: 'Chọn ngày!' }]}
              >
                <Select
                  style={{ width: 130 }}
                  placeholder="Ngày"
                  options={Array.from({ length: 31 }, (_, i) => ({
                    value: i + 1,
                    label: `Ngày ${i + 1}`,
                  }))}
                />
              </Form.Item>
            </Space>
          )}

          <Form.Item
            label="Từ ngày"
            name="startDate"
            tooltip="Bỏ trống = theo ngày bắt đầu của công việc mẫu"
          >
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Kết thúc lặp" name="endType" initialValue="NEVER">
            <Radio.Group
              options={[
                { value: 'NEVER', label: 'Không kết thúc' },
                { value: 'ON_DATE', label: 'Kết thúc vào ngày' },
              ]}
            />
          </Form.Item>
          {endType === 'ON_DATE' && (
            <Form.Item
              label="Kết thúc vào ngày"
              name="endDate"
              rules={[{ required: true, message: 'Chọn ngày kết thúc!' }]}
            >
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Các kỳ sắp sinh"
        open={previewId !== null}
        onCancel={() => {
          setPreviewId(null);
          setPreviewDates([]);
        }}
        footer={null}
      >
        {previewLoading ? (
          <Spin />
        ) : (
          <Space wrap>
            {previewDates.map((d) => (
              <span key={d}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                {d}
              </span>
            ))}
            {previewDates.length === 0 && (
              <Text type="secondary">Không còn kỳ nào.</Text>
            )}
          </Space>
        )}
      </Modal>
    </BodyCard>
  );
}
