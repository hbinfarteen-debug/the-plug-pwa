import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../supabase';
import { API_BASE_URL } from '../config';

export default function Settings({ showToast }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [updating, setUpdating] = useState(false);

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState('send'); // 'send' | 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [sandboxCode, setSandboxCode] = useState(''); // shown in dev mode
  const [otpLoading, setOtpLoading] = useState(false);

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

  // OTP: Request code
  const requestOtp = async () => {
    if (!user?.phone) return showToast('No phone number found', 'error');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpStep('verify');
        if (data.sandbox && data.debug_code) {
          // Dev/sandbox mode: show code on screen
          setSandboxCode(data.debug_code);
          showToast(`[SANDBOX] Code: ${data.debug_code}`, 'info');
        } else {
          showToast('OTP sent to your phone!', 'success');
        }
      } else {
        showToast(data.error || 'Failed to send OTP', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP: Verify code
  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) return showToast('Enter the 6-digit code', 'error');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, code: otpCode, userId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        const updatedUser = { ...user, phoneVerified: true };
        localStorage.setItem('plug_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowOtpModal(false);
        showToast('Phone verified! ✅ You can now message others.', 'success');
      } else {
        showToast(data.error || 'Invalid code', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setOtpLoading(false);
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
        
        <div className="settings-item" onClick={() => !updating && document.getElementById('avatar-input').click()}>
          <div className="settings-label">Change Profile Picture</div>
          <div className="settings-val">{updating ? 'Uploading...' : 'Update avatar'}</div>
          <input 
            type="file" 
            id="avatar-input" 
            style={{display:'none'}} 
            accept="image/*" 
            onChange={handleAvatarSelect}
          />
        </div>

        {/* Phone Verification Row */}
        <div 
          className="settings-item" 
          onClick={() => !isVerified && setShowOtpModal(true)}
          style={{cursor: isVerified ? 'default' : 'pointer'}}
        >
          <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
            <div className="settings-label">Mobile Number</div>
            <div style={{fontSize:'11px', color: isVerified ? 'var(--green)' : '#ff6b6b', display:'flex', alignItems:'center', gap:'4px'}}>
              {isVerified ? '✅ Phone Verified' : '⚠️ Not verified — tap to verify'}
            </div>
          </div>
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

        <div className="section-header"><div className="section-title">💡 HOW IT WORKS</div></div>
        
        <div className="how-section">
          <h3>The App</h3>
          <p><strong>THE PLUG</strong> is a youth-led PWA marketplace built for Bulawayo. We combine the power of local gigs and reselling with <em>Ubuntu</em> values.</p>
          
          <h3>Ubuntu Points</h3>
          <p>Ubuntu points are earned by being reliable. Every time you complete a deal or do what you said you would, your <strong>Ubuntu Score</strong> goes up. Higher scores unlock more suburbs!</p>
          
          <h3>Bulawayo Game Changer</h3>
          <p>By keeping trades hyper-local and verified, we remove the "scare-factor" and build a trusted network for <strong>Makokoba, Burnside, Cowdray Park</strong> and beyond. We are building the future of Zimbabwe's local economy, one plug at a time.</p>
        </div>

        <p style={{textAlign:'center', fontSize:'11px', color:'var(--text-dim)', padding:'20px'}}>App Version 1.0.5 (Bulawayo Edition)</p>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', 
          display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1000
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:'24px 24px 0 0', 
            padding:'30px 24px 40px', width:'100%', maxWidth:'480px'
          }}>
            <div style={{textAlign:'center', marginBottom:'20px'}}>
              <div style={{fontSize:'32px', marginBottom:'8px'}}>📱</div>
              <h3 style={{margin:0, fontSize:'18px'}}>Verify Your Phone</h3>
              <p style={{fontSize:'13px', color:'var(--text-muted)', margin:'6px 0 0'}}>
                {otpStep === 'send' 
                  ? `We'll send a code to +${user?.phone}`
                  : 'Enter the 6-digit code sent to your phone'
                }
              </p>
              {sandboxCode && otpStep === 'verify' && (
                <div style={{
                  marginTop:'12px', padding:'10px 14px', 
                  background:'rgba(0,255,136,0.1)', border:'1px solid var(--green)',
                  borderRadius:'10px', fontSize:'13px', color:'var(--green)'
                }}>
                  🧪 Sandbox Code: <strong style={{fontSize:'20px', letterSpacing:'4px'}}>{sandboxCode}</strong>
                </div>
              )}
            </div>

            {otpStep === 'send' ? (
              <button 
                className="btn-primary" 
                style={{width:'100%', justifyContent:'center'}}
                onClick={requestOtp}
                disabled={otpLoading}
              >
                {otpLoading ? 'Sending...' : '📨 Send Verification Code'}
              </button>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'14px'}}>
                <input
                  type="number"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.slice(0, 6))}
                  style={{
                    background:'var(--surface2)', border:'1.5px solid var(--border)', 
                    borderRadius:'var(--radius-sm)', padding:'14px 18px', 
                    color:'var(--text)', fontSize:'22px', fontWeight:700, 
                    letterSpacing:'8px', textAlign:'center', outline:'none', width:'100%',
                    boxSizing:'border-box'
                  }}
                />
                <div style={{display:'flex', gap:'10px'}}>
                  <button 
                    className="btn-primary" 
                    style={{flex:1, justifyContent:'center', background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)'}}
                    onClick={() => { setOtpStep('send'); setOtpCode(''); setSandboxCode(''); }}
                  >
                    Resend
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{flex:2, justifyContent:'center'}}
                    onClick={verifyOtp}
                    disabled={otpLoading || otpCode.length < 6}
                  >
                    {otpLoading ? 'Verifying...' : '✅ Verify'}
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={() => { setShowOtpModal(false); setOtpStep('send'); setOtpCode(''); setSandboxCode(''); }}
              style={{
                marginTop:'16px', width:'100%', background:'none', border:'none',
                color:'var(--text-muted)', fontSize:'14px', cursor:'pointer'
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
