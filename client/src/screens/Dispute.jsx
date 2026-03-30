import { useNavigate } from 'react-router-dom';

export default function Dispute({ showToast }) {
  const navigate = useNavigate();

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div className="logo" style={{fontSize:'16px',color:'var(--red)'}}>REPORT ISSUE</div>
        <div></div>
      </div>
      <div className="scroll-area">
        <div className="dispute-hdr">
          <h2>🛑 File a Dispute</h2>
          <p>7-day window. Community Jury will review.</p>
        </div>
        <div style={{padding:'14px 20px 6px',fontFamily:'"Syne",sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)'}}>What went wrong?</div>
        <div className="reason-grid">
          <div className="reason-card"><div className="ico">👻</div><p>No-Show / Ghosting</p></div>
          <div className="reason-card"><div className="ico">💸</div><p>Payment Not Made</p></div>
        </div>
        <div style={{padding:'0 20px 16px'}}>
          <div className="form-label">Your Statement</div>
          <textarea className="field-input" placeholder="Describe what happened clearly..." style={{height:'90px'}}></textarea>
          <button className="btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'14px',background:'var(--red)'}} onClick={() => { showToast('Dispute filed.', 'error'); navigate(-1); }}>Submit Dispute</button>
        </div>
      </div>
    </div>
  );
}
