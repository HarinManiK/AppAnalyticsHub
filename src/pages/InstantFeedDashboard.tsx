import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Radio, Users, Activity, Flame, ArrowLeft, ArrowRight, Loader2, Search, Clock, Tag } from 'lucide-react';

interface NameHistoryEntry {
  name: string;
  changedAt: string;
}

interface InstantFeedUser {
  id: string;
  userId?: string;
  currentName?: string;
  nameHistory?: NameHistoryEntry[];
  totalSessions?: number;
  totalTweetsPulled?: number;
  firstSeenAt?: string;
  lastActiveAt?: string;
}

interface InstantFeedSession {
  id: string;
  sessionId?: string;
  userId?: string;
  userName?: string;
  openedAt?: string;
  closedAt?: string | null;
  lastHeartbeatAt?: string;
  tweetsPulled?: number;
  status?: string;
}

export default function InstantFeedDashboard() {
  const [users, setUsers] = useState<InstantFeedUser[]>([]);
  const [sessions, setSessions] = useState<InstantFeedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Listen to users
    const unsubUsers = onSnapshot(collection(db, 'instantfeed_users'), (snapshot) => {
      const usersData: InstantFeedUser[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setUsers(usersData);
      setLoading(false);
    });

    // 2. Listen to sessions
    const unsubSessions = onSnapshot(collection(db, 'instantfeed_sessions'), (snapshot) => {
      const sessionsData: InstantFeedSession[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setSessions(sessionsData);
    });

    return () => {
      unsubUsers();
      unsubSessions();
    };
  }, []);

  // Determine if a session is currently active (pinged within 2 minutes and no closedAt)
  const isSessionLive = (s: InstantFeedSession) => {
    if (s.closedAt) return false;
    const lastPing = s.lastHeartbeatAt || s.openedAt;
    if (!lastPing) return false;
    const diffMs = Date.now() - new Date(lastPing).getTime();
    return diffMs < 2 * 60 * 1000;
  };

  // Check if a user currently has an active live session
  const isUserLive = (userId: string) => {
    return sessions.some((s) => (s.userId === userId || s.id === userId) && isSessionLive(s));
  };

  // Global KPI calculations
  const totalUsersCount = users.length;
  const totalSessionsCount = sessions.length > 0 ? sessions.length : users.reduce((acc, u) => acc + (u.totalSessions || 0), 0);
  const totalTweetsCount = sessions.reduce((acc, s) => acc + (s.tweetsPulled || 0), 0) || users.reduce((acc, u) => acc + (u.totalTweetsPulled || 0), 0);
  const liveSessionsCount = sessions.filter(isSessionLive).length;

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = (u.currentName || '').toLowerCase().includes(q);
    const matchId = (u.userId || u.id || '').toLowerCase().includes(q);
    const matchAkas = (u.nameHistory || []).some((h) => h.name.toLowerCase().includes(q));
    return matchName || matchId || matchAkas;
  }).sort((a, b) => {
    // Sort active users first, then by lastActiveAt descending
    const aLive = isUserLive(a.userId || a.id);
    const bLive = isUserLive(b.userId || b.id);
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    const aTime = new Date(a.lastActiveAt || a.firstSeenAt || 0).getTime();
    const bTime = new Date(b.lastActiveAt || b.firstSeenAt || 0).getTime();
    return bTime - aTime;
  });

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_) {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" className="btn btn-ghost" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <ArrowLeft size={18} />
            <span>Home</span>
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(203, 41, 87, 0.15)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Radio color="var(--accent-rose)" size={22} />
              </div>
              <h1 style={{ margin: 0, fontSize: '32px' }}>InstantFeed Analytics</h1>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Real-time user sessions, live tweet delivery, and alias tracking
            </p>
          </div>
        </div>

        {/* Live Indicator Badge */}
        {liveSessionsCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '8px 16px',
            borderRadius: '20px',
            color: '#10B981',
            fontWeight: 600,
            fontSize: '13px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span>{liveSessionsCount} Live Session{liveSessionsCount > 1 ? 's' : ''} Now</span>
          </div>
        )}
      </div>

      {/* Global Counters */}
      <div className="glass-panel" style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <Users size={16} />
            <span style={{ fontSize: '13px' }}>Total Users</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>{totalUsersCount}</h3>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <Clock size={16} />
            <span style={{ fontSize: '13px' }}>Total Sessions</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>{totalSessionsCount}</h3>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <Flame size={16} color="var(--accent-rose)" />
            <span style={{ fontSize: '13px' }}>Total Tweets Pulled</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>{totalTweetsCount.toLocaleString()}</h3>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <Activity size={16} />
            <span style={{ fontSize: '13px' }}>Active (Live) Sessions</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', color: liveSessionsCount > 0 ? '#10B981' : 'var(--text-primary)' }}>
            {liveSessionsCount}
          </h3>
        </div>
      </div>

      {/* Users Section */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="var(--text-primary)" />
            <h2 style={{ margin: 0, fontSize: '20px' }}>InstantFeed Users</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '12px' }}>
              {filteredUsers.length}
            </span>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px' }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search user or alias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', width: '180px' }}
            />
          </div>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>User / Name</th>
                <th>Status</th>
                <th>AKAs & Aliases</th>
                <th>Total Sessions</th>
                <th>Tweets Pulled</th>
                <th>Last Active</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const uid = user.userId || user.id;
                const isLive = isUserLive(uid);
                const akas = user.nameHistory || [];

                return (
                  <tr
                    key={user.id}
                    className="clickable"
                    onClick={() => navigate(`/instantfeed/user/${encodeURIComponent(uid)}`)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                        {user.currentName || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                        ID: {uid.length > 14 ? `${uid.slice(0, 8)}...${uid.slice(-4)}` : uid}
                      </div>
                    </td>
                    <td>
                      {isLive ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                          Live Now
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          Offline
                        </span>
                      )}
                    </td>
                    <td>
                      {akas.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(203, 41, 87, 0.12)',
                            color: 'var(--accent-rose)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}>
                            <Tag size={11} />
                            +{akas.length} AKA{akas.length > 1 ? 's' : ''}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            ({akas.map((a) => a.name).slice(0, 2).join(', ')}{akas.length > 2 ? '...' : ''})
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>None</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{user.totalSessions || 0}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {(user.totalTweetsPulled || 0).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatRelativeTime(user.lastActiveAt || user.firstSeenAt)}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/instantfeed/user/${encodeURIComponent(uid)}`);
                        }}
                      >
                        <span>View Sessions</span>
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    {searchQuery ? `No users matching "${searchQuery}"` : 'No InstantFeed users tracked yet. Open the Chrome extension feed to begin recording!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
