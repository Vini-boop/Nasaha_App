import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Bell, Shield, Database, Mail,
  LogOut, User, CheckCircle, Lock, Server, Globe, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/* ─── Section wrapper ─────────────────────────── */
function SettingsSection({ title, icon: Icon, iconColor, badge, children }) {
  return (
    <div className="scard">
      <div className="scard-header">
        <div className="scard-icon-wrap" style={{ background: `${iconColor}1a`, border: `1px solid ${iconColor}30` }}>
          <Icon size={17} color={iconColor} />
        </div>
        <div className="scard-header-text">
          <h3 className="scard-title">{title}</h3>
          {badge && <span className="scard-badge">{badge}</span>}
        </div>
      </div>
      <div className="scard-body">{children}</div>
    </div>
  );
}

/* ─── Toggle ──────────────────────────────────── */
function Toggle({ checked, onChange, label, sub }) {
  return (
    <label className="stoggle">
      <div className="stoggle-text">
        <span className="stoggle-label">{label}</span>
        {sub && <span className="stoggle-sub">{sub}</span>}
      </div>
      <div
        className={`stoggle-track ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
      >
        <div className="stoggle-thumb" />
      </div>
    </label>
  );
}

/* ─── Info row ────────────────────────────────── */
function InfoRow({ label, value, valueColor }) {
  return (
    <div className="sinfo-row">
      <span className="sinfo-label">{label}</span>
      <span className="sinfo-value" style={valueColor ? { color: valueColor } : {}}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function SettingsManager({ animate }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState({ adminEmail: '', emailAlertsEnabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Announcement state
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  const authHeader = { Authorization: `Bearer ${localStorage.getItem('adminToken')}` };

  const showNotif = (msg, type = 'success') => showToast(msg, type);

  useEffect(() => {
    fetch(`${API}/api/settings`, { headers: authHeader })
      .then(r => r.json())
      .then(d => setSettings({ adminEmail: d.adminEmail || '', emailAlertsEnabled: !!d.emailAlertsEnabled }))
      .catch(() => showNotif('Imeshindwa kupakia mipangilio.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showNotif('Mipangilio imehifadhiwa vizuri!');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        showNotif('Imeshindwa kuhifadhi.', 'error');
      }
    } catch {
      showNotif('Hitilafu ya mtandao. Jaribu tena.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementMsg.trim()) return showNotif('Tafadhali andika tangazo.', 'error');
    if (!window.confirm('Tangazo hili litatumwa kwa watumiaji wote kwenye simu zao. Endelea?')) return;
    
    try {
      setSendingAnnouncement(true);
      const res = await fetch(`${API}/api/admin/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ message: announcementMsg })
      });
      if (!res.ok) throw new Error('Imeshindwa kutuma tangazo');
      showNotif('Tangazo limetumwa kikamilifu!');
      setAnnouncementMsg('');
    } catch (err) {
      showNotif(err.message, 'error');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  return (
    <div className={`dashboard-content ${animate ? 'animate-fade-in' : ''}`}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mipangilio</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Sanidi mapendeleo ya mfumo na arifa
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 24px', gap: 8 }}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving
            ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Inahifadhi…</>
            : saved
              ? <><CheckCircle size={15} /> Imehifadhiwa!</>
              : <><Save size={15} /> Hifadhi Mabadiliko</>}
        </button>
      </div>


      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : (
        <div className="settings-layout">

          {/* ── LEFT COLUMN ── */}
          <div className="settings-main-col">

            {/* Profile card */}
            <SettingsSection title="Taarifa za Msimamizi" icon={User} iconColor="var(--primary-hover)">
              <div className="sprofile-card">
                <div className="sprofile-avatar-wrap">
                  <div className="sprofile-avatar">
                    {user?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="sprofile-avatar-ring" />
                </div>
                <div className="sprofile-info">
                  <p className="sprofile-name">{user?.name || 'Msimamizi'}</p>
                  <p className="sprofile-email">{user?.email}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="badge">
                      {user?.role?.toUpperCase() === 'ADMIN' ? '⚡ Msimamizi Mkuu' : '✍️ Mwandishi'}
                    </span>
                    <span className="badge badge-success">● Ameingia</span>
                  </div>
                </div>
                <button
                  className="btn-danger sprofile-logout-btn"
                  onClick={() => window.confirm('Una uhakika unataka kutoka?') && logout()}
                >
                  <LogOut size={14} />
                  Toka
                </button>
              </div>
            </SettingsSection>

            {/* Notifications */}
            <SettingsSection title="Arifa za Barua Pepe" icon={Bell} iconColor="var(--accent)">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Anwani ya Barua Pepe</label>
                <div className="modal-input-wrap">
                  <Mail size={15} className="modal-input-icon" />
                  <input
                    type="email"
                    className="form-input modal-input"
                    placeholder="msimamizi@nasaha.app"
                    value={settings.adminEmail}
                    onChange={e => setSettings({ ...settings, adminEmail: e.target.value })}
                  />
                </div>
                <p className="settings-help-text">
                  Arifa za maudhui mapya zitatumwa kwenye anwani hii.
                </p>
              </div>

              <Toggle
                checked={settings.emailAlertsEnabled}
                onChange={v => setSettings({ ...settings, emailAlertsEnabled: v })}
                label="Washa Arifa za Barua Pepe"
                sub="Pata ujumbe kila maudhui mapya yanapoongezwa kwenye mfumo."
              />
            </SettingsSection>

            {/* Security */}
            <SettingsSection title="Usalama na Faragha" icon={Lock} iconColor="var(--success)">
              <div className="scoming-box">
                <div className="scoming-icon">
                  <Lock size={22} color="var(--warning)" />
                </div>
                <div>
                  <p className="scoming-title">Inakuja Hivi Karibuni</p>
                  <p className="scoming-desc">
                    Kubadilisha nywila, kusimamia vikao, na uthibitisho wa pande mbili (2FA)
                    vitapatikana katika sasisho lijalo.
                  </p>
                </div>
              </div>
            </SettingsSection>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="settings-side-col">

            {/* Mass Announcement */}
            {user?.role?.toUpperCase() === 'ADMIN' && (
              <SettingsSection title="Tuma Tangazo" icon={Send} iconColor="var(--accent)">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Ujumbe kwa Watumiaji Wote</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Andika tangazo la kutuma kwa watumiaji wote..."
                    value={announcementMsg}
                    onChange={e => setAnnouncementMsg(e.target.value)}
                    style={{ marginBottom: 12, resize: 'none' }}
                  />
                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleSendAnnouncement}
                    disabled={sendingAnnouncement || !announcementMsg.trim()}
                  >
                    {sendingAnnouncement ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Tuma Tangazo
                  </button>
                </div>
              </SettingsSection>
            )}

            {/* System info */}
            <SettingsSection title="Maelezo ya Mfumo" icon={Server} iconColor="var(--warning)">
              <div className="sinfo-list">
                <InfoRow label="Toleo" value="v1.0.0" valueColor="var(--primary-hover)" />
                <InfoRow label="Seva" value="NasahaApp Backend" />
                <InfoRow label="Hifadhidata" value="PostgreSQL · Neon" />
                <InfoRow label="Lugha" value="Kiswahili (sw)" />
                <InfoRow label="Mazingira" value="Production" valueColor="var(--success)" />
              </div>
            </SettingsSection>

            {/* Quick links */}
            <SettingsSection title="Viungo vya Haraka" icon={Globe} iconColor="var(--accent)">
              <div className="squick-links">
                {[
                  { label: 'Dibaji', count: '—', color: 'var(--primary-hover)' },
                  { label: 'Makala', count: '—', color: 'var(--accent)' },
                  { label: 'Methali', count: '—', color: 'var(--warning)' },
                  { label: 'Waandishi', count: '—', color: 'var(--success)' },
                ].map(({ label, color }) => (
                  <div key={label} className="squick-chip" style={{ borderColor: `${color}30` }}>
                    <span className="squick-dot" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </SettingsSection>

          </div>
        </div>
      )}

      {/* ── Sticky save bar ── */}
      <div className="settings-save-bar">
        <p className="settings-save-note">
          {saved ? '✓ Mabadiliko yamehifadhiwa' : 'Mabadiliko hayatahifadhiwa moja kwa moja.'}
        </p>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 28px' }}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving
            ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Inahifadhi…</>
            : <><Save size={15} /> Hifadhi</>}
        </button>
      </div>
    </div>
  );
}
