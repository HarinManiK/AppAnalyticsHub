import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Activity, Home, LogIn, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import './index.css';
import LandingPage from './pages/LandingPage';
import ThoughtSlateDashboard from './pages/ThoughtSlateDashboard';
import UserDetails from './pages/UserDetails';
import ResetData from './ResetData';
import InstantFeedDashboard from './pages/InstantFeedDashboard';
import InstantFeedUserDetails from './pages/InstantFeedUserDetails';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav style={{ padding: '20px 40px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 15, 25, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity color="var(--accent-indigo)" size={28} />
            <h2 style={{ margin: 0, fontSize: '20px' }}>Analytics Hub</h2>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Home size={18} />
            <span>Home</span>
          </Link>
          <div onClick={() => { signOut(auth); window.location.href = '/'; }} style={{ color: 'var(--accent-rose)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </div>
        </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <Activity color="var(--accent-indigo)" size={48} style={{ marginBottom: '24px' }} />
          <h1 className="gradient-text" style={{ marginBottom: '8px' }}>Analytics Hub</h1>
          <button className="btn" onClick={handleLogin} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <LogIn size={18} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const allowedEmails = ['thecognitivefounder@gmail.com', 'kharinmani@gmail.com'];
  if (user.email && !allowedEmails.includes(user.email)) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <Activity color="var(--accent-rose)" size={48} style={{ marginBottom: '24px' }} />
          <h1 style={{ marginBottom: '8px', color: 'var(--accent-rose)' }}>Access Denied</h1>
          <p style={{ marginBottom: '32px' }}>Your email ({user.email}) is not authorized to view this dashboard.</p>
          <button className="btn btn-ghost" onClick={() => signOut(auth)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/thought-slate" element={<ThoughtSlateDashboard />} />
          <Route path="/thought-slate/user/:uid" element={<UserDetails />} />
          <Route path="/thought-slate/reset" element={<ResetData />} />
          <Route path="/instantfeed" element={<InstantFeedDashboard />} />
          <Route path="/instantfeed/user/:userId" element={<InstantFeedUserDetails />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
