import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Chat() {
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
      fetch(`/api/messages/${id}`)
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(err => console.error(err));
    };

    // Fetch deal info to show confirmation buttons
    const fetchDeal = async () => {
      try {
        const res = await fetch(`/api/deals/${user.id}`);
        const data = await res.json();
        // Look for the deal linked to this chat's listingId
        // We'll need chatInfo first to know listingId
        if (Array.isArray(data)) {
           // We'll fetch chatInfo below to match listingId
        }
      } catch (e) {}
    };

    const fetchChatInfo = async () => {
       try {
         const res = await fetch(`/api/chats/${user.id}`);
         const data = await res.json();
         const thisChat = data.find(c => c.id == id);
         if (thisChat) {
           setChatInfo(thisChat);
           // Now get deal for this listing
           const dealsRes = await fetch(`/api/deals/${user.id}`);
           const deals = await dealsRes.json();
           const match = deals.find(d => d.listingid == thisChat.listingId);
           if (match) setDeal(match);
         }
       } catch(e) {}
    };

    fetchMsgs();
    fetchChatInfo();
    const interval = setInterval(fetchMsgs, 3000); // Polling for now

    return () => clearInterval(interval);
  }, [id, navigate]);

  const confirmTrade = async (role) => {
    setLoadingDeal(true);
    const user = JSON.parse(localStorage.getItem('plug_user') || '{}');
    try {
      const res = await fetch(`/api/deals/${deal.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role })
      });
      const data = await res.json();
      if (res.ok) {
        setDeal(data.deal);
        alert('You successfully gifted 5 Ubuntu Points to the other user! 🎁');
        setShowReviewModal(true);
      }
    } catch(e) { console.error(e); }
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
       await fetch('/api/reviews', {
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
  const isVerified = user?.phoneVerified || user?.phone_verified;
  const isBuyer = deal?.seekerid == user.id;
  const isSeller = deal?.providerid == user.id;

  return (
    <div className="screen active" style={{background:'var(--bg)', display:'flex', flexDirection:'column'}}>
      <div className="topbar">
        <div style={{cursor:'pointer',fontSize:'20px'}} onClick={()=>navigate(-1)}>‹</div>
        <div style={{flex:1, marginLeft:'15px'}}>
          <div style={{fontSize:'15px', fontWeight:700}}>{chatInfo?.listingTitle || 'Chat Room'}</div>
          <div style={{fontSize:'11px', color: deal?.status === 'completed' ? 'var(--green)' : 'var(--amber)'}}>
            {deal?.status === 'completed' ? 'Deal Sealed ✅' : (deal ? 'HONOR DEAL WITHIN 72H ⏳' : 'Inquiry')}
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

      <div className="scroll-area" ref={scrollRef} style={{padding:'20px', display:'flex', flexDirection:'column', gap:'12px', background:'var(--bg)', flex:1}}>
        {history.length === 0 && (
          <div style={{textAlign:'center', color:'var(--text-muted)', fontSize:'13px', marginTop:'20px'}}>
            No messages yet. Send one to start the deal!
          </div>
        )}
        {history.map((m, i) => {
          const isAdmin = m.senderRole === 'admin' || m.senderPhone === '263715198745' || m.senderPhone === '263775939688';
          const isSender = m.senderId === user.id;
          
          return (
          <div key={i} style={{
            maxWidth:'80%',
            padding:'12px 16px',
            borderRadius:'18px',
            fontSize:'14px',
            lineHeight:1.5,
            alignSelf: isAdmin ? 'center' : (isSender ? 'flex-end' : 'flex-start'),
            background: isAdmin ? 'rgba(255, 69, 58, 0.15)' : (isSender ? 'var(--green)' : 'var(--surface2)'),
            color: isAdmin ? 'var(--red)' : (isSender ? '#000' : 'var(--text)'),
            border: isAdmin ? '1px solid var(--red)' : (isSender ? 'none' : '1px solid var(--border)'),
            borderBottomRightRadius: isAdmin ? '18px' : (isSender ? '4px' : '18px'),
            borderBottomLeftRadius: isAdmin ? '18px' : (!isSender ? '4px' : '18px'),
          }}>
            {isAdmin ? (
               <div style={{fontSize:'11px', fontWeight:800, marginBottom:'4px', color:'var(--red)'}}>🚨 ADMIN</div>
            ) : (
               <div style={{fontSize:'10px', fontWeight:700, marginBottom:'4px', opacity:0.6}}>
                 {m.senderName || (isSender ? user.fullname : 'Other')}
               </div>
            )}
            <div>{m.text}</div>
            <div style={{fontSize:'10px', marginTop:'4px', opacity:0.6, textAlign:'right'}}>
              {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
            </div>
          </div>
        )})}
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

