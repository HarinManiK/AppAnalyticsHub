import { Link } from 'react-router-dom';
import { Layers, ArrowRight, Radio } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 className="gradient-text" style={{ fontSize: '48px', marginBottom: '16px' }}>Master Analytics Hub</h1>
        <p style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
          Centralized data tracking and real-time API cost monitoring across all your deployed applications.
        </p>
      </div>

      <div className="grid-3">
        {/* Thought Slate Card */}
        <Link to="/thought-slate" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px' }}>
                <Layers color="var(--accent-indigo)" size={24} />
              </div>
              <h2 style={{ margin: 0, fontSize: '24px' }}>Thought Slate</h2>
            </div>
            <div style={{ flex: 1 }}></div>
            <div className="flex-between" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>Active</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <span>View Stats</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </Link>

        {/* InstantFeed Card */}
        <Link to="/instantfeed" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(203, 41, 87, 0.1)', padding: '12px', borderRadius: '12px' }}>
                <Radio color="var(--accent-rose)" size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px' }}>InstantFeed</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Chrome Extension Feed Telemetry</div>
              </div>
            </div>
            <div style={{ flex: 1 }}></div>
            <div className="flex-between" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: '#10B981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                Active
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <span>View Stats</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </Link>

        {/* Future App Placeholder */}
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', borderStyle: 'dashed', opacity: 0.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '50%' }}>
              <span style={{ fontSize: '24px' }}>+</span>
            </div>
            <h3 style={{ margin: 0 }}>New Application</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
