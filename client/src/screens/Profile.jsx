import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Profile({ showToast }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [vacation, setVacation] = useState(() => localStorage.getItem('vmode') === 'true');

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (data.id) setUser(data);
  }, []);

  const toggleVacation = () => {
    const newState = !vacation;
    setVacation(newState);
    localStorage.setItem('vmode', newState);
    showToast(newState ? 'Vacation mode ON 🌴' : 'Vacation mode OFF', 'success');
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <div className="logo">PROFILE</div>
        <div style={{display:'flex',gap:'8px'}}>
          <div className="icon-btn" onClick={() => navigate('/settings')}>⚙️</div>
          <div className="icon-btn" onClick={toggleVacation} style={{border:vacation?'1.5px solid var(--green)':''}}>{vacation ? '🛖' : '🏖️'}</div>
        </div>
      </div>
      <div className="scroll-area">
        {vacation && (
          <div className="vmode-banner">
            <span>🛖</span> Out of town? You're currently in <strong>Vacation Mode</strong>.
          </div>
        )}
        <div className="profile-header">
          <div className="avatar" style={{position:'relative'}}>
            😊
            {vacation && <div className="vmode-badge">💤</div>}
          </div>
          <div className="profile-name">{user?.fullName || 'Barry M.'}</div>
          <div className="profile-suburb">📍 {user?.homeBase || 'Makokoba'} · Bulawayo</div>
          <div style={{marginTop:'8px',display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
            <span className="ubuntu-chip"><div className="dot dot-g"></div> Trusted Plug</span>
            <span className="ubuntu-chip"><div className="dot dot-g"></div> ✅ ID Verified</span>
          </div>
        </div>
        
        <div className="ubuntu-meter">
          <div className="meter-top">
            <span className="meter-pts">{user?.ubuntuPoints || 138}</span>
            <span className="meter-rank">🥈 Silver Plug</span>
          </div>
          <div className="prog-bar"><div className="prog-fill" style={{width:'46%'}}></div></div>
          <div className="meter-sub">12 pts to next unlock · Milestone: 150 pts → 2 new neighborhoods</div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card"><div className="num">0</div><div className="lbl">Total Deals</div></div>
          <div className="stat-card"><div className="num">0</div><div className="lbl">Jobs Done</div></div>
          <div className="stat-card"><div className="num">0</div><div className="lbl">Items Sold</div></div>
        </div>

        <div style={{padding:'4px 20px 6px',fontFamily:'"Syne",sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--text-muted)'}}>Community Reviews</div>
        <div className="reviews-list">
          <div className="review-item">
            <div className="review-header"><div className="review-name">👩🏾 Nomsa D.</div><div className="review-pts">+5 Ubuntu</div></div>
            <div className="review-text">"Showed up on time, mowed perfectly. Very professional!"</div>
            <div className="review-date">2 weeks ago · Lawn Mowing Gig</div>
          </div>
        </div>

      </div>
    </div>
  );
}
