import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';

export default function App() {
  const [stops, setStops] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [districtMap, setDistrictMap] = useState({});
  const [summaryStats, setSummaryStats] = useState({});
  
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [activeTileLayer, setActiveTileLayer] = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  // Fetch JSON datasets on initial load
  useEffect(() => {
    async function loadDatasets() {
      try {
        setIsLoading(true);

        const [stopsRes, ilceSayilariRes, ozetRes] = await Promise.all([
          fetch('/data/temizlenmis_duraklar.json'),
          fetch('/data/ilce_durak_sayilari.json'),
          fetch('/data/ozet_istatistikler.json')
        ]);

        const stopsData = await stopsRes.json();
        const ilceSayilariData = await ilceSayilariRes.json();
        const ozetData = await ozetRes.json();

        setStops(stopsData);
        setSummaryStats(ozetData);
        setDistrictMap(ilceSayilariData);

        // Convert district object to sorted array by stop count descending
        const sortedDistricts = Object.values(ilceSayilariData).sort(
          (a, b) => b.durak_sayisi - a.durak_sayisi
        );
        setDistrictsList(sortedDistricts);

      } catch (err) {
        console.error('Veri yüklenirken hata oluştu:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDatasets();
  }, []);

  const handleResetView = () => {
    setSelectedDistrict(null);
    setSelectedStop(null);
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="app-container">
      {/* Loading Screen Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">İstanbul İETT Durak Verisi Hazırlanıyor...</div>
        </div>
      )}

      {/* Top Header */}
      <Header
        activeTileLayer={activeTileLayer}
        onChangeTileLayer={setActiveTileLayer}
        onResetView={handleResetView}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Left Sidebar */}
      <Sidebar
        districtsList={districtsList}
        summaryStats={summaryStats}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={(district) => {
          setSelectedDistrict(district);
          setSelectedStop(null);
        }}
        collapsed={sidebarCollapsed}
        allStops={stops}
        onSelectStop={(stop) => {
          setSelectedStop(stop);
        }}
      />

      {/* Interactive Map */}
      <MapComponent
        stops={stops}
        districtMap={districtMap}
        selectedDistrict={selectedDistrict}
        activeTileLayer={activeTileLayer}
        selectedStop={selectedStop}
        resetKey={resetKey}
      />
    </div>
  );
}
