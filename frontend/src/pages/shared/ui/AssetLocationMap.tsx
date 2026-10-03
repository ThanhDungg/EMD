// pages/shared/ui/AssetLocationMap — bản đồ vị trí tài sản (Leaflet + OpenStreetMap).
// 2 chế độ: xem (trang chi tiết tài sản) và chọn toạ độ (form tạo/sửa tài sản).
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// Tọa độ mặc định khi tài sản chưa có lat/lng (trung tâm Hà Nội).
const DEFAULT_CENTER: L.LatLngExpression = [21.0278, 105.8342];

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface AssetLocationMapProps {
  latitude?: number | string | null;
  longitude?: number | string | null;
  /** Trung tâm bản đồ khi tài sản chưa có toạ độ (VD: vị trí đang chọn). */
  center?: LatLngPoint | null;
  zoom?: number;
  height?: number;
  /** Có thao tác chọn/kéo để đổi toạ độ hay không. */
  editable?: boolean;
  onPick?: (point: LatLngPoint) => void;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Pin dạng chấm tròn (divIcon) — tránh phụ thuộc ảnh icon mặc định của Leaflet. */
const pinIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export function AssetLocationMap({
  latitude,
  longitude,
  center,
  zoom = 16,
  height = 320,
  editable = false,
  onPick,
}: AssetLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Callback mới nhất mà không cần dựng lại map.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  const hasPoint = lat !== null && lng !== null;

  // Dựng map 1 lần.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const cLat = toNumber(center?.latitude);
    const cLng = toNumber(center?.longitude);
    const map = L.map(containerRef.current, {
      center: hasPoint
        ? ([lat, lng] as L.LatLngExpression)
        : cLat !== null && cLng !== null
          ? ([cLat, cLng] as L.LatLngExpression)
          : DEFAULT_CENTER,
      zoom: hasPoint ? zoom : cLat !== null ? 17 : zoom === 16 ? 11 : zoom,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    if (hasPoint) {
      markerRef.current = L.marker([lat, lng], {
        icon: pinIcon(editable ? '#2174cd' : '#d13b3b'),
        draggable: editable,
      }).addTo(map);
      if (editable) {
        markerRef.current.on('dragend', () => {
          const p = markerRef.current?.getLatLng();
          if (p) onPickRef.current?.({ latitude: p.lat, longitude: p.lng });
        });
      }
    }
    if (editable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onPickRef.current?.({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
      });
    }
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Di chuyển pin khi toạ độ đổi (bấm trên bản đồ / kéo pin / đổi tài sản).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hasPoint) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: pinIcon(editable ? '#2174cd' : '#d13b3b'),
        draggable: editable,
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current?.getLatLng();
        if (p) onPickRef.current?.({ latitude: p.lat, longitude: p.lng });
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    map.setView([lat, lng], Math.max(map.getZoom(), zoom));
  }, [hasPoint, lat, lng, editable, zoom]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid #e5e8ef',
        background: '#eef1f6',
      }}
    />
  );
}
