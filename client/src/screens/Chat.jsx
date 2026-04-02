import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Chat({ showToast, t }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const scrollRef = useRef();

  const [deal, setDeal] = useState(null);
  const [loadingDeal, setLoadingDeal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    if (!user.id) return navigate('/onboard');

    // Fetch messages
    const fetchMsgs = () => {
      fetch(`${API_BASE_URL}/api/messages/${id}`)
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(err => console.error(err));
    };

    const fetchChatInfo = async () => {
       try {
         const res = await fetch(`${API_BASE_URL}/api/chats/${user.id}`);
         const data = await res.json();
         const thisChat = data.find(c => c.id == id);
         if (thisChat) {
           setChatInfo(thisChat);
           const dealsRes = await fetch(`${API_BASE_URL}/api/deals/${user.id}`);
           const deals = await dealsRes.json();
           // Only show deal header if this specific user is the seeker OR provider in the deal
           const match = deals.find(d => 
             d.listingid == thisChat.listingId && 
             (Number(d.seekerid) === Number(thisChat.buyerId) || Number(d.providerid) === Number(thisChat.buyerId))
           );
           if (match) setDeal(match);
         }
       } catch(e) {}
    };

    fetchMsgs();
    fetchChatInfo();
    const interval = setInterval(fetchMsgs, 3000);

    return () => clearInterval(interval);
  }, [id, navigate]);

  const confirmTrade = async (role) => {
    setLoadingDeal(true);
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    try {
      const res = await fetch(`${API_BASE_URL}/api/deals/${deal.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role })
      });
      const data = await res.json();
      if (res.ok) {
        setDeal(data.deal);
        showToast('You successfully gifted 5 Ubuntu Points to the other user! 🎁', 'success');
        setShowReviewModal(true);
      } else {
        showToast(data.error || 'Failed to confirm deal', 'error');
      }
    } catch(e) { 
      console.error(e);
      showToast('Error confirming trade', 'error');
    }
    setLoadingDeal(false);
  };

  const submitReview = async () => {
     if(!reviewText.trim()) {
        setShowReviewModal(false);
        return;
     }
     setLoadingDeal(true);
     const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
     const isBuyer = deal?.seekerid == user.id;
     const targetId = isBuyer ? deal.providerid : deal.seekerid;
     try {
       await fetch(`${API_BASE_URL}/api/reviews`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ dealid: deal.id, authorid: user.id, targetid: targetId, text: reviewText })
       });
     } catch(e){}
     setLoadingDeal(false);
     setShowReviewModal(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const send = async () => {
    if (!msg.trim()) return;
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: id,
          senderId: user.id,
          text: msg,
          isAdmin: user.role === 'admin'
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
  const isVerified = user?.phoneVerified || user?.phone_verified;
  const isBuyer = deal?.seekerid == user.id;
  const isSeller = deal?.providerid == user.id;

  // Determine the other person's name
  const otherPersonName = (() => {
    if (!chatInfo) return 'Other';
    if (chatInfo.buyerId === user.id) return chatInfo.sellerName || 'Seller';
    return chatInfo.buyerName || 'Buyer';
  })();

  return (
    <div className="screen active" style={{background:'var(--bg)', display:'flex', flexDirection:'column'}}>
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div style={{flex:1, marginLeft:'15px'}}>
          <div style={{fontSize:'15px', fontWeight:700}}>{chatInfo?.type === 'support' ? '🛡️ Admin Support' : (chatInfo?.listingTitle || 'Chat Room')}</div>
          <div style={{fontSize:'11px', color: chatInfo?.type === 'support' ? 'var(--green)' : (deal?.status === 'completed' ? 'var(--green)' : (deal ? 'HONOR DEAL WITHIN 72H ⏳' : `with ${otherPersonName}`))}}>
            {chatInfo?.type === 'support' ? 'Official Support Channel' : (deal?.status === 'completed' ? 'Deal Sealed ✅' : (deal ? 'HONOR DEAL WITHIN 72H ⏳' : `with ${otherPersonName}`))}
          </div>
        </div>
        <div></div>
      </div>

      {deal && deal.status !== 'completed' && (
        <div style={{padding:'12px 20px', background:'rgba(255,184,0,0.1)', borderBottom:'1px solid rgba(255,184,0,0.2)'}}>
           <div style={{fontSize:'13px', fontWeight:700, marginBottom:'6px', color:'var(--amber)', textAlign:'center'}}>Ready to seal the trade?</div>
           <div style={{fontSize:'11px', color:'var(--text-muted)', marginBottom:'10px', textAlign:'center'}}>Only agree to a done deal if the deal is completed. Gift 5 Ubuntu points!</div>
           
           <div style={{display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap'}}>
              {isBuyer ? (
                <button 
                  className="btn-sm" 
                  disabled={deal.buyer_confirmed || loadingDeal}
                  style={{background: deal.buyer_confirmed ? 'var(--green)' : 'var(--amber)', color:'#000', flex:1, minWidth:'120px'}}
                  onClick={() => confirmTrade('buyer')}
                >
                  {deal.buyer_confirmed ? '✅ Agreed' : 'DONE DEAL 🤝'}
                </button>
              ) : isSeller ? (
                <button 
                   className="btn-sm" 
                   disabled={deal.seller_confirmed || loadingDeal}
                   style={{background: deal.seller_confirmed ? 'var(--green)' : 'var(--amber)', color:'#000', flex:1, minWidth:'120px'}}
                   onClick={() => confirmTrade('seller')}
                >
                  {deal.seller_confirmed ? '✅ Agreed' : 'DONE DEAL 🤝'}
                </button>
              ) : (
                <div style={{fontSize:'12px', color:'var(--amber)', fontWeight:700}}>[Admin View] Waiting on users to honor deal.</div>
              )}
              <button 
                className="btn-sm" 
                style={{background:'rgba(255,107,107,0.1)', color:'var(--red)', border:'1px solid var(--red)', flex:1, minWidth:'100px'}}
                onClick={() => navigate('/dispute', { state: { dealId: deal.id } })}
              >
                Report Issue 🚩
              </button>
           </div>
           
           <div style={{marginTop:'12px', fontSize:'9px', color:'var(--amber)', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', opacity: 0.8}}>
             <span>⚠️</span> 
             <span>If you carry the conversation off-app (e.g. WhatsApp), please take screenshots as evidence in case of a dispute.</span>
           </div>
        </div>
      )}

      {/* Chat messages area */}
      <div className="scroll-area" ref={scrollRef} style={{padding:'20px', display:'flex', flexDirection:'column', gap:'8px', background:'var(--bg)', flex:1}}>
        {history.length === 0 && (
          <div style={{textAlign:'center', color:'var(--text-muted)', fontSize:'13px', marginTop:'20px'}}>
            No messages yet. Send one to start the deal!
          </div>
        )}
        {history.map((m, i) => {
          const isSender = m.senderId === user.id;
          const phoneToCheck = m.senderPhone || (isSender ? user.phone : null);
          const roleToCheck = m.senderRole || (isSender ? user.role : null);
          
          // Only render as admin if the message was explicitly flagged as a deliberate admin intervention
          const renderAsAdmin = m.is_admin === true || m.is_admin === 1;

          const senderName = m.senderName || (isSender ? user.fullname : otherPersonName);
          const initial = senderName?.charAt(0)?.toUpperCase() || '?';
          
          // Show date separator if needed
          const showDateSep = i === 0 || (() => {
            try {
              const prevDate = new Date(history[i-1].createdAt || history[i-1].createdat).toDateString();
              const curDate = new Date(m.createdAt || m.createdat).toDateString();
              return prevDate !== curDate;
            } catch(e) { return false; }
          })();

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {/* Date separator */}
              {showDateSep && (
                <div style={{
                  textAlign:'center', margin:'12px 0',
                  fontSize:'10px', color:'var(--text-dim)',
                  display:'flex', alignItems:'center', gap:'10px',
                  width: '100%'
                }}>
                  <div style={{flex:1, height:'1px', background:'var(--border)'}} />
                  <span style={{padding:'3px 12px', background:'var(--surface2)', borderRadius:'100px', border:'1px solid var(--border)'}}>
                    {(() => {
                      try { 
                        const d = new Date(m.createdAt || m.createdat);
                        const today = new Date();
                        if (d.toDateString() === today.toDateString()) return 'Today';
                        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
                        return d.toLocaleDateString([], {month:'short', day:'numeric'});
                      } catch(e) { return ''; }
                    })()}
                  </span>
                  <div style={{flex:1, height:'1px', background:'var(--border)'}} />
                </div>
              )}

              {/* Admin message */}
              {renderAsAdmin ? (
                <div style={{
                  maxWidth:'90%',
                  padding:'10px 16px',
                  borderRadius:'12px',
                  fontSize:'13px',
                  lineHeight:1.5,
                  alignSelf:'center',
                  background:'rgba(255, 69, 58, 0.1)',
                  color:'var(--red)',
                  border:'1px solid rgba(255,59,59,0.2)',
                  width:'100%',
                  textAlign:'center'
                }}>
                  <div style={{fontSize:'10px', fontWeight:800, marginBottom:'4px', color:'var(--red)'}}>🚨 ADMIN</div>
                  <div>{m.text}</div>
                  <div style={{fontSize:'10px', marginTop:'4px', opacity:0.6}}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </div>
                </div>
              ) : (
                /* Regular message with avatar distinction */
                <div style={{
                  display:'flex',
                  flexDirection: isSender ? 'row-reverse' : 'row',
                  alignItems:'flex-end',
                  gap:'8px',
                  alignSelf: isSender ? 'flex-end' : 'flex-start',
                  maxWidth:'85%'
                }}>
                  {/* Avatar for received messages */}
                  {!isSender && (
                    <div style={{
                      width:'28px', height:'28px', borderRadius:'50%',
                      background:'rgba(123,97,255,0.15)', border:'1px solid rgba(123,97,255,0.3)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', fontWeight:800, color:'#7B61FF',
                      fontFamily:'"Syne", sans-serif', flexShrink:0
                    }}>
                      {initial}
                    </div>
                  )}

                  {/* Bubble */}
                  <div style={{
                    padding:'10px 14px',
                    borderRadius: isSender ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize:'14px',
                    lineHeight:1.5,
                    background: isSender 
                      ? 'linear-gradient(135deg, #00E87A, #00C868)' 
                      : 'var(--surface2)',
                    color: isSender ? '#000' : 'var(--text)',
                    border: isSender ? 'none' : '1px solid var(--border)',
                    boxShadow: isSender 
                      ? '0 2px 8px rgba(0,232,122,0.2)' 
                      : '0 1px 4px rgba(0,0,0,0.1)',
                    textAlign: isSender ? 'right' : 'left'
                  }}>
                    {/* Name label */}
                    <div style={{
                      fontSize:'10px', fontWeight:700, marginBottom:'3px',
                      opacity: 0.7,
                      color: isSender ? 'rgba(0,0,0,0.4)' : 'var(--green)',
                      textAlign: isSender ? 'right' : 'left'
                    }}>
                      {isSender ? 'You' : senderName}
                    </div>
                    
                    <div style={{textAlign: isSender ? 'right' : 'left'}}>{m.text}</div>
                    
                    <div style={{
                      fontSize:'10px', marginTop:'4px', 
                      opacity:0.5, textAlign: isSender ? 'right' : 'left'
                    }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(isVerified || deal) ? (
        <div style={{padding:'12px 20px 24px', background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', gap:'10px', alignItems:'center'}}>
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
      ) : (
        <div style={{
          padding:'16px 20px 28px', background:'var(--surface)', 
          borderTop:'1px solid var(--border)', textAlign:'center'
        }}>
          <div style={{fontSize:'28px', marginBottom:'6px'}}>🔒</div>
          <div style={{fontSize:'13px', fontWeight:600, marginBottom:'4px'}}>Verify your phone to message</div>
          <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'12px'}}>
            Only verified users can send messages on The Plug.
          </div>
          <a 
            href="/settings" 
            style={{
              display:'inline-block', padding:'10px 24px',
              background:'var(--green)', color:'#000', borderRadius:'100px',
              fontSize:'13px', fontWeight:700, textDecoration:'none'
            }}
          >
            ✅ Verify Now in Settings
          </a>
        </div>
      )}

      {showReviewModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px'
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:'24px',
            padding:'24px', width:'100%', maxWidth:'400px',
            boxShadow:'0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{textAlign:'center', marginBottom:'20px'}}>
              <h3 style={{margin:0, fontFamily:'"Syne", sans-serif'}}>Leave a Review</h3>
              <p style={{fontSize:'12px', color:'var(--text-muted)'}}>Rate the other person's reliability! (Optional)</p>
            </div>
            <textarea 
              className="field-input" 
              placeholder="They were on time, great communication..." 
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              style={{height:'100px', width:'100%', marginBottom:'15px'}}
            ></textarea>

            <button 
              className="btn-primary" 
              style={{width:'100%', justifyContent:'center'}}
              onClick={submitReview}
              disabled={loadingDeal}
            >
               {loadingDeal ? 'Submitting...' : 'Post Review'}
            </button>
            <button
              onClick={() => setShowReviewModal(false)}
              style={{
                width:'100%', background:'none', border:'none',
                color:'var(--text-muted)', fontSize:'14px', cursor:'pointer', padding:'15px 0 0'
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
