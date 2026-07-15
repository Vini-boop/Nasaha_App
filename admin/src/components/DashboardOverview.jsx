import { useEffect, useState } from 'react';
import {
  Users, BookOpen, FileText, MessageSquare,
  TrendingUp, TrendingDown, Activity,
  ArrowRight, RefreshCw, Wifi, WifiOff, Quote,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CHART_DATA = [
  { label: 'Jan', pct: 38 },
  { label: 'Feb', pct: 55 },
  { label: 'Mar', pct: 42 },
  { label: 'Apr', pct: 74 },
  { label: 'Mei', pct: 60 },
  { label: 'Jun', pct: 88 },
  { label: 'Jul', pct: 72 },
];

const ACTIVITY = [
  { color: 'var(--primary-hover)', title: 'Dibaji mpya imeongezwa', time: 'dakika 2 zilizopita' },
  { color: 'var(--accent)', title: 'Methali "Mvumilivu hula mbivu"', time: 'saa 1 iliyopita' },
  { color: 'var(--success)', title: 'Makala "Maadili ya Kiafrika"', time: 'saa 3 zilizopita' },
  { color: 'var(--warning)', title: 'Ripoti ya wiki imesaidiwa', time: 'saa 5 zilizopita' },
];

/* ─── Daily Dibaji widget ───────────────────── */
function DailyDibajiWidget() {
  const [proverbs, setProverbs] = useState([]);
  const [dailyProverb, setDailyProverb] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/dibaji`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProverbs(d); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (proverbs.length === 0) return;

    const todayStr = new Date().toDateString();
    const dayOfWeek = new Date().getDay() + 1;
    const storedDate = localStorage.getItem('adminDailyDibajiDate');
    const storedProverb = localStorage.getItem('adminDailyDibaji');
    const storedHistory = localStorage.getItem('adminDailyDibajiHistory');
    let parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];

    if (!storedDate || storedDate !== todayStr || !storedProverb) {
      const oldProverb = storedProverb ? JSON.parse(storedProverb) : null;

      if (dayOfWeek === 1) {
        parsedHistory = [];
      } else if (oldProverb) {
        parsedHistory = [oldProverb, ...parsedHistory].slice(0, 6);
      }

      let newP = proverbs[0];
      if (oldProverb) {
        const idx = proverbs.findIndex(p => p.id === oldProverb.id);
        if (idx !== -1) newP = proverbs[(idx + 1) % proverbs.length];
      } else {
        newP = proverbs[Math.floor(Math.random() * proverbs.length)];
      }

      localStorage.setItem('adminDailyDibajiDate', todayStr);
      localStorage.setItem('adminDailyDibaji', JSON.stringify(newP));
      localStorage.setItem('adminDailyDibajiHistory', JSON.stringify(parsedHistory));

      setDailyProverb(newP);
      setHistory(parsedHistory);
    } else {
      setDailyProverb(JSON.parse(storedProverb));
      setHistory(parsedHistory);
    }
  }, [proverbs]);

  if (!dailyProverb) return null;

  return (
    <div className="dbaji-widget glass-panel">
      {/* Header */}
      <div className="dbaji-widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="dbaji-widget-icon">
            <BookOpen size={16} color="var(--primary-hover)" />
          </div>
          <span className="dbaji-widget-title">Dibaji ya Leo</span>
        </div>
        <span className="dbaji-widget-pill">Onyesho la Programu</span>
      </div>

      {/* Featured proverb */}
      <div className="dbaji-featured">
        <Quote size={48} className="dbaji-quote-mark" />
        <p className="dbaji-featured-text">"{dailyProverb.text}"</p>
        {dailyProverb.meaning && (
          <p className="dbaji-featured-meaning">{dailyProverb.meaning}</p>
        )}
        {dailyProverb.source && (
          <p className="dbaji-featured-source">— {dailyProverb.source}</p>
        )}
      </div>

      {/* History scroll */}
      {history.length > 0 && (
        <div className="dbaji-history">
          <p className="dbaji-history-label">Wiki Hii</p>
          <div className="dbaji-history-scroll">
            {history.map((h, i) => (
              <div key={i} className="dbaji-history-card">
                <p className="dbaji-history-text">"{h.text}"</p>
                <p className="dbaji-history-meaning">{h.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function DashboardOverview({ animate, onNavigate, user }) {
  const [counts, setCounts] = useState({ dibaji: 0, methali: 0, makala: 0 });
  const [online, setOnline] = useState(null);
  const [animated, setAnimated] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const loadData = async () => {
    setRefresh(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(`${API}/api/dibaji`),
        fetch(`${API}/api/methali`),
        fetch(`${API}/api/makala/all`)
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

      const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

      const myDibaji = isAdmin ? d1 : (Array.isArray(d1) ? d1.filter(i => i.user_id === user?.id) : []);
      const myMethali = isAdmin ? d2 : (Array.isArray(d2) ? d2.filter(i => i.user_id === user?.id) : []);
      const myMakala = isAdmin ? d3 : (Array.isArray(d3) ? d3.filter(i => i.user_id === user?.id) : []);

      setCounts({
        dibaji: myDibaji.length,
        methali: myMethali.length,
        makala: myMakala.length
      });
      setOnline(true);
    } catch (e) {
      setOnline(false);
    } finally {
      setRefresh(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const STATS = [
    {
      title: 'Dibaji',
      value: counts.dibaji ?? '—',
      icon: BookOpen,
      iconColor: 'var(--primary-hover)',
      iconBg: 'var(--primary-light)',
      trend: 'up',
      note: 'nasaha zilizohifadhiwa',
      tab: 'dibaji',
    },
    {
      title: 'Methali',
      value: counts.methali ?? '—',
      icon: MessageSquare,
      iconColor: 'var(--accent)',
      iconBg: 'var(--accent-light)',
      trend: 'up',
      note: 'methali zilizohifadhiwa',
      tab: 'methali',
    },
    {
      title: 'Makala',
      value: counts.makala ?? '—',
      icon: FileText,
      iconColor: 'var(--success)',
      iconBg: 'var(--success-light)',
      trend: 'neutral',
      note: 'makala zilizochapishwa',
      tab: 'makala',
    },
    {
      title: 'Hali ya API',
      value: online === null ? '…' : online ? 'Online' : 'Offline',
      icon: online === false ? WifiOff : Wifi,
      iconColor: online === false ? 'var(--danger)' : 'var(--success)',
      iconBg: online === false ? 'var(--danger-light)' : 'var(--success-light)',
      trend: online === false ? 'down' : 'up',
      note: 'backend server',
      tab: null,
    },
  ];

  const visibleStats = STATS.filter(s => {
    if (user?.role === 'ADMIN') return true;
    return ['dibaji', 'makala', null].includes(s.tab);
  });

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Habari za asubuhi' : now.getHours() < 17 ? 'Habari za mchana' : 'Habari za jioni';

  return (
    <div className={`dashboard-content ${animate ? 'animate-fade-in' : ''}`}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <p className="dash-greeting">{greeting}, {user?.name?.split(' ')[0] || 'Mtumiaji'} 👋</p>
          <h1 className="page-title">
            {user?.role === 'WRITER' ? 'Dashibodi ya Mwandishi' : 'Dashibodi ya Admin'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {user?.role === 'WRITER'
              ? 'Andika na simamia makala na dibaji zako'
              : 'Muhtasari wa shughuli za mfumo wa Nasaha'}
          </p>
        </div>
        <button
          className="btn-secondary"
          style={{ width: 'auto', gap: 8, padding: '9px 18px', flexShrink: 0 }}
          onClick={loadData}
          disabled={refresh}
        >
          <RefreshCw size={15} style={{ animation: refresh ? 'spin 1s linear infinite' : 'none' }} />
          Onyesha Upya
        </button>
      </div>

      {/* ── Stats grid ── */}
      <div className="stats-grid">
        {visibleStats.map(({ title, value, icon: Icon, iconColor, iconBg, trend, note, tab }) => (
          <div
            key={title}
            className={`stat-card glass-panel ${tab ? 'stat-card-clickable' : ''}`}
            onClick={() => tab && onNavigate?.(tab)}
            role={tab ? 'button' : undefined}
            tabIndex={tab ? 0 : undefined}
            onKeyDown={e => tab && e.key === 'Enter' && onNavigate?.(tab)}
          >
            <div className="stat-header">
              <span className="stat-title">{title}</span>
              <div className="stat-icon" style={{ background: iconBg }}>
                <Icon size={18} color={iconColor} />
              </div>
            </div>
            <div className="stat-value">{value}</div>
            <div className={`stat-footer ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-neutral'}`}>
              {trend === 'up' && <TrendingUp size={13} />}
              {trend === 'down' && <TrendingDown size={13} />}
              <span>{note}</span>
              {tab && (
                <span className="stat-nav-hint">
                  Simamia <ArrowRight size={11} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily Dibaji ── */}
      <DailyDibajiWidget />

      {/* ── Charts & Activity ── */}
      <div className="content-grid">

        {/* Chart */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 className="panel-header" style={{ margin: 0 }}>
              <Activity size={17} color="var(--primary-hover)" />
              Muhtasari wa Shughuli
            </h3>
            <span className="chart-year-badge">2025</span>
          </div>
          <div className="mock-chart">
            {CHART_DATA.map(({ label, pct }) => (
              <div key={label} className="bar-wrap">
                <div className="bar" style={{ height: animated ? `${pct}%` : '0%' }} />
                <span className="bar-label">{label}</span>
              </div>
            ))}
          </div>
          <p className="chart-note">* Takwimu za onyesho tu</p>
        </div>

        {/* Activity */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="panel-header">
            <Activity size={17} color="var(--accent)" />
            Shughuli za Hivi Karibuni
          </h3>
          <div className="activity-list">
            {ACTIVITY.filter(a => user?.role === 'ADMIN' || !a.title.includes('Methali') && !a.title.includes('Ripoti')).map(({ color, title, time }) => (
              <div key={title} className="activity-item">
                <div className="activity-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <div className="activity-content">
                  <h4>{title}</h4>
                  <p>{time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="quick-links">
        {[
          { tab: 'dibaji', label: 'Ongeza Dibaji', sub: 'Nasaha mpya za kila siku', icon: BookOpen, color: 'var(--primary-hover)', bg: 'var(--primary-light)' },
          { tab: 'methali', label: 'Ongeza Methali', sub: 'Methali za Kiswahili', icon: MessageSquare, color: 'var(--accent)', bg: 'var(--accent-light)' },
          { tab: 'makala', label: 'Andika Makala', sub: 'Chapisha makala mpya', icon: FileText, color: 'var(--success)', bg: 'var(--success-light)' },
          { tab: 'writers', label: 'Simamia Waandishi', sub: 'Ongeza waandishi wapya', icon: Users, color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
        ]
          .filter(l => user?.role === 'ADMIN' || ['dibaji', 'makala'].includes(l.tab))
          .map(({ tab, label, sub, icon: Icon, color, bg }) => (
            <div
              key={tab}
              className="glass-panel quick-link-card"
              onClick={() => onNavigate?.(tab)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onNavigate?.(tab)}
            >
              <div className="quick-link-icon" style={{ background: bg }}>
                <Icon size={21} color={color} />
              </div>
              <div className="quick-link-text">
                <h4>{label}</h4>
                <p>{sub}</p>
              </div>
              <ArrowRight size={15} color="var(--text-muted)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
            </div>
          ))}
      </div>
    </div>
  );
}
