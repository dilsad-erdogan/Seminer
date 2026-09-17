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
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxNativeZoom: 16
  },
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    subdomains: ['a', 'b', 'c']
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxNativeZoom: 19
  }
};

const MAP_CENTER = [41.0082, 28.9784]; // Istanbul center
const DEFAULT_ZOOM = 11;

export default function MapComponent({
  stops = [],
  districtMap = {},
  selectedDistrict = null,
  onSelectDistrict = () => { },
  activeTileLayer = 'dark',
  selectedStop = null,
  resetKey = 0,
  selectedStartStop = null,
  selectedEndStop = null,
  selectedIntermediateStops = [],
  onSetStartStop = () => { },
  onSetEndStop = () => { },
  onAddIntermediateStop = () => { }
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const polygonGroupRef = useRef(null);
  const layerGroupRef = useRef(null);
  const routeGroupRef = useRef(null);

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
      maxZoom: 19,
      maxNativeZoom: tileConfig.maxNativeZoom || 18,
      subdomains: tileConfig.subdomains || ['a', 'b', 'c']
    }).addTo(map);

    // Layer group for district boundary frame polygons (bottom layer)
    polygonGroupRef.current = L.layerGroup().addTo(map);
    // Layer group for circle markers (middle layer)
    layerGroupRef.current = L.layerGroup().addTo(map);
    // Layer group for route stop markers (top layer)
    routeGroupRef.current = L.layerGroup().addTo(map);

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
      maxZoom: 19,
      maxNativeZoom: tileConfig.maxNativeZoom || 18,
      subdomains: tileConfig.subdomains || ['a', 'b', 'c']
    }).addTo(mapRef.current);
  }, [activeTileLayer]);

  // Render District Boundary Frames (Polygons) and Stop Markers
  useEffect(() => {
    if (!mapRef.current || !polygonGroupRef.current || !layerGroupRef.current) return;

    polygonGroupRef.current.clearLayers();
    layerGroupRef.current.clearLayers();

    // Build quick lookup map by ilce_id as well as ilce_adi
    const districtById = {};
    Object.values(districtMap || {}).forEach(item => {
      if (item && item.ilce_id) {
        districtById[String(item.ilce_id)] = item;
      }
      if (item && item.ilce_adi) {
        districtById[item.ilce_adi] = item;
      }
    });

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
      const ilceInfo = districtById[ilceId] || districtMap[ilceId];
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
        `<strong>${ilceName} Çerçevesi</strong><br/>${points.length} Durak Kapsanıyor`,
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

      const ilceInfo = districtById[String(stop.ilce_id)];
      const ilceName = ilceInfo ? ilceInfo.ilce_adi : 'Bilinmiyor';
      const districtColor = getDistrictColor(stop.ilce_id);

      const circleMarker = L.circleMarker([lat, lng], {
        radius: selectedDistrict ? 5.5 : 3.5,
        fillColor: districtColor,
        color: selectedDistrict ? '#ffffff' : districtColor,
        weight: selectedDistrict ? 1.5 : 0.5,
        opacity: 0.9,
        fillOpacity: 0.8
      });

      const stopUid = stop.id || stop.durak_kodu;

      // Custom Dark Popup Content with Action Buttons
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
          <div class="popup-actions">
            <button class="popup-btn btn-start" id="pop-start-${stopUid}">🟢 Başlangıç</button>
            <button class="popup-btn btn-inter" id="pop-inter-${stopUid}">🔵 Ara Durak</button>
            <button class="popup-btn btn-end" id="pop-end-${stopUid}">🔴 Bitiş</button>
          </div>
        </div>
      `;

      circleMarker.bindPopup(popupContent);

      circleMarker.on('popupopen', () => {
        setTimeout(() => {
          const btnStart = document.getElementById(`pop-start-${stopUid}`);
          const btnInter = document.getElementById(`pop-inter-${stopUid}`);
          const btnEnd = document.getElementById(`pop-end-${stopUid}`);

          if (btnStart) {
            btnStart.onclick = (e) => {
              e.stopPropagation();
              onSetStartStop(stop);
              if (mapRef.current) mapRef.current.closePopup();
            };
          }
          if (btnInter) {
            btnInter.onclick = (e) => {
              e.stopPropagation();
              onAddIntermediateStop(stop);
              if (mapRef.current) mapRef.current.closePopup();
            };
          }
          if (btnEnd) {
            btnEnd.onclick = (e) => {
              e.stopPropagation();
              onSetEndStop(stop);
              if (mapRef.current) mapRef.current.closePopup();
            };
          }
        }, 30);
      });

      circleMarker.addTo(layerGroupRef.current);
    });

    // Fly to bounds if district selected, or fly back to center if district cleared
    if (selectedDistrict && bounds.length > 0) {
      mapRef.current.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1.2 });
    }
  }, [stops, selectedDistrict, districtMap, onSelectDistrict, onSetStartStop, onSetEndStop, onAddIntermediateStop]);

  // Fly to specific selected stop
  useEffect(() => {
    if (!mapRef.current || !selectedStop) return;

    const lat = parseFloat(selectedStop.enlem);
    const lng = parseFloat(selectedStop.boylam);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 });

      const districtById = {};
      Object.values(districtMap || {}).forEach(item => {
        if (item && item.ilce_id) {
          districtById[String(item.ilce_id)] = item;
        }
      });

      const ilceInfo = districtById[String(selectedStop.ilce_id)];
      const ilceName = ilceInfo ? ilceInfo.ilce_adi : 'Bilinmiyor';
      const districtColor = getDistrictColor(selectedStop.ilce_id);
      const selUid = selectedStop.id || selectedStop.durak_kodu;

      const popupContent = `
        <div class="popup-card">
          <div class="popup-title">🚏 ${selectedStop.adi}</div>
          <div class="popup-info">
            <span><strong>Durak Kodu:</strong> ${selectedStop.durak_kodu || '-'}</span>
            <span><strong>İlçe:</strong> <span style="display:inline-block; padding:1px 6px; border-radius:4px; background:${districtColor}33; color:${districtColor}; font-weight:700;">${ilceName}</span></span>
            <span><strong>Tip:</strong> ${selectedStop.durak_tipi || 'Genel'}</span>
          </div>
          <div class="popup-actions">
            <button class="popup-btn btn-start" id="pop-sel-start-${selUid}">🟢 Başlangıç</button>
            <button class="popup-btn btn-inter" id="pop-sel-inter-${selUid}">🔵 Ara Durak</button>
            <button class="popup-btn btn-end" id="pop-sel-end-${selUid}">🔴 Bitiş</button>
          </div>
        </div>
      `;

      L.popup({ autoClose: false })
        .setLatLng([lat, lng])
        .setContent(popupContent)
        .openOn(mapRef.current);

      setTimeout(() => {
        const btnStart = document.getElementById(`pop-sel-start-${selUid}`);
        const btnInter = document.getElementById(`pop-sel-inter-${selUid}`);
        const btnEnd = document.getElementById(`pop-sel-end-${selUid}`);

        if (btnStart) {
          btnStart.onclick = (e) => {
            e.stopPropagation();
            onSetStartStop(selectedStop);
            if (mapRef.current) mapRef.current.closePopup();
          };
        }
        if (btnInter) {
          btnInter.onclick = (e) => {
            e.stopPropagation();
            onAddIntermediateStop(selectedStop);
            if (mapRef.current) mapRef.current.closePopup();
          };
        }
        if (btnEnd) {
          btnEnd.onclick = (e) => {
            e.stopPropagation();
            onSetEndStop(selectedStop);
            if (mapRef.current) mapRef.current.closePopup();
          };
        }
      }, 30);
    }
  }, [selectedStop, districtMap, onSetStartStop, onSetEndStop, onAddIntermediateStop]);

  // Render Highlighted Route Markers (Start, End, Intermediates)
  useEffect(() => {
    if (!mapRef.current || !routeGroupRef.current) return;

    routeGroupRef.current.clearLayers();

    const points = [];

    // 🟢 Start Stop Marker
    if (selectedStartStop && selectedStartStop.enlem && selectedStartStop.boylam) {
      const lat = parseFloat(selectedStartStop.enlem);
      const lng = parseFloat(selectedStartStop.boylam);
      points.push([lat, lng]);

      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 3.5,
        opacity: 1,
        fillOpacity: 1
      });

      marker.bindPopup(`
        <div class="popup-card">
          <div class="popup-title" style="color: #10b981; font-size:0.9rem; font-weight:800;">🟢 BAŞLANGIÇ DURAĞI</div>
          <div class="popup-info">
            <span><strong>Durak Adı:</strong> ${selectedStartStop.adi}</span>
            <span><strong>Durak Kodu:</strong> ${selectedStartStop.durak_kodu || '-'}</span>
            <span><strong>Konum:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          </div>
        </div>
      `).openPopup();

      marker.addTo(routeGroupRef.current);
    }

    // 🔴 End Stop Marker
    if (selectedEndStop && selectedEndStop.enlem && selectedEndStop.boylam) {
      const lat = parseFloat(selectedEndStop.enlem);
      const lng = parseFloat(selectedEndStop.boylam);
      points.push([lat, lng]);

      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 3.5,
        opacity: 1,
        fillOpacity: 1
      });

      marker.bindPopup(`
        <div class="popup-card">
          <div class="popup-title" style="color: #ef4444; font-size:0.9rem; font-weight:800;">🔴 BİTİŞ DURAĞI</div>
          <div class="popup-info">
            <span><strong>Durak Adı:</strong> ${selectedEndStop.adi}</span>
            <span><strong>Durak Kodu:</strong> ${selectedEndStop.durak_kodu || '-'}</span>
            <span><strong>Konum:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          </div>
        </div>
      `);

      marker.addTo(routeGroupRef.current);
    }

    // 🔵 Intermediate Stop Markers
    (selectedIntermediateStops || []).forEach((stop, idx) => {
      if (stop && stop.enlem && stop.boylam) {
        const lat = parseFloat(stop.enlem);
        const lng = parseFloat(stop.boylam);
        points.push([lat, lng]);

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#06b6d4',
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 1
        });

        marker.bindPopup(`
          <div class="popup-card">
            <div class="popup-title" style="color: #06b6d4; font-size:0.85rem; font-weight:800;">🔵 ARA DURAK #${idx + 1}</div>
            <div class="popup-info">
              <span><strong>Durak Adı:</strong> ${stop.adi}</span>
              <span><strong>Durak Kodu:</strong> ${stop.durak_kodu || '-'}</span>
              <span><strong>Konum:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>
          </div>
        `);

        marker.addTo(routeGroupRef.current);
      }
    });

    if (points.length > 0) {
      mapRef.current.flyToBounds(points, { padding: [80, 80], maxZoom: 15, duration: 1.2 });
    }
  }, [selectedStartStop, selectedEndStop, selectedIntermediateStops]);

  return (
    <div className="map-viewport">
      <div id="istanbul-map" ref={mapContainerRef} />
    </div>
  );
}
