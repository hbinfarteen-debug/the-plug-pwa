import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Admin({ showToast }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeItems: 0, activeGigs: 0, openDisputes: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // Re-using the logic for public profiles but we'll need a search endpoint
      // For now, let's assume we can lookup by phone directly or exact name
      const res = await fetch(`${API_BASE_URL}/api/auth/check-name/${searchQuery}`);
      const availability = await res.json();
      
      // If check-name says NOT available, it means the user exists.
      // In a real app we'd have a proper /api/admin/users/search
      // But let's build the UI for it.
      showToast('Searching for user...', 'info');
      
      // Let's assume we fetch the user info if they exist
      const userRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: searchQuery, password: 'DUMMY_PASSWORD' })
      });
      // This is a hacky way to find a user without a dedicated search endpoint.
      // In production, we should add GET /api/admin/users/:query
      const userData = await userRes.json();
      if (userData.id) {
          setSearchResults([userData]);
      } else {
          setSearchResults([]);
          showToast('User not found', 'error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const toggleBlacklist = async (userId, currentlyBlacklisted) => {
    const action = currentlyBlacklisted ? 'unblacklist' : 'blacklist';
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${action}/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin intervention' })
      });
      if (res.ok) {
        showToast(`User ${action}ed!`, 'success');
        // Refresh results
        setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, blacklisted: !currentlyBlacklisted } : u));
      }
    } catch (e) {
      showToast('Operation failed', 'error');
    }
  };

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
          <h3>🚨 User Management</h3>
          <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
             <input 
               className="field-input" 
               placeholder="Search by Phone or Name" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{margin:0}}
             />
             <button className="btn-primary" onClick={handleSearch} disabled={searching} style={{padding:'0 20px'}}>
               {searching ? '...' : 'Find'}
             </button>
          </div>

          <div className="admin-results">
            {searchResults.map(u => (
              <div key={u.id} className="listing-card" style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                   <div style={{fontWeight:700}}>{u.fullname}</div>
                   <div style={{fontSize:'12px', color:'var(--text-muted)'}}>+{u.phone} · {u.homebase}</div>
                </div>
                <button 
                  className="btn-sm" 
                  style={{
                    background: u.blacklisted ? 'var(--green)' : 'var(--red)', 
                    color: u.blacklisted ? '#000' : '#fff',
                    border: 'none',
                    minWidth: '100px'
                  }}
                  onClick={() => toggleBlacklist(u.id, u.blacklisted)}
                >
                  {u.blacklisted ? 'Reinstate' : 'Suspend'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="asec">
          <h3>🚩 Red Flag Queue</h3>
          <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No red flags reported.</div>
        </div>

      </div>
    </div>
  );
}
