// pages/assets/ui/AssetQrModal — tem QR của tài sản.
// QR chứa URL trang chi tiết tài sản trong hệ thống (nội bộ): quét tem dán
// ngoài thực tế → mở thẳng trang chi tiết, xem vị trí + sự cố liên quan.
// Dùng cho 2 chế độ: 1 tài sản (nút Tem QR ở danh sách / trang chi tiết) và
// hàng loạt (nút Tem QR trên toolbar → in tem cho cả danh sách đang lọc).
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, Modal, QRCode, Space, Typography } from 'antd';
import { useRef } from 'react';
import type { AssetItem } from '@/entities/asset';

const { Text } = Typography;

/** URL quét QR → trang chi tiết tài sản. */
function assetQrUrl(asset: Pick<AssetItem, 'id'>): string {
  return `${window.location.origin}/assets/${asset.id}`;
}

export interface AssetQrModalProps {
  /** Rỗng = không có gì để in. */
  assets: AssetItem[];
  open: boolean;
  onClose: () => void;
  /** true = in tem cho cả danh sách (lưới nhiều nhãn). */
  batch?: boolean;
}

export function AssetQrModal({
  assets,
  open,
  onClose,
  batch = false,
}: AssetQrModalProps) {
  const labelRefs = useRef(new Map<number, HTMLDivElement>());
  const size = batch ? 104 : 220;

  function downloadOne(asset: AssetItem) {
    const canvas = labelRefs.current.get(asset.id)?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `qr-${asset.code || asset.id}.png`;
    a.click();
  }

  const print = () => {
    const nodes = assets
      .map((asset) => labelRefs.current.get(asset.id)?.innerHTML)
      .filter(Boolean)
      .join('');
    if (!nodes) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><title>Tem QR tài sản</title>` +
        `<style>body{font-family:Arial,sans-serif;margin:12px}` +
        `.grid{display:flex;flex-wrap:wrap;gap:10px}` +
        `.label{border:1px solid #333;border-radius:8px;padding:10px;text-align:center;width:150px}` +
        `.code{font-weight:700;font-size:14px;margin-top:6px}` +
        `.name{font-size:11px;color:#555;overflow:hidden}` +
        `@media print{.noprint{display:none}}</style></head><body>` +
        `<div class="grid">${nodes}</div></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const label = (asset: AssetItem) => (
    <div
      key={asset.id}
      ref={(node) => {
        if (node) labelRefs.current.set(asset.id, node);
        else labelRefs.current.delete(asset.id);
      }}
      className="label"
      style={{
        border: '1px solid #333',
        borderRadius: 8,
        padding: 10,
        textAlign: 'center',
        width: batch ? 150 : '100%',
      }}
    >
      <QRCode value={assetQrUrl(asset)} size={size} />
      <div className="code" style={{ marginTop: 6, fontWeight: 700 }}>
        {asset.code}
      </div>
      <div
        className="name"
        style={{ fontSize: 11, color: '#555', overflow: 'hidden' }}
      >
        {asset.name}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        batch ? `Tem QR tài sản (${assets.length} tài sản)` : 'Tem QR tài sản'
      }
      width={batch ? 900 : 420}
      footer={
        <Space>
          {batch ? (
            <Button type="primary" icon={<PrinterOutlined />} onClick={print}>
              In tất cả
            </Button>
          ) : (
            <>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => assets[0] && downloadOne(assets[0])}
              >
                Tải PNG
              </Button>
              <Button icon={<PrinterOutlined />} onClick={print}>
                In tem
              </Button>
            </>
          )}
        </Space>
      }
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: batch ? 'flex-start' : 'center',
          maxHeight: '55vh',
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {assets.map(label)}
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Quét tem bằng camera điện thoại → mở trang chi tiết tài sản (vị trí và
        danh sách sự cố liên quan). Cần đăng nhập hệ thống.
        {batch && ' Dán tem theo mã tài sản in trên nhãn.'}
      </Text>
    </Modal>
  );
}
