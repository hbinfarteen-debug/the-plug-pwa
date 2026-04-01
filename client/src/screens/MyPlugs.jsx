import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function MyPlugs({ showToast, t, onSuccess }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('req');
  const [plugs, setPlugs] = useState({ requests: [], hustle: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savedListings, setSavedListings] = useState([]);

  // Boost setup
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostingPlug, setBoostingPlug] = useState(null);
  const [boostRef, setBoostRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (e) { return '24h'; }
  };

  const isListingEnded = (createdAt, durationHours) => {
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const end = new Date(created.getTime() + (durationHours * 60 * 60 * 1000));
      return now >= end;
    } catch (e) { return false; }
  };

  useEffect(() => {
    const usr = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!usr.id) {
      setLoading(false);
      return;
    }
    setUser(usr);
    setBoostRef('');

    // Load saved listings
    const saved = JSON.parse(localStorage.getItem('plug_saved') || '[]');
    if (saved.length > 0) {
      Promise.all(saved.map(id =>
        fetch(`${API_BASE_URL}/api/listings/${id}`)
          .then(r => r.json())
          .catch(() => null)
      )).then(results => {
        setSavedListings(results.filter(Boolean));
      });
    }

    fetch(`${API_BASE_URL}/api/users/${usr.id}/plugs`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setPlugs({
            requests: Array.isArray(data.requests) ? data.requests : [],
            hustle: Array.isArray(data.hustle) ? data.hustle : []
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const deleteBid = (bidId, listingId) => {
    setPlugs(prev => ({
      ...prev,
      requests: prev.requests.filter(r => !(r.id === listingId))
    }));
    showToast('Bid removed ✓', 'success');
  };

  const removeSaved = (listingId) => {
    const saved = JSON.parse(localStorage.getItem('plug_saved') || '[]');
    const updated = saved.filter(id => id !== listingId);
    localStorage.setItem('plug_saved', JSON.stringify(updated));
    setSavedListings(prev => prev.filter(l => l.id !== listingId));
    showToast('Removed from saved', 'success');
  };

  const submitManualBoost = async () => {
    if (!boostRef || boostRef.length < 5) return showToast('Enter a valid EcoCash Ref Code', 'error');
    setIsSubmitting(true);
    
    try {
       const res = await fetch(`${API_BASE_URL}/api/payments/manual-submit`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           userId: user.id,
           listingId: boostingPlug.id,
           amount: 0.30,
           proofCode: boostRef,
           type: 'boost'
         })
       });
       const data = await res.json();
       
       if (res.ok && data.success) {
         showToast('Code submitted! Barry will verify and boost you soon. 🚀', 'success');
         setShowBoostModal(false);
         setBoostRef('');
       } else {
         showToast(data.error || 'Failed to submit code.', 'error');
       }
    } catch(e) {
      console.error(e);
      showToast('Network error while submitting.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process bids: for ended listings, only show won bids
  const processedRequests = plugs.requests.map((r, idx) => {
    const ended = r.status === 'ended' || r.status === 'sold' || isListingEnded(r.createdat, r.duration);
    return { ...r, _bidNumber: idx + 1, _ended: ended };
  }).filter(r => {
    // If ended, only show if this user won (bidStatus accepted) or status is won
    if (r._ended) {
      return r.bidStatus === 'accepted' || r.bidStatus === 'won';
    }
    return true;
  });

  if (loading) return <div className="screen active"><div style={{padding:'20px',textAlign:'center'}}>Loading your plugs...</div></div>;

  // Color palette for bid cards
  const getBidAccent = (status) => {
    if (status === 'accepted' || status === 'won') return { bg: 'rgba(0,232,122,0.08)', border: 'rgba(0,232,122,0.25)', color: 'var(--green)', label: 'WON 🏆' };
    if (status === 'rejected' || status === 'lost') return { bg: 'rgba(255,59,59,0.08)', border: 'rgba(255,59,59,0.25)', color: 'var(--red)', label: 'LOST' };
    return { bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.2)', color: 'var(--amber)', label: 'PENDING' };
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <div className="logo">{t.myPlugs}</div>
        <div className="icon-btn" onClick={() => showToast('All caught up!', 'success')}>📬</div>
      </div>
      <div className="scroll-area">
        {/* Tabs - 3 tabs now */}
        <div className="plugs-tabs" style={{gridTemplateColumns:'1fr 1fr 1fr', display:'grid'}}>
          <div className={`plugs-tab ${tab==='req'?'active':''}`} onClick={()=>setTab('req')}>📥 Bids</div>
          <div className={`plugs-tab ${tab==='hus'?'active':''}`} onClick={()=>setTab('hus')}>💪 Hustle</div>
          <div className={`plugs-tab ${tab==='saved'?'active':''}`} onClick={()=>setTab('saved')}>💾 Saved</div>
        </div>

        {/* ===== BIDS TAB (Redesigned) ===== */}
        {tab === 'req' && (
          <div className="plugs-panel active">
            {processedRequests.length > 0 ? processedRequests.map((r, idx) => {
              const accent = getBidAccent(r.bidStatus);
              const imageUrl = (() => {
                try {
                  const parsed = typeof r.imageUrls === 'string' ? JSON.parse(r.imageUrls || r.imageurls) : (r.imageUrls || r.imageurls);
                  return Array.isArray(parsed) ? parsed[0] : parsed;
                } catch(e) { return null; }
              })();

              return (
                <div key={r.id} style={{
                  margin:'0 20px 14px',
                  background: accent.bg,
                  border: `1px solid ${accent.border}`,
                  borderRadius:'16px',
                  overflow:'hidden',
                  transition:'transform 0.15s',
                }}>
                  {/* Card top with image + info */}
                  <div style={{display:'flex', gap:'0'}}>
                    {/* Image or placeholder */}
                    <div style={{
                      width:'90px', minHeight:'100px', flexShrink:0,
                      background: imageUrl ? 'transparent' : 'var(--surface3)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'32px', position:'relative', overflow:'hidden'
                    }}>
                      {imageUrl ? (
                        <img src={imageUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="bid item" />
                      ) : (
                        r.type === 'item' ? '🎮' : '🌿'
                      )}
                      {/* Bid number badge */}
                      <div style={{
                        position:'absolute', top:'6px', left:'6px',
                        background: accent.color, color:'#000',
                        width:'24px', height:'24px', borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'11px', fontWeight:800, fontFamily:'"Syne", sans-serif',
                        boxShadow:'0 2px 8px rgba(0,0,0,0.3)'
                      }}>
                        {idx + 1}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{flex:1, padding:'12px 14px', display:'flex', flexDirection:'column', justifyContent:'center', minWidth:0}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'6px'}}>
                        <div style={{fontSize:'15px', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.title}</div>
                        <div style={{
                          flexShrink:0, fontSize:'10px', fontWeight:800, padding:'3px 10px',
                          borderRadius:'100px', background: accent.bg,
                          border: `1px solid ${accent.border}`, color: accent.color,
                          letterSpacing:'0.5px'
                        }}>
                          {accent.label}
                        </div>
                      </div>
                      
                      <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'4px'}}>
                        📍 {r.suburb}
                      </div>

                      <div style={{display:'flex', alignItems:'center', gap:'12px', marginTop:'2px'}}>
                        <div style={{fontSize:'18px', fontWeight:800, color: accent.color, fontFamily:'"Syne", sans-serif'}}>
                          ${Number(r.myBid || 0).toFixed(2)}
                        </div>
                        <div style={{fontSize:'11px', color:'var(--text-dim)'}}>your bid</div>
                      </div>
                    </div>
                  </div>

                  {/* Swap code for won bids */}
                  {r.bidStatus === 'accepted' && (
                    <div style={{margin:'0 14px', padding:'10px', background:'var(--surface3)', border:'1.5px dashed var(--green)', borderRadius:'10px', textAlign:'center'}}>
                      <div style={{fontFamily:'"Syne", sans-serif', fontSize:'24px', fontWeight:800, color:'var(--green)', letterSpacing:'8px'}}>8 8 2 1</div>
                      <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>Show this code to provider when job is done ↑</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{display:'flex', gap:'8px', padding:'10px 14px 14px'}}>
                    {r.bidStatus === 'accepted' && (
                      <button className="btn-sm p" onClick={onSuccess} style={{flex:1}}>✅ Complete</button>
                    )}
                    <button className="btn-sm s" onClick={()=>navigate(`/detail/${r.id}`)} style={{flex:1}}>View</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteBid(r.id, r.id); }} 
                      style={{
                        width:'40px', height:'40px', borderRadius:'10px', border:'1px solid rgba(255,59,59,0.25)',
                        background:'rgba(255,59,59,0.08)', color:'var(--red)', display:'flex', alignItems:'center',
                        justifyContent:'center', cursor:'pointer', fontSize:'16px', flexShrink:0, transition:'background 0.2s'
                      }}
                      title="Remove bid"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div style={{padding:'60px 20px', textAlign:'center', color:'var(--text-muted)'}}>
                <div style={{fontSize:'48px', marginBottom:'16px'}}>📥</div>
                <h3 style={{fontFamily:'"Syne", sans-serif', fontSize:'18px', fontWeight:800, marginBottom:'8px', color:'var(--text)'}}>No active bids</h3>
                <p style={{fontSize:'13px', lineHeight:1.6}}>Bid on items and gigs from the feed.<br/>Won bids will show up here!</p>
              </div>
            )}
          </div>
        )}

        {/* ===== HUSTLE TAB ===== */}
        {tab === 'hus' && (
          <div className="plugs-panel active">
            {plugs?.hustle?.length > 0 ? plugs.hustle.map(h => {
              const boosted = h.is_boosted || h.isBoosted;
              return (
                <div key={h.id} className="plug-item" style={boosted ? {borderColor:'var(--green)', boxShadow:'0 0 10px rgba(0,232,122,0.1)'} : {}}>
                  <div className="plug-item-header">
                    <div>
                      <div className="plug-item-title">{h.title} {boosted && <span style={{fontSize:'12px', color:'var(--green)'}}>🚀 BOOSTED</span>}</div>
                      <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'3px'}}>📍 {h.suburb} · Status: {h.status}</div>
                    </div>
                    <div className={`pstatus ${h.status === 'active' ? 's-active' : 's-pending'}`}>{h.status.toUpperCase()}</div>
                  </div>
                  <div className="plug-acts" style={{marginTop:'10px'}}>
                     <button className="btn-sm s" onClick={()=>navigate(`/detail/${h.id}`)}>{t.manage}</button>
                     {!boosted && (
                       <button className="btn-sm p" style={{background:'rgba(255,184,0,0.15)', color:'var(--amber)', border:'1px solid rgba(255,184,0,0.3)'}} onClick={() => {
                         setBoostingPlug(h);
                         setShowBoostModal(true);
                       }}>
                         🚀 {t.boost}
                       </button>
                     )}
                  </div>
                </div>
              );
            }) : <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>Nothing to hustle yet. Plug something!</div>}
          </div>
        )}

        {/* ===== SAVED TAB (New) ===== */}
        {tab === 'saved' && (
          <div className="plugs-panel active">
            {savedListings.length > 0 ? savedListings.map(l => {
              const imageUrl = (() => {
                try {
                  const parsed = typeof l.imageUrls === 'string' ? JSON.parse(l.imageUrls || l.imageurls) : (l.imageUrls || l.imageurls);
                  return Array.isArray(parsed) ? parsed[0] : parsed;
                } catch(e) { return null; }
              })();
              const timeLeft = getTimeRemaining(l.createdat || l.createdAt, l.duration);
              const bidCount = l.bids?.length || l.bidCount || 0;
              const hasEnded = timeLeft === 'Ended';

              return (
                <div key={l.id} style={{
                  margin:'0 20px 14px',
                  background: hasEnded ? 'rgba(255,255,255,0.02)' : 'var(--surface)',
                  border: `1px solid ${hasEnded ? 'rgba(255,59,59,0.15)' : 'var(--border)'}`,
                  borderRadius:'16px',
                  overflow:'hidden',
                  opacity: hasEnded ? 0.6 : 1,
                  transition:'transform 0.15s'
                }}
                  onClick={() => navigate(`/detail/${l.id}`)}
                >
                  <div style={{display:'flex'}}>
                    {/* Image */}
                    <div style={{
                      width:'100px', height:'100px', flexShrink:0,
                      background: imageUrl ? 'transparent' : 'var(--surface3)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'34px', position:'relative', overflow:'hidden'
                    }}>
                      {imageUrl ? (
                        <img src={imageUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="saved item" />
                      ) : (
                        l.type === 'item' ? '🎮' : '🌿'
                      )}
                      {/* Timer overlay */}
                      <div style={{
                        position:'absolute', bottom:'4px', right:'4px',
                        background:'rgba(0,0,0,0.85)', borderRadius:'5px',
                        padding:'2px 6px', fontSize:'10px', fontWeight:700,
                        color: hasEnded ? 'var(--red)' : 'var(--amber)',
                        fontFamily:'"Syne", sans-serif'
                      }}>
                        {hasEnded ? '⛔ Ended' : `⏱ ${timeLeft}`}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{flex:1, padding:'12px 14px', display:'flex', flexDirection:'column', position:'relative', minWidth:0}}>
                      {/* Remove button */}
                      <div 
                        onClick={(e) => { e.stopPropagation(); removeSaved(l.id); }}
                        style={{
                          position:'absolute', top:'8px', right:'8px',
                          width:'26px', height:'26px', borderRadius:'50%',
                          background:'rgba(255,59,59,0.1)', border:'1px solid rgba(255,59,59,0.2)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          cursor:'pointer', fontSize:'12px', color:'var(--red)',
                          transition:'background 0.2s'
                        }}
                      >
                        ✕
                      </div>

                      <div style={{fontSize:'14px', fontWeight:700, marginBottom:'6px', paddingRight:'30px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                        {l.title}
                      </div>

                      <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                        <div style={{
                          fontSize:'18px', fontWeight:800, color:'var(--green)',
                          fontFamily:'"Syne", sans-serif'
                        }}>
                          ${l.type === 'item' ? (bidCount > 0 ? Number(l.price || 0).toFixed(2) : '0.00') : Number(l.price || 0).toFixed(2)}
                        </div>
                        <div style={{
                          fontSize:'11px', padding:'2px 8px', borderRadius:'100px',
                          background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.2)',
                          color:'var(--amber)', fontWeight:600
                        }}>
                          {bidCount} bid{bidCount !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'auto', paddingTop:'4px'}}>
                        📍 {l.suburb}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{padding:'60px 20px', textAlign:'center', color:'var(--text-muted)'}}>
                <div style={{fontSize:'48px', marginBottom:'16px'}}>💾</div>
                <h3 style={{fontFamily:'"Syne", sans-serif', fontSize:'18px', fontWeight:800, marginBottom:'8px', color:'var(--text)'}}>No saved plugs</h3>
                <p style={{fontSize:'13px', lineHeight:1.6}}>Tap the save button on any listing<br/>to keep it handy here.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {showBoostModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1000
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:'24px 24px 0 0',
            padding:'32px 24px 44px', width:'100%', maxWidth:'480px',
            boxShadow:'0 -8px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{textAlign:'center', marginBottom:'24px'}}>
              <div style={{fontSize:'44px', marginBottom:'8px'}}>🚀</div>
              <h3 style={{margin:'0 0 6px', fontSize:'20px', fontFamily:'"Syne", sans-serif'}}>Boost Your Plug</h3>
              <p style={{fontSize:'13px', color:'var(--text-muted)', margin:0, lineHeight:1.6}}>
                1. Send <strong>$0.30</strong> to <strong>0775939688</strong> (Barry Changwa)<br/>
                2. Enter the <strong>EcoCash Transaction ID</strong> below.
              </p>
            </div>

            <div style={{
              background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.2)',
              borderRadius:'12px', padding:'12px', marginBottom:'20px', textAlign:'center'
            }}>
               <div style={{fontSize:'11px', color:'var(--amber)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px'}}>ECOCASH DETAILS</div>
               <div style={{fontSize:'16px', fontWeight:700}}>0775939688</div>
               <div style={{fontSize:'13px'}}>Barry Changwa</div>
            </div>

            <div className="form-group" style={{marginBottom:'24px'}}>
              <label style={{fontSize:'12px', color:'var(--text-muted)'}}>EcoCash Transaction ID (Ref Code)</label>
              <input 
                className="field-input" 
                placeholder="e.g. PP230401.1234.H12345" 
                value={boostRef}
                onChange={(e) => setBoostRef(e.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              style={{width:'100%', justifyContent:'center', marginBottom:'12px'}}
              onClick={submitManualBoost}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'I\'ve Sent $0.30 - Submit Code 🚀'}
            </button>

            <button
              onClick={() => setShowBoostModal(false)}
              style={{
                width:'100%', background:'none', border:'none',
                color:'var(--text-muted)', fontSize:'14px', cursor:'pointer', padding:'8px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
