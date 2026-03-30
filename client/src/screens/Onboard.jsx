import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { neighborhoods } from '../data/neighborhoods';

export default function Onboard({ showToast }) {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(1);
  const [lang, setLang] = useState('English');
  const [suburb, setSuburb] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ageOk, setAgeOk] = useState(true);

  const [fullName, setFullName] = useState('');
  const [nameError, setNameError] = useState('');
  const [checkingName, setCheckingName] = useState(false);

  const filteredSuburbs = neighborhoods.filter(n => 
    n.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  const nxt = (n) => setSlide(n);

  const checkNameAvailability = async () => {
    if (!fullName || fullName.length < 3) return setNameError('Name too short (min 3 chars)');
    setCheckingName(true);
    try {
      const res = await fetch(`/api/auth/check-name/${encodeURIComponent(fullName)}`);
      const data = await res.json();
      if (!data.available) {
        setNameError('This Plug name is already taken! 🛑');
      } else {
        setNameError('');
        nxt(3);
      }
    } catch (e) {
      setNameError('Error checking name availability');
    }
    setCheckingName(false);
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
            <button className="btn-primary" onClick={()=>nxt(2)} style={{alignSelf:'flex-start'}}>Continue ›</button>
          </div>
        )}

        {slide === 2 && (
          <div className="slide active">
            <div className="slide-num">Step 2 of 6</div>
            <div className="slide-emoji">🏷️</div>
            <h2>What’s your <em>Plug Name</em>?</h2>
            <p style={{marginBottom:'14px'}}>Pick a unique name. Respectable names help build Ubuntu trust faster! ✨</p>
            <input 
              className="field-input" 
              placeholder="e.g. Brave_Plug_Bulawayo" 
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameError('');
              }}
            />
            {nameError && <p style={{color:'var(--red)', fontSize:'12px', marginTop:'8px'}}>{nameError}</p>}
            <button 
              className="btn-primary" 
              onClick={checkNameAvailability}
              disabled={checkingName}
              style={{alignSelf:'flex-start',marginTop:'20px'}}
            >
              {checkingName ? 'Checking...' : 'Check Availability ›'}
            </button>
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
              <div className="quiz-opt" onClick={async ()=>{
                showToast(`Welcome to THE PLUG, ${fullName}! 🎉`,'success');
                
                // Save user to backend
                try {
                  const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fullName,
                      phone: '263' + Math.floor(Math.random()*100000000), 
                      dob: '1990-01-01',
                      deviceId: 'dev_' + Math.random().toString(36).substr(2, 9),
                      homeBase: suburb || 'Makokoba'
                    })
                  });
                  const userData = await res.json();
                  localStorage.setItem('plug_user', JSON.stringify(userData));
                  setTimeout(()=>navigate('/home'), 1500);
                } catch (e) {
                  showToast('Error saving profile', 'error');
                }
              }}>B) You lose −5 Ubuntu Points</div>
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
