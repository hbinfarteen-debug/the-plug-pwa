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
  const [activeTab, setActiveTab] = useState('commander'); // commander, users, deals, disputes
  const [allUsers, setAllUsers] = useState([]);
  const [wonBids, setWonBids] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBids, setLoadingBids] = useState(false);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [sanitizing, setSanitizing] = useState(false);

  useEffect(() => {
    let key = sessionStorage.getItem('admin_key');
    if (!key) {
      key = prompt('Enter Admin Password to load Commander View:');
      if (key === '259047changwaMAFIA!') {
        sessionStorage.setItem('admin_key', key);
      } else {
        showToast('Access Denied', 'error');
        navigate('/settings');
        return;
      }
    }

    fetch(`${API_BASE_URL}/api/admin/stats`, { headers: { 'x-admin-key': key } })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);

    fetchPendingPayments();
    fetchAllUsers();
    fetchWonBids();
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoadingDisputes(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/disputes`, { headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' } });
      const data = await res.json();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoadingDisputes(false);
  };

  const resolveDispute = async (disputeId, action, targetId, otherId) => {
    try {
       const res = await fetch(`${API_BASE_URL}/api/admin/disputes/${disputeId}/resolve`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('admin_key') || '' },
         body: JSON.stringify({ action, targetId, otherId })
       });
       if (res.ok) {
          showToast(`Dispute resolved (${action})`, 'success');
          fetchDisputes(); 
       }
    } catch (e) {
       showToast('Error resolving dispute', 'error');
    }
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' } });
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
      const res = await fetch(`${API_BASE_URL}/api/admin/won-bids`, { headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' } });
      const data = await res.json();
      setWonBids(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBids(false);
    }
  };

  const clearBid = async (id) => {
    if (!confirm('Clear this bid from your view?')) return;
    try {
       const res = await fetch(`${API_BASE_URL}/api/admin/clear-bid/${id}`, {
         method: 'POST',
         headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' }
       });
       if (res.ok) {
         showToast('Bid cleared from view', 'success');
         fetchWonBids();
       }
    } catch (e) {
      showToast('Error clearing bid', 'error');
    }
  };

  const fetchPendingPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pending-payments`, { headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' } });
      const data = await res.json();
      setPendingPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const startSupportChat = async (user) => {
    const admin = JSON.parse(localStorage.getItem('plug_user') || '{}');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: null,
          buyerId: user.id,
          sellerId: admin.id,
          type: 'support'
        })
      });
      const data = await res.json();
      if (data.id) {
        navigate(`/chat/${data.id}`);
      } else {
        showToast('Could not start support chat', 'error');
      }
    } catch (e) {
      showToast('Error starting support chat', 'error');
    }
  };

  const joinDealChat = async (bid) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: bid.id,
          buyerId: bid.buyerId,
          sellerId: bid.sellerId
        })
      });
      const data = await res.json();
      if (data.id) {
        navigate(`/chat/${data.id}`);
      } else {
        showToast('Could not find or create chat', 'error');
      }
    } catch (e) {
      showToast('Error joining chat', 'error');
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
        headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('admin_key') || '' },
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
         method: 'POST',
         headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' }
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

  const handleSanitizeSuburbs = async () => {
    if (!confirm('WARNING: This will delete listings outside Bulawayo and reset user locations to CBD. Proceed?')) return;
    setSanitizing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/sanitize-suburbs`, {
        method: 'POST',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_key') || '' }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Sanitized! Deleted ${data.listingsDeleted} listings, updated ${data.usersUpdated} users.`, 'success');
      } else {
        showToast(data.error || 'Failed to sanitize', 'error');
      }
    } catch(e) {
      console.error(e);
      showToast('Error connecting', 'error');
    } finally {
      setSanitizing(false);
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
        <div 
          className={`nav-item ${activeTab==='disputes'?'active':''}`} 
          style={{flex:1, textAlign:'center', padding:'15px 0', fontSize:'13px', fontWeight:700, opacity:activeTab==='disputes'?1:0.5, borderBottom:activeTab==='disputes'?'2px solid var(--amber)':'none'}}
          onClick={()=>setActiveTab('disputes')}
        >
          Disputes
        </div>
      </div>

      <div className="scroll-area">
        {activeTab === 'commander' && (
          <>
            <div className="admin-stat-grid">
              <div className="admin-stat"><div className="num g">{stats.activeItems}</div><div className="lbl">Active Items</div></div>
              <div className="admin-stat"><div className="num a">{stats.openDisputes}</div><div className="lbl">Open Disputes</div></div>
              <div className="admin-stat" style={{border:'1px solid var(--green)', boxShadow:'inset 0 0 10px rgba(0,232,122,0.1)'}}><div className="num g">${Number(stats.totalRevenue || 0).toFixed(2)}</div><div className="lbl">Total Earnings</div></div>
            </div>

            <div className="asec" style={{border:'1px solid rgba(255,107,107,0.2)', background:'rgba(255,107,107,0.05)'}}>
                <h3>🧹 Database Sanitizer</h3>
                <p style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'12px'}}>Remove all listings and reset user profiles associated with neighborhoods NOT on the official Bulawayo list.</p>
                <button 
                  className="btn-primary" 
                  style={{background:'var(--red)', color:'#fff', border:'none'}}
                  onClick={handleSanitizeSuburbs}
                  disabled={sanitizing}
                >
                  {sanitizing ? 'Sanitizing...' : 'Cleanup Database Now 🚩'}
                </button>
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
                     <div style={{fontSize:'11px', color:'var(--green)', fontWeight:700}}>
                       {u.ubuntupoints} pts {((u.ubuntu_points_lost || u.ubuntupoints_lost) > 0) && <span style={{color:'var(--red)'}}>({u.ubuntu_points_lost || u.ubuntupoints_lost} lost)</span>}
                     </div>
                  </div>
                  <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                    <button 
                      className="btn-sm" 
                      style={{background:'rgba(123,97,255,0.1)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.3)'}}
                      onClick={(e) => { e.stopPropagation(); startSupportChat(u); }}
                    >
                      💬 Support
                    </button>
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
              {wonBids.map(b => {
                const start = new Date(b.createdAt);
                const end = new Date(start.getTime() + (b.duration || 24) * 3600000);
                const now = new Date();
                const diffMs = now - end;
                const hrs = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                const isEnded = diffMs > 0;

                return (
                  <div key={b.id} className="listing-card" style={{padding:'14px', border: hrs >= 72 ? '2px solid var(--red)' : '1px solid var(--border)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                      <div style={{fontWeight:700}}>{b.title}</div>
                      <div style={{fontSize:'12px', background:b.status === 'active' ? 'rgba(0,232,122,0.1)' : 'rgba(255,107,107,0.1)', color:b.status === 'active' ? 'var(--green)' : 'var(--red)', padding:'2px 8px', borderRadius:'8px', fontWeight:700}}>
                        {b.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </div>
                    </div>
                    <div style={{fontSize:'13px', color:'var(--text-muted)'}}>Poster: <span style={{color:'var(--text)'}}>{b.posterName}</span></div>
                    <div style={{fontSize:'13px', color:'var(--text-muted)'}}>Winner: <span style={{color:'var(--green)', fontWeight:700}}>{b.winningBidder}</span></div>
                    
                    <div style={{marginTop:'8px', fontSize:'11px', fontWeight:700, color: hrs >= 72 ? 'var(--red)' : 'var(--amber)'}}>
                      {isEnded ? `⏱️ Ended: ${hrs}h ${mins}m ago` : `⏳ Ends in: ${Math.abs(hrs)}h ${Math.abs(mins)}m`}
                      {hrs >= 72 && " — Window Closed! 🛑"}
                    </div>

                    <div style={{marginTop:'10px', paddingTop:'10px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                       <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Base: ${Number(b.basePrice || 0).toFixed(2)}</div>
                       <div style={{fontSize:'15px', fontWeight:900, color:'var(--green)'}}>${Number(b.highestBid).toFixed(2)}</div>
                    </div>
                    <div style={{marginTop:'10px', display:'flex', gap:'10px'}}>
                      <button className="btn-sm" style={{flex:1, justifyContent:'center', background:'rgba(255,184,0,0.1)', color:'var(--amber)', border:'1px solid var(--amber)'}} onClick={() => joinDealChat(b)}>
                        Inspect Deal Chat 💬
                      </button>
                      <button className="btn-sm" style={{background:'rgba(255,107,107,0.1)', color:'var(--red)', border:'1px solid rgba(255,107,107,0.3)'}} onClick={() => clearBid(b.id)}>
                        Clear🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
              {wonBids.length === 0 && <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No bids recorded yet.</div>}
              {loadingBids && <div style={{padding:'20px', textAlign:'center'}}>Loading bids...</div>}
            </div>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div style={{padding:'20px'}}>
            <div style={{fontSize:'18px', fontWeight:800, marginBottom:'20px', fontFamily:'"Syne", sans-serif'}}>⚖️ Open Disputes</div>
            
            {loadingDisputes && <div style={{padding:'30px', textAlign:'center', color:'var(--text-muted)'}}>Loading disputes...</div>}
            
            {disputes.filter(d => d.status === 'open').length === 0 && !loadingDisputes && (
              <div style={{padding:'40px 20px', textAlign:'center', background:'var(--surface)', borderRadius:'16px', border:'1px solid var(--border)'}}>
                <div style={{fontSize:'40px', marginBottom:'10px'}}>✅</div>
                <div style={{fontSize:'14px', color:'var(--text-muted)'}}>No open disputes right now.</div>
              </div>
            )}

            {disputes.filter(d => d.status === 'open').map(d => (
              <div key={d.id} style={{
                background:'var(--surface)', 
                borderRadius:'16px', 
                border:'1px solid rgba(255,107,107,0.3)', 
                marginBottom:'20px',
                overflow:'hidden'
              }}>
                {/* Header */}
                <div style={{
                  padding:'14px 16px', 
                  background:'rgba(255,107,107,0.08)', 
                  borderBottom:'1px solid rgba(255,107,107,0.15)',
                  display:'flex', justifyContent:'space-between', alignItems:'center'
                }}>
                  <div style={{fontWeight:800, fontSize:'15px'}}>🚩 Dispute #{d.id}</div>
                  <div style={{fontSize:'11px', background:'rgba(255,107,107,0.15)', color:'var(--red)', padding:'3px 10px', borderRadius:'20px', fontWeight:800, letterSpacing:'0.5px'}}>OPEN</div>
                </div>

                {/* Details */}
                <div style={{padding:'16px'}}>
                  <div style={{marginBottom:'12px'}}>
                    <div style={{fontSize:'11px', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px'}}>Reported by</div>
                    <div style={{fontSize:'14px', fontWeight:700}}>{d.reporterName}</div>
                  </div>
                  
                  <div style={{marginBottom:'12px'}}>
                    <div style={{fontSize:'11px', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px'}}>Reason</div>
                    <div style={{fontSize:'14px', fontWeight:700, color:'var(--amber)'}}>{d.reason}</div>
                  </div>

                  <div style={{
                    background:'var(--bg)', 
                    padding:'12px 14px', 
                    borderRadius:'10px', 
                    border:'1px solid var(--border)',
                    fontSize:'13px', 
                    color:'var(--text)', 
                    fontStyle:'italic', 
                    lineHeight:1.5
                  }}>
                    "{d.statement}"
                  </div>
                </div>

                {/* Inspect Chat Button */}
                <div style={{padding:'0 16px 12px'}}>
                  <button 
                    className="btn-sm" 
                    style={{
                      width:'100%', justifyContent:'center', 
                      background:'rgba(255,184,0,0.1)', color:'var(--amber)', 
                      border:'1px solid rgba(255,184,0,0.3)',
                      padding:'10px', fontSize:'13px', fontWeight:700
                    }} 
                    onClick={() => joinDealChat({ id: d.dealid, buyerId: d.seekerid, sellerId: d.providerid })}
                  >
                    Inspect Chat 💬
                  </button>
                </div>

                {/* Resolution Section */}
                <div style={{
                  padding:'16px', 
                  background:'var(--bg)', 
                  borderTop:'1px solid var(--border)'
                }}>
                  <div style={{fontSize:'11px', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px'}}>
                    Resolve — Award or Deduct 5 pts
                  </div>

                  {/* Buyer Card */}
                  <div style={{
                    background:'var(--surface)', 
                    border:'1px solid var(--border)', 
                    borderRadius:'12px', 
                    padding:'14px', 
                    marginBottom:'10px'
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                      <div>
                        <div style={{fontSize:'14px', fontWeight:700}}>{d.seekerName}</div>
                        <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Buyer · {d.seekerPhone}</div>
                      </div>
                      <div style={{fontSize:'10px', background:'rgba(0,150,255,0.1)', color:'#4da6ff', padding:'3px 8px', borderRadius:'20px', fontWeight:700}}>BUYER</div>
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button className="btn-sm" style={{flex:1, padding:'8px', fontSize:'12px', fontWeight:700, background:'rgba(0,232,122,0.1)', color:'var(--green)', border:'1px solid var(--green)', borderRadius:'8px'}} onClick={() => resolveDispute(d.id, 'award', d.seekerid, d.providerid)}>
                        +5 Award ✅
                      </button>
                      <button className="btn-sm" style={{flex:1, padding:'8px', fontSize:'12px', fontWeight:700, background:'rgba(255,107,107,0.1)', color:'var(--red)', border:'1px solid var(--red)', borderRadius:'8px'}} onClick={() => resolveDispute(d.id, 'deduct', d.seekerid, d.providerid)}>
                        -5 Deduct ❌
                      </button>
                    </div>
                  </div>

                  {/* Seller Card */}
                  <div style={{
                    background:'var(--surface)', 
                    border:'1px solid var(--border)', 
                    borderRadius:'12px', 
                    padding:'14px', 
                    marginBottom:'14px'
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                      <div>
                        <div style={{fontSize:'14px', fontWeight:700}}>{d.providerName}</div>
                        <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Seller · {d.providerPhone}</div>
                      </div>
                      <div style={{fontSize:'10px', background:'rgba(255,184,0,0.1)', color:'var(--amber)', padding:'3px 8px', borderRadius:'20px', fontWeight:700}}>SELLER</div>
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button className="btn-sm" style={{flex:1, padding:'8px', fontSize:'12px', fontWeight:700, background:'rgba(0,232,122,0.1)', color:'var(--green)', border:'1px solid var(--green)', borderRadius:'8px'}} onClick={() => resolveDispute(d.id, 'award', d.providerid, d.seekerid)}>
                        +5 Award ✅
                      </button>
                      <button className="btn-sm" style={{flex:1, padding:'8px', fontSize:'12px', fontWeight:700, background:'rgba(255,107,107,0.1)', color:'var(--red)', border:'1px solid var(--red)', borderRadius:'8px'}} onClick={() => resolveDispute(d.id, 'deduct', d.providerid, d.seekerid)}>
                        -5 Deduct ❌
                      </button>
                    </div>
                  </div>

                  {/* Clear Button */}
                  <button 
                    className="btn-sm" 
                    style={{
                      width:'100%', justifyContent:'center', 
                      background:'var(--surface2)', color:'var(--text-muted)', 
                      border:'1px solid var(--border)',
                      padding:'10px', fontSize:'12px', fontWeight:600
                    }} 
                    onClick={() => resolveDispute(d.id, 'clear', null, null)}
                  >
                    Clear Issue — No Points Changed
                  </button>
                </div>
              </div>
            ))}

            {/* Resolved Section */}
            <div style={{fontSize:'18px', fontWeight:800, marginTop:'30px', marginBottom:'16px', fontFamily:'"Syne", sans-serif'}}>✅ Resolved Disputes</div>
            
            {disputes.filter(d => d.status === 'resolved').length === 0 && (
              <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px'}}>No resolved disputes yet.</div>
            )}

            {disputes.filter(d => d.status === 'resolved').map(d => (
              <div key={d.id} style={{
                background:'var(--surface)', borderRadius:'12px', 
                border:'1px solid rgba(0,232,122,0.2)', padding:'14px 16px', 
                marginBottom:'10px', opacity:0.75
              }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700, fontSize:'14px'}}>Dispute #{d.id}</div>
                    <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'2px'}}>Deal #{d.dealid} · {d.reason}</div>
                  </div>
                  <div style={{fontSize:'11px', background:'rgba(0,232,122,0.1)', color:'var(--green)', padding:'3px 10px', borderRadius:'20px', fontWeight:700}}>RESOLVED</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
