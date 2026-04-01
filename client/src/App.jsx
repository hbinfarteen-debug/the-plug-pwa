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
import Notifications from './screens/Notifications';
import SuccessOverlay from './components/SuccessOverlay';
import PostModal from './components/PostModal';
import { useState, useEffect } from 'react';
import { translations } from './utils/translations';

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
  
  if (p === '/' || p === '/onboard' || p === '/settings' || p.startsWith('/detail/') || p.startsWith('/post') || p.startsWith('/admin') || p.startsWith('/dispute') || p.startsWith('/profile/') || p.startsWith('/chat/') || p === '/notifications') {
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
  const [language, setLanguage] = useState(localStorage.getItem('plug_lang') || 'English');
  
  const showToast = (msg, type = '') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 2600);
  };

  const t = translations[language] || translations.English;

  useEffect(() => {
    localStorage.setItem('plug_lang', language);
  }, [language]);

  return (
    <Router>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Splash t={t} />} />
          <Route path="/onboard" element={<Onboard showToast={showToast} t={t} language={language} setLanguage={setLanguage} />} />
          <Route path="/home" element={<Home showToast={showToast} t={t} />} />
          <Route path="/search" element={<Search t={t} />} />
          <Route path="/post" element={<PostListing showToast={showToast} t={t} />} />
          <Route path="/profile/:id" element={<PublicProfile showToast={showToast} t={t} />} />
          <Route path="/myplugs" element={<MyPlugs showToast={showToast} t={t} onSuccess={() => setSuccessData({})} />} />
          <Route path="/profile" element={<Profile showToast={showToast} t={t} />} />
          <Route path="/messages" element={<Messages showToast={showToast} t={t} />} />
          <Route path="/chat/:id" element={<Chat showToast={showToast} t={t} />} />
          <Route path="/detail/:id" element={<Detail showToast={showToast} t={t} />} />
          <Route path="/admin" element={<Admin showToast={showToast} t={t} />} />
          <Route path="/dispute" element={<Dispute showToast={showToast} t={t} />} />
          <Route path="/settings" element={<Settings showToast={showToast} t={t} setLanguage={setLanguage} language={language} />} />
          <Route path="/notifications" element={<Notifications showToast={showToast} t={t} />} />
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
