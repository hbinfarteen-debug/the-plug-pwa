import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Profile({ showToast }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [vacation, setVacation] = useState(() => localStorage.getItem('vmode') === 'true');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!stored.id) return;
    
    // Fetch fresh data to ensure points are up to date
    fetch(`${API_BASE_URL}/api/users/${stored.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setUser(data);
          localStorage.setItem('plug_user', JSON.stringify(data));
        }
      })
      .catch(err => {
        console.error("Profile sync error:", err);
        setUser(stored);
      });
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
          <div className="avatar" style={{position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
            {user?.avatarUrl || user?.avatarurl ? (
              <img src={user.avatarUrl || user.avatarurl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="avatar" />
            ) : (
              '😊'
            )}
            {vacation && <div className="vmode-badge">💤</div>}
          </div>
          <div className="profile-name">{user?.fullname || 'Loading...'}</div>
          <div className="profile-suburb">📍 {user?.homebase || '...'} · Bulawayo</div>
          <div style={{marginTop:'8px',display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
            {(() => {
              const pts = user?.ubuntupoints || 0;
              const deals = user?.stats?.deals || 0;
              if (pts < 80) return <span className="ubuntu-chip" style={{borderColor:'var(--red)', color:'var(--red)'}}><div className="dot" style={{background:'var(--red)'}}></div> Shakey Plug ⚠️</span>;
              if (pts < 90) return <span className="ubuntu-chip" style={{borderColor:'#FF9500', color:'#FF9500'}}><div className="dot" style={{background:'#FF9500'}}></div> Dangerous Plug 🚨</span>;
              if (deals < 5) return <span className="ubuntu-chip" style={{borderColor:'var(--text-muted)', color:'var(--text-muted)'}}><div className="dot" style={{background:'var(--text-muted)'}}></div> New Plug</span>;
              return <span className="ubuntu-chip"><div className="dot dot-g"></div> Trusted Plug</span>;
            })()}
            {user?.phoneVerified || user?.phone_verified ? (
              <span className="ubuntu-chip" style={{borderColor:'var(--green)', color:'var(--green)'}}>
                <div className="dot dot-g"></div> ✅ Verified
              </span>
            ) : (
              <span 
                className="ubuntu-chip" 
                style={{borderColor:'#ff6b6b', color:'#ff6b6b', cursor:'pointer'}}
                onClick={() => navigate('/settings')}
              >
                ⚠️ Unverified
              </span>
            )}
          </div>
        </div>
        
        <div className="ubuntu-meter">
          <div className="meter-top">
            <span className="meter-pts">{user?.ubuntupoints || 0}</span>
            <span className="meter-rank">{user?.ubuntupoints >= 150 ? '🥈 Silver Plug' : '🥉 Bronze Plug'}</span>
          </div>
          <div className="prog-bar"><div className="prog-fill" style={{width: `${Math.min((user?.ubuntupoints || 0) / 150 * 100, 100)}%`}}></div></div>
          <div className="meter-sub">{Math.max(150 - (user?.ubuntupoints || 0), 0)} pts to next unlock · Milestone: 150 pts → 2 new neighborhoods</div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card"><div className="num">0</div><div className="lbl">Total Deals</div></div>
          <div className="stat-card"><div className="num">0</div><div className="lbl">Jobs Done</div></div>
          <div className="stat-card"><div className="num">0</div><div className="lbl">Items Sold</div></div>
        </div>

        <div style={{padding:'4px 20px 6px',fontFamily:'"Syne",sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--text-muted)'}}>Community Reviews</div>
        <div className="reviews-list">
          <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px'}}>
            No reviews yet. Complete deals to earn Ubuntu points!
          </div>
        </div>

      </div>
    </div>
  );
}
