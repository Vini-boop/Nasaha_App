import { useState, useEffect } from 'react';
import {
  Plus, MessageSquare, Save, PenTool, X,
  RefreshCw, Trash2, Search,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const EMPTY_FORM = { methali: '', meaning: '', lesson: '', category: '', image: '' };

const CATEGORIES = [
  'Maisha', 'Mapenzi', 'Juhudi na Kazi', 'Hekima na Busara',
  'Umoja na Ushirikiano', 'Uvumilivu', 'Tabia na Mienendo',
  'Majuto na Onyo', 'Jumla',
];

const CATEGORY_IMAGES = {
  'Maisha': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
  'Mapenzi': 'https://images.unsplash.com/photo-1518398092300-5cca33f1b0a8?auto=format&fit=crop&w=800&q=80',
  'Juhudi na Kazi': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
  'Hekima na Busara': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
  'Umoja na Ushirikiano': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
  'Uvumilivu': 'https://images.unsplash.com/photo-1493836512294-502baa1986e2?auto=format&fit=crop&w=800&q=80',
  'Tabia na Mienendo': 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=800&q=80',
  'Majuto na Onyo': 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=800&q=80',
  'Jumla': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
};

/* ─── Skeleton ────────────────────────────────── */
function SkeletonItem() {
  return (
    <div className="data-item" style={{ gap: 12 }}>
      <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '65%' }} />
        <div className="skeleton" style={{ height: 11, width: '90%' }} />
        <div className="skeleton" style={{ height: 11, width: '45%' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MethaliManager({ animate, user }) {
  const [methaliList, setMethaliList] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchQ, setSearchQ] = useState('');

  const authHeader = { Authorization: `Bearer ${localStorage.getItem('adminToken')}` };
  const { showToast } = useToast();

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  /* ── Fetch ── */
  const fetchMethali = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API}/api/methali`);
      if (res.ok) {
        const data = await res.json();
        const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
        setMethaliList(isAdmin ? data : data.filter(item => item.user_id === user?.id));
      }
      else showToast('Imeshindwa kupakia methali.', 'error');
    } catch {
      showToast('Hitilafu ya mtandao. Jaribu tena.', 'error');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchMethali(); }, []);

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.methali.trim() || !formData.meaning.trim()) {
      showToast('Tafadhali jaza methali na maana yake.', 'error');
      return;
    }
    setLoading(true);
    try {
      const url = editingId ? `${API}/api/methali/${editingId}` : `${API}/api/methali`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchMethali();
        setFormData(EMPTY_FORM);
        setEditingId(null);
        showToast(editingId ? 'Methali imesasishwa vizuri! ✓' : 'Methali mpya imehifadhiwa! ✓');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Imeshindwa kuhifadhi methali.', 'error');
      }
    } catch {
      showToast('Hitilafu ya mtandao. Jaribu tena.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Edit ── */
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      methali: item.methali || '',
      meaning: item.meaning || '',
      lesson: item.lesson || '',
      category: item.category || '',
      image: item.image || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Delete ── */
  const handleDelete = async (id, text) => {
    if (!window.confirm(`Futa methali hii?\n\n"${text}"\n\nHaitaweza kurejeshwa.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API}/api/methali/${id}`, {
        method: 'DELETE', headers: authHeader,
      });
      if (res.ok) {
        fetchMethali();
        if (editingId === id) { setEditingId(null); setFormData(EMPTY_FORM); }
        showToast('Methali imefutwa kikamilifu. ✓');
      } else {
        showToast('Imeshindwa kufuta methali.', 'error');
      }
    } catch {
      showToast('Hitilafu ya mtandao.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = methaliList.filter(m =>
    !searchQ ||
    m.methali?.toLowerCase().includes(searchQ.toLowerCase()) ||
    m.meaning?.toLowerCase().includes(searchQ.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className={`dashboard-content ${animate ? 'animate-fade-in' : ''}`}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Simamia Methali</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Ongeza, hariri na futa methali za Kiswahili
          </p>
        </div>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '9px 18px' }}
          onClick={fetchMethali}
          disabled={fetching}
        >
          <RefreshCw size={15} style={{ animation: fetching ? 'spin 1s linear infinite' : 'none' }} />
          Onyesha Upya
        </button>
      </div>

      <div className="manager-grid">

        {/* ══════════════════════════
            FORM PANEL
        ══════════════════════════ */}
        <div className="glass-panel" style={{ padding: 28 }}>
          <h3 className="panel-header">
            {editingId
              ? <><PenTool size={17} color="var(--accent)" /> Hariri Methali</>
              : <><Plus size={17} color="var(--primary)" /> Ongeza Methali Mpya</>}
          </h3>

          <form onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <label>Methali *</label>
              <input
                type="text"
                className="form-input"
                placeholder="mf. Asiyesikia la mkuu kuvunjika guu"
                value={formData.methali}
                onChange={e => set('methali', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Maana *</label>
              <textarea
                className="form-textarea"
                placeholder="Eleza maana ya methali hii..."
                value={formData.meaning}
                onChange={e => set('meaning', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Funzo / Somo</label>
              <textarea
                className="form-textarea"
                placeholder="Funzo linalopatikana kutoka kwa methali hii..."
                value={formData.lesson}
                onChange={e => set('lesson', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Kitengo</label>
              <select
                className="form-input"
                value={formData.category}
                onChange={e => {
                  const cat = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    category: cat,
                    image: CATEGORY_IMAGES[cat] || CATEGORY_IMAGES['Jumla'],
                  }));
                }}
              >
                <option value="">— Chagua kitengo —</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Image preview */}
              {formData.image && (
                <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', height: 130, border: '1px solid var(--glass-border)' }}>
                  <img
                    src={formData.image}
                    alt={formData.category}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading
                  ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Inahifadhi…</>
                  : <><Save size={15} /> {editingId ? 'Sasisha Methali' : 'Hifadhi Methali'}</>}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); }}
                >
                  <X size={14} /> Ghairi
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ══════════════════════════
            LIST PANEL
        ══════════════════════════ */}
        <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="panel-header" style={{ margin: 0 }}>
              <MessageSquare size={17} color="var(--accent)" />
              Methali Zote
              {!fetching && (
                <span className="badge badge-accent" style={{ marginLeft: 8 }}>{filtered.length}</span>
              )}
            </h3>
          </div>

          {/* Search */}
          <div className="table-search" style={{ marginBottom: 16 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tafuta methali…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
            {searchQ && (
              <button className="table-search-clear" onClick={() => setSearchQ('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {fetching && [1, 2, 3].map(i => <SkeletonItem key={i} />)}

            {!fetching && filtered.length === 0 && (
              <div className="empty-state">
                <MessageSquare size={40} color="var(--border-color)" />
                <h3>{searchQ ? 'Hakuna methali inayolingana' : 'Bado hakuna methali'}</h3>
                <p>{searchQ ? 'Badilisha neno la kutafuta.' : 'Ongeza methali yako ya kwanza.'}</p>
              </div>
            )}

            {!fetching && filtered.map(item => (
              <div
                key={item.id}
                className="data-item"
                style={{
                  borderLeft: editingId === item.id
                    ? '3px solid var(--primary-hover)'
                    : '3px solid transparent',
                }}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.category}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                  />
                )}
                <div className="data-item-content">
                  <h4>{item.methali}</h4>
                  <p>{item.meaning}</p>
                  {item.lesson && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                      Funzo: {item.lesson}
                    </p>
                  )}
                  <div className="data-item-meta">
                    <span className="badge">{item.category || 'Jumla'}</span>
                  </div>
                </div>
                <div className="data-item-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => handleEdit(item)}
                    title="Hariri"
                  >
                    <PenTool size={14} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(item.id, item.methali)}
                    disabled={deleting === item.id}
                    title="Futa"
                  >
                    {deleting === item.id
                      ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
