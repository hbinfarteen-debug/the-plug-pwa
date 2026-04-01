import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function PublicProfile({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE_URL}/api/users/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Profile Error:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="screen active"><div className="scroll-area">Loading profile...</div></div>;
  if (!user) return <div className="screen active"><div className="scroll-area">User not found</div></div>;

  const reputation = (user.ubuntuPoints || user.ubuntupoints || 0) > 200 ? 'Elite Plug' : (user.ubuntuPoints || user.ubuntupoints || 0) > 120 ? 'Trusted Plug' : 'New Plug';

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div className="logo" style={{fontSize:'16px'}}>PLUG PROFILE</div>
        <div className="icon-btn" onClick={() => navigate('/chat/new')}>💬</div>
      </div>
      
      <div className="scroll-area">
        <div className="profile-header">
          <div className="avatar" style={{position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
            {user?.avatarUrl || user?.avatarurl ? (
               <img src={user.avatarUrl || user.avatarurl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="avatar" />
            ) : (
                '👨🏾'
            )}
          </div>
          <h2 className="profile-name">{user.fullName || user.fullname || 'Plug Seller'}</h2>
          <div className="profile-suburb">📍 {user.homeBase || user.homebase || '...'} · <span style={{color:'var(--green)', fontWeight:700}}>{user.ubuntuPoints || user.ubuntupoints || 0} pts</span></div>
          <div style={{marginTop:'10px', display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap'}}>
            <span className="badge-chip green">⭐ {reputation}</span>
            {user?.phone_verified || user?.phoneVerified ? (
              <span className="badge-chip" style={{background:'rgba(0,255,136,0.15)', color:'var(--green)', border:'1px solid var(--green)'}}>
                ✅ ID Verified
              </span>
            ) : (
              <span className="badge-chip" style={{background:'rgba(255,107,107,0.15)', color:'#ff6b6b', border:'1px solid #ff6b6b'}}>
                ⚠️ Not Verified
              </span>
            )}
          </div>
        </div>

        {user?.stats?.sold > 0 && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="num">{user.stats.sold || 0}</div>
              <div className="lbl">Sold</div>
            </div>
            <div className="stat-card">
              <div className="num">{user.stats.active || 0}</div>
              <div className="lbl">Active</div>
            </div>
            <div className="stat-card">
              <div className="num">{user.stats.successRate || 100}%</div>
              <div className="lbl">Success</div>
            </div>
          </div>
        )}

        <div className="section-header">
          <div className="section-title">Ubuntu Badges</div>
        </div>
        <div className="badges-row">
          <div className="badge-chip">🤝 Early Adopter</div>
          {(user?.chatsCount >= 10 || user?.chat_count >= 10 || user?.chatCount >= 10) && <div className="badge-chip green">⚡ Fast Responder</div>}
          <div className="badge-chip">📍 {user.homeBase || user.homebase || 'Local'} Zone</div>
        </div>

        <div className="section-header">
          <div className="section-title">Recent Feedback</div>
        </div>
        {user?.reviews && user.reviews.length > 0 ? (
          <div className="reviews-list">
            {user.reviews.map((r, i) => (
              <div key={i} className="review-item" style={i === user.reviews.length - 1 ? {borderBottom:'none'} : {}}>
                <div className="review-header">
                  <span className="review-name">{r.author}</span>
                  <span className="review-pts">+{r.points || 5} pts</span>
                </div>
                <p className="review-text">{r.comment}</p>
                <div className="review-date">{r.date || 'Recent'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>No reviews yet.</div>
        )}

        <div style={{padding:'20px'}}>
             <button className="btn-primary" style={{width:'100%', justifyContent:'center'}} onClick={() => navigate(`/chat/${id}`)}>Message Plug 💬</button>
        </div>
      </div>
    </div>
  );
}
