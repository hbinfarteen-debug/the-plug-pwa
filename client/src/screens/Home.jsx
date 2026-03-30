import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const items = listings.filter(l => l.type === 'item');
  const gigs = listings.filter(l => l.type === 'gig');

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
                  {listings.slice(0, 4).map(l => (
                    <div key={l.id} className="urgency-card" onClick={()=>navigate(`/detail/${l.id}`)}>
                      <div className="urgency-img" style={{padding:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {l.imageUrls && JSON.parse(l.imageUrls).length > 0 ? (
                          <img src={JSON.parse(l.imageUrls)[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="listing" />
                        ) : (
                          l.type === 'item' ? '🎮' : '🌿'
                        )}
                        <div className="urgency-timer">22h</div>
                      </div>
                      <div className="urgency-info"><h5>{l.title}</h5><div className="urgency-bid">${l.price || 'Blind'}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(filter === 'all' || filter === 'item') && (
              <>
                <div className="section-header"><div className="section-title">🛒 Items</div><div className="see-all">Filter</div></div>
                {items.length > 0 ? items.map(l => (
                  <div key={l.id} className="listing-card" onClick={()=>navigate(`/detail/${l.id}`)}>
                    <div className="listing-thumb" style={{padding:0, overflow:'hidden'}}>
                      {l.imageUrls && JSON.parse(l.imageUrls).length > 0 ? (
                        <img src={JSON.parse(l.imageUrls)[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="listing" />
                      ) : (
                        '🎮'
                      )}
                    </div>
                    <div className="listing-body">
                      <h4>{l.title}</h4>
                      <div className="listing-meta"><span className="listing-price">${l.price?.toFixed(2)}</span><span className="listing-time">22h left</span></div>
                      <div className="listing-suburb">📍 {l.suburb}</div>
                      <div className="ubuntu-chip"><div className="dot dot-g"></div> {l.ubuntuPoints} pts · {l.fullName}</div>
                    </div>
                  </div>
                )) : <p style={{padding:'0 20px', color:'var(--text-muted)'}}>No items listed yet.</p>}
              </>
            )}

            {(filter === 'all' || filter === 'gig') && (
              <>
                <div className="section-header"><div className="section-title">💼 Local Gigs</div><div className="see-all">Filter</div></div>
                {gigs.length > 0 ? gigs.map(l => (
                  <div key={l.id} className="gig-card" onClick={()=>navigate(`/detail/${l.id}`)}>
                    <div className="gig-header">
                      <div className="gig-icon youth">{l.category === 'Gardening' ? '🌿' : '💼'}</div>
                      <div className="gig-info"><h4>{l.title}</h4><p>{l.description}</p></div>
                    </div>
                    <div className="gig-meta">
                      <span className="gig-stat">💰 <strong>{l.bidCount || 0} bids</strong></span>
                      <span className="gig-stat">📍 <strong>{l.suburb}</strong></span>
                    </div>
                    {l.is16PlusFriendly === 1 && <div style={{marginTop:'9px'}}><span className="youth-tag">✅ 16+ Friendly</span></div>}
                  </div>
                )) : <p style={{padding:'0 20px', color:'var(--text-muted)'}}>No gigs available in your area.</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
