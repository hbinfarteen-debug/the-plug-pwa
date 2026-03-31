import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const navigate = useNavigate();

  const chats = [];

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
        
        <div className="messages-list">
          {chats.map(chat => (
            <div key={chat.id} className="listing-card" style={{padding:'12px', alignItems:'center', gap:'15px'}} onClick={() => navigate(`/chat/${chat.id}`)}>
              <div className="sav" style={{width:'50px', height:'50px', fontSize:'24px'}}>👨🏾</div>
              <div style={{flex:1}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                  <span style={{fontWeight:700, fontSize:'15px'}}>{chat.name}</span>
                  <span style={{fontSize:'11px', color:'var(--text-dim)'}}>{chat.time}</span>
                </div>
                <p style={{fontSize:'13px', color: chat.unread ? 'var(--text)' : 'var(--text-muted)', fontWeight: chat.unread ? 600 : 400}}>
                  {chat.lastMsg}
                </p>
              </div>
              {chat.unread && <div className="dot dot-g"></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
