// pages/shared/ui/ExcelImportModal — modal nhập dữ liệu từ file .xlsx dùng
// chung cho nhiều module (tài sản, vị trí...).
// Nguyên tắc chung: tải file mẫu → chọn file → import; nếu backend báo lỗi
// theo dòng thì hiện bảng lỗi và KHÔNG ghi gì, người dùng sửa file rồi thử lại.
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Modal, Space, Table, Typography, Upload } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { AssetImportError } from '@/entities/asset';
import { apiErrorMessage } from '@/shared/lib';

const { Text, Paragraph } = Typography;

const MB = 1024 * 1024;

export interface ExcelImportModalProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Tên file khi tải file mẫu. */
  templateFileName: string;
  accept: string;
  maxSize: number;
  /** Dòng nhắc ngắn ở Alert phía trên. */
  infoMessage: string;
  infoDescription: string;
  /** Tải file mẫu từ backend. */
  loadTemplate: () => Promise<Blob>;
  /** Gọi import, ném lỗi dạng AssetImportFailure khi file sai. */
  onImport: (file: File) => Promise<T>;
  /** Hiển thị kết quả sau khi import thành công. */
  renderSuccess: (data: T) => ReactNode;
  /** Nhãn nút import (mặc định "Nhập dữ liệu"). */
  importLabel?: string;
}

export function ExcelImportModal<T>({
  open,
  onClose,
  title,
  templateFileName,
  accept,
  maxSize,
  infoMessage,
  infoDescription,
  loadTemplate,
  onImport,
  renderSuccess,
  importLabel = 'Nhập dữ liệu',
}: ExcelImportModalProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [errors, setErrors] = useState<AssetImportError[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFile(null);
    setData(null);
    setErrors([]);
    setErrorMessage(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await loadTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = templateFileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Tải file mẫu thất bại.'));
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setErrors([]);
    setErrorMessage(null);
    try {
      const result = await onImport(file);
      setData(result);
      setFile(null);
    } catch (error) {
      // Backend trả về danh sách lỗi theo dòng; lỗi khác thì chỉ có message.
      const failure = error as { errors?: AssetImportError[]; message?: string };
      setErrors(Array.isArray(failure?.errors) ? failure.errors : []);
      setErrorMessage(
        typeof failure?.message === 'string'
          ? failure.message
          : apiErrorMessage(error, 'Nhập dữ liệu thất bại.'),
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={title}
      width={720}
      destroyOnClose
      footer={[
        <Button key="close" onClick={handleClose}>
          Đóng
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<CloudUploadOutlined />}
          disabled={!file}
          loading={importing}
          onClick={handleImport}
        >
          {importLabel}
        </Button>,
      ]}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message={infoMessage}
          description={infoDescription}
          action={
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={handleDownload}
            >
              Tải file mẫu
            </Button>
          }
        />

        <Upload.Dragger
          accept={accept}
          maxCount={1}
          fileList={file ? [{ uid: '1', name: file.name }] : []}
          beforeUpload={(selected) => {
            const extension = selected.name.slice(selected.name.lastIndexOf('.'));
            if (extension.toLowerCase() !== accept) {
              setErrorMessage(
                `Chỉ hỗ trợ file ${accept}. Hãy lưu lại file đúng định dạng.`,
              );
              return Upload.LIST_IGNORE;
            }
            if (selected.size > maxSize) {
              setErrorMessage(
                `File vượt quá ${maxSize / MB} MB. Hãy chia nhỏ thành nhiều file.`,
              );
              return Upload.LIST_IGNORE;
            }
            setErrorMessage(null);
            setData(null);
            setErrors([]);
            setFile(selected);
            return false;
          }}
          onRemove={() => {
            setFile(null);
            setData(null);
          }}
        >
          <p style={{ margin: 0 }}>
            <CloudUploadOutlined style={{ fontSize: 40 }} />
          </p>
          <p style={{ margin: '8px 0 0' }}>
            Kéo thả file vào đây, hoặc bấm để chọn file
          </p>
        </Upload.Dragger>

        {errorMessage && (
          <Alert type="error" showIcon message={errorMessage} />
        )}

        {data !== null && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Nhập thành công"
            description={renderSuccess(data)}
          />
        )}

        {errors.length > 0 && (
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              <Text strong>Chi tiết lỗi</Text>
              <Text type="secondary">
                {' '}
                — sửa các dòng dưới đây trong file rồi nhập lại. Không có dữ
                liệu nào được ghi.
              </Text>
            </Paragraph>
            <Table<AssetImportError>
              size="small"
              bordered
              rowKey={(row) => `${row.row}-${row.column}-${row.message}`}
              dataSource={errors}
              pagination={{ pageSize: 8, size: 'small' }}
              columns={[
                { title: 'Dòng', dataIndex: 'row', width: 70 },
                { title: 'Cột', dataIndex: 'column', width: 160 },
                { title: 'Lỗi', dataIndex: 'message' },
              ]}
            />
          </div>
        )}
      </Space>
    </Modal>
  );
}
