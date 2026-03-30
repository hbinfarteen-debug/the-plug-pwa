import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Detail({ showToast }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    fetch(`/api/listings/${id}`)
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

    try {
      const res = await fetch(`/api/listings/${id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderId: user.id, amount: parseFloat(bidAmount) })
      });
      if (res.ok) {
        showToast("Bid placed! You're winning 🎉", 'success');
        setBidAmount('');
        // Refresh listing
        const updated = await fetch(`/api/listings/${id}`).then(r => r.json());
        setListing(updated);
      }
    } catch (e) {
      showToast('Error placing bid', 'error');
    }
  };

  if (loading) return <div className="screen active"><div style={{padding:'20px',textAlign:'center'}}>Loading detail...</div></div>;
  if (!listing) return <div className="screen active"><div style={{padding:'20px',textAlign:'center'}}>Listing not found.</div></div>;

  return (
    <div className="screen active">
      <div className="detail-img" style={{padding:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
        {listing.imageUrls && JSON.parse(listing.imageUrls).length > 0 ? (
          <img src={JSON.parse(listing.imageUrls)[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="listing" />
        ) : (
          listing.type === 'item' ? '🎮' : '🌿'
        )}
        <div className="detail-timer-tag">⏱ 22h left</div>
      </div>
      <div className="scroll-area" style={{paddingBottom:'80px'}}>
        <div className="detail-body">
          <h2>{listing.title}</h2>
          <div className="dprice">
            ${listing.bids && listing.bids.length > 0 
              ? listing.bids[0].amount.toFixed(2) 
              : (listing.price || 0).toFixed(2)} 
            <span>{listing.type === 'item' ? 'current bid' : 'gig'}</span>
          </div>
          <div className="seller-row" onClick={() => navigate(`/profile/${listing.posterId}`)}>
            <div className="sav">👨🏾</div>
            <div style={{flex:1}}><div style={{fontSize:'14px',fontWeight:600}}>{listing.fullName}</div><div style={{fontSize:'12px',color:'var(--text-muted)'}}>📍 {listing.suburb} · <span style={{color:'var(--green)',fontWeight:700}}>{listing.ubuntuPoints} pts</span></div></div>
            <div>›</div>
          </div>
          <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'16px'}}>{listing.description}</p>
          
          <div className="bid-section">
            <h4>Place Your Bid</h4>
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
              <button className="btn-primary" style={{padding:'12px 18px'}} onClick={placeBid}>Bid</button>
            </div>
          </div>

          <div style={{marginTop:'20px'}}>
            <h4>Recent Bids</h4>
            {listing.bids?.length > 0 ? (
              listing.bids.map(b => (
                <div key={b.id} style={{padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between'}}>
                  <span>{b.fullName} ({b.ubuntuPoints} pts)</span>
                  <span style={{color:'var(--green)', fontWeight:700}}>${b.amount.toFixed(2)}</span>
                </div>
              ))
            ) : <p style={{fontSize:'12px', color:'var(--text-muted)'}}>No bids yet. Be the first!</p>}
          </div>

          <div style={{display:'flex',gap:'9px', marginTop:'20px'}}>
            <button className="btn-sm s" onClick={() => showToast('Listing saved!', 'success')}>💾 Save</button>
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
