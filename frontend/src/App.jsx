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

  // Stop Selection States
  const [selectedStartStop, setSelectedStartStop] = useState(null);
  const [selectedEndStop, setSelectedEndStop] = useState(null);
  const [selectedIntermediateStops, setSelectedIntermediateStops] = useState([]);

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

  // Handle Random Stop Generation
  const handleGenerateRandomStops = (requestedCount = 6) => {
    const pool = selectedDistrict
      ? stops.filter(s => String(s.ilce_id) === String(selectedDistrict.ilce_id))
      : stops;

    if (!pool || pool.length < 2) {
      alert('Seçilen bölgede yeterli durak bulunamadı!');
      return;
    }

    const count = Math.min(requestedCount, pool.length);
    // Fisher-Yates shuffle copy of pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const pickedStops = shuffled.slice(0, count);

    const start = pickedStops[0];
    const end = pickedStops[pickedStops.length - 1];
    const intermediates = pickedStops.slice(1, pickedStops.length - 1);

    setSelectedStartStop(start);
    setSelectedEndStop(end);
    setSelectedIntermediateStops(intermediates);

    // LOG TO CONSOLE
    console.log('%c==============================================', 'color: #38bdf8; font-weight: bold;');
    console.log('%c🎲 [RASTGELE SEÇİLEN DURAKLAR SONUCU]', 'color: #38bdf8; font-size: 14px; font-weight: bold;');
    console.log('📍 Hedef Bölge:', selectedDistrict ? selectedDistrict.ilce_adi : 'Tüm İstanbul');
    console.log('🔢 Toplam Durak Sayısı:', count);
    console.log('🟢 BAŞLANGIÇ DURAĞI:', start);
    console.log('🔴 BİTİŞ DURAĞI:', end);
    console.log(`🔵 ARA DURAKLAR (${intermediates.length} Adet):`, intermediates);
    console.log('📋 Sıralı Bütün Rota Durakları Dizisi:', [start, ...intermediates, end]);
    console.log('%c==============================================', 'color: #38bdf8; font-weight: bold;');
  };

  // Handle Manual Log
  const handleLogManualStops = () => {
    console.log('%c==============================================', 'color: #10b981; font-weight: bold;');
    console.log('%c✋ [MANUEL SEÇİLEN DURAKLAR SONUCU]', 'color: #10b981; font-size: 14px; font-weight: bold;');
    console.log('🟢 BAŞLANGIÇ DURAĞI:', selectedStartStop || 'Henüz Seçilmedi');
    console.log('🔴 BİTİŞ DURAĞI:', selectedEndStop || 'Henüz Seçilmedi');
    console.log(`🔵 ARA DURAKLAR (${selectedIntermediateStops.length} Adet):`, selectedIntermediateStops);
    console.log('%c==============================================', 'color: #10b981; font-weight: bold;');
  };

  // Clear selections
  const handleClearSelection = () => {
    setSelectedStartStop(null);
    setSelectedEndStop(null);
    setSelectedIntermediateStops([]);
  };

  const handleResetView = () => {
    setSelectedDistrict(null);
    setSelectedStop(null);
    handleClearSelection();
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
        selectedStop={selectedStop}
        onSelectStop={(stop) => {
          setSelectedStop(stop);
        }}
        // Stop Selector props
        selectedStartStop={selectedStartStop}
        selectedEndStop={selectedEndStop}
        selectedIntermediateStops={selectedIntermediateStops}
        onSetStartStop={setSelectedStartStop}
        onSetEndStop={setSelectedEndStop}
        onAddIntermediateStop={(stop) => setSelectedIntermediateStops(prev => [...prev, stop])}
        onRemoveIntermediateStop={(idx) => setSelectedIntermediateStops(prev => prev.filter((_, i) => i !== idx))}
        onGenerateRandomStops={handleGenerateRandomStops}
        onLogManualStops={handleLogManualStops}
        onClearSelection={handleClearSelection}
      />

      {/* Interactive Map */}
      <MapComponent
        stops={stops}
        districtMap={districtMap}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={(district) => {
          setSelectedDistrict(district);
          setSelectedStop(null);
        }}
        activeTileLayer={activeTileLayer}
        selectedStop={selectedStop}
        resetKey={resetKey}
        selectedStartStop={selectedStartStop}
        selectedEndStop={selectedEndStop}
        selectedIntermediateStops={selectedIntermediateStops}
        onSetStartStop={setSelectedStartStop}
        onSetEndStop={setSelectedEndStop}
        onAddIntermediateStop={(stop) => setSelectedIntermediateStops(prev => [...prev, stop])}
      />
    </div>
  );
}
