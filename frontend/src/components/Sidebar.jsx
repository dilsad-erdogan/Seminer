import React, { useState } from 'react';
import { Search, MapPin, X, Filter, ChevronRight, BarChart2, Layers } from 'lucide-react';

export default function Sidebar({
  districtsList = [],
  summaryStats = {},
  selectedDistrict = null,
  onSelectDistrict = () => {},
  collapsed = false,
  allStops = [],
  onSelectStop = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const totalStopsCount = summaryStats.basariyla_islenen_durak_sayisi || 15361;
  const maxDistrictCount = districtsList.length > 0 ? districtsList[0].durak_sayisi : 1;

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.trim().length > 1) {
      const lower = term.toLowerCase();
      // Search in stops (top 8 matches)
      const stopMatches = allStops
        .filter(s => s.adi && (s.adi.toLowerCase().includes(lower) || String(s.durak_kodu).includes(lower)))
        .slice(0, 8);

      setSearchResults(stopMatches);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (stop) => {
    onSelectStop(stop);
    setSearchTerm(stop.adi);
    setSearchResults([]);
  };

  return (
    <aside className={`sidebar-panel ${collapsed ? 'collapsed' : ''}`}>
      {/* Search Input Box */}
      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Durak adı, kodu veya ilçe ara..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {searchTerm && (
          <X
            size={16}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
            onClick={() => { setSearchTerm(''); setSearchResults([]); }}
          />
        )}

        {/* Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div className="search-results-dropdown">
            {searchResults.map(stop => (
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

      {/* Selected Filter Alert */}
      {selectedDistrict && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '10px',
            fontSize: '0.8rem',
            color: '#60a5fa'
          }}
        >
          <span>Filtre: <strong>{selectedDistrict.ilce_adi}</strong> ({selectedDistrict.durak_sayisi} Durak)</span>
          <button
            onClick={() => onSelectDistrict(null)}
            style={{ background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
          >
            <X size={14} /> Temizle
          </button>
        </div>
      )}

      {/* District List Header */}
      <div className="section-title">
        <span>İlçe Durak Yoğunluğu ({districtsList.length})</span>
        <BarChart2 size={16} />
      </div>

      {/* District Scrollable List */}
      <div className="district-list-container">
        {districtsList.map((district) => {
          const isSelected = selectedDistrict && selectedDistrict.ilce_id === district.ilce_id;
          const percentage = ((district.durak_sayisi / totalStopsCount) * 100).toFixed(1);
          const progressPercent = Math.round((district.durak_sayisi / maxDistrictCount) * 100);

          return (
            <div
              key={district.ilce_id}
              className={`district-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectDistrict(isSelected ? null : district)}
            >
              <div className="district-row">
                <span className="district-name">{district.ilce_adi}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>%{percentage}</span>
                  <span className="district-count">{district.durak_sayisi}</span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
