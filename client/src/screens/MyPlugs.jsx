import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function MyPlugs({ showToast, onSuccess }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('req');
  const [plugs, setPlugs] = useState({ requests: [], hustle: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/users/${user.id}/plugs`)
      .then(res => res.json())
      .then(data => {
        setPlugs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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
            {plugs.requests.length > 0 ? plugs.requests.map(r => (
              <div key={r.id} className="plug-item">
                <div className="plug-item-header">
                  <div><div className="plug-item-title">{r.title}</div><div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'3px'}}>📍 {r.suburb} · You bid ${r.myBid.toFixed(2)}</div></div>
                  <div className={`pstatus ${r.bidStatus === 'accepted' ? 's-pending' : 's-active'}`}>{r.bidStatus.toUpperCase()}</div>
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
            {plugs.hustle.length > 0 ? plugs.hustle.map(h => (
              <div key={h.id} className="plug-item">
                <div className="plug-item-header">
                  <div><div className="plug-item-title">{h.title}</div><div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'3px'}}>📍 {h.suburb} · Status: {h.status}</div></div>
                  <div className={`pstatus ${h.status === 'active' ? 's-active' : 's-pending'}`}>{h.status.toUpperCase()}</div>
                </div>
                <div className="plug-acts" style={{marginTop:'10px'}}>
                   <button className="btn-sm s" onClick={()=>navigate(`/detail/${h.id}`)}>Manage Bids</button>
                </div>
              </div>
            )) : <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>Nothing to hustle yet. Plug something!</div>}
          </div>
        )}

      </div>
    </div>
  );
}
