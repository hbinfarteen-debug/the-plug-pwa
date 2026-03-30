import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Search() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Items', 'Gigs', '16+ Friendly', 'Ending Soon'];

  return (
    <div className="screen active">
      <div className="topbar">
        <div className="logo">THE<span> PLUG</span></div>
        <div className="icon-btn" onClick={() => navigate('/settings')}>⚙️</div>
      </div>
      <div className="scroll-area">
        <div className="search-bar-wrap">
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="What are you looking for? / Ufuna chii?" />
          </div>
        </div>
        <div className="filter-row">
          {filters.map(f => (
            <div 
              key={f} 
              className={`fchip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </div>
          ))}
        </div>
        <div className="section-header" style={{paddingBottom:'4px'}}><div className="section-title">My Neighborhoods</div></div>
        <div style={{padding:'0 20px'}}>
          <div className="suburb-check">
            <div><div className="sc-label">🏠 Makokoba <span style={{fontSize:'11px',color:'var(--green)'}}>Home Base</span></div><div className="sc-sub">Central · 14 active plugs</div></div>
            <div className="chk on">✓</div>
          </div>
          <div className="suburb-check">
            <div><div className="sc-label">Burnside</div><div className="sc-sub">North · 8 active plugs</div></div>
            <div className="chk on">✓</div>
          </div>
          <div className="suburb-check">
            <div><div className="sc-label">🔒 Cowdray Park</div><div className="sc-sub">Earn 12 more pts to unlock</div></div>
            <div className="chk locked">🔒</div>
          </div>
        </div>
      </div>
    </div>
  );
}
