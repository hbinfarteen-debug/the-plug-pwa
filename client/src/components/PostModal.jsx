import { useNavigate } from 'react-router-dom';

export default function PostModal({ onClose }) {
  const navigate = useNavigate();

  return (
    <div className="modal-overlay show" id="postModal" onClick={onClose} style={{display:'flex'}}>
      <div className="modal-sheet" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-handle"></div>
        <h3 style={{fontFamily:'"Syne",sans-serif',fontSize:'20px',fontWeight:800,marginBottom:'16px'}}>What are you plugging?</h3>
        <div style={{display:'flex',flexDirection:'column',gap:'11px'}}>
          <button className="btn-primary" style={{width:'100%',justifyContent:'center',fontSize:'16px',padding:'18px'}} onClick={() => { onClose(); navigate('/post', { state: { type: 'item' } }); }}>🛒 I'm Selling an Item</button>
          <button className="btn-outline" style={{width:'100%',justifyContent:'center',fontSize:'16px',padding:'17px'}} onClick={() => { onClose(); navigate('/post', { state: { type: 'gig' } }); }}>💼 I'm Posting a Gig</button>
          <button className="btn-ghost" style={{width:'100%',textAlign:'center'}} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
