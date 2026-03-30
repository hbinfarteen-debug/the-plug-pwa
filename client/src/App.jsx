import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Splash from './screens/Splash';
import Onboard from './screens/Onboard';
import Home from './screens/Home';
import Search from './screens/Search';
import PostListing from './screens/PostListing';
import PublicProfile from './screens/PublicProfile';
import MyPlugs from './screens/MyPlugs';
import Messages from './screens/Messages';
import Chat from './screens/Chat';
import Profile from './screens/Profile';
import Detail from './screens/Detail';
import Admin from './screens/Admin';
import Dispute from './screens/Dispute';
import Settings from './screens/Settings';
import SuccessOverlay from './components/SuccessOverlay';
import PostModal from './components/PostModal';
import { useState } from 'react';

function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const p = loc.pathname;
  
  // Hide on overlay screens
  if (p === '/' || p === '/onboard' || p === '/settings' || p.startsWith('/detail/') || p.startsWith('/post') || p.startsWith('/admin') || p.startsWith('/dispute') || p.startsWith('/profile/') || p.startsWith('/chat/')) {
      return null;
  }

  return (
    <div className="bottom-nav">
      <div className={`nav-item ${p==='/home'?'active':''}`} onClick={() => nav('/home')}><div className="nav-icon">🏠</div>Home</div>
      <div className={`nav-item ${p==='/search'?'active':''}`} onClick={() => nav('/search')}><div className="nav-icon">🔍</div>Search</div>
      <div className={`nav-item ${p==='/myplugs'?'active':''}`} onClick={() => nav('/myplugs')}><div className="nav-icon">📋</div>My Plugs</div>
      <div className={`nav-item ${p==='/messages'?'active':''}`} onClick={() => nav('/messages')}><div className="nav-icon">💬</div>Messages</div>
      <div className={`nav-item ${p==='/profile'?'active':''}`} onClick={() => nav('/profile')}><div className="nav-icon">👤</div>Profile</div>
    </div>
  );
}

function FloatingActionButton({ onShowPost }) {
  const loc = useLocation();
  const p = loc.pathname;
  
  if (p === '/' || p === '/onboard' || p === '/settings' || p.startsWith('/detail/') || p.startsWith('/post') || p.startsWith('/admin') || p.startsWith('/dispute') || p.startsWith('/profile/') || p.startsWith('/chat/')) {
      return null;
  }

  return (
    <div className="fab-container" onClick={onShowPost}>
      <div className="fab">+</div>
    </div>
  );
}

function App() {
  const [showPostModal, setShowPostModal] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  const showToast = (msg, type = '') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 2600);
  };

  return (
    <Router>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboard" element={<Onboard showToast={showToast} />} />
          <Route path="/home" element={<Home showToast={showToast} />} />
          <Route path="/search" element={<Search />} />
          <Route path="/post" element={<PostListing showToast={showToast} />} />
          <Route path="/profile/:id" element={<PublicProfile showToast={showToast} />} />
          <Route path="/myplugs" element={<MyPlugs showToast={showToast} onSuccess={() => setSuccessData({})} />} />
          <Route path="/profile" element={<Profile showToast={showToast} />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/detail/:id" element={<Detail showToast={showToast} />} />
          <Route path="/admin" element={<Admin showToast={showToast} />} />
          <Route path="/dispute" element={<Dispute showToast={showToast} />} />
          <Route path="/settings" element={<Settings showToast={showToast} />} />
        </Routes>
        
        <BottomNav />
        <FloatingActionButton onShowPost={() => setShowPostModal(true)} />
        
        {showPostModal && <PostModal onClose={() => setShowPostModal(false)} />}
        {successData && <SuccessOverlay showToast={showToast} onClose={() => setSuccessData(null)} />}
        
        <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`} id="toast">{toast.msg}</div>
      </div>
    </Router>
  );
}

export default App;
