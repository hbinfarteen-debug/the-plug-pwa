import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { uploadListingImages } from '../supabase';
import { API_BASE_URL } from '../config';
import { ALL_SUBURBS } from '../utils/suburbs';

export default function PostListing({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [type, setType] = useState(location.state?.type || 'item');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tech & Electronics');
  const [price, setPrice] = useState('1.00');
  const [is16PlusFriendly, setIs16PlusFriendly] = useState(false);
  const [selectedSuburbs, setSelectedSuburbs] = useState([JSON.parse(localStorage.getItem('plug_user') || '{}').homeBase || JSON.parse(localStorage.getItem('plug_user') || '{}').homebase]);
  const [duration, setDuration] = useState(24);
  const [loading, setLoading] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const toggleSuburb = (loc) => {
    const u = JSON.parse(localStorage.getItem('plug_user') || '{}');
    const home = u.homeBase || u.homebase;
    const isAdmin = u.role === 'admin' || u.phone === '263715198745' || u.phone === '+263715198745' || 
                    u.phone === '263775939688' || u.phone === '+263775939688';
    
    const unlocked = typeof u.unlockedSuburbs === 'string' ? JSON.parse(u.unlockedSuburbs || '[]') : (u.unlockedSuburbs || []);
    const pool = Array.from(new Set([home, 'CBD', ...unlocked])).filter(Boolean);
    const limit = isAdmin ? 500 : pool.length;

    if (selectedSuburbs.includes(loc)) {
      if (selectedSuburbs.length === 1 && loc === home) return; // Must have at least 1
      setSelectedSuburbs(selectedSuburbs.filter(s => s !== loc));
    } else {
      if (selectedSuburbs.length < limit) {
        setSelectedSuburbs([...selectedSuburbs, loc]);
      } else {
        showToast(`Limit reached. You can only select up to ${limit} neighborhoods.`, 'error');
      }
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const doPost = async () => {
    if (!title.trim()) return showToast('Please add a title!', 'error');
    
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return showToast('Please onboard first!', 'error');

    const isVerified = user.phoneVerified || user.phone_verified;
    if (!isVerified) {
      showToast('Verify your device in Settings to post!', 'error');
      return navigate('/settings');
    }
    
    setIsUploading(true);
    let imageUrls = [];
    try {
      if (images.length > 0) {
        imageUrls = await uploadListingImages(images);
      }
    } catch (e) {
      console.error(e);
      showToast('Image upload failed, posting text only.', 'error');
    }

    try {
      const body = {
        type,
        title,
        description,
        category,
        suburb: selectedSuburbs[0] || 'CBD',
        suburbs: selectedSuburbs,
        duration,
        price: type === 'item' ? parseFloat(price) : null,
        is16PlusFriendly: is16PlusFriendly ? 1 : 0,
        posterId: user.id,
        imageUrls
      };
      const res = await fetch(`${API_BASE_URL}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast('Your Plug is LIVE! 🚀', 'success');
        setTimeout(() => navigate('/home'), 1500);
      }
    } catch (e) {
      showToast('Error posting listing', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div className="logo" style={{fontSize:'16px'}}>POST A PLUG</div>
        <div></div>
      </div>
      <div className="scroll-area">
        <div style={{padding:'18px 20px'}}>
          <div className="post-toggle">
            <div className={`ptype ${type==='item'?'active':''}`} onClick={()=>setType('item')}>🛒 Selling Item</div>
            <div className={`ptype ${type==='gig'?'active':''}`} onClick={()=>setType('gig')}>💼 Posting Gig</div>
          </div>
          <div className="upload-zone" onClick={()=>document.getElementById('p-imgs').click()}>
            <input type="file" id="p-imgs" multiple accept="image/*" style={{display:'none'}} onChange={handleImageChange} />
            {previews.length > 0 ? (
              <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
                {previews.map((p, i) => <img key={i} src={p} style={{width:'60px',height:'60px',borderRadius:'8px',objectFit:'cover'}} alt="preview" />)}
              </div>
            ) : (
              <>
                <div style={{fontSize:'30px'}}>📷</div>
                <p>Tap to add photos (max 3)</p>
              </>
            )}
            <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'4px'}}>Auto-compressed · Deleted after 30 days</div>
          </div>
          <div className="form-group">
            <label className="form-label">TITLE</label>
            <input className="field-input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="What are you selling / what's the job?" />
          </div>
          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea className="field-input" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Item condition or job requirements..." style={{height:'80px', paddingTop:'12px'}} />
          </div>
          <div className="form-group">
            <label className="form-label">CATEGORY</label>
            <select className="field-input" value={category} onChange={(e)=>setCategory(e.target.value)}>
              <option value="Tech & Electronics">📱 Tech & Electronics</option>
              <option value="Home & Furniture">🏠 Home & Furniture</option>
              <option value="Clothing & Fashion">👕 Clothing & Fashion</option>
              <option value="Tools & Equipment">🔧 Tools & Equipment</option>
              <option value="Medical & Mobility">♿ Medical & Mobility</option>
              <option value="Gaming & Toys">🎮 Gaming & Toys</option>
              <option value="Gardening & Outdoors">🌿 Gardening & Outdoors</option>
              <option value="Moving & Labour">📦 Moving & Labour</option>
              <option value="Vehicle Services">🚗 Vehicle Services</option>
              <option value="Cleaning">🧹 Cleaning</option>
              <option value="Food & Catering">🍕 Food & Catering</option>
              <option value="Cosmetics">💄 Cosmetics</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>
              <span>LISTING LOCATION</span>
              <span style={{fontSize:'10px', color:'var(--amber)'}}>{selectedSuburbs.length} selected</span>
            </label>
            <input 
              className="field-input" 
              placeholder="Search neighborhoods..." 
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              style={{marginBottom:'10px', height:'38px', fontSize:'13px'}}
            />
            <div className="dur-grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', maxHeight:'250px', overflowY:'auto', padding:'5px', border:'1px solid var(--border)', borderRadius:'12px'}}>
              {(() => {
                const u = JSON.parse(localStorage.getItem('plug_user') || '{}');
                const home = u.homeBase || u.homebase;
                const isAdmin = u.role === 'admin' || u.phone === '263715198745' || u.phone === '+263715198745' || 
                                u.phone === '263775939688' || u.phone === '+263775939688';
                
                let pool = isAdmin ? ALL_SUBURBS : [];
                if (!isAdmin) {
                  const unlocked = typeof u.unlockedSuburbs === 'string' 
                    ? JSON.parse(u.unlockedSuburbs || '[]') 
                    : (u.unlockedSuburbs || []);
                  pool = Array.from(new Set([home, 'CBD', ...unlocked])).filter(Boolean);
                }

                if (locationSearch) {
                   pool = pool.filter(s => s.toLowerCase().includes(locationSearch.toLowerCase()));
                }
                
                return pool;
              })().map(loc => {
                const u = JSON.parse(localStorage.getItem('plug_user') || '{}');
                const home = u.homeBase || u.homebase;
                const isSel = selectedSuburbs.includes(loc);
                return (
                  <div key={loc} className={`dur-card ${isSel?'sel':''}`} onClick={()=>toggleSuburb(loc)} style={{marginBottom:'0'}}>
                    <div className="h" style={{fontSize:'12px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                      {isSel && '✓ '} {loc}
                    </div>
                    <div className="hl">{loc === home ? 'Home Base' : 'Unlocked'}</div>
                  </div>
                );
              })}
              {locationSearch && !ALL_SUBURBS.some(s => s.toLowerCase().includes(locationSearch.toLowerCase())) && (
                <div style={{gridColumn:'1/-1', padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:'12px'}}>No matching neighborhood found.</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">DURATION</label>
            <div className="dur-grid">
              {[24, 48, 72].map(h => (
                <div key={h} className={`dur-card ${duration===h?'sel':''}`} onClick={()=>setDuration(h)}>
                  <div className="h">{h}</div>
                  <div className="hl">hours</div>
                </div>
              ))}
            </div>
          </div>

          {type === 'item' && (
            <div className="price-note">
              Auction starts at <strong>$1</strong><br />
              <span style={{fontSize:'12px'}}>Bidders drive the price up</span>
            </div>
          )}

          {type === 'gig' && (
            <div className="price-note">
              <strong>Blind Market</strong><br />
              <span style={{fontSize:'12px'}}>No starting price — bidders name their rate</span>
            </div>
          )}

          {type === 'gig' && (
            <div className="toggle-row">
              <div><div style={{fontSize:'14px',fontWeight:600}}>16+ Friendly Job</div></div>
              <div className={`tsw ${is16PlusFriendly?'on':''}`} onClick={()=>setIs16PlusFriendly(!is16PlusFriendly)}><div className="tkn"></div></div>
            </div>
          )}

          {(() => {
            const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
            const isVerified = user.phoneVerified || user.phone_verified;
            return isVerified ? (
              <button 
                className="btn-primary" 
                style={{width:'100%',justifyContent:'center',fontSize:'16px',padding:'16px', marginTop:'20px', opacity: isUploading ? 0.7 : 1}} 
                onClick={doPost}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading & Posting...' : 'Go Live 🚀'}
              </button>
            ) : (
              <button 
                className="btn-primary" 
                style={{width:'100%',justifyContent:'center',fontSize:'16px',padding:'16px', marginTop:'20px', background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)'}} 
                onClick={() => navigate('/settings')}
              >
                🔐 Verify identity to post
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
