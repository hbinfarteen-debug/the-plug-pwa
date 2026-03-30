import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([
    { from: 'them', text: 'Hey! Is the PS3 still available?', time: '10:30 AM' },
    { from: 'me', text: 'Yes it is! I can meet in Burnside today.', time: '10:32 AM' },
    { from: 'them', text: 'Perfect. What time?', time: '10:33 AM' },
  ]);

  const send = () => {
    if (!msg.trim()) return;
    setHistory([...history, { from: 'me', text: msg, time: '3:37 PM' }]);
    setMsg('');
  };

  return (
    <div className="screen active" style={{background:'var(--bg)'}}>
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div style={{flex:1, marginLeft:'15px'}}>
          <div style={{fontSize:'15px', fontWeight:700}}>Chukwudi M.</div>
          <div style={{fontSize:'11px', color:'var(--green)'}}>● Online</div>
        </div>
        <div className="icon-btn">📞</div>
      </div>

      <div className="scroll-area" style={{padding:'20px', display:'flex', flexDirection:'column', gap:'12px', background:'var(--bg)'}}>
        {history.map((m, i) => (
          <div key={i} style={{
            maxWidth:'80%',
            padding:'12px 16px',
            borderRadius:'18px',
            fontSize:'14px',
            lineHeight:1.5,
            alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
            background: m.from === 'me' ? 'var(--green)' : 'var(--surface2)',
            color: m.from === 'me' ? '#000' : 'var(--text)',
            border: m.from === 'me' ? 'none' : '1px solid var(--border)',
            borderBottomRightRadius: m.from === 'me' ? '4px' : '18px',
            borderBottomLeftRadius: m.from === 'them' ? '4px' : '18px',
          }}>
            {m.text}
            <div style={{fontSize:'10px', marginTop:'4px', opacity:0.6, textAlign:'right'}}>{m.time}</div>
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
