import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

// Generate consistent color from a string (for unique conversation colors)
function stringToColor(str) {
  const colors = [
    { bg: 'rgba(0,232,122,0.12)', border: 'rgba(0,232,122,0.25)', text: '#00E87A' },
    { bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.25)', text: '#FFB800' },
    { bg: 'rgba(123,97,255,0.12)', border: 'rgba(123,97,255,0.25)', text: '#7B61FF' },
    { bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.25)', text: '#FF6B6B' },
    { bg: 'rgba(0,186,255,0.12)', border: 'rgba(0,186,255,0.25)', text: '#00BAFF' },
    { bg: 'rgba(255,145,77,0.12)', border: 'rgba(255,145,77,0.25)', text: '#FF914D' },
    { bg: 'rgba(0,210,190,0.12)', border: 'rgba(0,210,190,0.25)', text: '#00D2BE' },
    { bg: 'rgba(230,100,230,0.12)', border: 'rgba(230,100,230,0.25)', text: '#E664E6' },
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch(e) { return ''; }
}

export default function Messages() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return navigate('/onboard');

    fetch(`${API_BASE_URL}/api/chats/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChats(data);
        } else {
          setChats([]);
        }
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
          <div style={{fontSize:'12px', color:'var(--text-dim)'}}>{chats.length} chat{chats.length !== 1 ? 's' : ''}</div>
        </div>
        
        {loading ? (
          <div style={{padding:'20px', textAlign:'center', color:'var(--text-muted)'}}>Loading chats...</div>
        ) : !chats || chats.length === 0 ? (
          <div style={{padding:'40px 20px', textAlign:'center', color:'var(--text-muted)'}}>
            <div style={{fontSize:'48px', marginBottom:'20px'}}>💬</div>
            <h3 style={{fontFamily:'"Syne", sans-serif', fontSize:'18px', fontWeight:800, color:'var(--text)', marginBottom:'8px'}}>No messages yet</h3>
            <p style={{fontSize:'13px', lineHeight:1.6}}>Start a conversation from any listing in the feed!</p>
          </div>
        ) : (
          <div style={{padding:'6px 16px'}}>
            {chats.map((chat, idx) => {
              const currentUser = JSON.parse(localStorage.getItem('plug_user') || '{}');
              const isSupport = chat.type === 'support';
              const otherName = isSupport ? 'Official Support' : (chat.buyerId === currentUser.id ? chat.sellerName : chat.buyerName);
              const isBuyer = chat.buyerId === currentUser.id;
              const colorSet = isSupport 
                ? { bg: 'rgba(255, 69, 58, 0.1)', text: 'var(--red)', border: 'rgba(255, 69, 58, 0.3)' }
                : stringToColor(otherName || String(chat.id));
              const initial = isSupport ? 'AD' : (otherName?.charAt(0).toUpperCase() || '?');
              const timeAgo = formatTimeAgo(chat.updatedAt);

              return (
                <div 
                  key={chat.id} 
                  style={{
                    padding:'14px',
                    marginBottom:'10px',
                    background:'var(--surface)',
                    border: `1px solid var(--border)`,
                    borderLeft: `4px solid ${isSupport ? 'var(--red)' : colorSet.text}`,
                    borderRadius:'14px',
                    display:'flex',
                    alignItems:'center',
                    gap:'12px',
                    cursor:'pointer',
                    transition:'transform 0.15s, border-color 0.2s'
                  }} 
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
                  {/* Color-coded avatar */}
                  <div style={{
                    width:'48px', height:'48px', borderRadius:'14px',
                    background: colorSet.bg, border: `1.5px solid ${colorSet.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'20px', fontWeight:800, color: colorSet.text,
                    fontFamily:'"Syne", sans-serif', flexShrink:0,
                    position:'relative'
                  }}>
                    {initial}
                    {/* Role indicator dot */}
                    {!isSupport && (
                      <div style={{
                        position:'absolute', bottom:'-2px', right:'-2px',
                        width:'14px', height:'14px', borderRadius:'50%',
                        background: isBuyer ? 'var(--amber)' : 'var(--green)',
                        border:'2px solid var(--surface)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'7px'
                      }}>
                        {isBuyer ? '🛒' : '🔌'}
                      </div>
                    )}
                    {isSupport && (
                      <div style={{
                        position:'absolute', bottom:'-2px', right:'-2px',
                        width:'14px', height:'14px', borderRadius:'50%',
                        background: 'var(--red)',
                        border:'2px solid var(--surface)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'7px'
                      }}>
                        🛡️
                      </div>
                    )}
                  </div>

                  {/* Chat info */}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'3px'}}>
                      <span style={{fontWeight:700, fontSize:'15px'}}>{otherName || 'Unknown User'}</span>
                      <span style={{
                        fontSize:'10px', color:'var(--text-dim)', flexShrink:0,
                        background:'var(--surface2)', padding:'2px 8px', borderRadius:'100px'
                      }}>
                        {timeAgo}
                      </span>
                    </div>
                    
                    {/* Listing context - highlighted separately */}
                    <div style={{
                      fontSize:'11px', fontWeight:700, marginBottom:'3px',
                      color: isSupport ? 'var(--red)' : colorSet.text,
                      display:'flex', alignItems:'center', gap:'4px'
                    }}>
                      <span style={{opacity:0.7}}>{isSupport ? '🛡️' : (isBuyer ? '🛒' : '🔌')}</span>
                      {isSupport ? 'The Plug Admin' : `Re: ${chat.listingTitle || 'General Inquiry'}`}
                    </div>
                    
                    {/* Last message */}
                    <p style={{
                      fontSize:'13px', color:'var(--text-muted)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      maxWidth:'100%', margin:0
                    }}>
                      {chat.lastMsg || 'Started a conversation'}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div style={{color:'var(--text-dim)', fontSize:'16px', flexShrink:0}}>›</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
