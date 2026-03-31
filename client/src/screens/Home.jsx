import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Home({ showToast, t }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const ALL_SUBURBS = [
    'Makokoba', 'Burnside', 'Cowdray Park', 'Nkulumane', 'Hillside', 
    'Morningside', 'Bradfield', 'Queens Park', 'Magwegwe', 'Pumula', 
    'Sizinda', 'Entumbane', 'Njube', 'Hyde Park', 'Selborne Park', 
    'Kumalo', 'Suburbs', 'Malindela', 'Ilanda'
  ];

  const getTimeRemaining = (createdAt, durationHours) => {
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const end = new Date(created.getTime() + (durationHours * 60 * 60 * 1000));
      const diffMs = end - now;

      if (diffMs <= 0) return 'Ended';

      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    } catch (e) {
      return '24h';
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('plug_user');
      if (!stored) {
        navigate('/onboard');
        return;
      }
      setUser(JSON.parse(stored));
    } catch (e) {
      console.error('Error reading user data', e);
      navigate('/onboard');
    }

    fetch(`${API_BASE_URL}/api/listings`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch feed');
        return res.json();
      })
      .then(data => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Feed error:', err);
        setLoading(false);
      });

    // Check if blacklisted or verification status changed
    if (user?.id) {
      fetch(`${API_BASE_URL}/api/users/${user.id}`)
        .then(res => res.json())
        .then(dbUser => {
          if (dbUser.blacklisted) {
            showToast('Account suspended', 'error');
            localStorage.clear();
            navigate('/onboard');
          } else if (dbUser.phoneVerified !== user.phoneVerified) {
             const updated = { ...user, phoneVerified: dbUser.phoneVerified };
             localStorage.setItem('plug_user', JSON.stringify(updated));
             setUser(updated);
          }
        })
        .catch(() => {});
    }
  }, [navigate]);

  // Sort so boosted items are always at the top
  const sortedListings = [...listings].sort((a, b) => {
    const aBoost = (a.is_boosted === true || a.is_boosted === 1) ? 1 : 0;
    const bBoost = (b.is_boosted === true || b.is_boosted === 1) ? 1 : 0;
    return bBoost - aBoost;
  });

  // Filter based on user's unlocked areas and selected type
  const getUnlockedList = () => {
    if (!user) return [];
    const isAdmin = user?.phone === '263715198745' || user?.phone === '+263715198745' || 
                    user?.phone === '263775939688' || user?.phone === '+263775939688';

    if (isAdmin) {
      return ALL_SUBURBS;
    }

    try {
      const list = typeof user?.unlockedSuburbs === 'string' 
        ? JSON.parse(user.unlockedSuburbs) 
        : (user?.unlockedSuburbs || []);
      
      const combined = Array.from(new Set([user?.homeBase || user?.homebase, ...list])).filter(Boolean);
      return combined;
    } catch(e) {
      return [user?.homeBase || user?.homebase].filter(Boolean);
    }
  };

  const unlockedList = getUnlockedList();

  const filteredListings = sortedListings.filter(l => 
    (!user || unlockedList.includes(l.suburb))
  );

  const handleUnlock = async (suburb) => {
    setUnlocking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/unlock-suburb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Welcome to ${suburb}! 📍`, 'success');
        const updated = { ...user, unlockedSuburbs: JSON.stringify(data.unlockedSuburbs) };
        localStorage.setItem('plug_user', JSON.stringify(updated));
        setUser(updated);
        setShowUnlockModal(false);
      } else {
        showToast(data.error || 'Failed to unlock', 'error');
      }
    } catch(e) {
      showToast('Network error', 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const hasUnusedUnlocks = user && unlockedList.length < (user.unlockedSuburbsLimit || 1);

  const items = filteredListings.filter(l => l.type === 'item');
  const gigs = filteredListings.filter(l => l.type === 'gig');

  return (
    <div className="screen active">
      <div className="topbar">
        <img 
          src={logo} 
          alt="The Plug" 
          onClick={() => navigate('/home')} 
          style={{height:'22px', width:'auto', cursor:'pointer'}} 
        />
        <div style={{display:'flex',gap:'15px'}}>
          <div className="icon-btn" onClick={() => navigate('/messages')} style={{position:'relative'}}>💬<div className="badge"></div></div>
          <div className="icon-btn" onClick={() => navigate('/messages')}>🔔</div>
        </div>
      </div>
      <div className="scroll-area">
        <div className="feed-toggle">
          <div className={`feed-tab ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>{t.all}</div>
          <div className={`feed-tab ${filter==='item'?'active':''}`} onClick={()=>setFilter('item')}>{t.items}</div>
          <div className={`feed-tab ${filter==='gig'?'active':''}`} onClick={()=>setFilter('gig')}>{t.gigs}</div>
        </div>

        <div style={{padding:'10px 20px', backgroundColor:'var(--surface)', borderBottom:'1px solid var(--border)', fontSize:'12px', color:'var(--text-muted)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
           <div>
             📍 {t.showingPlugs.replace('{suburbs}', (unlockedList.join(', ') || 'your area'))}
             {user?.ubuntupoints < 150 && unlockedList.length === 1 && <span style={{marginLeft:'5px'}}>{t.get150Pts}</span>}
           </div>
           {hasUnusedUnlocks && (
             <button 
               className="btn-sm" 
               style={{background:'var(--amber)', color:'#000', border:'none', fontSize:'10px', fontWeight:700}}
               onClick={() => setShowUnlockModal(true)}
             >
               {t.unlockNew}
             </button>
           )}
        </div>

        {!(user?.phoneVerified || user?.phone_verified) && (
          <div style={{
            margin:'15px 20px', padding:'16px', background:'rgba(255, 107, 107, 0.1)', 
            border:'1px solid rgba(255, 107, 107, 0.3)', borderRadius:'12px',
            display:'flex', alignItems:'center', gap:'12px'
          }}>
            <div style={{fontSize:'24px'}}>🔐</div>
            <div style={{flex:1}}>
               <div style={{fontSize:'13px', fontWeight:700, color:'#ff6b6b'}}>Verification Required</div>
               <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Verify your device to message, bid, or post.</div>
            </div>
            <button 
              className="btn-sm" 
              style={{background:'var(--red)', color:'#fff', border:'none'}}
              onClick={() => navigate('/settings')}
            >
              Verify
            </button>
          </div>
        )}

        {loading ? (
          <div style={{padding:'20px',textAlign:'center'}}>Loading the feed...</div>
        ) : (
          <>
            {(filter === 'all') && (
              <>
                <div className="section-header">
                  <div className="section-title">⚡ {t.endingSoon}</div>
                  <div className="see-all">{t.seeAll}</div>
                </div>
                <div className="urgency-rail">
                  {filteredListings.slice(0, 4).map(l => {
                    const boosted = l.is_boosted || l.isBoosted;
                    return (
                    <div key={l.id} className="urgency-card" style={boosted ? {borderColor:'var(--green)', boxShadow:'0 0 12px rgba(0,232,122,0.15)'} : {}} onClick={()=>navigate(`/detail/${l.id}`)}>
                      <div className="urgency-img" style={{padding:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
                        {boosted && <div style={{position:'absolute', top:4, left:4, background:'var(--green)', color:'#fff', padding:'2px 6px', fontSize:'10px', borderRadius:'10px', fontWeight:'bold', zIndex:10}}>🚀 {t.boosted}</div>}
                        {l.imageUrls && l.imageUrls !== '[]' ? (
                          <img 
                            src={(() => {
                              try {
                                const parsed = typeof l.imageUrls === 'string' ? JSON.parse(l.imageUrls) : l.imageUrls;
                                return Array.isArray(parsed) ? parsed[0] : parsed;
                              } catch(e) { return null; }
                            })()} 
                            style={{width:'100%',height:'100%',objectFit:'cover'}} 
                            alt="listing" 
                          />
                        ) : (
                          l.type === 'item' ? '🎮' : '🌿'
                        )}
                        <div className="urgency-timer">{getTimeRemaining(l.createdat, l.duration)}</div>
                      </div>
                      <div className="urgency-info"><h5>{l.title}</h5><div className="urgency-bid">${l.price || 'Blind'}</div></div>
                    </div>
                  )})}
                </div>
              </>
            )}

            {(filter === 'all' || filter === 'item') && (
              <>
                <div className="section-header"><div className="section-title">🛒 Items</div><div className="see-all">Filter</div></div>
                {items.length > 0 ? items.map(l => {
                  const boosted = l.is_boosted || l.isBoosted;
                  return (
                  <div key={l.id} className="listing-card" style={boosted ? {borderColor:'var(--green)'} : {}} onClick={()=>navigate(`/detail/${l.id}`)}>
                    <div className="listing-thumb" style={{padding:0, overflow:'hidden', position:'relative'}}>
                      {boosted && <div style={{position:'absolute', top:4, left:4, background:'var(--green)', color:'#fff', padding:'2px 6px', fontSize:'10px', borderRadius:'10px', fontWeight:'bold', zIndex:10}}>🚀</div>}
                      {l.imageUrls && l.imageUrls !== '[]' ? (
                        <img 
                          src={(() => {
                            try {
                              const parsed = typeof l.imageUrls === 'string' ? JSON.parse(l.imageUrls) : l.imageUrls;
                              return Array.isArray(parsed) ? parsed[0] : parsed;
                            } catch(e) { return null; }
                          })()} 
                          style={{width:'100%',height:'100%',objectFit:'cover'}} 
                          alt="listing" 
                        />
                      ) : (
                        '🎮'
                      )}
                    </div>
                    <div className="listing-body">
                      <h4>{l.title}</h4>
                      <div className="listing-meta"><span className="listing-price">${(l.price || 0).toFixed(2)}</span><span className="listing-time">{getTimeRemaining(l.createdat, l.duration)} {t.left}</span></div>
                      <div className="listing-suburb">📍 {l.suburb}</div>
                      <div className="ubuntu-chip"><div className="dot dot-g"></div> {l.ubuntupoints} {t.pts} · {l.fullname}</div>
                    </div>
                  </div>
                )}) : <p style={{padding:'0 20px', color:'var(--text-muted)'}}>{t.noListings.replace('{suburb}', (user?.homebase || ''))}</p>}
              </>
            )}

            {(filter === 'all' || filter === 'gig') && (
              <>
                <div className="section-header"><div className="section-title">💼 Local Gigs</div><div className="see-all">Filter</div></div>
                {gigs.length > 0 ? gigs.map(l => {
                  const boosted = l.is_boosted || l.isBoosted;
                  return (
                  <div key={l.id} className="gig-card" style={boosted ? {borderColor:'var(--green)'} : {}} onClick={()=>navigate(`/detail/${l.id}`)}>
                    <div className="gig-header">
                      <div className="gig-icon youth" style={boosted ? {background:'var(--green)', color:'#fff'} : {}}>{boosted ? '🚀' : (l.category === 'Gardening' ? '🌿' : '💼')}</div>
                      <div className="gig-info"><h4>{l.title} {boosted && <span style={{fontSize:'12px',color:'var(--green)'}}>BOOSTED</span>}</h4><p>{l.description}</p></div>
                    </div>
                    <div className="gig-meta">
                      <span className="gig-stat">💰 <strong>{l.bidCount || 0} {t.bids}</strong></span>
                      <span className="gig-stat">📍 <strong>{l.suburb}</strong></span>
                    </div>
                    {l.is16PlusFriendly && <div style={{marginTop:'9px'}}><span className="youth-tag">✅ 16+ Friendly</span></div>}
                  </div>
                )}) : <p style={{padding:'0 20px', color:'var(--text-muted)'}}>{t.noListings.replace('{suburb}', (user?.homebase || ''))}</p>}
              </>
            )}
          </>
        )}
      </div>

      {/* Unlock Suburb Modal */}
      {showUnlockModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px'
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:'24px',
            padding:'24px', width:'100%', maxWidth:'400px',
            boxShadow:'0 10px 40px rgba(0,0,0,0.5)', height:'80vh', overflow:'hidden', display:'flex', flexDirection:'column'
          }}>
            <div style={{textAlign:'center', marginBottom:'20px'}}>
              <h3 style={{margin:0, fontFamily:'"Syne", sans-serif'}}>Choose Neighborhood</h3>
              <p style={{fontSize:'12px', color:'var(--text-muted)'}}>You have {user.unlockedSuburbsLimit - unlockedList.length} unlock(s) available!</p>
            </div>

            <div style={{flex:1, overflowY:'auto', paddingRight:'10px'}}>
              {ALL_SUBURBS.filter(s => !unlockedList.includes(s)).map(s => (
                <div 
                  key={s} 
                  className="listing-card" 
                  style={{padding:'15px', marginBottom:'10px', cursor:'pointer', textAlign:'center', fontWeight:700}}
                  onClick={() => !unlocking && handleUnlock(s)}
                >
                  {s}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowUnlockModal(false)}
              style={{
                width:'100%', background:'none', border:'none',
                color:'var(--text-muted)', fontSize:'14px', cursor:'pointer', padding:'15px 0 0'
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
