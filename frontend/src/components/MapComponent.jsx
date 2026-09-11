import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

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
  activeTileLayer = 'dark',
  selectedStop = null,
  resetKey = 0
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
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

    // Layer group for circle markers
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

  // Update Markers based on Stops & Selected District
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    // Filter stops if district is selected
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

      const circleMarker = L.circleMarker([lat, lng], {
        radius: selectedDistrict ? 5 : 3.5,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 0.8,
        opacity: 0.9,
        fillOpacity: 0.75
      });

      // Custom Dark Popup Content
      const popupContent = `
        <div class="popup-card">
          <div class="popup-title">🚏 ${stop.adi || 'Durak'}</div>
          <div class="popup-info">
            <span><strong>Durak Kodu:</strong> ${stop.durak_kodu || '-'}</span>
            <span><strong>İlçe:</strong> ${ilceName}</span>
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
  }, [stops, selectedDistrict, districtMap]);

  // Fly to specific selected stop
  useEffect(() => {
    if (!mapRef.current || !selectedStop) return;

    const lat = parseFloat(selectedStop.enlem);
    const lng = parseFloat(selectedStop.boylam);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 });

      // Highlight with a temporary popup
      const ilceName = districtMap[selectedStop.ilce_id] ? districtMap[selectedStop.ilce_id].ilce_adi : 'Bilinmiyor';
      const popupContent = `
        <div class="popup-card">
          <div class="popup-title">🚏 ${selectedStop.adi}</div>
          <div class="popup-info">
            <span><strong>Durak Kodu:</strong> ${selectedStop.durak_kodu || '-'}</span>
            <span><strong>İlçe:</strong> ${ilceName}</span>
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
