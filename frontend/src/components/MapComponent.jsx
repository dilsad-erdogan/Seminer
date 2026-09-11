import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getDistrictColor, getConvexHull } from '../utils/colors';

// Fix Leaflet marker icons in React Vite builds
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const TILE_SERVERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

const MAP_CENTER = [41.0082, 28.9784]; // Istanbul center
const DEFAULT_ZOOM = 11;

export default function MapComponent({
  stops = [],
  districtMap = {},
  selectedDistrict = null,
  onSelectDistrict = () => {},
  activeTileLayer = 'dark',
  selectedStop = null,
  resetKey = 0
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const polygonGroupRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      preferCanvas: true // Use canvas renderer for high performance with 15k markers
    });

    // Add Zoom Control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Tile Layer
    const tileConfig = TILE_SERVERS[activeTileLayer] || TILE_SERVERS.dark;
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19
    }).addTo(map);

    // Layer group for district boundary frame polygons (bottom layer)
    polygonGroupRef.current = L.layerGroup().addTo(map);
    // Layer group for circle markers (top layer)
    layerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Reset View (Triggered by "İstanbul'a Odaklan" button)
  useEffect(() => {
    if (!mapRef.current) return;
    if (resetKey > 0) {
      mapRef.current.closePopup();
      mapRef.current.flyTo(MAP_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
    }
  }, [resetKey]);

  // Handle Tile Layer Switch
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const tileConfig = TILE_SERVERS[activeTileLayer] || TILE_SERVERS.dark;
    mapRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19
    }).addTo(mapRef.current);
  }, [activeTileLayer]);

  // Render District Boundary Frames (Polygons) and Stop Markers
  useEffect(() => {
    if (!mapRef.current || !polygonGroupRef.current || !layerGroupRef.current) return;

    polygonGroupRef.current.clearLayers();
    layerGroupRef.current.clearLayers();

    // Group all stops by district ID for convex hull calculations
    const districtPointsMap = {};
    stops.forEach(s => {
      if (!s.enlem || !s.boylam || !s.ilce_id) return;
      const ilceId = String(s.ilce_id);
      if (!districtPointsMap[ilceId]) {
        districtPointsMap[ilceId] = [];
      }
      districtPointsMap[ilceId].push([parseFloat(s.enlem), parseFloat(s.boylam)]);
    });

    // 1. Draw District Boundary Frames (Polygons)
    Object.entries(districtPointsMap).forEach(([ilceId, points]) => {
      if (points.length < 3) return;

      const hullPoints = getConvexHull(points);
      if (hullPoints.length < 3) return;

      const districtColor = getDistrictColor(ilceId);
      const ilceInfo = districtMap[ilceId];
      const ilceName = ilceInfo ? ilceInfo.ilce_adi : 'İlçe';

      const isSelected = selectedDistrict && String(selectedDistrict.ilce_id) === ilceId;
      const isAnySelected = Boolean(selectedDistrict);

      let fillOpacity = 0.15;
      let opacity = 0.85;
      let weight = 2;
      let dashArray = '6, 6';

      if (isAnySelected) {
        if (isSelected) {
          fillOpacity = 0.35;
          opacity = 1.0;
          weight = 3.5;
          dashArray = null;
        } else {
          fillOpacity = 0.03;
          opacity = 0.25;
          weight = 1;
        }
      }

      const polygon = L.polygon(hullPoints, {
        color: districtColor,
        fillColor: districtColor,
        fillOpacity: fillOpacity,
        opacity: opacity,
        weight: weight,
        dashArray: dashArray,
        lineJoin: 'round'
      });

      polygon.bindTooltip(
        `<strong>${ilceName} İlçe Çerçevesi</strong><br/>${points.length} Durak Kapsanıyor`,
        { sticky: true, className: 'district-tooltip' }
      );

      polygon.on('click', () => {
        if (ilceInfo && onSelectDistrict) {
          onSelectDistrict(ilceInfo);
        }
      });

      polygon.addTo(polygonGroupRef.current);
    });

    // 2. Filter stops if district is selected
    const displayStops = selectedDistrict
      ? stops.filter(s => String(s.ilce_id) === String(selectedDistrict.ilce_id))
      : stops;

    const bounds = [];

    displayStops.forEach(stop => {
      if (!stop.enlem || !stop.boylam) return;

      const lat = parseFloat(stop.enlem);
      const lng = parseFloat(stop.boylam);
      bounds.push([lat, lng]);

      const ilceName = districtMap[stop.ilce_id] ? districtMap[stop.ilce_id].ilce_adi : 'Bilinmiyor';
      const districtColor = getDistrictColor(stop.ilce_id);

      const circleMarker = L.circleMarker([lat, lng], {
        radius: selectedDistrict ? 5.5 : 3.5,
        fillColor: districtColor,
        color: selectedDistrict ? '#ffffff' : districtColor,
        weight: selectedDistrict ? 1.5 : 0.5,
        opacity: 0.9,
        fillOpacity: 0.8
      });

      // Custom Dark Popup Content
      const popupContent = `
        <div class="popup-card">
          <div class="popup-title">🚏 ${stop.adi || 'Durak'}</div>
          <div class="popup-info">
            <span><strong>Durak Kodu:</strong> ${stop.durak_kodu || '-'}</span>
            <span><strong>İlçe:</strong> <span style="display:inline-block; padding:1px 6px; border-radius:4px; background:${districtColor}33; color:${districtColor}; font-weight:700; border:1px solid ${districtColor}55;">${ilceName}</span></span>
            <span><strong>Tip:</strong> ${stop.durak_tipi || 'Genel'}</span>
            <span><strong>Yön:</strong> ${stop.yon_bilgisi || '-'}</span>
            <span><strong>Konum:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          </div>
        </div>
      `;

      circleMarker.bindPopup(popupContent);
      circleMarker.addTo(layerGroupRef.current);
    });

    // Fly to bounds if district selected, or fly back to center if district cleared
    if (selectedDistrict && bounds.length > 0) {
      mapRef.current.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1.2 });
    }
  }, [stops, selectedDistrict, districtMap, onSelectDistrict]);

  // Fly to specific selected stop
  useEffect(() => {
    if (!mapRef.current || !selectedStop) return;

    const lat = parseFloat(selectedStop.enlem);
    const lng = parseFloat(selectedStop.boylam);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 });

      const ilceName = districtMap[selectedStop.ilce_id] ? districtMap[selectedStop.ilce_id].ilce_adi : 'Bilinmiyor';
      const districtColor = getDistrictColor(selectedStop.ilce_id);

      const popupContent = `
        <div class="popup-card">
          <div class="popup-title">🚏 ${selectedStop.adi}</div>
          <div class="popup-info">
            <span><strong>Durak Kodu:</strong> ${selectedStop.durak_kodu || '-'}</span>
            <span><strong>İlçe:</strong> <span style="display:inline-block; padding:1px 6px; border-radius:4px; background:${districtColor}33; color:${districtColor}; font-weight:700;">${ilceName}</span></span>
            <span><strong>Tip:</strong> ${selectedStop.durak_tipi || 'Genel'}</span>
          </div>
        </div>
      `;

      L.popup({ autoClose: false })
        .setLatLng([lat, lng])
        .setContent(popupContent)
        .openOn(mapRef.current);
    }
  }, [selectedStop, districtMap]);

  return (
    <div className="map-viewport">
      <div id="istanbul-map" ref={mapContainerRef} />
    </div>
  );
}
