import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, User, Clock, Flame, Activity, Tag, Loader2, CheckCircle2, AlertCircle, History } from 'lucide-react';

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

export default function InstantFeedUserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<InstantFeedUser | null>(null);
  const [sessions, setSessions] = useState<InstantFeedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // Live timer tick every 10s to keep durations and live statuses accurate
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) return;

    // 1. Real-time listener for user profile
    const unsubUser = onSnapshot(doc(db, 'instantfeed_users', userId), (docSnap) => {
      if (docSnap.exists()) {
        setUser({ id: docSnap.id, ...(docSnap.data() as any) });
      }
      setLoading(false);
    });

    // 2. Real-time listener for all sessions
    const unsubSessions = onSnapshot(collection(db, 'instantfeed_sessions'), (snapshot) => {
      const allSessions: InstantFeedSession[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Filter for this user's sessions and sort descending by openedAt
      const userSessions = allSessions
        .filter((s) => s.userId === userId || s.id === userId)
        .sort((a, b) => {
          const tA = new Date(a.openedAt || 0).getTime();
          const tB = new Date(b.openedAt || 0).getTime();
          return tB - tA;
        });

      setSessions(userSessions);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubSessions();
    };
  }, [userId]);

  const isSessionLive = (s: InstantFeedSession) => {
    if (s.closedAt) return false;
    const lastPing = s.lastHeartbeatAt || s.openedAt;
    if (!lastPing) return false;
    const diffMs = Date.now() - new Date(lastPing).getTime();
    return diffMs < 2 * 60 * 1000;
  };

  const isUserLive = sessions.some(isSessionLive);

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch (_) {
      return isoString;
    }
  };

  const formatDuration = (openedAt?: string, closedAt?: string | null) => {
    if (!openedAt) return '—';
    try {
      const start = new Date(openedAt).getTime();
      const end = closedAt ? new Date(closedAt).getTime() : Date.now();
      const diffSec = Math.max(0, Math.floor((end - start) / 1000));

      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      let str = '';
      if (hrs > 0) str += `${hrs}h `;
      if (mins > 0 || hrs > 0) str += `${mins}m `;
      str += `${secs}s`;

      if (!closedAt) {
        return `Ongoing (${str})`;
      }
      return str;
    } catch (_) {
      return '—';
    }
  };

  if (loading) {
    return (
      <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const nameHistory = user?.nameHistory || [];
  const totalTweetsPulled = sessions.reduce((acc, s) => acc + (s.tweetsPulled || 0), 0) || (user?.totalTweetsPulled || 0);

  return (
    <div className="container">
      {/* Header & Back Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/instantfeed')}
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={18} />
          <span>Back to Feed Hub</span>
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '32px' }}>{user?.currentName || 'Unknown User'}</h1>

            {/* Live Indicator Badge */}
            {isUserLive ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                Active Session In Progress
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
              }}>
                Offline
              </span>
            )}
          </div>

          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            UUID: {userId} &bull; First Seen: {formatTimestamp(user?.firstSeenAt)} &bull; Last Active: {formatTimestamp(user?.lastActiveAt)}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '12px' }}>
            <Clock color="var(--text-primary)" size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total Sessions</p>
            <h3 style={{ margin: 0, fontSize: '24px' }}>{sessions.length || user?.totalSessions || 0}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(203, 41, 87, 0.12)', padding: '14px', borderRadius: '12px' }}>
            <Flame color="var(--accent-rose)" size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total Tweets Pulled</p>
            <h3 style={{ margin: 0, fontSize: '24px' }}>{totalTweetsPulled.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '12px' }}>
            <Tag color="var(--text-primary)" size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Known Aliases (AKAs)</p>
            <h3 style={{ margin: 0, fontSize: '24px' }}>{nameHistory.length}</h3>
          </div>
        </div>
      </div>

      {/* AKAs & Name History Panel */}
      <div className="glass-panel" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <History size={20} color="var(--accent-rose)" />
          <h2 style={{ margin: 0, fontSize: '20px' }}>Name History &amp; AKAs</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Current Name Card */}
          <div style={{
            padding: '14px 18px',
            background: 'rgba(16, 185, 129, 0.08)',
            borderLeft: '4px solid #10B981',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={18} color="#10B981" />
              <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>
                {user?.currentName || 'Anonymous'}
              </span>
              <span style={{
                background: '#10B981',
                color: '#000',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                textTransform: 'uppercase'
              }}>
                Current Name
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Active Now
            </span>
          </div>

          {/* Historical AKAs */}
          {nameHistory.map((entry, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 18px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderLeft: '4px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Tag size={16} color="var(--text-secondary)" />
                <span style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-secondary)' }}>
                  {entry.name}
                </span>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  Previous Alias
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Changed on: {formatTimestamp(entry.changedAt)}
              </span>
            </div>
          ))}

          {nameHistory.length === 0 && (
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              No previous aliases recorded. User has always been identified as <strong>{user?.currentName || 'Anonymous'}</strong>.
            </p>
          )}
        </div>
      </div>

      {/* Sessions Breakdown Table */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color="var(--text-primary)" />
            <h2 style={{ margin: 0, fontSize: '20px' }}>Session Log &amp; Tweet Pulls</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '12px' }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Real-time sync active &bull; Auto-refreshes on live events
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Opened At</th>
                <th>Closed At</th>
                <th>Duration</th>
                <th>Tweets Pulled</th>
                <th>Session ID</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const live = isSessionLive(s);
                const hasClosed = Boolean(s.closedAt);
                const disconnected = !hasClosed && !live;

                return (
                  <tr
                    key={s.id}
                    style={{
                      background: live ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                    }}
                  >
                    <td>
                      {live ? (
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
                          Live (In Progress)
                        </span>
                      ) : disconnected ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#F59E0B',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}>
                          <AlertCircle size={13} />
                          Left Open / Ended
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                        }}>
                          <CheckCircle2 size={13} />
                          Completed
                        </span>
                      )}
                    </td>

                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {formatTimestamp(s.openedAt)}
                    </td>

                    <td>
                      {hasClosed ? (
                        <span style={{ color: 'var(--text-primary)' }}>{formatTimestamp(s.closedAt)}</span>
                      ) : live ? (
                        <span style={{ color: '#10B981', fontWeight: 600, fontStyle: 'italic' }}>
                          🟢 Active Now (Not Closed)
                        </span>
                      ) : (
                        <span style={{ color: '#F59E0B', fontStyle: 'italic' }}>
                          — (No Close Signal)
                        </span>
                      )}
                    </td>

                    <td style={{ fontFamily: 'monospace', color: live ? '#10B981' : 'var(--text-primary)' }}>
                      {formatDuration(s.openedAt, s.closedAt)}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '15px',
                          color: (s.tweetsPulled || 0) > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}>
                          {s.tweetsPulled || 0}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>tweets</span>
                        {live && (
                          <span style={{
                            fontSize: '10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10B981',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            SYNCING
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {s.sessionId || s.id}
                    </td>
                  </tr>
                );
              })}

              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    No sessions recorded for this user yet.
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
