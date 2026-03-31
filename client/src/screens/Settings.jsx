import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings({ showToast }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (data.id) setUser(data);
  }, []);

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem('plug_user');
      showToast('Logged out successfully', 'success');
      navigate('/');
    }
  };

  const clearAppData = () => {
    if (confirm("This will clear all local app data. You will need to login again. Proceed?")) {
      localStorage.clear();
      showToast('App data cleared', 'success');
      window.location.href = '/';
    }
  };

  const deleteAccount = () => {
    if (confirm("Are you sure you want to delete your Plug? This is irreversible.")) {
        showToast('Processing deletion request... (24h)', 'error');
    }
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div className="logo" style={{fontSize:'16px'}}>SETTINGS</div>
        <div></div>
      </div>
      
      <div className="scroll-area">
        <div className="section-header"><div className="section-title">👤 PROFILE SETTINGS</div></div>
        
        <div className="settings-item" onClick={() => showToast('Gallery opened...', '')}>
          <div className="settings-label">Change Profile Picture</div>
          <div className="settings-val">Update avatar</div>
        </div>

        <div className="settings-item">
          <div className="settings-label">Mobile Number</div>
          <div className="settings-val">+{user?.phone || '2637xxxxxxxx'}</div>
        </div>

        <div className="settings-item" onClick={handleLogout}>
          <div className="settings-label">Logout</div>
          <div className="settings-val">Switch account</div>
        </div>

        <div className="settings-item" style={{color:'var(--red)'}} onClick={deleteAccount}>
          <div className="settings-label">Delete Account</div>
          <div className="settings-val" style={{color:'var(--red)'}}>Permanently remove profile</div>
        </div>

        <div className="section-header"><div className="section-title">🛠️ TROUBLESHOOTING</div></div>
        <div className="settings-item" onClick={clearAppData}>
          <div className="settings-label">Clear App Data</div>
          <div className="settings-val">Reset cache & local storage</div>
        </div>

        <div className="section-header"><div className="section-title">💡 HOW IT WORKS</div></div>
        
        <div className="how-section">
          <h3>The App</h3>
          <p><strong>THE PLUG</strong> is a youth-led PWA marketplace built for Bulawayo. We combine the power of local gigs and reselling with <em>Ubuntu</em> values.</p>
          
          <h3>Ubuntu Points</h3>
          <p>Ubuntu points are earned by being reliable. Every time you complete a deal or do what you said you would, your <strong>Ubuntu Score</strong> goes up. Higher scores unlock more suburbs!</p>
          
          <h3>Bulawayo Game Changer</h3>
          <p>By keeping trades hyper-local and verified, we remove the "scare-factor" and build a trusted network for <strong>Makokoba, Burnside, Cowdray Park</strong> and beyond. We are building the future of Zimbabwe’s local economy, one plug at a time.</p>
        </div>

        <p style={{textAlign:'center', fontSize:'11px', color:'var(--text-dim)', padding:'20px'}}>App Version 1.0.5 (Bulawayo Edition)</p>
      </div>
    </div>
  );
}
