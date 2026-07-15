import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, X, RefreshCw, Inbox } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Sasa hivi';
  if (m < 60) return `dakika ${m} zilizopita`;
  const h = Math.floor(m / 60);
  if (h < 24) return `saa ${h} zilizopita`;
  const d = Math.floor(h / 24);
  return `siku ${d} zilizopita`;
}

export default function NotificationsPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('adminToken')}` };

  /* Click-outside to close */
  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    fetchNotifications();
    markRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: authHeader });
      if (res.ok) setNotifications(await res.json());
    } catch {/* silent */ }
    finally { setLoading(false); }
  };

  const markRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read`, {
        method: 'PUT', headers: authHeader,
      });
    } catch {/* best-effort */ }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div ref={panelRef} className="notif-panel glass-panel">

      {/* Header */}
      <div className="notif-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={16} color="var(--primary-hover)" />
          <span className="notif-panel-title">Arifa</span>
          {unreadCount > 0 && (
            <span className="notif-unread-badge">{unreadCount}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="notif-icon-btn"
            onClick={fetchNotifications}
            title="Onyesha upya"
            aria-label="Onyesha upya arifa"
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            className="notif-icon-btn"
            onClick={onClose}
            title="Funga"
            aria-label="Funga arifa"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="notif-panel-body">
        {loading ? (
          <div className="notif-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="notif-skeleton">
                <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <Inbox size={32} color="var(--border-color)" />
            <p>Hakuna arifa mpya</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item ${n.read ? '' : 'notif-item-unread'}`}
            >
              <div className="notif-item-icon">
                {n.read
                  ? <Check size={13} color="var(--text-muted)" />
                  : <span className="notif-item-dot" />}
              </div>
              <div className="notif-item-body">
                <p className="notif-item-msg">{n.message}</p>
                <div className="notif-item-time">
                  <Clock size={10} />
                  {timeAgo(n.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="notif-panel-footer">
          <span>{notifications.length} arifa zote</span>
          {unreadCount > 0 && <span style={{ color: 'var(--primary-hover)' }}>{unreadCount} mpya</span>}
        </div>
      )}
    </div>
  );
}
