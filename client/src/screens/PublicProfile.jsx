import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function PublicProfile({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/users/${id}`)
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

  const reputation = user.ubuntuPoints > 200 ? 'Elite Plug' : user.ubuntuPoints > 120 ? 'Trusted Plug' : 'New Plug';

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div className="logo" style={{fontSize:'16px'}}>PLUG PROFILE</div>
        <div className="icon-btn" onClick={() => navigate('/chat/new')}>💬</div>
      </div>
      
      <div className="scroll-area">
        <div className="profile-header">
          <div className="avatar">👨🏾</div>
          <h2 className="profile-name">{user.fullName}</h2>
          <div className="profile-suburb">📍 {user.homeBase} · <span style={{color:'var(--green)', fontWeight:700}}>{user.ubuntuPoints} pts</span></div>
          <div style={{marginTop:'10px'}}>
             <span className="badge-chip green">⭐ {reputation}</span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="num">12</div>
            <div className="lbl">Sold</div>
          </div>
          <div className="stat-card">
            <div className="num">4</div>
            <div className="lbl">Active</div>
          </div>
          <div className="stat-card">
            <div className="num">100%</div>
            <div className="lbl">Success</div>
          </div>
        </div>

        <div className="section-header">
          <div className="section-title">Ubuntu Badges</div>
        </div>
        <div className="badges-row">
          <div className="badge-chip">🤝 Early Adopter</div>
          <div className="badge-chip green">⚡ Fast Responder</div>
          <div className="badge-chip">📍 {user.homeBase} Local</div>
        </div>

        <div className="section-header">
          <div className="section-title">Recent Feedback</div>
        </div>
        <div className="reviews-list">
          <div className="review-item">
            <div className="review-header">
              <span className="review-name">Sipho M.</span>
              <span className="review-pts">+5 pts</span>
            </div>
            <p className="review-text">Great seller, PS3 was as described. Straight to the point.</p>
            <div className="review-date">2 days ago</div>
          </div>
          <div className="review-item" style={{borderBottom:'none'}}>
            <div className="review-header">
              <span className="review-name">Nomsa D.</span>
              <span className="review-pts">+5 pts</span>
            </div>
            <p className="review-text">Helpful and on time. Would trade again!</p>
            <div className="review-date">1 week ago</div>
          </div>
        </div>

        <div style={{padding:'20px'}}>
             <button className="btn-primary" style={{width:'100%', justifyContent:'center'}} onClick={() => navigate(`/chat/${id}`)}>Message Plug 💬</button>
        </div>
      </div>
    </div>
  );
}
