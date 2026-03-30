import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Admin({ showToast }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeItems: 0, activeGigs: 0, openDisputes: 0 });

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate('/home')}>‹</div>
        <div className="logo" style={{fontSize:'15px',color:'var(--amber)'}}>COMMANDER VIEW</div>
        <div></div>
      </div>
      <div className="admin-bar">⚠️ Admin Access — Owner Only</div>
      <div className="scroll-area">
        <div className="admin-stat-grid">
          <div className="admin-stat"><div className="num g">{stats.activeItems}</div><div className="lbl">Active Items</div></div>
          <div className="admin-stat"><div className="num g">{stats.activeGigs}</div><div className="lbl">Active Gigs</div></div>
          <div className="admin-stat"><div className="num a">{stats.openDisputes}</div><div className="lbl">Open Disputes</div></div>
          <div className="admin-stat"><div className="num r">0</div><div className="lbl">Red Flags</div></div>
        </div>

        <div className="asec">
          <h3>🚨 Red Flag Queue</h3>
          <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No red flags reported.</div>
        </div>

      </div>
    </div>
  );
}
