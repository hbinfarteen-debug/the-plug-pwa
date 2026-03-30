import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div id="splash" className="screen active">
      <div className="splash-inner">
        <div className="splash-logo">THE<br/>PLUG</div>
        <div className="splash-tag">Community Marketplace · Bulawayo</div>
        <p className="splash-sub">Sell anything. Find any gig.<br/>Build your <em>Ubuntu</em> reputation.</p>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',marginTop:'36px'}}>
          <button className="btn-primary" onClick={() => navigate('/onboard')}>Get Started ›</button>
          <button className="btn-ghost" onClick={() => navigate('/home')}>Already a Plug? Sign In</button>
        </div>
        <p style={{marginTop:'36px',fontSize:'12px',color:'var(--text-dim)'}}>Triple-tap logo anywhere to access Admin View</p>
      </div>
    </div>
  );
}
