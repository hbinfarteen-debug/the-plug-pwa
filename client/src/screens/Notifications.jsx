import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Notifications({ showToast }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleAction = async (n) => {
    await markRead(n.id);
    if (n.type === 'deal_won' || n.type === 'bid_won') {
       // Find the chat for this listing
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
            <h3>All caught up</h3>
            <p>You'll get notified here when you win a bid or someone bids on your plug!</p>
          </div>
        ) : (
          <div style={{padding:'10px 20px'}}>
            {notifications.map(n => (
              <div 
                key={n.id} 
                className="listing-card" 
                style={{
                  padding:'16px', 
                  marginBottom:'12px', 
                  opacity: n.read ? 0.6 : 1,
                  borderLeft: n.read ? 'none' : '4px solid var(--amber)',
                  display:'flex',
                  gap:'15px',
                  alignItems:'center'
                }}
                onClick={() => handleAction(n)}
              >
                <div style={{fontSize:'24px'}}>
                  {n.type === 'deal_won' ? '🎉' : n.type === 'bid_won' ? '🔌' : '🔔'}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700, fontSize:'14px', marginBottom:'4px'}}>{n.title}</div>
                  <div style={{fontSize:'12px', color:'var(--text-muted)', lineHeight:1.4}}>{n.message}</div>
                  <div style={{fontSize:'10px', color:'var(--text-dim)', marginTop:'6px'}}>
                    {new Date(n.createdat).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
