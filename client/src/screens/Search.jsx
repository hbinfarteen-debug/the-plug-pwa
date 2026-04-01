import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Search({ t }) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('plug_user'));
    setUser(localUser);
  }, []);

  const isAdmin = user?.role === 'admin' || 
                  user?.phone === '263715198745' || user?.phone === '+263715198745' || 
                  user?.phone === '263775939688' || user?.phone === '+263775939688';

  const filters = [t.all, t.items, t.gigs, t.friendly, t.ending];

  const pointsToUnlock = 150 - (user?.ubuntupoints || 100);

  return (
    <div className="screen active">
      <div className="topbar">
        <div className="logo">{t.search} <strong>Bulawayo</strong></div>
        <div className="icon-btn" onClick={() => navigate('/settings')}>⚙️</div>
      </div>
      <div className="scroll-area">
        <div className="search-bar-wrap">
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder={t.placeholder} />
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
          {isAdmin ? (
            <div className="suburb-check" style={{border:'1px solid var(--amber)', background:'rgba(255,193,7,0.05)'}}>
              <div>
                <div className="sc-label" style={{color:'var(--amber)'}}>🏰 Bulawayo (Full Access)</div>
                <div className="sc-sub">Administrator: Watching over all 105 areas</div>
              </div>
              <div className="chk on" style={{background:'var(--amber)'}}>✓</div>
            </div>
          ) : (
            <>
              <div className="suburb-check">
                <div>
                  <div className="sc-label">🏠 {user?.homebase || 'Makokoba'} <span style={{fontSize:'11px',color:'var(--green)'}}>Home Base</span></div>
                  <div className="sc-sub">Active in your primary zone</div>
                </div>
                <div className="chk on">✓</div>
              </div>
              
              {user?.ubuntupoints >= 150 ? (
                <div className="suburb-check">
                  <div>
                    <div className="sc-label">Burnside</div>
                    <div className="sc-sub">Unlocked via Ubuntu</div>
                  </div>
                  <div className="chk on">✓</div>
                </div>
              ) : (
                <div className="suburb-check">
                  <div>
                    <div className="sc-label">🔒 Neighboring Suburbs</div>
                    <div className="sc-sub">Earn {pointsToUnlock > 0 ? pointsToUnlock : 50} more pts to unlock 2 more</div>
                  </div>
                  <div className="chk locked">🔒</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
