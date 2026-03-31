import logo from '../assets/logo.png';

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div id="splash" className="screen active">
      <div className="splash-inner">
        <img src={logo} alt="The Plug Logo" style={{width:'220px', height:'auto', marginBottom:'20px'}} />
        <div className="splash-tag">Community Marketplace · Bulawayo</div>
        <p className="splash-sub">Sell anything. Find any gig.<br/>Build your <em>Ubuntu</em> reputation.</p>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',marginTop:'36px'}}>
          <button className="btn-primary" onClick={() => navigate('/onboard')}>Get Started ›</button>
          <button className="btn-ghost" onClick={() => navigate('/home')}>Already a Plug? Sign In</button>
        </div>
      </div>
    </div>
  );
}
