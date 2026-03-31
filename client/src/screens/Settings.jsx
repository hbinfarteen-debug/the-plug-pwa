import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../supabase';
import { API_BASE_URL } from '../config';
import { getDeviceFingerprint, getDeviceInfo } from '../utils/deviceFingerprint';

export default function Settings({ showToast }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Device verification state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ device: '', browser: '' });

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (data.id) setUser(data);
    setDeviceInfo(getDeviceInfo());
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

  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUpdating(true);
    showToast('Uploading avatar...', 'info');
    try {
      const url = await uploadImage(file);
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url })
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user, avatarUrl: url, avatarurl: url };
        localStorage.setItem('plug_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        showToast('Avatar updated! 👨🏾‍🎤', 'success');
      } else throw new Error(data.error);
    } catch (err) {
      console.error(err);
      showToast('Upload failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Device verification — completely free, no SMS
  const handleVerifyDevice = async () => {
    setVerifying(true);
    try {
      const fingerprint = getDeviceFingerprint();

      const res = await fetch(`${API_BASE_URL}/api/auth/verify-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, deviceId: fingerprint })
      });
      const data = await res.json();

      if (res.ok && data.verified) {
        const updatedUser = { ...user, phoneVerified: true, phone_verified: true, deviceid: fingerprint };
        localStorage.setItem('plug_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowVerifyModal(false);
        showToast('Device verified! ✅ You can now message others.', 'success');
      } else {
        showToast(data.error || 'Verification failed', 'error');
        setShowVerifyModal(false);
      }
    } catch (err) {
      console.error(err);
      showToast('Network error. Try again.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const isVerified = user?.phoneVerified || user?.phone_verified;

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div className="logo" style={{fontSize:'16px'}}>SETTINGS</div>
        <div></div>
      </div>

      <div className="scroll-area">
        <div className="section-header"><div className="section-title">👤 PROFILE SETTINGS</div></div>

        {/* Avatar */}
        <div className="settings-item" onClick={() => !updating && document.getElementById('avatar-input').click()}>
          <div className="settings-label">Change Profile Picture</div>
          <div className="settings-val">{updating ? 'Uploading...' : 'Update avatar'}</div>
          <input type="file" id="avatar-input" style={{display:'none'}} accept="image/*" onChange={handleAvatarSelect} />
        </div>

        {/* Verification Row */}
        <div
          className="settings-item"
          onClick={() => !isVerified && setShowVerifyModal(true)}
          style={{cursor: isVerified ? 'default' : 'pointer'}}
        >
          <div style={{display:'flex', flexDirection:'column', gap:'3px'}}>
            <div className="settings-label">Device Verification</div>
            <div style={{fontSize:'11px', color: isVerified ? 'var(--green)' : '#ff6b6b'}}>
              {isVerified ? '✅ This device is verified' : '⚠️ Not verified — tap to verify for free'}
            </div>
          </div>
          <div className="settings-val" style={{color: isVerified ? 'var(--green)' : '#ff6b6b', fontWeight:700}}>
            {isVerified ? 'Verified' : 'Verify →'}
          </div>
        </div>

        {/* Phone display */}
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
          <div className="settings-val">Reset cache &amp; local storage</div>
        </div>

        {/* Admin Tools — Only visible to you (+263715198745, +263775939688) */}
        {(user?.phone === '263715198745' || user?.phone === '+263715198745' || 
          user?.phone === '263775939688' || user?.phone === '+263775939688') && (
          <>
            <div className="section-header"><div className="section-title">🛡️ OWNER TOOLS</div></div>
            <div className="settings-item" onClick={() => navigate('/admin')}>
              <div className="settings-label" style={{color:'var(--amber)', fontWeight:700}}>Commander View</div>
              <div className="settings-val" style={{color:'var(--amber)'}}>Admin Dashboard →</div>
            </div>
          </>
        )}

        <div className="section-header"><div className="section-title">💡 HOW IT WORKS</div></div>
        <div className="how-section">
          <h3>The App</h3>
          <p><strong>THE PLUG</strong> is a youth-led PWA marketplace built for Bulawayo. We combine the power of local gigs and reselling with <em>Ubuntu</em> values.</p>
          <h3>Ubuntu Points</h3>
          <p>Ubuntu points are earned by being reliable. Every time you complete a deal or do what you said you would, your <strong>Ubuntu Score</strong> goes up. Higher scores unlock more suburbs!</p>
          <h3>Bulawayo Game Changer</h3>
          <p>By keeping trades hyper-local and verified, we remove the "scare-factor" and build a trusted network for <strong>Makokoba, Burnside, Cowdray Park</strong> and beyond.</p>
        </div>
        <p style={{textAlign:'center', fontSize:'11px', color:'var(--text-dim)', padding:'20px'}}>App Version 1.0.5 (Bulawayo Edition)</p>
      </div>

      {/* Device Verification Modal */}
      {showVerifyModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1000
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:'24px 24px 0 0',
            padding:'32px 24px 44px', width:'100%', maxWidth:'480px',
            boxShadow:'0 -8px 40px rgba(0,0,0,0.5)'
          }}>
            {/* Header */}
            <div style={{textAlign:'center', marginBottom:'24px'}}>
              <div style={{fontSize:'44px', marginBottom:'8px'}}>🔐</div>
              <h3 style={{margin:'0 0 6px', fontSize:'20px', fontFamily:'"Syne", sans-serif'}}>Verify Your Device</h3>
              <p style={{fontSize:'13px', color:'var(--text-muted)', margin:0, lineHeight:1.6}}>
                We create a unique digital fingerprint of this device. This keeps bad actors out — if someone is banned, their device is blocked too.
              </p>
            </div>

            {/* Device Info Card */}
            <div style={{
              background:'var(--surface2)', borderRadius:'16px',
              padding:'16px 20px', marginBottom:'20px',
              border:'1px solid var(--border)'
            }}>
              <div style={{fontSize:'12px', color:'var(--text-muted)', letterSpacing:'1px', marginBottom:'10px'}}>DEVICE DETECTED</div>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{fontSize:'32px'}}>{deviceInfo.device.includes('Phone') || deviceInfo.device.includes('iPhone') ? '📱' : deviceInfo.device.includes('Tablet') || deviceInfo.device.includes('iPad') ? '📟' : '💻'}</div>
                <div>
                  <div style={{fontWeight:700, fontSize:'15px'}}>{deviceInfo.device}</div>
                  <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{deviceInfo.browser} Browser</div>
                </div>
              </div>
            </div>

            {/* What's captured */}
            <div style={{
              background:'rgba(0, 255, 136, 0.05)', border:'1px solid rgba(0,255,136,0.2)',
              borderRadius:'12px', padding:'12px 16px', marginBottom:'24px', fontSize:'12px',
              color:'var(--text-muted)', lineHeight:1.7
            }}>
              📋 <strong>What we capture:</strong> Screen size, browser type, timezone, graphics info.
              <br/>🚫 <strong>What we don't capture:</strong> Your name, contacts, location, or any personal data.
            </div>

            {/* Actions */}
            <button
              className="btn-primary"
              style={{width:'100%', justifyContent:'center', marginBottom:'12px'}}
              onClick={handleVerifyDevice}
              disabled={verifying}
            >
              {verifying ? (
                <span style={{display:'flex', alignItems:'center', gap:'8px', justifyContent:'center'}}>
                  <span style={{
                    width:'14px', height:'14px', borderRadius:'50%',
                    border:'2px solid #000', borderTop:'2px solid transparent',
                    animation:'spin 0.8s linear infinite', display:'inline-block'
                  }}></span>
                  Verifying...
                </span>
              ) : '✅ Verify This Device — It\'s Free'}
            </button>

            <button
              onClick={() => setShowVerifyModal(false)}
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
