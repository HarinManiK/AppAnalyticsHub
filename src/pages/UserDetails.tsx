import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, User, Calendar, Loader2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function UserDetails() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [appUser, setAppUser] = useState<{ username: string, friendCode: string } | null>(null);
  const [usernameHistory, setUsernameHistory] = useState<any[]>([]);
  const [rawDailyDocs, setRawDailyDocs] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewTimezone, setViewTimezone] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Default timezone selection based on user profile
  useEffect(() => {
    if (user?.timezone && !viewTimezone) {
      setViewTimezone(user.timezone);
    } else if (!viewTimezone) {
      setViewTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [user?.timezone]);

  useEffect(() => {
    if (!uid) return;
    
    // Real-time listener for user summary
    const unsubUser = onSnapshot(doc(db, 'analytics_users', uid), (docSnap) => {
      if (docSnap.exists()) {
        setUser({ id: docSnap.id, ...docSnap.data() });
      }
    });

    const unsubAppUser = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setAppUser({
          username: d.username || '',
          friendCode: d.friend_code || ''
        });
        
        if (d.usernameHistory) {
          // Normalize legacy string arrays into map arrays, then sort by timestamp
          const normalized = d.usernameHistory.map((item: any, i: number) => {
            if (typeof item === 'string') return { name: item, timestamp: i }; 
            return item;
          });
          const sortedHistory = normalized.sort((a: any, b: any) => b.timestamp - a.timestamp);
          setUsernameHistory(sortedHistory);
        }
      }
    });

    // Real-time listener for daily breakdowns
    const unsubDaily = onSnapshot(collection(db, 'analytics_users', uid, 'daily'), (snapshot) => {
      const dailyRecords = snapshot.docs.map(d => ({ date: d.id, ...d.data() }));
      setRawDailyDocs(dailyRecords);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubAppUser();
      unsubDaily();
    };
  }, [uid]);

  // Auto-sanitize legacy strings and bloat from the database
  useEffect(() => {
    if (uid && usernameHistory.length > 0) {
      // Legacy strings were assigned index-based timestamps (0, 1, 2, etc.)
      const hasLegacy = usernameHistory.some(item => item.timestamp < 1000);
      
      // Check for consecutive duplicates (since array is sorted descending by timestamp)
      let hasDuplicates = false;
      for (let i = 0; i < usernameHistory.length - 1; i++) {
        if (usernameHistory[i].name === usernameHistory[i+1].name) {
          hasDuplicates = true;
          break;
        }
      }
      
      if (hasLegacy || hasDuplicates) {
        // Filter out all legacy bloat
        let cleanedHistory = usernameHistory.filter(item => item.timestamp >= 1000);
        
        // Remove consecutive duplicates
        cleanedHistory = cleanedHistory.filter((item, index, arr) => {
          if (index === 0) return true;
          return item.name !== arr[index - 1].name;
        });

        // Write the cleaned array directly back to Firestore
        updateDoc(doc(db, 'users', uid), {
          usernameHistory: cleanedHistory
        }).then(() => {
          console.log('Successfully cleaned history bloat from database');
        }).catch(err => {
          console.error('Failed to clean history bloat:', err);
        });
      }
    }
  }, [uid, usernameHistory]);



  // Dynamic timezone bucketing
  useEffect(() => {
    if (!rawDailyDocs.length) {
      setDailyData([]);
      return;
    }
    const tz = viewTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const buckets: Record<string, number[]> = {};
    
    rawDailyDocs.forEach(doc => {
      if (doc.taskTimestampsUnix && Array.isArray(doc.taskTimestampsUnix)) {
        doc.taskTimestampsUnix.forEach((ts: number) => {
          const d = new Date(ts);
          // 'en-CA' gives YYYY-MM-DD format naturally
          const dateStr = d.toLocaleDateString('en-CA', { timeZone: tz }); 
          if (!buckets[dateStr]) buckets[dateStr] = [];
          buckets[dateStr].push(ts);
        });
      } else if (doc.taskTimestamps) {
         // Legacy string fallback
         if (!buckets[doc.date]) buckets[doc.date] = [];
         doc.taskTimestamps.forEach(() => buckets[doc.date].push(-1));
      }
    });

    const parsedDays = Object.entries(buckets).map(([date, timestamps]) => ({
      date,
      taskTimestampsUnix: timestamps,
      taskTimestamps: timestamps // For length counts
    })).sort((a, b) => b.date.localeCompare(a.date));
    
    setDailyData(parsedDays);
  }, [rawDailyDocs, viewTimezone]);

  if (loading) {
    return (
      <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Loader2 className="spinner" size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Find the day to display on the chart (selected or default to most recent)
  const activeDay = selectedDate ? dailyData.find(d => d.date === selectedDate) : (dailyData.length > 0 ? dailyData[0] : null);
  
  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => {
      const start = i.toString().padStart(2, '0');
      return `${start}:00`;
    }),
    datasets: [{
      label: 'Tasks Created',
      data: Array(24).fill(0),
      backgroundColor: 'rgba(20, 184, 166, 0.6)',
      borderColor: '#14B8A6',
      borderWidth: 1
    }]
  };

  if (activeDay && activeDay.taskTimestampsUnix) {
    const tz = viewTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    activeDay.taskTimestampsUnix.forEach((ts: number) => {
      if (ts === -1) return; // Skip legacy for chart
      const d = new Date(ts);
      const hourStr = d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
      const hour = parseInt(hourStr) % 24;
      chartData.datasets[0].data[hour] += 1;
    });
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#94A3B8' } },
      title: { display: true, text: `Peak Usage Hours (${activeDay?.date || 'No Data'})`, color: '#F1F5F9' },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const hour = context[0].label.split(':')[0];
            return `${hour}:00 to ${hour}:59`;
          }
        }
      }
    },
    scales: {
      y: { ticks: { color: '#94A3B8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px' }}>{appUser?.username || user?.nickname || user?.username || 'User Details'}</h1>
          <p style={{ margin: 0 }}>
            @{user?.username} | {user?.email} {appUser?.friendCode ? `| Code: ${appUser.friendCode}` : ''}
          </p>
          {(user?.timezone || user?.country) && (
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Region: {user?.country || 'Unknown'} | Timezone: {user?.timezone || 'Unknown'}
            </p>
          )}
        </div>
      </div>

      {/* Global Timezone Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Viewing Data In Timezone:</label>
          <select 
            value={viewTimezone} 
            onChange={(e) => setViewTimezone(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--accent-teal)', 
              fontWeight: 'bold',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {user?.timezone && <option value={user.timezone}>User Native ({user.timezone})</option>}
            <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Your Local ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
            <option value="UTC">Universal Time (UTC)</option>
            <option disabled>──────────</option>
            {Intl.supportedValuesOf('timeZone').map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px' }}>
            <User color="var(--text-primary)" size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total Tasks</p>
            <h3 style={{ margin: 0, fontSize: '24px' }}>{user?.totalTasks || 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Daily Breakdown Table */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Calendar color="var(--text-primary)" size={24} />
            <h2 style={{ margin: 0 }}>Daily Breakdown</h2>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tasks</th>

                </tr>
              </thead>
              <tbody>
                  {dailyData.map(day => {
                    const isSelected = (selectedDate === day.date) || (!selectedDate && day === dailyData[0]);
                    return (
                      <tr 
                        key={day.date} 
                        className="clickable" 
                        onClick={() => setSelectedDate(day.date)}
                        style={{ background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent' }}
                      >
                        <td style={{ fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                          {day.date}
                        </td>
                        <td style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                          {day.taskTimestamps?.length || 0}
                        </td>
                      </tr>
                    );
                  })}
                  {dailyData.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No daily records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Username Changelog */}
        {usernameHistory.length > 0 && (
          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <User color="var(--text-primary)" size={24} />
              <h2 style={{ margin: 0 }}>Username History</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {usernameHistory.map((entry, index) => (
                <div key={index} style={{ 
                  padding: '12px 16px', 
                  background: 'rgba(255,255,255,0.03)', 
                  borderRadius: '8px',
                  borderLeft: index === 0 ? '4px solid var(--accent-emerald)' : '4px solid transparent',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 'bold', color: index === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {entry.name}
                  </span>
                  {index === 0 && <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 'bold' }}>Current</span>}
                  
                  {entry.timestamp > 1000 && (
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {(() => {
                        const tz = viewTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                        return new Date(entry.timestamp).toLocaleDateString('en-CA', { timeZone: tz });
                      })()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart (Full Width at Bottom) */}
        <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Peak Usage Hours</h2>
          </div>
          <Bar options={chartOptions} data={chartData} />
        </div>
      </div>
    </div>
  );
}
