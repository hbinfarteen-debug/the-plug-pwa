import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { uploadListingImages } from '../supabase';
import { API_BASE_URL } from '../config';

const ALL_SUBURBS = [
  'Makokoba', 'Burnside', 'Cowdray Park', 'Nkulumane', 'Hillside', 
  'Morningside', 'Bradfield', 'Queens Park', 'Magwegwe', 'Pumula', 
  'Sizinda', 'Entumbane', 'Njube', 'Hyde Park', 'Selborne Park', 
  'Kumalo', 'Suburbs', 'Malindela', 'Ilanda'
];

export default function PostListing({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [type, setType] = useState(location.state?.type || 'item');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tech & Electronics');
  const [price, setPrice] = useState('1.00');
  const [is16PlusFriendly, setIs16PlusFriendly] = useState(false);
  const [selectedSuburb, setSelectedSuburb] = useState(() => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    return user.homeBase || user.homebase || '';
  });

  const [duration, setDuration] = useState(24);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

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
      const res = await fetch(`${API_BASE_URL}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          description,
          category,
          suburb: selectedSuburb,
          duration,
          price: type === 'item' ? parseFloat(price) : null,
          is16PlusFriendly,
          posterId: user.id,
          imageUrls
        })
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
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">LISTING LOCATION</label>
            <div className="dur-grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', maxHeight:'300px', overflowY:'auto', padding:'5px'}}>
              {(() => {
                const u = JSON.parse(localStorage.getItem('plug_user') || '{}');
                const home = u.homeBase || u.homebase;
                const isAdmin = u.phone === '263715198745' || u.phone === '+263715198745' || 
                                u.phone === '263775939688' || u.phone === '+263775939688';
                
                if (isAdmin) return ALL_SUBURBS;

                const unlocked = typeof u.unlockedSuburbs === 'string' 
                  ? JSON.parse(u.unlockedSuburbs || '[]') 
                  : (u.unlockedSuburbs || []);
                
                return Array.from(new Set([home, ...unlocked])).filter(Boolean);
              })().map(loc => {
                const u = JSON.parse(localStorage.getItem('plug_user') || '{}');
                const home = u.homeBase || u.homebase;
                return (
                  <div key={loc} className={`dur-card ${selectedSuburb===loc?'sel':''}`} onClick={()=>setSelectedSuburb(loc)} style={{marginBottom:'0'}}>
                    <div className="h" style={{fontSize:'12px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{loc}</div>
                    <div className="hl">{loc === home ? 'Home Base' : 'Unlocked'}</div>
                  </div>
                );
              })}
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
