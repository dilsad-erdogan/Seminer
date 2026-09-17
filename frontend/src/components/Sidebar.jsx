import React, { useState } from 'react';
import { Search, MapPin, X, Filter, ChevronRight, BarChart2, ArrowLeft, Bus, Target } from 'lucide-react';
import { getDistrictColor } from '../utils/colors';
import StopSelectorPanel from './StopSelectorPanel';

export default function Sidebar({
  districtsList = [],
  summaryStats = {},
  selectedDistrict = null,
  onSelectDistrict = () => { },
  collapsed = false,
  allStops = [],
  selectedStop = null,
  onSelectStop = () => { },
  // Stop selection props
  selectedStartStop = null,
  selectedEndStop = null,
  selectedIntermediateStops = [],
  onSetStartStop = () => { },
  onSetEndStop = () => { },
  onAddIntermediateStop = () => { },
  onRemoveIntermediateStop = () => { },
  onGenerateRandomStops = () => { },
  onLogManualStops = () => { },
  onClearSelection = () => { }
}) {
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'selector'
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [districtFilterTerm, setDistrictFilterTerm] = useState('');

  const totalStopsCount = summaryStats.basariyla_islenen_durak_sayisi || 15361;
  const maxDistrictCount = districtsList.length > 0 ? districtsList[0].durak_sayisi : 1;

  // Handle Global Search Input Change
  const handleGlobalSearchChange = (e) => {
    const term = e.target.value;
    setGlobalSearchTerm(term);

    if (term.trim().length > 1) {
      const lower = term.toLowerCase();
      const stopMatches = allStops
        .filter(s => s.adi && (s.adi.toLowerCase().includes(lower) || String(s.durak_kodu).includes(lower)))
        .slice(0, 10);

      setGlobalSearchResults(stopMatches);
    } else {
      setGlobalSearchResults([]);
    }
  };

  const handleSelectSearchResult = (stop) => {
    onSelectStop(stop);
    setGlobalSearchTerm(stop.adi);
    setGlobalSearchResults([]);
  };

  // Get stops for the currently selected district
  const districtStops = selectedDistrict
    ? allStops.filter(s => String(s.ilce_id) === String(selectedDistrict.ilce_id))
    : [];

  // Filter stops within district if search query typed
  const filteredDistrictStops = districtFilterTerm.trim()
    ? districtStops.filter(s =>
      (s.adi && s.adi.toLowerCase().includes(districtFilterTerm.toLowerCase())) ||
      (s.durak_kodu && String(s.durak_kodu).includes(districtFilterTerm))
    )
    : districtStops;

  return (
    <aside className={`sidebar-panel ${collapsed ? 'collapsed' : ''}`}>
      {/* Top Sidebar Tab Navigation */}
      <div className="sidebar-tab-nav">
        <button
          className={`sidebar-tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          <BarChart2 size={16} />
          <span>İlçe Analizi</span>
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'selector' ? 'active' : ''}`}
          onClick={() => setActiveTab('selector')}
        >
          <Target size={16} />
          <span>Durak Seçimi</span>
        </button>
      </div>

      {activeTab === 'selector' ? (
        /* STOP SELECTOR TAB PANEL */
        <StopSelectorPanel
          selectedDistrict={selectedDistrict}
          districtsList={districtsList}
          allStops={allStops}
          onSelectDistrict={onSelectDistrict}
          selectedStartStop={selectedStartStop}
          selectedEndStop={selectedEndStop}
          selectedIntermediateStops={selectedIntermediateStops}
          onSetStartStop={onSetStartStop}
          onSetEndStop={onSetEndStop}
          onAddIntermediateStop={onAddIntermediateStop}
          onRemoveIntermediateStop={onRemoveIntermediateStop}
          onGenerateRandomStops={onGenerateRandomStops}
          onLogManualStops={onLogManualStops}
          onClearSelection={onClearSelection}
        />
      ) : (
        /* ANALYSIS TAB PANEL */
        <>
          {/* Global Search Input Box */}
          <div className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Tüm İstanbul'da durak ara..."
              value={globalSearchTerm}
              onChange={handleGlobalSearchChange}
            />
            {globalSearchTerm && (
              <X
                size={16}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => { setGlobalSearchTerm(''); setGlobalSearchResults([]); }}
              />
            )}

            {/* Global Autocomplete Dropdown */}
            {globalSearchResults.length > 0 && (
              <div className="search-results-dropdown">
                {globalSearchResults.map(stop => (
                  <div
                    key={stop.id || stop.durak_kodu}
                    className="search-result-item"
                    onClick={() => handleSelectSearchResult(stop)}
                  >
                    <div>
                      <strong style={{ color: '#38bdf8' }}>{stop.adi}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Kod: {stop.durak_kodu} | Tip: {stop.durak_tipi}</div>
                    </div>
                    <ChevronRight size={14} color="#64748b" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPI Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-title">Toplam Durak</span>
              <div className="stat-value">
                {totalStopsCount.toLocaleString('tr-TR')}
                <span className="stat-sub">aktif</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-title">Anakara İlçe</span>
              <div className="stat-value">
                {summaryStats.tespit_edilen_ilce_sayisi || 41}
                <span className="stat-sub">bölge</span>
              </div>
            </div>
          </div>

          {/* CONDITIONAL CONTENT VIEW */}
      {selectedDistrict ? (
        /* DISTRICT DETAIL & STOP LIST VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden' }}>
          {/* Back button and District Title */}
          <div className="district-detail-header">
            <button
              className="back-btn"
              onClick={() => {
                onSelectDistrict(null);
                setDistrictFilterTerm('');
              }}
            >
              <ArrowLeft size={14} /> Tüm İlçelere Dön
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: getDistrictColor(selectedDistrict.ilce_id),
                    boxShadow: `0 0 8px ${getDistrictColor(selectedDistrict.ilce_id)}`
                  }}
                />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  {selectedDistrict.ilce_adi}
                </h3>
              </div>
              <span className="district-count" style={{ fontSize: '0.85rem' }}>
                {districtStops.length} Durak
              </span>
            </div>
          </div>

          {/* District Stop Search Filter */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="search-input"
              style={{ padding: '8px 12px 8px 32px', fontSize: '0.8rem' }}
              placeholder={`${selectedDistrict.ilce_adi} duraklarında ara...`}
              value={districtFilterTerm}
              onChange={(e) => setDistrictFilterTerm(e.target.value)}
            />
            <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            {districtFilterTerm && (
              <X
                size={14}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setDistrictFilterTerm('')}
              />
            )}
          </div>

          {/* List of Stops in Selected District */}
          <div className="district-list-container">
            {filteredDistrictStops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '0.8rem', color: '#94a3b8' }}>
                Aradığınız kriterlere uygun durak bulunamadı.
              </div>
            ) : (
              filteredDistrictStops.map((stop) => {
                const isActive = selectedStop && (selectedStop.id === stop.id || selectedStop.durak_kodu === stop.durak_kodu);

                return (
                  <div
                    key={stop.id || stop.durak_kodu}
                    className={`stop-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectStop(stop)}
                  >
                    <div className="stop-header-row">
                      <span className="stop-name">{stop.adi}</span>
                      <span className="stop-code">Kod: {stop.durak_kodu}</span>
                    </div>

                    <div className="stop-meta-row">
                      <span className="stop-badge">{stop.durak_tipi || 'Durak'}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {stop.yon_bilgisi ? `Yön: ${stop.yon_bilgisi}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ALL DISTRICTS OVERVIEW LIST VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
          <div className="section-title">
            <span>İlçe Durak Yoğunluğu ({districtsList.length})</span>
            <BarChart2 size={16} />
          </div>

          <div className="district-list-container">
            {districtsList.map((district) => {
              const percentage = ((district.durak_sayisi / totalStopsCount) * 100).toFixed(1);
              const progressPercent = Math.round((district.durak_sayisi / maxDistrictCount) * 100);
              const districtColor = getDistrictColor(district.ilce_id);

              return (
                <div
                  key={district.ilce_id}
                  className="district-item"
                  onClick={() => onSelectDistrict(district)}
                >
                  <div className="district-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          backgroundColor: districtColor,
                          boxShadow: `0 0 6px ${districtColor}`
                        }}
                      />
                      <span className="district-name">{district.ilce_adi}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>%{percentage}</span>
                      <span className="district-count">{district.durak_sayisi}</span>
                    </div>
                  </div>

                  {/* Visual Progress Bar matching district color */}
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${progressPercent}%`,
                        background: `linear-gradient(to right, ${districtColor}, ${districtColor}bb)`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}
    </aside>
  );
}
