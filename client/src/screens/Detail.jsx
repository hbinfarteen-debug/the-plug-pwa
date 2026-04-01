import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Detail({ showToast, t }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biting, setBiting] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/listings/${id}`)
      .then(res => res.json())
      .then(data => {
        setListing(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const placeBid = async () => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return showToast('Please onboard first!', 'error');

    const isVerified = user.phoneVerified || user.phone_verified;
    if (!isVerified) {
      showToast('Please verify your device in Settings to bid!', 'error');
      return navigate('/settings');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/listings/${id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderId: user.id, amount: parseFloat(bidAmount) })
      });
      if (res.ok) {
        showToast("Bid placed! You're winning 🎉", 'success');
        setBidAmount('');
        const updated = await fetch(`${API_BASE_URL}/api/listings/${id}`).then(r => r.json());
        setListing(updated);
      }
    } catch (e) {
      showToast('Error placing bid', 'error');
    }
  };

  const startChat = async () => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return navigate('/onboard');
    if (user.id === listing?.posterId) return showToast("This is your listing!", 'info');

    setBiting(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerId: user.id,
          sellerId: listing.posterId
        })
      });
      const data = await res.json();
      if (data.id) {
        navigate(`/chat/${data.id}`);
      }
    } catch (err) {
      showToast('Error starting chat', 'error');
    }
    setBiting(false);
  };

  if (loading) return <div className="screen active"><div style={{padding:'20px',textAlign:'center'}}>Loading detail...</div></div>;
  if (!listing) return <div className="screen active"><div style={{padding:'20px',textAlign:'center'}}>Listing not found.</div></div>;

  return (
    <div className="screen active">
      {isFullscreen && (
        <div className="fullscreen-overlay" onClick={() => setIsFullscreen(false)} style={{
          position:'fixed', top:0, left:0, width:'100vw', height:'100vh', 
          background:'rgba(0,0,0,0.95)', zIndex:2000, display:'flex', 
          alignItems:'center', justifyContent:'center', backdropFilter:'blur(10px)'
        }}>
          <img 
            src={(() => {
              try {
                const parsed = typeof listing.imageUrls === 'string' ? JSON.parse(listing.imageUrls) : listing.imageUrls;
                return Array.isArray(parsed) ? parsed[0] : parsed;
              } catch(e) { return null; }
            })()} 
            style={{maxWidth:'95%', maxHeight:'90%', borderRadius:'12px', boxShadow:'0 0 40px rgba(0,0,0,0.5)'}} 
            alt="fullscreen" 
          />
          <div style={{position:'absolute', top:'20px', right:'20px', color:'#fff', fontSize:'24px', fontWeight:300}}>✕</div>
        </div>
      )}
      <div className="detail-img" onClick={() => setIsFullscreen(true)} style={{padding:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-in'}}>
        {listing.imageUrls && listing.imageUrls !== '[]' ? (
          <img 
            src={(() => {
              try {
                const parsed = typeof listing.imageUrls === 'string' ? JSON.parse(listing.imageUrls) : listing.imageUrls;
                return Array.isArray(parsed) ? parsed[0] : parsed;
              } catch(e) { return null; }
            })()} 
            style={{width:'100%',height:'100%',objectFit:'cover'}} 
            alt="listing" 
          />
        ) : (
          listing.type === 'item' ? '🎮' : '🌿'
        )}
        <div className="detail-timer-tag">⏱ {getTimeRemaining(listing.createdat, listing.duration)} {t?.left || 'left'}</div>
      </div>
      <div className="scroll-area" style={{paddingBottom:'80px'}}>
        <div className="detail-body">
          <h2>{listing.title}</h2>
          <div className="dprice">
            ${listing.bids && listing.bids.length > 0 
              ? Number(listing.bids[0].amount || 0).toFixed(2) 
              : (listing.type === 'item' ? Number(0).toFixed(2) : Number(listing.price || 0).toFixed(2))} 
            <span>{listing.type === 'item' ? 'current bid' : 'gig'}</span>
          </div>
          <div className="seller-row" onClick={() => navigate(`/profile/${listing?.posterId}`)}>
            <div className="sav" style={{background:'var(--surface2)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', borderRadius:'8px', width:'40px', height:'40px'}}>
               {listing?.avatarUrl || listing?.avatarurl ? (
                 <img src={listing.avatarUrl || listing.avatarurl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="avatar" />
               ) : (
                 listing?.fullname?.charAt(0) || '👤'
               )}
            </div>
            <div style={{flex:1}}><div style={{fontSize:'14px',fontWeight:600}}>{listing?.fullname || 'Plug Seller'}</div><div style={{fontSize:'12px',color:'var(--text-muted)'}}>📍 {listing?.suburb} · <span style={{color:'var(--green)',fontWeight:700}}>{listing?.ubuntupoints || 0} pts</span></div></div>
            <div>›</div>
          </div>
          <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'16px'}}>{listing.description}</p>
          
          <div className="bid-section">
            <h4>{listing.type === 'item' ? 'Place Your Bid' : 'Apply for Gig'}</h4>
            <div style={{display:'flex',gap:'10px'}}>
              <div style={{flex:1,display:'flex',alignItems:'center',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'11px 14px'}}>
                <span style={{fontSize:'15px',color:'var(--text-muted)',marginRight:'7px'}}>$</span>
                <input 
                  type="number" 
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.00" 
                  style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--text)',fontSize:'18px',fontWeight:700,fontFamily:'"Syne",sans-serif'}} 
                />
              </div>
              {(() => {
                const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
                const isVerified = user.phoneVerified || user.phone_verified;
                const isOwner = Number(user.id) === Number(listing.posterId);

                if (listing.status !== 'active') {
                  return <button className="btn-primary" style={{padding:'12px 18px', background:'var(--surface2)', color:'var(--red)', border:'1px solid var(--red)', cursor:'not-allowed'}} disabled>Closed</button>;
                }

                if (isOwner) {
                  return <button className="btn-primary" style={{padding:'12px 18px', background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)', cursor:'not-allowed'}} disabled>Your Plug</button>;
                }

                return isVerified ? (
                  <button className="btn-primary" style={{padding:'12px 18px'}} onClick={placeBid}>Bid</button>
                ) : (
                  <button className="btn-primary" style={{padding:'12px 18px', background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)'}} onClick={() => navigate('/settings')}>Verify to bid</button>
                );
              })()}
            </div>
          </div>

          <button className="btn-primary" style={{width:'100%', marginTop:'15px', background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)'}} onClick={startChat} disabled={biting}>
            {biting ? 'Starting...' : '💬 Message Plug'}
          </button>

          <div style={{marginTop:'20px'}}>
            <h4>Recent Bids</h4>
            {listing.bids?.length > 0 ? (
              listing.bids.map(b => (
                <div key={b.id} style={{padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                  <span>{b.fullname || 'Bidder'} ({b.ubuntupoints || 0} pts)</span>
                  <span style={{color:'var(--green)', fontWeight:700}}>${Number(b.amount || 0).toFixed(2)}</span>
                </div>
              ))
            ) : <p style={{fontSize:'12px', color:'var(--text-muted)'}}>No bids yet. Be the first!</p>}
          </div>

          <div style={{display:'flex',gap:'9px', marginTop:'20px'}}>
            <button className="btn-sm s" onClick={() => {
              const saved = JSON.parse(localStorage.getItem('plug_saved') || '[]');
              const listingId = listing.id;
              if (saved.includes(listingId)) {
                const updated = saved.filter(id => id !== listingId);
                localStorage.setItem('plug_saved', JSON.stringify(updated));
                showToast('Removed from saved', 'success');
              } else {
                saved.push(listingId);
                localStorage.setItem('plug_saved', JSON.stringify(saved));
                showToast('Listing saved! Find it in My Plugs → Saved 💾', 'success');
              }
            }}>{(() => {
              const saved = JSON.parse(localStorage.getItem('plug_saved') || '[]');
              return saved.includes(listing.id) ? '✅ Saved' : '💾 Save';
            })()} </button>
            <button className="btn-sm d" onClick={() => navigate('/dispute')}>🚩 Report</button>
          </div>
        </div>
      </div>
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate(-1)} style={{flex:'none',padding:'10px 18px',fontSize:'14px'}}>‹ Back</div>
      </div>
    </div>
  );
}
