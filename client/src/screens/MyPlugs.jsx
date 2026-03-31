import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function MyPlugs({ showToast, onSuccess }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('req');
  const [plugs, setPlugs] = useState({ requests: [], hustle: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Boost setup
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostingPlug, setBoostingPlug] = useState(null);
  const [boostRef, setBoostRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const usr = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!usr.id) {
      setLoading(false);
      return;
    }
    setUser(usr);
    setBoostRef('');

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

  if (loading) return <div className="screen active"><div style={{padding:'20px',textAlign:'center'}}>Loading your plugs...</div></div>;

  return (
    <div className="screen active">
      <div className="topbar">
        <div className="logo">MY PLUGS</div>
        <div className="icon-btn" onClick={() => showToast('All caught up!', 'success')}>📬</div>
      </div>
      <div className="scroll-area">
        <div className="plugs-tabs">
          <div className={`plugs-tab ${tab==='req'?'active':''}`} onClick={()=>setTab('req')}>📥 My Requests</div>
          <div className={`plugs-tab ${tab==='hus'?'active':''}`} onClick={()=>setTab('hus')}>💪 My Hustle</div>
        </div>

        {tab === 'req' && (
          <div className="plugs-panel active">
            {plugs?.requests?.length > 0 ? plugs.requests.map(r => (
              <div key={r.id} className="plug-item">
                <div className="plug-item-header">
                  <div><div className="plug-item-title">{r.title}</div><div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'3px'}}>📍 {r.suburb} · You bid ${Number(r.myBid || 0).toFixed(2)}</div></div>
                  <div className={`pstatus ${r.bidStatus === 'accepted' ? 's-pending' : 's-active'}`}>{String(r.bidStatus || 'PENDING').toUpperCase()}</div>
                </div>
                {r.bidStatus === 'accepted' && (
                  <div className="swap-code">
                    <div className="swap-num">8 8 2 1</div>
                    <div className="swap-lbl">Show this code to provider when job is done ↑</div>
                  </div>
                )}
                <div className="plug-acts" style={{marginTop:'10px'}}>
                  {r.bidStatus === 'accepted' && <button className="btn-sm p" onClick={onSuccess}>✅ Complete</button>}
                  <button className="btn-sm s" onClick={()=>navigate(`/detail/${r.id}`)}>View</button>
                </div>
              </div>
            )) : <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No active requests yet.</div>}
          </div>
        )}

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
                     <button className="btn-sm s" onClick={()=>navigate(`/detail/${h.id}`)}>Manage</button>
                     {!boosted && (
                       <button className="btn-sm p" style={{background:'rgba(255,184,0,0.15)', color:'var(--amber)', border:'1px solid rgba(255,184,0,0.3)'}} onClick={() => {
                         setBoostingPlug(h);
                         setShowBoostModal(true);
                       }}>
                         🚀 Boost ($0.30)
                       </button>
                     )}
                  </div>
                </div>
              );
            }) : <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>Nothing to hustle yet. Plug something!</div>}
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
