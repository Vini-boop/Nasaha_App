import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, Trash2, Mail, Shield, AlertCircle, RefreshCw, X, Search,
  Calendar, UserCheck, UserX,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const EMPTY_FORM = { name: '', email: '' };

/* ─── Skeleton card ───────────────────────────── */
function SkeletonCard() {
  return (
    <div className="wcard wcard-skeleton">
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '55%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 10, width: '35%', borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
    </div>
  );
}

/* ─── Writer card ─────────────────────────────── */
function WriterCard({ writer, onDelete, deleting }) {
  const initials = writer.name
    ? writer.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'W';

  const joinDate = new Date(writer.createdAt).toLocaleDateString('sw', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  /* pick a consistent accent colour per name */
  const colours = [
    'var(--primary-hover)', 'var(--accent)', 'var(--warning)',
    'var(--success)', '#A78BFA', '#FB923C',
  ];
  const colour = colours[(writer.name?.charCodeAt(0) || 0) % colours.length];

  return (
    <div className="wcard">
      {/* Avatar */}
      <div className="wcard-avatar" style={{ background: `${colour}22`, border: `2px solid ${colour}44` }}>
        <span style={{ color: colour, fontWeight: 700, fontSize: '1rem' }}>{initials}</span>
      </div>

      {/* Info */}
      <div className="wcard-info">
        <p className="wcard-name">{writer.name}</p>
        <p className="wcard-email">
          <Mail size={11} style={{ opacity: 0.55, flexShrink: 0 }} />
          {writer.email}
        </p>
        <div className="wcard-meta">
          <span className="wcard-role-badge">
            <UserCheck size={10} />
            Mwandishi
          </span>
          <span className="wcard-date">
            <Calendar size={10} />
            {joinDate}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        className="action-btn delete wcard-delete"
        onClick={() => onDelete(writer)}
        disabled={deleting === writer.id}
        title="Futa mwandishi"
        aria-label="Futa mwandishi"
      >
        {deleting === writer.id
          ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
          : <Trash2 size={14} />}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function WritersManager({ animate }) {
  const { user } = useAuth();
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const nameRef = useRef(null);

  const { showToast } = useToast();
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('adminToken')}` };

  const fetchWriters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users`, { headers: authHeader });
      if (res.ok) {
        const data = await res.json();
        setWriters(data.filter(u => u.role === 'WRITER'));
      } else {
        showToast('Imeshindwa kupakia waandishi.', 'error');
      }
    } catch {
      showToast('Hitilafu ya mtandao. Jaribu tena.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWriters(); }, []);
  useEffect(() => {
    if (showModal) setTimeout(() => nameRef.current?.focus(), 50);
  }, [showModal]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Tafadhali jaza jina na barua pepe.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindwa kuongeza mwandishi.');
      showToast(`${form.name} ameongezwa. Nywila imetumwa kwa barua pepe. ✓`);
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchWriters();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (w) => {
    if (!window.confirm(`Futa mwandishi "${w.name}"?\n\nHatoweza kuingia tena na data yake haitarudishwa.`)) return;
    setDeleting(w.id);
    try {
      const res = await fetch(`${API}/api/users/${w.id}`, { method: 'DELETE', headers: authHeader });
      if (res.ok) {
        showToast(`${w.name} amefutwa kikamilifu. ✓`);
        fetchWriters();
      } else {
        const data = await res.json();
        showToast(data.error || 'Imeshindwa kufuta.', 'error');
      }
    } catch {
      showToast('Hitilafu ya mtandao.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  /* Access guard */
  if (user?.role !== 'ADMIN') {
    return (
      <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="empty-state">
          <Shield size={40} color="var(--border-color)" />
          <h3>Hauna Ruhusa</h3>
          <p>Ukurasa huu unapatikana kwa wasimamizi pekee.</p>
        </div>
      </div>
    );
  }

  const filtered = writers.filter(w =>
    !searchQ ||
    w.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    w.email?.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className={`dashboard-content ${animate ? 'animate-fade-in' : ''}`}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Waandishi</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Simamia waandishi wanaoweza kuandika dibaji na makala
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-secondary"
            style={{ width: 'auto', padding: '9px 16px', flex: 'none' }}
            onClick={fetchWriters}
            disabled={loading}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Onyesha Upya
          </button>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '9px 20px' }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} />
            Ongeza Mwandishi
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="wstats-strip">
        <div className="wstat-card">
          <div className="wstat-icon" style={{ background: 'rgba(20,184,166,0.12)' }}>
            <Users size={18} color="var(--primary-hover)" />
          </div>
          <div>
            <p className="wstat-num">{writers.length}</p>
            <p className="wstat-label">Waandishi Wote</p>
          </div>
        </div>
        <div className="wstat-card">
          <div className="wstat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
            <UserCheck size={18} color="var(--success)" />
          </div>
          <div>
            <p className="wstat-num" style={{ color: 'var(--success)' }}>{writers.length}</p>
            <p className="wstat-label">Wanaofanya Kazi</p>
          </div>
        </div>
        <div className="wstat-card">
          <div className="wstat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <UserX size={18} color="var(--danger)" />
          </div>
          <div>
            <p className="wstat-num" style={{ color: 'var(--danger)' }}>0</p>
            <p className="wstat-label">Wamesimamishwa</p>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="wsearch-bar">
        <Search size={15} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Tafuta kwa jina au barua pepe…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />
        {searchQ && (
          <button className="table-search-clear" onClick={() => setSearchQ('')}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Cards grid ── */}
      {loading ? (
        <div className="wcards-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px' }}>
          <div className="empty-state">
            <Users size={42} color="var(--border-color)" />
            <h3>{searchQ ? 'Hakuna mwandishi anayelingana' : 'Bado hakuna waandishi'}</h3>
            <p>
              {searchQ
                ? 'Badilisha neno la kutafuta au futa kichujio.'
                : 'Bonyeza "Ongeza Mwandishi" kuanza.'}
            </p>
            {!searchQ && (
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 22px', marginTop: 8 }}
                onClick={() => setShowModal(true)}
              >
                <Plus size={15} /> Ongeza Mwandishi wa Kwanza
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="wcards-grid">
          {filtered.map(w => (
            <WriterCard
              key={w.id}
              writer={w}
              onDelete={handleDelete}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      {/* ── Count footer ── */}
      {!loading && filtered.length > 0 && (
        <p className="wcount-footer">
          {searchQ
            ? `Matokeo ${filtered.length} kati ya ${writers.length}`
            : `Waandishi ${writers.length} wote wanaonyeshwa`}
        </p>
      )}

      {/* ══════════════════════════════════════
          ADD WRITER MODAL
      ══════════════════════════════════════ */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal-card glass-panel wmodal">

            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="wmodal-icon">
                  <Users size={18} color="var(--primary-hover)" />
                </div>
                <div>
                  <h2 className="modal-title">Ongeza Mwandishi Mpya</h2>
                  <p className="modal-sub">Nywila itatengenezwa na kutumwa kwa barua pepe</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Notice */}
            <div className="modal-notice">
              <span className="modal-notice-dot" />
              Baada ya kuongezwa, mwandishi atapata barua pepe iliyo na nywila ya muda katika
              muundo wa <strong>WRT026-XXXX</strong>.
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-group">
                <label>Jina Kamili</label>
                <div className="modal-input-wrap">
                  <User size={15} className="modal-input-icon" />
                  <input
                    ref={nameRef}
                    type="text"
                    className="form-input modal-input"
                    placeholder="k.m. Juma Ali"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Barua Pepe</label>
                <div className="modal-input-wrap">
                  <Mail size={15} className="modal-input-icon" />
                  <input
                    type="email"
                    className="form-input modal-input"
                    placeholder="k.m. juma@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 'none', padding: '10px 20px' }}
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting
                    ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Inaongeza…</>
                    : <><Plus size={15} /> Ongeza Mwandishi</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
