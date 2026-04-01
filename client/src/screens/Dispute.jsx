import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Dispute({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [reason, setReason] = useState(null);
  const [statement, setStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dealId = location.state?.dealId || null;

  const handleSubmit = async () => {
    if (!reason || !statement.trim()) {
      showToast('Please select a reason and describe what happened.', 'error');
      return;
    }
    
    setSubmitting(true);
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');

    try {
      const res = await fetch(`${API_BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealid: dealId,
          reporterid: user.id || null,
          reason,
          statement
        })
      });
      
      if (res.ok) {
        showToast('Dispute filed successfully.', 'success');
        navigate(-1);
      } else {
        showToast('Failed to file dispute', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          <p>7-day window. Admin will review the chat logs.</p>
        </div>
        <div style={{padding:'14px 20px 6px',fontFamily:'"Syne",sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)'}}>What went wrong?</div>
        <div className="reason-grid">
          <div 
             className="reason-card" 
             style={{ border: reason === 'ghosting' ? '2px solid var(--red)' : '1px solid var(--border)' }}
             onClick={() => setReason('ghosting')}
          >
            <div className="ico">👻</div><p>No-Show / Ghosting</p>
          </div>
          <div 
             className="reason-card" 
             style={{ border: reason === 'payment' ? '2px solid var(--red)' : '1px solid var(--border)' }}
             onClick={() => setReason('payment')}
          >
            <div className="ico">💸</div><p>Payment Not Made</p>
          </div>
        </div>
        <div style={{padding:'0 20px 16px'}}>
          <div className="form-label">Your Statement</div>
          <textarea 
            className="field-input" 
            placeholder="Describe what happened clearly..." 
            style={{height:'90px'}}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          ></textarea>
          <button 
            className="btn-primary" 
            style={{width:'100%',justifyContent:'center',marginTop:'14px',background:'var(--red)'}} 
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
}
