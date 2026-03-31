import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { neighborhoods } from '../data/neighborhoods';
import { supabase } from '../supabase';

export default function Onboard({ showToast }) {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(1);
  const [lang, setLang] = useState('English');
  const [suburb, setSuburb] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ageOk, setAgeOk] = useState(true);
  const [isLogin, setIsLogin] = useState(false);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [checkingName, setCheckingName] = useState(false);

  const filteredSuburbs = neighborhoods.filter(n => 
    n.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  const nxt = (n) => setSlide(n);

  const handleAuth = async () => {
    if (!fullName || fullName.length < 3) return setNameError('Name too short');
    if (!password || password.length < 4) return setNameError('Password too short (min 4)');
    
    setCheckingName(true);
    setNameError('');
    
    try {
      if (isLogin) {
        // Login via Backend
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: fullName, password }) // Using fullName as phone/name for now as per user pattern
        });
        const data = await res.json();

        if (!res.ok) {
          setNameError(data.error || 'Login failed');
        } else {
          showToast(`Welcome back, ${data.fullname}!`, 'success');
          localStorage.setItem('plug_user', JSON.stringify(data));
          navigate('/home');
        }
      } else {
        // Check availability via Backend
        const res = await fetch(`/api/auth/check-name/${encodeURIComponent(fullName)}`);
        const { available } = await res.json();

        if (!available) {
          setNameError('This Plug name is already taken! 🛑');
        } else {
          nxt(3); // Go to suburb selection
        }
      }
    } catch (e) {
      setNameError(`Error connecting to The Plug Server`);
    }
    setCheckingName(false);
  };

  const completeOnboarding = async () => {
    showToast(`Welcome to THE PLUG, ${fullName}! 🎉`,'success');
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: fullName,
          password: password,
          phone: '263' + Math.floor(Math.random()*100000000),
          dob: '1990-01-01',
          deviceid: 'dev_' + Math.random().toString(36).substr(2, 9),
          homebase: suburb || 'Makokoba'
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      localStorage.setItem('plug_user', JSON.stringify(data));
      setTimeout(()=>navigate('/home'), 1500);
    } catch (e) {
      console.error('Registration error:', e);
      showToast('Error saving profile: ' + (e.message || ''), 'error');
    }
  };

  return (
    <div id="onboard" className="screen active">
      <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        
        {slide === 1 && (
          <div className="slide active">
            <div className="slide-num">Step 1 of 6</div>
            <div className="slide-emoji">🌍</div>
            <h2>Choose your <em>language</em></h2>
            <p>THE PLUG speaks your language. Pick the one you're most comfortable with.</p>
            <div className="lang-grid">
              <div className={`lang-card ${lang==='English'?'selected':''}`} onClick={()=>setLang('English')}>
                <div className="flag">🇿🇼</div><div className="lname">English</div>
              </div>
              <div className={`lang-card ${lang==='IsiNdebele'?'selected':''}`} onClick={()=>setLang('IsiNdebele')}>
                <div className="flag">🇿🇼</div><div className="lname">IsiNdebele</div>
              </div>
              <div className={`lang-card ${lang==='ChiShona'?'selected':''}`} onClick={()=>setLang('ChiShona')}>
                <div className="flag">🇿🇼</div><div className="lname">ChiShona</div>
              </div>
            </div>
            
            <div style={{marginTop:'auto', paddingBottom:'20px'}}>
               <button className="btn-primary" onClick={()=>{ setIsLogin(false); nxt(2); }} style={{width:'100%', marginBottom:'10px'}}>New Plug (Sign Up) ›</button>
               <button className="btn-secondary" onClick={()=>{ setIsLogin(true); nxt(2); }} style={{width:'100%'}}>Regular Plug (Login) ›</button>
            </div>
          </div>
        )}

        {slide === 2 && (
          <div className="slide active">
            <div className="slide-num">Step 2 of 6</div>
            <div className="slide-emoji">{isLogin ? '🔑' : '🏷️'}</div>
            <h2>{isLogin ? 'Plug Login' : 'Pick your Plug Name'}</h2>
            <p style={{marginBottom:'14px'}}>{isLogin ? 'Enter your details to enter the marketplace.' : 'Pick a unique name. Respectable names help build Ubuntu trust faster!'}</p>
            
            <div className="form-group" style={{marginBottom:'15px'}}>
              <label style={{fontSize:'12px', color:'var(--text-muted)'}}>Plug Name</label>
              <input 
                className="field-input" 
                placeholder="e.g. Brave_Plug_Bulawayo" 
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setNameError('');
                }}
              />
            </div>

            <div className="form-group" style={{marginBottom:'15px'}}>
              <label style={{fontSize:'12px', color:'var(--text-muted)'}}>Password</label>
              <input 
                type="password"
                className="field-input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {nameError && <p style={{color:'var(--red)', fontSize:'12px', marginTop:'8px'}}>{nameError}</p>}
            
            <button 
              className="btn-primary" 
              onClick={handleAuth}
              disabled={checkingName}
              style={{alignSelf:'flex-start',marginTop:'10px'}}
            >
              {checkingName ? 'Processing...' : (isLogin ? 'Enter The Plug' : 'Check Availability')}
            </button>
            <p onClick={()=>setSlide(1)} style={{fontSize:'12px', color:'var(--accent)', marginTop:'15px', cursor:'pointer'}}>‹ Back</p>
          </div>
        )}

        {slide === 3 && (
          <div className="slide active">
            <div className="slide-num">Step 3 of 6</div>
            <div className="slide-emoji">📍</div>
            <h2>Your <em>Home Base</em></h2>
            <p style={{marginBottom:'14px'}}>Your neighborhood is your starting territory. Earn points to unlock more.</p>
            <input 
              className="suburb-search" 
              placeholder="Search Bulawayo suburbs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="suburb-list" style={{maxHeight:'200px', overflowY:'auto'}}>
              {filteredSuburbs.map(n => (
                <div key={n} className={`suburb-item ${suburb===n?'selected':''}`} onClick={()=>setSuburb(n)}>
                  <div><div style={{fontWeight:600}}>{n}</div><div className="suburb-zone">Bulawayo</div></div>
                </div>
              ))}
              {filteredSuburbs.length === 0 && <p style={{padding:'10px', fontSize:'12px', color:'var(--text-muted)'}}>No neighborhoods found.</p>}
            </div>
            <button className="btn-primary" onClick={()=>{
              if(!suburb) return showToast('Please select a neighborhood!', 'error');
              nxt(4);
            }} style={{alignSelf:'flex-start',marginTop:'14px'}}>Confirm ›</button>
          </div>
        )}

        {slide === 4 && (
          <div className="slide active">
            <div className="slide-num">Step 4 of 6</div>
            <div className="slide-emoji">🛡️</div>
            <h2>Safety <em>Check</em></h2>
            <p style={{marginBottom:'14px'}}>Your age determines which jobs you can access. Must be 16+.</p>
            <div className="form-label">Date of Birth</div>
            <input type="date" className="field-input" onChange={(e)=>{
              const a=(new Date()-new Date(e.target.value))/(365.25*24*60*60*1000);
              setAgeOk(a>=18);
            }} />
            {!ageOk && <div className="age-warn" style={{display:'block'}}>⚠️ You're under 18. Only "16+ Friendly" gigs will show in your feed.</div>}
            <button className="btn-primary" onClick={()=>nxt(5)} style={{alignSelf:'flex-start',marginTop:'14px'}}>Continue ›</button>
          </div>
        )}

        {slide === 5 && (
          <div className="slide active">
            <div className="slide-num">Step 5 of 6</div>
            <div className="slide-emoji">📜</div>
            <h2>The <em>Plug Code</em></h2>
            <div className="plug-code-list" style={{display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px'}}>
              <div className="plug-code-item"><div className="pcn">1</div><div><h4>Your Word is Your Bond</h4><p>Accepting a bid is a contract. No-shows = −5 Ubuntu Points.</p></div></div>
              <div className="plug-code-item"><div className="pcn">2</div><div><h4>Start Small, Grow Big</h4><p>You start in one suburb. Every 50 pts unlocks 2 more neighborhoods.</p></div></div>
              <div className="plug-code-item"><div className="pcn">3</div><div><h4>Safety First</h4><p>Meet in public. Under 18? Only do 16+ Friendly jobs.</p></div></div>
              <div className="plug-code-item"><div className="pcn">4</div><div><h4>The 7-Day Rule</h4><p>7 days to report a problem. After that, the deal is sealed.</p></div></div>
              <div className="plug-code-item"><div className="pcn">5</div><div><h4>Respect the Ubuntu</h4><p>Gifting points builds community. Scamming gets you permanently banned.</p></div></div>
            </div>
            <button className="btn-primary" onClick={()=>nxt(6)} style={{alignSelf:'flex-start'}}>I Agree — Take Quiz ›</button>
          </div>
        )}

        {slide === 6 && (
          <div className="slide active">
            <div className="slide-num">Step 6 of 6</div>
            <div className="slide-emoji">🧠</div>
            <h2>Quick <em>Quiz</em></h2>
            <p style={{marginBottom:0}}>Final step, {fullName}! Prove you understand the Ubuntu rules!</p>
            <div className="quiz-box">
              <h4>❓ KNOWLEDGE CHECK</h4>
              <p>What happens if you don't show up for a job you agreed to?</p>
              <div className="quiz-opt" onClick={()=>{showToast('Wrong! 🤔','error')}}>A) Nothing happens</div>
              <div className="quiz-opt" onClick={completeOnboarding}>B) You lose −5 Ubuntu Points</div>
              <div className="quiz-opt" onClick={()=>{showToast('Incorrect. Read the code again!','error')}}>C) Your account is deleted</div>
            </div>
            <p style={{fontSize:'12px', fontStyle:'italic', color:'var(--text-muted)', marginTop:'20px', lineHeight:1.5}}>
              💡 "Generosity is rewarded in secret. Keep an eye on your giving — good things come to those who share."
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
