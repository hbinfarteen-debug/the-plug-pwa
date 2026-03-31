import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return navigate('/onboard');

    // Fetch messages
    const fetchMsgs = () => {
      fetch(`/api/messages/${id}`)
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(err => console.error(err));
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000); // Polling for now

    return () => clearInterval(interval);
  }, [id, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const send = async () => {
    if (!msg.trim()) return;
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: id,
          senderId: user.id,
          text: msg
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setHistory([...history, newMsg]);
        setMsg('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const user = JSON.parse(localStorage.getItem('plug_user') || '{}');

  return (
    <div className="screen active" style={{background:'var(--bg)', display:'flex', flexDirection:'column'}}>
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div style={{flex:1, marginLeft:'15px'}}>
          <div style={{fontSize:'15px', fontWeight:700}}>Chat Room</div>
          <div style={{fontSize:'11px', color:'var(--green)'}}>● Active</div>
        </div>
        <div className="icon-btn">📞</div>
      </div>

      <div className="scroll-area" ref={scrollRef} style={{padding:'20px', display:'flex', flexDirection:'column', gap:'12px', background:'var(--bg)', flex:1}}>
        {history.length === 0 && (
          <div style={{textAlign:'center', color:'var(--text-muted)', fontSize:'13px', marginTop:'20px'}}>
            No messages yet. Send one to start the deal!
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{
            maxWidth:'80%',
            padding:'12px 16px',
            borderRadius:'18px',
            fontSize:'14px',
            lineHeight:1.5,
            alignSelf: m.senderId === user.id ? 'flex-end' : 'flex-start',
            background: m.senderId === user.id ? 'var(--green)' : 'var(--surface2)',
            color: m.senderId === user.id ? '#000' : 'var(--text)',
            border: m.senderId === user.id ? 'none' : '1px solid var(--border)',
            borderBottomRightRadius: m.senderId === user.id ? '4px' : '18px',
            borderBottomLeftRadius: m.senderId !== user.id ? '4px' : '18px',
          }}>
            {m.text}
            <div style={{fontSize:'10px', marginTop:'4px', opacity:0.6, textAlign:'right'}}>
              {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{padding:'12px 20px 24px', background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', gap:'10px', alignItems:'center'}}>
        <div className="icon-btn">📎</div>
        <div style={{flex:1, background:'var(--surface2)', borderRadius:'100px', padding:'10px 18px', border:'1px solid var(--border)'}}>
           <input 
             style={{width:'100%', background:'none', border:'none', color:'var(--text)', outline:'none', fontSize:'14px'}}
             placeholder="Type a message..."
             value={msg}
             onChange={(e) => setMsg(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && send()}
           />
        </div>
        <div className="icon-btn" style={{background:'var(--green)', color:'#000'}} onClick={send}>⬆️</div>
      </div>
    </div>
  );
}
