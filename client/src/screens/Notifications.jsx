import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Notifications({ showToast }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return navigate('/onboard');

    fetch(`${API_BASE_URL}/api/notifications/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [navigate]);

  const markRead = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read/${id}`, { method: 'POST' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: 1 } : n));
    } catch (e) {}
  };

  const removeNotification = async (e, id) => {
    e.stopPropagation();
    setRemoving(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Animate out then remove
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
          setRemoving(null);
        }, 300);
      }
    } catch (err) {
      console.error(err);
      setRemoving(null);
      showToast('Failed to remove', 'error');
    }
  };

  const handleAction = async (n) => {
    await markRead(n.id);
    if (n.type === 'deal_won' || n.type === 'bid_won') {
       const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
       const chatsRes = await fetch(`${API_BASE_URL}/api/chats/${user.id}`);
       const chats = await chatsRes.json();
       const chat = chats.find(c => c.listingId == n.related_id);
       if (chat) navigate(`/chat/${chat.id}`);
       else navigate(`/detail/${n.related_id}`);
    } else if (n.related_id) {
       navigate(`/detail/${n.related_id}`);
    }
  };

  const getNotifIcon = (type) => {
    switch(type) {
      case 'deal_won': return { icon: '🎉', bg: 'rgba(0,232,122,0.1)', border: 'rgba(0,232,122,0.2)' };
      case 'bid_won': return { icon: '🔌', bg: 'rgba(0,232,122,0.1)', border: 'rgba(0,232,122,0.2)' };
      case 'pts_gain': return { icon: '🎁', bg: 'rgba(0,232,122,0.1)', border: 'rgba(0,232,122,0.2)' };
      case 'pts_loss': return { icon: '📉', bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.2)' };
      case 'admin_alert': return { icon: '🚨', bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.2)' };
      default: return { icon: '🔔', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.15)' };
    }
  };

  const formatTimeAgo = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch(e) { return ''; }
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div className="logo" style={{fontSize:'15px', color:'var(--amber)'}}>NOTIFICATIONS</div>
        <div></div>
      </div>

      <div className="scroll-area">
        {loading ? (
          <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Checking for updates...</div>
        ) : notifications.length === 0 ? (
          <div style={{padding:'60px 20px', textAlign:'center', color:'var(--text-muted)'}}>
            <div style={{fontSize:'48px', marginBottom:'20px'}}>🔔</div>
            <h3 style={{fontFamily:'"Syne", sans-serif', fontSize:'18px', fontWeight:800, color:'var(--text)', marginBottom:'8px'}}>All caught up</h3>
            <p style={{fontSize:'13px', lineHeight:1.6}}>You'll get notified here when you win a bid or someone bids on your plug!</p>
          </div>
        ) : (
          <div style={{padding:'10px 16px'}}>
            {notifications.map(n => {
              const nStyle = getNotifIcon(n.type);
              const isRemoving = removing === n.id;
              
              return (
                <div 
                  key={n.id} 
                  style={{
                    padding:'14px',
                    marginBottom:'10px',
                    background: n.read ? 'var(--surface)' : nStyle.bg,
                    border: `1px solid ${n.read ? 'var(--border)' : nStyle.border}`,
                    borderRadius:'14px',
                    opacity: isRemoving ? 0 : (n.read ? 0.65 : 1),
                    transform: isRemoving ? 'translateX(100px)' : 'translateX(0)',
                    transition: 'opacity 0.3s, transform 0.3s',
                    display:'flex',
                    gap:'12px',
                    alignItems:'flex-start',
                    cursor:'pointer',
                    position:'relative'
                  }}
                  onClick={() => handleAction(n)}
                >
                  {/* Icon */}
                  <div style={{
                    width:'40px', height:'40px', borderRadius:'12px',
                    background: nStyle.bg, border: `1px solid ${nStyle.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'20px', flexShrink:0
                  }}>
                    {nStyle.icon}
                  </div>

                  {/* Content */}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px'}}>
                      <div style={{fontWeight:700, fontSize:'14px', marginBottom:'3px'}}>{n.title}</div>
                    </div>
                    <div style={{fontSize:'12px', color:'var(--text-muted)', lineHeight:1.5}}>{n.message}</div>
                    <div style={{fontSize:'10px', color:'var(--text-dim)', marginTop:'6px'}}>
                      {formatTimeAgo(n.createdat)}
                    </div>
                  </div>

                  {/* Delete button */}
                  <div 
                    onClick={(e) => removeNotification(e, n.id)}
                    style={{
                      width:'28px', height:'28px', borderRadius:'50%',
                      background:'rgba(255,59,59,0.08)', border:'1px solid rgba(255,59,59,0.15)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', fontSize:'12px', color:'var(--red)',
                      flexShrink:0, marginTop:'2px',
                      transition:'background 0.2s, transform 0.15s'
                    }}
                    title="Remove notification"
                  >
                    ✕
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
