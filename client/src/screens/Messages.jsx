import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return navigate('/onboard');

    fetch(`/api/chats/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setChats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [navigate]);

  return (
    <div className="screen active">
      <div className="topbar">
        <div className="logo" onClick={() => navigate('/home')}>MESSAGES</div>
        <div className="icon-btn">🔍</div>
      </div>
      
      <div className="scroll-area">
        <div className="section-header">
          <div className="section-title">Active Conversations</div>
        </div>
        
        {loading ? (
          <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>Loading chats...</div>
        ) : chats.length === 0 ? (
          <div style={{padding:'40px 20px', textAlign:'center', color:'var(--text-muted)'}}>
            <div style={{fontSize:'48px', marginBottom:'20px'}}>💬</div>
            <h3>No messages yet</h3>
            <p>Start a conversation from any listing in the feed!</p>
          </div>
        ) : (
          <div className="messages-list">
            {chats.map(chat => {
              const currentUser = JSON.parse(localStorage.getItem('plug_user') || '{}');
              const otherName = chat.buyerId === currentUser.id ? chat.sellerName : chat.buyerName;
              return (
                <div key={chat.id} className="listing-card" style={{padding:'16px', alignItems:'center', gap:'15px', marginBottom:'12px'}} onClick={() => navigate(`/chat/${chat.id}`)}>
                  <div className="sav" style={{width:'50px', height:'50px', fontSize:'24px', background:'var(--surface2)', borderRadius:'12px', display:'grid', placeItems:'center'}}>
                    {otherName?.charAt(0).toUpperCase() || '🔌'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                      <span style={{fontWeight:700, fontSize:'15px'}}>{otherName || 'Unknown User'}</span>
                      <span style={{fontSize:'10px', color:'var(--text-dim)'}}>
                        {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </span>
                    </div>
                    <div style={{fontSize:'12px', color:'var(--accent)', fontWeight:600, marginBottom:'2px'}}>Re: {chat.listingTitle || 'General Inquiry'}</div>
                    <p style={{fontSize:'13px', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'200px'}}>
                      {chat.lastMsg || 'Started a conversation'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
