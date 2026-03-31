import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Splash({ t }) {
  const navigate = useNavigate();

  return (
    <div id="splash" className="screen active">
      <div className="splash-inner">
        <img src={logo} alt="The Plug Logo" style={{width:'220px', height:'auto', marginBottom:'20px'}} />
        <div className="splash-tag">{t.tagline}</div>
        <p className="splash-sub">{t.subTagline}</p>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',marginTop:'36px'}}>
          <button className="btn-primary" onClick={() => navigate('/onboard')}>{t.getStarted}</button>
          <button className="btn-ghost" onClick={() => navigate('/home')}>{t.signInPlug}</button>
        </div>
      </div>
    </div>
  );
}
