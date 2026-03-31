import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');

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

  // Filter based on user's homebase and selected type
  const filteredListings = sortedListings.filter(l => 
    (!user || !user.homebase || l.suburb === user.homebase)
  );

  const items = filteredListings.filter(l => l.type === 'item');
  const gigs = filteredListings.filter(l => l.type === 'gig');

  return (
    <div className="screen active">
      <div className="topbar">
        <div className="logo" onClick={() => navigate('/home')}>THE<span>PLUG</span></div>
        <div style={{display:'flex',gap:'15px'}}>
          <div className="icon-btn" onClick={() => navigate('/messages')} style={{position:'relative'}}>💬<div className="badge"></div></div>
          <div className="icon-btn" onClick={() => navigate('/messages')}>🔔</div>
        </div>
      </div>
      <div className="scroll-area">
        <div className="feed-toggle">
          <div className={`feed-tab ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>All</div>
          <div className={`feed-tab ${filter==='item'?'active':''}`} onClick={()=>setFilter('item')}>Items</div>
          <div className={`feed-tab ${filter==='gig'?'active':''}`} onClick={()=>setFilter('gig')}>Gigs</div>
        </div>

        <div style={{padding:'10px 20px', backgroundColor:'var(--surface)', borderBottom:'1px solid var(--border)', fontSize:'12px', color:'var(--text-muted)'}}>
           📍 Showing Plugs in <strong>{user?.homebase || 'your area'}</strong> 
           {user?.ubuntupoints < 150 && <span style={{marginLeft:'5px'}}>(Get 150 pts to unlock more)</span>}
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
                  <div className="section-title">⚡ Ending Soon</div>
                  <div className="see-all">See all</div>
                </div>
                <div className="urgency-rail">
                  {filteredListings.slice(0, 4).map(l => {
                    const boosted = l.is_boosted || l.isBoosted;
                    return (
                    <div key={l.id} className="urgency-card" style={boosted ? {borderColor:'var(--green)', boxShadow:'0 0 12px rgba(0,232,122,0.15)'} : {}} onClick={()=>navigate(`/detail/${l.id}`)}>
                      <div className="urgency-img" style={{padding:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
                        {boosted && <div style={{position:'absolute', top:4, left:4, background:'var(--green)', color:'#fff', padding:'2px 6px', fontSize:'10px', borderRadius:'10px', fontWeight:'bold', zIndex:10}}>🚀 BOOSTED</div>}
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
                        <div className="urgency-timer">22h</div>
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
                      <div className="listing-meta"><span className="listing-price">${(l.price || 0).toFixed(2)}</span><span className="listing-time">22h left</span></div>
                      <div className="listing-suburb">📍 {l.suburb}</div>
                      <div className="ubuntu-chip"><div className="dot dot-g"></div> {l.ubuntupoints} pts · {l.fullname}</div>
                    </div>
                  </div>
                )}) : <p style={{padding:'0 20px', color:'var(--text-muted)'}}>No items listed in {user?.homebase} yet.</p>}
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
                      <span className="gig-stat">💰 <strong>{l.bidCount || 0} bids</strong></span>
                      <span className="gig-stat">📍 <strong>{l.suburb}</strong></span>
                    </div>
                    {l.is16PlusFriendly && <div style={{marginTop:'9px'}}><span className="youth-tag">✅ 16+ Friendly</span></div>}
                  </div>
                )}) : <p style={{padding:'0 20px', color:'var(--text-muted)'}}>No gigs available in {user?.homebase}.</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
