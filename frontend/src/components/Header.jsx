import React from 'react';
import { Bus, Map, Layers, RefreshCw, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function Header({
  activeTileLayer = 'dark',
  onChangeTileLayer = () => {},
  onResetView = () => {},
  sidebarCollapsed = false,
  onToggleSidebar = () => {}
}) {
  return (
    <header className="top-header">
      <div className="brand-section">
        <button
          className="btn-icon"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Paneli Göster' : 'Paneli Gizle'}
          style={{ padding: '8px' }}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className="brand-logo">
          <Bus size={22} />
        </div>

        <div className="brand-text">
          <h1>İETT İstanbul Durak & İlçe Haritası</h1>
          <p>İstanbul Geneli Durak Konum ve İlçe Analiz Platformu</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Live Indicator Badge */}
        <div className="badge-live">
          <span className="pulse-dot"></span>
          <span>15.361 Durak Aktif</span>
        </div>

        {/* Reset View Button */}
        <button className="btn-icon" onClick={onResetView}>
          <RefreshCw size={14} />
          <span>İstanbul'a Odaklan</span>
        </button>

        {/* Tile Layer Selector Group */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 41, 59, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            className={`layer-btn ${activeTileLayer === 'dark' ? 'active' : ''}`}
            onClick={() => onChangeTileLayer('dark')}
          >
            Karanlık
          </button>
          <button
            className={`layer-btn ${activeTileLayer === 'light' ? 'active' : ''}`}
            onClick={() => onChangeTileLayer('light')}
          >
            Aydınlık
          </button>
          <button
            className={`layer-btn ${activeTileLayer === 'satellite' ? 'active' : ''}`}
            onClick={() => onChangeTileLayer('satellite')}
          >
            Uydu
          </button>
        </div>
      </div>
    </header>
  );
}
