import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Admin({ showToast }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeItems: 0, activeGigs: 0, openDisputes: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [activeTab, setActiveTab] = useState('commander'); // commander, users, deals
  const [allUsers, setAllUsers] = useState([]);
  const [wonBids, setWonBids] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBids, setLoadingBids] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);

    fetchPendingPayments();
    fetchAllUsers();
    fetchWonBids();
  }, []);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`);
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchWonBids = async () => {
    setLoadingBids(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/won-bids`);
      const data = await res.json();
      setWonBids(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBids(false);
    }
  };

  const fetchPendingPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pending-payments`);
      const data = await res.json();
      setPendingPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayments(false);
    }
  };

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

  const handlePaymentAction = async (paymentId, action) => {
    try {
       const res = await fetch(`${API_BASE_URL}/api/admin/${action}-payment/${paymentId}`, {
         method: 'POST'
       });
       if (res.ok) {
         showToast(`Payment ${action}ed!`, 'success');
         fetchPendingPayments();
       } else {
         showToast('Action failed', 'error');
       }
    } catch(e) {
      console.error(e);
      showToast('Error processing payment', 'error');
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
      
      <div style={{display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 20px'}}>
        <div 
          className={`nav-item ${activeTab==='commander'?'active':''}`} 
          style={{flex:1, textAlign:'center', padding:'15px 0', fontSize:'13px', fontWeight:700, opacity:activeTab==='commander'?1:0.5, borderBottom:activeTab==='commander'?'2px solid var(--amber)':'none'}}
          onClick={()=>setActiveTab('commander')}
        >
          Commander
        </div>
        <div 
          className={`nav-item ${activeTab==='users'?'active':''}`} 
          style={{flex:1, textAlign:'center', padding:'15px 0', fontSize:'13px', fontWeight:700, opacity:activeTab==='users'?1:0.5, borderBottom:activeTab==='users'?'2px solid var(--amber)':'none'}}
          onClick={()=>setActiveTab('users')}
        >
          Users
        </div>
        <div 
          className={`nav-item ${activeTab==='deals'?'active':''}`} 
          style={{flex:1, textAlign:'center', padding:'15px 0', fontSize:'13px', fontWeight:700, opacity:activeTab==='deals'?1:0.5, borderBottom:activeTab==='deals'?'2px solid var(--amber)':'none'}}
          onClick={()=>setActiveTab('deals')}
        >
          Won Bids
        </div>
      </div>

      <div className="scroll-area">
        {activeTab === 'commander' && (
          <>
            <div className="admin-stat-grid">
              <div className="admin-stat"><div className="num g">{stats.activeItems}</div><div className="lbl">Active Items</div></div>
              <div className="admin-stat"><div className="num a">{stats.openDisputes}</div><div className="lbl">Open Disputes</div></div>
              <div className="admin-stat" style={{border:'1px solid var(--green)', boxShadow:'inset 0 0 10px rgba(0,232,122,0.1)'}}><div className="num g">${(stats.totalRevenue || 0).toFixed(2)}</div><div className="lbl">Total Earnings</div></div>
            </div>

            <div className="asec">
              <h3>💰 Revenue & Boosts</h3>
              <p style={{marginBottom:'15px'}}>Verify the EcoCash Code on your phone before hitting Approve.</p>
              
              {loadingPayments ? (
                <div style={{padding:'20px', textAlign:'center'}}>Loading payments...</div>
              ) : (
                <div className="admin-results">
                  {pendingPayments.map(p => (
                    <div key={p.id} className="listing-card" style={{padding:'16px', display:'flex', flexDirection:'column', gap:'10px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                        <div>
                           <div style={{fontWeight:700, fontSize:'15px'}}>{p.type.toUpperCase()} - ${Number(p.amount).toFixed(2)}</div>
                           <div style={{fontSize:'12px', color:'var(--text-muted)'}}>User: {p.userName} (+{p.phone})</div>
                           {p.listingTitle && <div style={{fontSize:'12px', color:'var(--amber)', marginTop:'2px'}}>Plug: {p.listingTitle}</div>}
                        </div>
                        <div style={{background:'rgba(255,184,0,0.1)', padding:'6px 12px', borderRadius:'10px', fontSize:'13px', fontWeight:700, color:'var(--amber)', fontFamily:'monospace'}}>
                          {p.proof_code}
                        </div>
                      </div>
                      
                      <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
                        <button 
                          className="btn-primary" 
                          style={{flex:1, background: 'var(--green)', color: '#000', border:'none', height:'38px', fontSize:'13px'}}
                          onClick={() => handlePaymentAction(p.id, 'approve')}
                        >
                          Approve ✅
                        </button>
                        <button 
                          className="btn-primary" 
                          style={{flex:1, background: 'rgba(255,255,255,0.05)', color: 'var(--red)', border:'1px solid var(--red)', height:'38px', fontSize:'13px'}}
                          onClick={() => handlePaymentAction(p.id, 'reject')}
                        >
                          Reject ❌
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingPayments.length === 0 && <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No pending payments to verify.</div>}
                </div>
              )}
            </div>

            <div className="asec">
              <h3>🚩 Red Flag Queue</h3>
              <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No red flags reported.</div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="asec">
            <h3>👥 Platform Users</h3>
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
              {(searchQuery ? searchResults : allUsers).map(u => (
                <div key={u.id} className="listing-card" style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer'}} onClick={() => navigate(`/profile/${u.id}`)}>
                  <div style={{flex:1}}>
                     <div style={{fontWeight:700, fontSize:'14px'}}>{u.fullname} {u.blacklisted && <span style={{color:'var(--red)', fontSize:'10px'}}>SUSPENDED</span>}</div>
                     <div style={{fontSize:'12px', color:'var(--text-muted)'}}>+{u.phone} · {u.homebase}</div>
                     <div style={{fontSize:'11px', color:'var(--green)', fontWeight:700}}>{u.ubuntupoints} pts</div>
                  </div>
                  <button 
                    className="btn-sm" 
                    style={{
                      background: u.blacklisted ? 'var(--green)' : 'rgba(255,107,107,0.1)', 
                      color: u.blacklisted ? '#000' : 'var(--red)',
                      border: u.blacklisted ? 'none' : '1px solid rgba(255,107,107,0.3)',
                      minWidth: '100px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBlacklist(u.id, u.blacklisted);
                    }}
                  >
                    {u.blacklisted ? 'Reinstate' : 'Suspend'}
                  </button>
                </div>
              ))}
              {loadingUsers && <div style={{padding:'20px', textAlign:'center'}}>Loading users...</div>}
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="asec">
            <h3>🏆 Won Bids & Deals</h3>
            <div className="admin-results">
              {wonBids.map(b => (
                <div key={b.id} className="listing-card" style={{padding:'14px'}}>
                   <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                     <div style={{fontWeight:700}}>{b.title}</div>
                     <div style={{fontSize:'12px', background:'var(--surface2)', padding:'2px 8px', borderRadius:'8px'}}>{b.status.toUpperCase()}</div>
                   </div>
                   <div style={{fontSize:'13px', color:'var(--text-muted)'}}>Poster: <span style={{color:'var(--text)'}}>{b.posterName}</span></div>
                   <div style={{fontSize:'13px', color:'var(--text-muted)'}}>Winner: <span style={{color:'var(--green)', fontWeight:700}}>{b.winningBidder}</span></div>
                   <div style={{marginTop:'10px', paddingTop:'10px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Base: ${Number(b.basePrice || 0).toFixed(2)}</div>
                      <div style={{fontSize:'15px', fontWeight:900, color:'var(--green)'}}>${Number(b.highestBid).toFixed(2)}</div>
                   </div>
                </div>
              ))}
              {wonBids.length === 0 && <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No bids recorded yet.</div>}
              {loadingBids && <div style={{padding:'20px', textAlign:'center'}}>Loading bids...</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
