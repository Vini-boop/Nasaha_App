import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, BookOpen, Save, X, Pencil, Trash2,
  Eye, EyeOff, RefreshCw, Quote, Globe,
  Heart, MessageCircle, CalendarDays, Clock, History, ListOrdered,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/* ── Rotation Panel ───────────────────────────────────────────────────────────
 * Fetches /api/dibaji/current and displays the full rotation state:
 *  - Today's active Dibaji
 *  - This week's history (Sun–yesterday)
 *  - Weekly queue
 */
function RotationPanel() {
  const [rotation, setRotation] = useState(null);
  const [loadingRotation, setLoadingRotation] = useState(true);
  const [rotationError, setRotationError] = useState(null);

  const DAY_LABELS = {
    Sunday: 'Jumapili',
    Monday: 'Jumatatu',
    Tuesday: 'Jumanne',
    Wednesday: 'Jumatano',
    Thursday: 'Alhamisi',
    Friday: 'Ijumaa',
    Saturday: 'Jumamosi',
  };

  const fetchRotation = useCallback(async () => {
    setLoadingRotation(true);
    setRotationError(null);
    try {
      const res = await fetch(`${API}/api/dibaji/current`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRotation(await res.json());
    } catch (e) {
      setRotationError('Imeshindwa kupakia hali ya mzunguko. ' + e.message);
    } finally {
      setLoadingRotation(false);
    }
  }, []);

  useEffect(() => { fetchRotation(); }, [fetchRotation]);

  /* ── sub-components ── */
  const SectionLabel = ({ icon: Icon, label, color = 'var(--primary)' }) => (
    <p style={{
      display: 'flex', alignItems: 'center', gap: 7,
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.09em',
      textTransform: 'uppercase', color, marginBottom: 10,
    }}>
      <Icon size={13} color={color} />
      {label}
    </p>
  );

  const ActiveCard = ({ dibaji }) => (
    <div style={{
      background: 'linear-gradient(135deg, #0c4a6e 0%, #164e63 100%)',
      borderRadius: 14,
      padding: '20px 22px',
      borderLeft: '4px solid #22d3ee',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Quote size={48} color="rgba(34,211,238,0.1)"
        style={{ position: 'absolute', top: 6, right: 8 }} />
      <p style={{
        fontSize: '1rem', fontStyle: 'italic', fontWeight: 700,
        color: '#f0f9ff', lineHeight: 1.6, marginBottom: 10,
      }}>
        "{dibaji.text}"
      </p>
      {dibaji.meaning && (
        <p style={{ fontSize: '0.8rem', color: '#bae6fd', lineHeight: 1.5, marginBottom: 10 }}>
          {dibaji.meaning}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {dibaji.source && (
          <span style={{
            fontSize: '0.7rem', color: '#7dd3fc', fontStyle: 'italic',
            background: 'rgba(255,255,255,0.07)', padding: '3px 10px', borderRadius: 20,
          }}>
            {dibaji.source}
          </span>
        )}
        <span style={{
          fontSize: '0.7rem', fontWeight: 600, color: '#22d3ee',
          background: 'rgba(34,211,238,0.12)', padding: '3px 10px', borderRadius: 20,
          marginLeft: 'auto',
        }}>
          {DAY_LABELS[dibaji.day] || dibaji.day} · {dibaji.date}
        </span>
      </div>
    </div>
  );

  const HistoryRow = ({ item, index }) => (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 10,
      borderLeft: '3px solid rgba(255,255,255,0.08)',
    }}>
      <span style={{
        fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
        minWidth: 20, paddingTop: 2, textAlign: 'right',
      }}>
        {index + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-main)',
          lineHeight: 1.5, marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          "{item.text}"
        </p>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {DAY_LABELS[item.day] || item.day} · {item.date}
        </p>
      </div>
    </div>
  );

  const QueueRow = ({ item, index }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 8,
    }}>
      <span style={{
        fontSize: '0.6rem', fontWeight: 700,
        background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
        borderRadius: '50%', width: 20, height: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {index + 1}
      </span>
      <p style={{
        flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)',
        fontStyle: 'italic', lineHeight: 1.4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        margin: 0,
      }}>
        "{item.value?.text}"
      </p>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
        {item.generatedDate}
      </span>
    </div>
  );

  /* ── render ── */
  return (
    <div className="glass-panel" style={{ padding: 28, marginBottom: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 className="panel-header" style={{ margin: 0 }}>
            <CalendarDays size={18} color="var(--primary)" />
            Mzunguko wa Dibaji — Wiki Hii
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Mzunguko wa Jumapili–Jumamosi · Maeneo ya Nairobi (EAT)
          </p>
        </div>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '7px 14px', fontSize: '0.8rem' }}
          onClick={fetchRotation}
          disabled={loadingRotation}
          title="Pakia upya hali ya mzunguko"
        >
          <RefreshCw size={13} style={{ animation: loadingRotation ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loadingRotation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ height: 100, borderRadius: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!loadingRotation && rotationError && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10,
          color: '#fca5a5',
          fontSize: '0.85rem',
        }}>
          {rotationError}
        </div>
      )}

      {/* Content */}
      {!loadingRotation && rotation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Active Dibaji ── */}
          <div>
            <SectionLabel icon={Clock} label="Dibaji Inayofanya Kazi Leo" color="#22d3ee" />
            {rotation.activeDibaji
              ? <ActiveCard dibaji={rotation.activeDibaji} />
              : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Hakuna dibaji inayofanya kazi. Ongeza dibaji kwanza.
                </p>
              )
            }
          </div>

          {/* ── History + Queue side by side ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: rotation.history?.length > 0 ? '1fr 1fr' : '1fr',
            gap: 20,
          }}>

            {/* Weekly history */}
            {rotation.history?.length > 0 && (
              <div>
                <SectionLabel icon={History} label={`Historia ya Wiki Hii (${rotation.history.length})`} color="#a78bfa" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rotation.history.map((item, i) => (
                    <HistoryRow key={item.date || i} item={item} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Queue */}
            {rotation.queue?.length > 0 && (
              <div>
                <SectionLabel icon={ListOrdered} label={`Foleni ya Wiki (${rotation.queue.length})`} color="#6ee7b7" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {rotation.queue.map((item, i) => (
                    <QueueRow key={item.generatedDate || i} item={item} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Sunday — no history yet */}
            {(!rotation.history || rotation.history.length === 0) && (
              <div style={{
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  📅 Wiki mpya imeanza leo (Jumapili). Historia itaongezeka kuanzia kesho.
                </p>
              </div>
            )}
          </div>

          {/* ── Meta footer ── */}
          <div style={{
            display: 'flex', gap: 16, flexWrap: 'wrap',
            borderTop: '1px solid var(--border-color)',
            paddingTop: 14, marginTop: 4,
          }}>
            {[
              { label: 'Mwanzo wa Mzunguko', value: rotation.cycleStart },
              { label: 'Maeneo ya Saa', value: rotation.timezone },
              { label: 'Jumapili ya Wiki Hii', value: rotation.sundayDate },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: '1 1 140px' }}>
                <p style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 3 }}>
                  {label}
                </p>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                  {value || '—'}
                </p>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  text: '',
  meaning: '',
  source: '',
  enText: '',
  enMeaning: '',
};

const MAX_TEXT = 120;
const MAX_MEANING = 400;

/* ── tiny helpers ─────────────────────────────────────── */
function CharCount({ value = '', max }) {
  const left = max - value.length;
  const warn = left < 20;
  return (
    <span style={{
      fontSize: '0.7rem',
      color: warn ? 'var(--warning)' : 'var(--text-muted)',
      marginLeft: 'auto',
    }}>
      {value.length}/{max}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="data-item" style={{ gap: 12 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 16, width: '70%' }} />
        <div className="skeleton" style={{ height: 12, width: '90%' }} />
        <div className="skeleton" style={{ height: 12, width: '50%' }} />
      </div>
    </div>
  );
}

/* ── preview card (mirrors mobile HomeScreen card) ───────*/
function PreviewCard({ text, meaning, source }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      padding: '24px',
      marginTop: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* decorative quote mark */}
      <Quote
        size={64}
        color="rgba(15,118,110,0.15)"
        style={{ position: 'absolute', top: 8, right: 8 }}
      />
      <p style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--primary-hover)',
        marginBottom: 12,
      }}>
        📱 Mfano wa Programu
      </p>
      <p style={{
        fontSize: '1.15rem',
        fontStyle: 'italic',
        fontWeight: 700,
        color: 'var(--text-main)',
        lineHeight: 1.6,
        marginBottom: 16,
        textAlign: 'center',
      }}>
        "{text || 'Andika dibaji hapa...'}"
      </p>
      {meaning && (
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          borderTop: '1px solid var(--glass-border)',
          paddingTop: 12,
          marginTop: 4,
        }}>
          {meaning}
        </p>
      )}
      {source && (
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          marginTop: 10,
          textAlign: 'right',
        }}>
          — {source}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function DibajiManager({ animate, user }) {
  const [dibajiList, setDibajiList] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [viewingComments, setViewingComments] = useState(null);
  const [dibajiComments, setDibajiComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [showEnFields, setShowEnFields] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const formRef = useRef(null);
  const { showToast } = useToast();

  /* ── helpers ── */
  const notify = (type, message) => showToast(message, type);

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  /* ── fetch ── */
  const fetchDibaji = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API}/api/dibaji`);
      if (res.ok) {
        const data = await res.json();
        const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
        setDibajiList(isAdmin ? data : data.filter(item => item.user_id === user?.id));
      }
      else notify('error', 'Imeshindwa kupakia dibaji.');
    } catch {
      notify('error', 'Hitilafu ya mtandao. Jaribu tena.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchDibaji(); }, []);

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.text.trim() || !formData.meaning.trim()) {
      notify('error', 'Tafadhali jaza maandishi ya dibaji na maana yake.');
      return;
    }
    setLoading(true);
    try {
      const url = editingId ? `${API}/api/dibaji/${editingId}` : `${API}/api/dibaji`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchDibaji();
        setFormData(EMPTY_FORM);
        setEditingId(null);
        setShowPreview(false);
        notify('success', editingId
          ? 'Dibaji imesasishwa vizuri! ✓'
          : 'Dibaji mpya imehifadhiwa vizuri! ✓');
      } else {
        const err = await res.json().catch(() => ({}));
        notify('error', err.error || 'Imeshindwa kuhifadhi dibaji.');
      }
    } catch {
      notify('error', 'Hitilafu ya mtandao. Hakikisha seva inafanya kazi.');
    } finally {
      setLoading(false);
    }
  };

  /* ── edit ── */
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      text: item.text || '',
      meaning: item.meaning || '',
      source: item.source || '',
      enText: item.enText || '',
      enMeaning: item.enMeaning || '',
    });
    if (item.enText || item.enMeaning) setShowEnFields(true);
    setShowPreview(false);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── delete ── */
  const handleDelete = async (id, text) => {
    if (!window.confirm(`Futa dibaji hii?\n\n"${text}"\n\nHaitaweza kurejeshwa.`)) return;
    try {
      const res = await fetch(`${API}/api/dibaji/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
        fetchDibaji();
        if (editingId === id) { setEditingId(null); setFormData(EMPTY_FORM); }
        notify('success', 'Dibaji imefutwa. ✓');
      } else {
        notify('error', 'Imeshindwa kufuta dibaji.');
      }
    } catch {
      notify('error', 'Hitilafu ya mtandao.');
    }
  };

  const handleViewComments = async (id) => {
    if (viewingComments === id) {
      setViewingComments(null);
      return;
    }
    setViewingComments(id);
    setLoadingComments(true);
    try {
      const res = await fetch(`${API}/api/dibaji/${id}/comments`);
      if (res.ok) setDibajiComments(await res.json());
    } catch (e) {
      console.error("Failed to fetch comments", e);
    } finally {
      setLoadingComments(false);
    }
  };

  /* ── cancel edit ── */
  const handleCancel = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowPreview(false);
  };

  /* ── filtered list ── */
  const filtered = dibajiList.filter(d =>
    !searchQ ||
    d.text?.toLowerCase().includes(searchQ.toLowerCase()) ||
    d.meaning?.toLowerCase().includes(searchQ.toLowerCase()) ||
    d.source?.toLowerCase().includes(searchQ.toLowerCase())
  );

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className={`dashboard-content ${animate ? 'animate-fade-in' : ''}`}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Simamia Dibaji</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Ongeza, hariri na futa nasaha za kila siku kwa programu
          </p>
        </div>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '9px 18px' }}
          onClick={fetchDibaji}
          disabled={fetching}
        >
          <RefreshCw size={15} style={{ animation: fetching ? 'spin 1s linear infinite' : 'none' }} />
          Onyesha Upya
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          ROTATION PANEL — live weekly cycle status
      ══════════════════════════════════════════════════════ */}
      <RotationPanel />

      <div className="manager-grid">

        {/* ══════════════════════════
            FORM PANEL (left)
        ══════════════════════════ */}
        <div ref={formRef} className="glass-panel" style={{ padding: 28 }}>

          {/* Panel header */}
          <h3 className="panel-header">
            {editingId ? 'Hariri Dibaji' : 'Ongeza Dibaji Mpya'}
          </h3>

          <form onSubmit={handleSubmit} noValidate>

            {/* Dibaji text */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ margin: 0 }}>Maandishi ya Dibaji *</label>
                <CharCount value={formData.text} max={MAX_TEXT} />
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="mf. Haraka haraka haina baraka"
                value={formData.text}
                maxLength={MAX_TEXT}
                onChange={e => set('text', e.target.value)}
                required
              />
            </div>

            {/* Meaning */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ margin: 0 }}>Maana na Tafakari *</label>
                <CharCount value={formData.meaning} max={MAX_MEANING} />
              </div>
              <textarea
                className="form-textarea"
                placeholder="Eleza maana ya dibaji hii na funzo lake kwa maisha..."
                value={formData.meaning}
                maxLength={MAX_MEANING}
                onChange={e => set('meaning', e.target.value)}
                style={{ minHeight: 110 }}
                required
              />
            </div>

            {/* Source */}
            <div className="form-group">
              <label>Chanzo / Kitengo</label>
              <input
                type="text"
                className="form-input"
                placeholder="mf. Dibaji za leo · Methali · Wazee wa Kale"
                value={formData.source}
                onChange={e => set('source', e.target.value)}
              />
            </div>

            {/* English toggle */}
            <button
              type="button"
              onClick={() => setShowEnFields(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--accent-light)',
                border: '1px solid rgba(56,189,248,0.25)',
                color: 'var(--accent)',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: 20,
                width: '100%',
              }}
            >
              <Globe size={16} />
              {showEnFields ? 'Ficha' : 'Onyesha'} Tafsiri ya Kiingereza (hiari)
            </button>

            {showEnFields && (
              <div style={{
                padding: '18px 20px',
                background: 'rgba(56,189,248,0.05)',
                border: '1px solid rgba(56,189,248,0.15)',
                borderRadius: 12,
                marginBottom: 20,
              }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: 14,
                  lineHeight: 1.5,
                }}>
                  Tafsiri hii itatumika katika programu kwa watumiaji wanaochagua Kiingereza (EN).
                </p>

                <div className="form-group">
                  <label>Maandishi kwa Kiingereza</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Haste has no blessing"
                    value={formData.enText}
                    onChange={e => set('enText', e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Maana kwa Kiingereza</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. Rushing things often leads to poor results..."
                    value={formData.enMeaning}
                    onChange={e => set('enMeaning', e.target.value)}
                    style={{ minHeight: 80 }}
                  />
                </div>
              </div>
            )}

            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: showPreview ? 0 : 20,
                width: '100%',
              }}
            >
              {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
              {showPreview ? 'Ficha Mfano' : 'Angalia Mfano wa Programu'}
            </button>

            {showPreview && (
              <PreviewCard
                text={formData.text}
                meaning={formData.meaning}
                source={formData.source}
              />
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading
                  ? <><RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Inahifadhi...</>
                  : <><Save size={16} /> {editingId ? 'Sasisha Dibaji' : 'Hifadhi Dibaji'}</>}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                  style={{ flex: 1 }}
                >
                  <X size={15} /> Ghairi
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ══════════════════════════
            LIST PANEL (right)
        ══════════════════════════ */}
        <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="panel-header" style={{ margin: 0 }}>
              <BookOpen size={18} color="var(--accent)" />
              Dibaji Zilizohifadhiwa
              {!fetching && (
                <span className="badge badge-accent" style={{ marginLeft: 8 }}>
                  {filtered.length}
                </span>
              )}
            </h3>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(15,23,42,0.4)',
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            padding: '9px 14px',
            marginBottom: 16,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input
              type="text"
              placeholder="Tafuta dibaji..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-main)',
                outline: 'none', flex: 1, fontSize: '0.875rem', fontFamily: 'var(--font-family)',
              }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Loading skeletons */}
            {fetching && [1, 2, 3].map(i => <SkeletonCard key={i} />)}

            {/* Empty state */}
            {!fetching && filtered.length === 0 && (
              <div className="empty-state">
                <BookOpen size={42} color="var(--border-color)" />
                <h3>{searchQ ? 'Hakuna dibaji inayolingana' : 'Bado hakuna dibaji'}</h3>
                <p>{searchQ ? `Tafuta nyingine au ongeza dibaji mpya.` : 'Ongeza dibaji yako ya kwanza kwa kutumia fomu iliyo kushoto.'}</p>
              </div>
            )}

            {/* Cards */}
            {!fetching && filtered.map(item => (
              <div key={item.id}>
                <div
                  className="data-item"
                  style={{
                    borderLeft: editingId === item.id ? '3px solid var(--primary-hover)' : '3px solid transparent',
                  }}
                >
                  <div className="data-item-content">
                    <h4 style={{ fontStyle: 'italic', color: 'var(--text-main)', marginBottom: 5 }}>
                      "{item.text}"
                    </h4>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{item.meaning}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {item.source && <span className="badge">{item.source}</span>}
                      {item.enText && (
                        <span className="badge badge-accent">
                          <Globe size={10} style={{ marginRight: 3 }} />EN
                        </span>
                      )}
                      {item.createdAt && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {new Date(item.createdAt).toLocaleDateString('sw', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Heart size={11} color="var(--danger)" /> {item.likes || 0} Likes
                    </div>
                  </div>

                  <div className="data-item-actions">
                    <button
                      className={`action-btn ${viewingComments === item.id ? 'edit' : ''}`}
                      style={viewingComments === item.id ? {} : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
                      onClick={() => handleViewComments(item.id)}
                      title="Maoni"
                    >
                      <MessageCircle size={14} />
                    </button>
                    {(user?.role === 'ADMIN' || user?.id === item.user_id) && (
                      <>
                        <button className="action-btn edit" onClick={() => handleEdit(item)} title="Hariri">
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(item.id, item.text)} title="Futa">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Comments drawer */}
                {viewingComments === item.id && (
                  <div className="makala-comments-drawer">
                    <p className="makala-comments-title">
                      <MessageCircle size={13} />
                      Maoni ya Wasomaji
                    </p>
                    {loadingComments ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[1, 2].map(i => (
                          <div key={i} style={{ display: 'flex', gap: 8 }}>
                            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 4 }} />
                              <div className="skeleton" style={{ height: 11, width: '85%', borderRadius: 4 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : dibajiComments.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Bado hakuna maoni.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dibajiComments.map(c => (
                          <div key={c.id} className="makala-comment-item">
                            <div className="makala-comment-avatar">{c.user_name?.[0]?.toUpperCase() || 'U'}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{c.user_name}</strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {new Date(c.createdAt).toLocaleDateString('sw', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.comment}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
