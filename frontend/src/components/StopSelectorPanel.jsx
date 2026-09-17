import React, { useState } from 'react';
import { Dices, MousePointerClick, Play, Trash2, CheckCircle2, MapPin, Search, Plus, X, ArrowRight } from 'lucide-react';

export default function StopSelectorPanel({
  selectedDistrict = null,
  districtsList = [],
  allStops = [],
  onSelectDistrict = () => { },
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
  const [selectorMode, setSelectorMode] = useState('random'); // 'random' | 'manual'
  const [totalStopCount, setTotalStopCount] = useState(6);

  // Search inputs for manual mode
  const [startSearchTerm, setStartSearchTerm] = useState('');
  const [endSearchTerm, setEndSearchTerm] = useState('');
  const [interSearchTerm, setInterSearchTerm] = useState('');

  const [startSearchResults, setStartSearchResults] = useState([]);
  const [endSearchResults, setEndSearchResults] = useState([]);
  const [interSearchResults, setInterSearchResults] = useState([]);

  // Available stops based on district selection
  const availableStops = selectedDistrict
    ? allStops.filter(s => String(s.ilce_id) === String(selectedDistrict.ilce_id))
    : allStops;

  // Search helper
  const handleSearch = (term, setResults) => {
    if (term.trim().length > 1) {
      const lower = term.toLowerCase();
      const matches = availableStops
        .filter(s => (s.adi && s.adi.toLowerCase().includes(lower)) || (s.durak_kodu && String(s.durak_kodu).includes(lower)))
        .slice(0, 8);
      setResults(matches);
    } else {
      setResults([]);
    }
  };

  const handleRunRandom = () => {
    onGenerateRandomStops(totalStopCount);
  };

  return (
    <div className="stop-selector-panel">
      {/* Mode Switcher Tabs */}
      <div className="selector-mode-tabs">
        <button
          className={`mode-tab-btn ${selectorMode === 'random' ? 'active' : ''}`}
          onClick={() => setSelectorMode('random')}
        >
          <Dices size={16} />
          <span>🎲 Rastgele Seçim</span>
        </button>
        <button
          className={`mode-tab-btn ${selectorMode === 'manual' ? 'active' : ''}`}
          onClick={() => setSelectorMode('manual')}
        >
          <MousePointerClick size={16} />
          <span>✋ Manuel Seçim</span>
        </button>
      </div>

      {/* District Context Header */}
      <div className="district-context-bar">
        <MapPin size={15} className="pin-icon" />
        <span className="context-label">Hedef İlçe:</span>
        <select
          className="district-select-dropdown"
          value={selectedDistrict ? selectedDistrict.ilce_id : ''}
          onChange={(e) => {
            const val = e.target.value;
            if (!val) {
              onSelectDistrict(null);
            } else {
              const found = districtsList.find(d => String(d.ilce_id) === val);
              if (found) onSelectDistrict(found);
            }
          }}
        >
          <option value="">🌐 Tüm İstanbul (Genel)</option>
          {districtsList.map(d => (
            <option key={d.ilce_id} value={d.ilce_id}>
              {d.ilce_adi} ({d.durak_sayisi} Durak)
            </option>
          ))}
        </select>
      </div>

      {/* MODE 1: RANDOM GENERATOR */}
      {selectorMode === 'random' && (
        <div className="mode-content-card">
          <div className="mode-header">
            <h4>🎲 Otomatik Rastgele Durak Seçici</h4>
            <p>Belirlediğiniz toplam durak sayısı kadar (1 baş, 1 bitiş ve ara duraklar) rastgele durak seçer.</p>
          </div>

          <div className="input-group-card">
            <div className="input-label-row">
              <label>Toplam Durak Sayısı (Başlangıç + Ara + Bitiş):</label>
              <span className="count-badge">{totalStopCount} Durak</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <input
                type="range"
                min="3"
                max="20"
                value={totalStopCount}
                onChange={(e) => setTotalStopCount(parseInt(e.target.value, 10))}
                className="custom-range-slider"
              />
              <input
                type="number"
                min="3"
                max="20"
                value={totalStopCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= 3 && v <= 50) setTotalStopCount(v);
                }}
                className="number-input"
              />
            </div>

            <div className="breakdown-pills">
              <span className="pill pill-green">🟢 1 Başlangıç</span>
              <span className="pill pill-blue">🔵 {Math.max(1, totalStopCount - 2)} Ara Durak</span>
              <span className="pill pill-red">🔴 1 Bitiş</span>
            </div>
          </div>

          <button className="btn-primary-action" onClick={handleRunRandom}>
            <Dices size={18} />
            <span>Rastgele Durakları Seç & Konsola Yazdır</span>
          </button>
        </div>
      )}

      {/* MODE 2: MANUAL SELECTION */}
      {selectorMode === 'manual' && (
        <div className="mode-content-card">
          <div className="mode-header">
            <h4>✋ Manuel Durak Seçici</h4>
            <p>Başlangıç, bitiş ve uğranmasını istediğiniz ara durakları tek tek seçebilirsiniz.</p>
          </div>

          {/* 🟢 START STOP PICKER */}
          <div className="manual-stop-box start-box">
            <div className="box-title">
              <span className="dot dot-green"></span>
              <span>🟢 Başlangıç Durağı</span>
            </div>

            {selectedStartStop ? (
              <div className="selected-stop-badge">
                <div>
                  <strong>{selectedStartStop.adi}</strong>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Kod: {selectedStartStop.durak_kodu}</div>
                </div>
                <button className="btn-remove" onClick={() => onSetStartStop(null)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Başlangıç durağı ara..."
                  value={startSearchTerm}
                  onChange={(e) => {
                    setStartSearchTerm(e.target.value);
                    handleSearch(e.target.value, setStartSearchResults);
                  }}
                />
                {startSearchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    {startSearchResults.map(s => (
                      <div
                        key={s.id || s.durak_kodu}
                        className="search-result-item"
                        onClick={() => {
                          onSetStartStop(s);
                          setStartSearchTerm('');
                          setStartSearchResults([]);
                        }}
                      >
                        <strong>{s.adi}</strong>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.durak_kodu}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🔴 END STOP PICKER */}
          <div className="manual-stop-box end-box">
            <div className="box-title">
              <span className="dot dot-red"></span>
              <span>🔴 Bitiş Durağı</span>
            </div>

            {selectedEndStop ? (
              <div className="selected-stop-badge">
                <div>
                  <strong>{selectedEndStop.adi}</strong>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Kod: {selectedEndStop.durak_kodu}</div>
                </div>
                <button className="btn-remove" onClick={() => onSetEndStop(null)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Bitiş durağı ara..."
                  value={endSearchTerm}
                  onChange={(e) => {
                    setEndSearchTerm(e.target.value);
                    handleSearch(e.target.value, setEndSearchResults);
                  }}
                />
                {endSearchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    {endSearchResults.map(s => (
                      <div
                        key={s.id || s.durak_kodu}
                        className="search-result-item"
                        onClick={() => {
                          onSetEndStop(s);
                          setEndSearchTerm('');
                          setEndSearchResults([]);
                        }}
                      >
                        <strong>{s.adi}</strong>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.durak_kodu}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🔵 INTERMEDIATE STOPS PICKER */}
          <div className="manual-stop-box inter-box">
            <div className="box-title">
              <span className="dot dot-blue"></span>
              <span>🔵 Uğranacak Ara Duraklar ({selectedIntermediateStops.length})</span>
            </div>

            {/* List of selected intermediate stops */}
            {selectedIntermediateStops.length > 0 && (
              <div className="inter-stops-list">
                {selectedIntermediateStops.map((s, idx) => (
                  <div key={s.id || s.durak_kodu || idx} className="inter-stop-item">
                    <span className="step-num">#{idx + 1}</span>
                    <span className="stop-name-text">{s.adi}</span>
                    <button className="btn-remove-sm" onClick={() => onRemoveIntermediateStop(idx)}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new intermediate stop search */}
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Ara durak ekle..."
                value={interSearchTerm}
                onChange={(e) => {
                  setInterSearchTerm(e.target.value);
                  handleSearch(e.target.value, setInterSearchResults);
                }}
              />
              {interSearchResults.length > 0 && (
                <div className="search-results-dropdown">
                  {interSearchResults.map(s => (
                    <div
                      key={s.id || s.durak_kodu}
                      className="search-result-item"
                      onClick={() => {
                        onAddIntermediateStop(s);
                        setInterSearchTerm('');
                        setInterSearchResults([]);
                      }}
                    >
                      <strong>{s.adi}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.durak_kodu}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            className="btn-primary-action"
            onClick={onLogManualStops}
            disabled={!selectedStartStop && !selectedEndStop && selectedIntermediateStops.length === 0}
          >
            <CheckCircle2 size={18} />
            <span>Seçilen Durakları Konsola Yazdır</span>
          </button>
        </div>
      )}

      {/* SUMMARY DISPLAY CARD OF CURRENT SELECTION */}
      {(selectedStartStop || selectedEndStop || selectedIntermediateStops.length > 0) && (
        <div className="active-selection-summary">
          <div className="summary-header">
            <span>📋 Seçili Durak Özeti</span>
            <button className="btn-clear-sm" onClick={onClearSelection}>
              <Trash2 size={13} /> Temizle
            </button>
          </div>

          <div className="summary-list">
            {selectedStartStop && (
              <div className="summary-row row-start">
                <span className="badge-tag green">🟢 BAŞLANGIÇ</span>
                <span className="stop-title">{selectedStartStop.adi}</span>
              </div>
            )}

            {selectedIntermediateStops.map((s, i) => (
              <div key={i} className="summary-row row-inter">
                <span className="badge-tag blue">🔵 ARA DURAK #{i + 1}</span>
                <span className="stop-title">{s.adi}</span>
              </div>
            ))}

            {selectedEndStop && (
              <div className="summary-row row-end">
                <span className="badge-tag red">🔴 BİTİŞ</span>
                <span className="stop-title">{selectedEndStop.adi}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
