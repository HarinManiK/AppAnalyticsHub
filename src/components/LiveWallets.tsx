import { useEffect, useState } from 'react';
import { Wallet, Key, Loader2, AlertCircle } from 'lucide-react';

interface WalletData {
  openRouter: {
    limit: number | null;
    usage: number | null;
    loading: boolean;
    error: string | null;
  };
}

export default function LiveWallets() {
  const [data, setData] = useState<WalletData>({
    openRouter: { limit: null, usage: null, loading: true, error: null }
  });

  useEffect(() => {
    const fetchOpenRouter = async () => {
      const key = import.meta.env.VITE_OPENROUTER_KEY;
      if (!key) {
        setData({ openRouter: { limit: null, usage: null, loading: false, error: 'API key missing in .env' } });
        return;
      }
      try {
        const res = await fetch('https://openrouter.ai/api/v1/credits', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (!res.ok) throw new Error('Failed to fetch OpenRouter data');
        const json = await res.json();
        setData({
          openRouter: {
            limit: json.data?.total_credits ?? null,
            usage: json.data?.total_usage ?? 0,
            loading: false,
            error: null
          }
        });
      } catch (err: any) {
        setData({ openRouter: { limit: null, usage: null, loading: false, error: err.message } });
      }
    };

    fetchOpenRouter();
  }, []);

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Wallet color="var(--text-primary)" size={24} />
        <h2 style={{ margin: 0 }}>Live Vendor Wallets</h2>
      </div>

      <div style={{ maxWidth: '600px' }}>
        {/* OpenRouter Card */}
        <div className="glass-card">
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} color="var(--accent-indigo)" />
              OpenRouter API
            </h3>
            {data.openRouter.loading && <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }} />}
          </div>
          
          {data.openRouter.error ? (
            <div style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <AlertCircle size={16} />
              {data.openRouter.error}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Remaining Balance</p>
                <h2 style={{ margin: '4px 0 0 0', color: 'var(--accent-teal)' }}>
                  {data.openRouter.limit !== null ? `$${(data.openRouter.limit - (data.openRouter.usage ?? 0)).toFixed(4)}` : 'Unlimited'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Wallet Limit</p>
                  <h4 style={{ margin: '4px 0 0 0' }}>{data.openRouter.limit !== null ? `$${data.openRouter.limit.toFixed(2)}` : 'Unlimited'}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total Burnt</p>
                  <h4 style={{ margin: '4px 0 0 0', color: 'var(--accent-rose)' }}>${data.openRouter.usage !== null ? data.openRouter.usage.toFixed(4) : '0.0000'}</h4>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
