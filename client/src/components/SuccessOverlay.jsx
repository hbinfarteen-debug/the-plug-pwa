export default function SuccessOverlay({ showToast, onClose }) {
  return (
    <div className="success-screen show" id="successScreen">
      <div className="confetti">🎉</div>
      <div className="spts">+5</div>
      <div style={{fontSize:'14px',color:'var(--text-muted)',marginBottom:'4px'}}>Ubuntu Points Earned</div>
      <h2>Deal Sealed!</h2>
      <p>The Swap Code matched. Your Ubuntu reputation grows stronger.</p>
      
      <div className="gift-box">
        <h4>🫶 Show Ubuntu — Gift a Point?</h4>
        <p>Gift 1 point to Sipho for exceptional work.</p>
        <button className="btn-primary" style={{marginTop:'12px',width:'100%',justifyContent:'center'}} onClick={()=>showToast('Gifted 1 point!','success')}>Gift 1 Ubuntu Point</button>
      </div>
      
      <button className="btn-outline" style={{width:'100%',justifyContent:'center'}} onClick={onClose}>Return Home</button>
    </div>
  );
}
