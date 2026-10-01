// pages/report/ui/charts/SitesMapView — bản đồ vị trí dự án (leaflet + OSM).
// Dùng circleMarker (vector) để khỏi phụ thuộc ảnh icon của leaflet.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { ReportMarker } from '@/entities/report';

interface Props {
  markers: ReportMarker[];
  height?: number;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function SitesMapView({ markers, height = 340 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([16.05, 108.2], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Map trong card ẩn/hiện cần tính lại kích thước sau mount.
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (markers.length === 0) return;
    const bounds = L.latLngBounds([]);
    for (const m of markers) {
      L.circleMarker([m.lat, m.lng], {
        radius: 8,
        color: '#2174cd',
        weight: 2,
        fillColor: '#4d94ff',
        fillOpacity: 0.7,
      })
        .bindPopup(
          `<b>${escapeHtml(m.name)}</b>${m.sub ? `<br/>${escapeHtml(m.sub)}` : ''}`,
        )
        .addTo(layer);
      bounds.extend([m.lat, m.lng]);
    }
    map.fitBounds(bounds.pad(0.2));
  }, [markers]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
