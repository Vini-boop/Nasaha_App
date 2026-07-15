import { useState, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, MessageSquare, FileText,
  Settings, LogOut, Bell, Search, Menu, X,
  ChevronRight, Users, ChevronDown,
} from 'lucide-react';
import DashboardOverview from './components/DashboardOverview';
import DibajiManager from './components/DibajiManager';
import MethaliManager from './components/MethaliManager';
import MakalaManager from './components/MakalaManager';
import WritersManager from './components/WritersManager';
import SettingsManager from './components/SettingsManager';
import NotificationsPanel from './components/NotificationsPanel';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import './App.css';
import './components/Login.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashibodi', icon: LayoutDashboard },
  { id: 'dibaji', label: 'Dibaji', icon: BookOpen },
  { id: 'methali', label: 'Methali', icon: MessageSquare },
  { id: 'makala', label: 'Makala', icon: FileText },
];

const PAGE_TITLES = {
  dashboard: 'Dashibodi',
  dibaji: 'Dibaji',
  methali: 'Methali',
  makala: 'Makala',
  writers: 'Waandishi',
  settings: 'Mipangilio',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [animate, setAnimate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNotif, setShowNotif] = useState(false);

  const { user, loading, logout } = useAuth();

  useEffect(() => { setAnimate(true); }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handler = e => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* Close notifications when clicking elsewhere */
  useEffect(() => {
    if (!showNotif) return;
    const handler = () => setShowNotif(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showNotif]);

  const navigate = tab => {
    setActiveTab(tab);
    setSidebarOpen(false);
    setAnimate(false);
    setTimeout(() => setAnimate(true), 20);
  };

  const renderContent = () => {
    if (user.role === 'WRITER' && !['dashboard', 'dibaji', 'makala'].includes(activeTab)) {
      return (
        <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div className="empty-state">
            <h3>Hauna Ruhusa</h3>
            <p>Huruhusiwi kufikia ukurasa huu.</p>
          </div>
        </div>
      );
    }
    switch (activeTab) {
      case 'dashboard': return <DashboardOverview animate={animate} onNavigate={navigate} user={user} />;
      case 'dibaji': return <DibajiManager animate={animate} user={user} />;
      case 'methali': return <MethaliManager animate={animate} user={user} />;
      case 'makala': return <MakalaManager animate={animate} user={user} />;
      case 'writers': return <WritersManager animate={animate} user={user} />;
      case 'settings': return <SettingsManager animate={animate} user={user} />;
      default: return <DashboardOverview animate={animate} onNavigate={navigate} user={user} />;
    }
  };

  /* ── Loading screen ── */
  if (loading) return (
    <div className="loading-screen">
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />
      <div className="loading-logo">N</div>
      <p className="loading-brand">Nasaha</p>
      <div className="loading-bar-track">
        <div className="loading-bar-fill" />
      </div>
      <p className="loading-text">Inathibitisha taarifa…</p>
    </div>
  );

  if (!user) return <Login />;

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (user.role === 'ADMIN') return true;
    return ['dashboard', 'makala', 'dibaji'].includes(item.id);
  });

  const roleLabel = user.role === 'ADMIN' ? 'Msimamizi Mkuu' : 'Mwandishi';

  return (
    <div className="app-container">

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ══════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════ */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <BookOpen size={18} color="#fff" />
          </div>
          <span className="sidebar-logo-text">Nasaha</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Maudhui</span>

          {visibleNavItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}

          {user.role === 'ADMIN' && (
            <>
              <span className="nav-section-label" style={{ marginTop: 20 }}>Mfumo</span>
              <button
                className={`nav-item ${activeTab === 'writers' ? 'active' : ''}`}
                onClick={() => navigate('writers')}
              >
                <Users size={17} />
                Waandishi
              </button>
              <button
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => navigate('settings')}
              >
                <Settings size={17} />
                Mipangilio
              </button>
            </>
          )}

          <div className="nav-spacer" />
        </nav>

        {/* Sidebar user card */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="avatar sidebar-user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name || 'Mtumiaji'}</p>
              <p className="sidebar-user-role">{roleLabel}</p>
            </div>
            <button
              className="sidebar-user-logout"
              onClick={logout}
              title="Toka kwenye mfumo"
              aria-label="Toka kwenye mfumo"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════
          MAIN WRAPPER
      ══════════════════════════════════════ */}
      <main className="main-wrapper">
        <div className="bg-glow-1" />
        <div className="bg-glow-2" />

        {/* ── Top header ── */}
        <header className="top-header">
          <div className="header-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Fungua/funga menyu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="header-breadcrumb">
              <span>Nasaha</span>
              <ChevronRight size={14} />
              <span className="current">{PAGE_TITLES[activeTab]}</span>
            </div>
          </div>

          {/* Search */}
          <div className="header-search">
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tafuta…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="header-actions">
            {user.role === 'ADMIN' && (
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                  className={`icon-button ${showNotif ? 'active' : ''}`}
                  aria-label="Arifa"
                  onClick={() => setShowNotif(v => !v)}
                >
                  <Bell size={17} />
                  <span className="notif-dot" />
                </button>
                {showNotif && (
                  <NotificationsPanel onClose={() => setShowNotif(false)} />
                )}
              </div>
            )}

            {/* Header user chip */}
            <div className="user-profile">
              <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'Mtumiaji'}</span>
                <span className="user-role">{roleLabel}</span>
              </div>
              <ChevronDown size={13} color="var(--text-muted)" style={{ marginLeft: 2 }} />
            </div>
          </div>
        </header>

        {/* Page content */}
        {renderContent()}
      </main>
    </div>
  );
}
