import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2 } from 'lucide-react';

export default function ThoughtSlateDashboard() {
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [appUsers, setAppUsers] = useState<Record<string, { username: string, friendCode: string }>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Real-time listener for global stats
    const unsubGlobal = onSnapshot(doc(db, 'analytics', 'global_stats'), (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data());
      }
    });

    // Real-time listener for users
    const unsubUsers = onSnapshot(collection(db, 'analytics_users'), (snapshot) => {
      const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData.sort((a: any, b: any) => (b.totalTasks || 0) - (a.totalTasks || 0)));
      setLoading(false);
    });

    // Real-time listener for the actual app profiles to grab custom usernames and friend codes
    const unsubAppUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersMap: Record<string, { username: string, friendCode: string }> = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        usersMap[d.id] = {
          username: data.username || '',
          friendCode: data.friend_code || ''
        };
      });
      setAppUsers(usersMap);
    });

    return () => {
      unsubGlobal();
      unsubUsers();
      unsubAppUsers();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Loader2 className="spinner" size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex-between" style={{ marginBottom: '40px' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '36px' }}>Thought Slate</h1>
          <p>Global Analytics Overview</p>
        </div>
      </div>

      {/* Global Counters */}
      <div className="glass-panel" style={{ marginBottom: '40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total Users</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>{users.length}</h3>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total Tasks Created</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>{globalStats?.totalTasks || 0}</h3>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total Tasks Assigned to Others</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>{globalStats?.tasksAssignedOut || 0}</h3>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Avg Tasks Per User</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--accent-emerald)' }}>
            {users.length ? ((globalStats?.totalTasks || 0) / users.length).toFixed(2) : "0.00"}
          </h3>
        </div>
      </div>

      {/* User Leaderboard */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Users color="var(--text-primary)" size={24} />
          <h2 style={{ margin: 0 }}>Users</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Friend Code</th>
                <th>Email</th>
                <th>Total Tasks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="clickable" onClick={() => navigate(`/thought-slate/user/${user.id}`)}>
                  <td>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{appUsers[user.id]?.username || user.nickname || user.username || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{user.username}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--accent-teal)' }}>
                    {appUsers[user.id]?.friendCode || 'N/A'}
                  </td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.totalTasks || 0}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>View Details</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No users found yet. Start using the app!
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
