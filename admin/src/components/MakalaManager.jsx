import { useState, useEffect } from 'react';
import {
  PenTool, FileText, UploadCloud, MessageCircle,
  Heart, Plus, Save, X, RefreshCw, Trash2,
  Search, ChevronDown, ChevronUp, Clock, User,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const EMPTY_FORM = { title: '', category: '', content: '', readTime: '', image: '', author: '' };

/* ─── Skeleton ────────────────────────────────── */
function SkeletonItem() {
  return (
    <div className="data-item" style={{ gap: 12 }}>
      <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '70%' }} />
        <div className="skeleton" style={{ height: 11, width: '50%' }} />
        <div className="skeleton" style={{ height: 11, width: '35%' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MakalaManager({ animate, user }) {
  const [makalaList, setMakalaList] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewingComments, setViewingComments] = useState(null);
  const [makalaComments, setMakalaComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const authHeader = { Authorization: `Bearer ${localStorage.getItem('adminToken')}` };

  const { showToast } = useToast();

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  /* ── Fetch ── */
  const fetchMakala = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API}/api/makala/all`);
      if (res.ok) {
        const data = await res.json();
        const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
        setMakalaList(isAdmin ? data : data.filter(item => item.user_id === user?.id));
      }
      else showToast('Imeshindwa kupakia makala.', 'error');
    } catch {
      showToast('Hitilafu ya mtandao. Jaribu tena.', 'error');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchMakala(); }, []);

  /* ── Image upload ── */
  const handleImageUpload = async (fileOrEvent) => {
    const file = fileOrEvent?.target?.files
      ? fileOrEvent.target.files[0]
      : fileOrEvent;
    if (!file) return;

    setUploadingImg(true);
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        set('image', data.url);
        showToast('Picha imepakiwa vizuri! ✓');
      } else {
        showToast('Imeshindwa kupakia picha.', 'error');
      }
    } catch {
      showToast('Hitilafu ya mtandao wakati wa kupakia picha.', 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  /* Paste image */
  const handlePaste = e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        handleImageUpload(items[i].getAsFile());
        e.preventDefault();
        break;
      }
    }
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Tafadhali jaza kichwa na maudhui ya makala.', 'error');
      return;
    }
    setLoading(true);
    try {
      const url = editingId ? `${API}/api/makala/${editingId}` : `${API}/api/makala`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchMakala();
        setFormData(EMPTY_FORM);
        setEditingId(null);
        showToast(editingId ? 'Makala imesasishwa vizuri! ✓' : 'Makala imechapishwa vizuri! ✓');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Imeshindwa kuhifadhi makala.', 'error');
      }
    } catch {
      showToast('Hitilafu ya mtandao. Jaribu tena.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Edit ── */
  const handleEdit = item => {
    setEditingId(item.id);
    setFormData({
      title: item.title || '',
      category: item.category || '',
      content: item.content || '',
      readTime: item.readTime || '',
      image: item.image || '',
      author: item.author || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Delete ── */
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Futa makala hii?\n\n"${title}"\n\nHaitaweza kurejeshwa.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API}/api/makala/${id}`, {
        method: 'DELETE', headers: authHeader,
      });
      if (res.ok) {
        fetchMakala();
        if (editingId === id) { setEditingId(null); setFormData(EMPTY_FORM); }
        showToast('Makala imefutwa kikamilifu. ✓');
      } else {
        showToast('Imeshindwa kufuta makala.', 'error');
      }
    } catch {
      showToast('Hitilafu ya mtandao.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  /* ── Comments ── */
  const handleViewComments = async id => {
    if (viewingComments === id) { setViewingComments(null); return; }
    setViewingComments(id);
    setLoadingComments(true);
    setMakalaComments([]);
    try {
      const res = await fetch(`${API}/api/makala/${id}/comments`);
      if (res.ok) setMakalaComments(await res.json());
    } catch {/* silent */ }
    finally { setLoadingComments(false); }
  };

  /* ── Read time helper ── */
  const rtNum = formData.readTime ? formData.readTime.split(' ')[0] : '';
  const rtUnit = formData.readTime ? (formData.readTime.split(' ')[1] || 'Dakika') : 'Dakika';

  /* ── Image src helper ── */
  const imgSrc = url => url?.startsWith('/') ? `${API}${url}` : url;

  const filtered = makalaList.filter(m =>
    !searchQ ||
    m.title?.toLowerCase().includes(searchQ.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchQ.toLowerCase()) ||
    m.author?.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className={`dashboard-content ${animate ? 'animate-fade-in' : ''}`}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Simamia Makala</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Andika, hariri na chapisha makala za programu
          </p>
        </div>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '9px 18px' }}
          onClick={fetchMakala}
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
              ? <><PenTool size={17} color="var(--accent)" /> Hariri Makala</>
              : <><Plus size={17} color="var(--primary)" /> Andika Makala Mpya</>}
          </h3>

          <form onSubmit={handleSubmit} noValidate>

            {/* Title */}
            <div className="form-group">
              <label>Kichwa cha Makala *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Andika kichwa hapa..."
                value={formData.title}
                onChange={e => set('title', e.target.value)}
                required
              />
            </div>

            {/* Category + Read time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Kitengo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="mf. Maisha"
                  value={formData.category}
                  onChange={e => set('category', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Muda wa Kusoma</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="mf. 4"
                    value={rtNum}
                    onChange={e => set('readTime', `${e.target.value} ${rtUnit}`.trim())}
                  />
                  <select
                    className="form-input"
                    style={{ width: 110 }}
                    value={rtUnit}
                    onChange={e => set('readTime', `${rtNum} ${e.target.value}`.trim())}
                  >
                    <option value="Dakika">Dakika</option>
                    <option value="Saa">Saa</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Author */}
            <div className="form-group">
              <label>Mwandishi</label>
              <div className="modal-input-wrap">
                <User size={14} className="modal-input-icon" />
                <input
                  type="text"
                  className="form-input modal-input"
                  placeholder="mf. Mwandishi Hodari"
                  value={formData.author}
                  onChange={e => set('author', e.target.value)}
                />
              </div>
            </div>

            {/* Cover image */}
            <div className="form-group">
              <label>Picha ya Jalada</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="https://example.com/picha.jpg"
                  value={formData.image}
                  onChange={e => set('image', e.target.value)}
                  onPaste={handlePaste}
                />
                <label className="makala-upload-btn" style={{ opacity: uploadingImg ? 0.6 : 1, pointerEvents: uploadingImg ? 'none' : 'auto' }}>
                  <UploadCloud size={15} />
                  {uploadingImg ? 'Inapakia…' : 'Pakia'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
              {formData.image && (
                <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', height: 130, border: '1px solid var(--glass-border)', position: 'relative' }}>
                  <img src={imgSrc(formData.image)} alt="Mfano" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => set('image', '')}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, padding: 4, color: '#fff', display: 'flex', cursor: 'pointer' }}
                    title="Ondoa picha"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="form-group">
              <label>Maudhui Kamili *</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 180 }}
                placeholder="Andika maudhui kamili ya makala hapa..."
                value={formData.content}
                onChange={e => set('content', e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading
                  ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Inahifadhi…</>
                  : <><Save size={15} /> {editingId ? 'Sasisha Makala' : 'Chapisha Makala'}</>}
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
              <FileText size={17} color="var(--accent)" />
              Makala Zilizochapishwa
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
              placeholder="Tafuta makala…"
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
                <FileText size={40} color="var(--border-color)" />
                <h3>{searchQ ? 'Hakuna makala inayolingana' : 'Bado hakuna makala'}</h3>
                <p>{searchQ ? 'Badilisha neno la kutafuta.' : 'Andika makala yako ya kwanza.'}</p>
              </div>
            )}

            {!fetching && filtered.map(item => (
              <div key={item.id}>
                <div
                  className="data-item"
                  style={{
                    borderLeft: editingId === item.id
                      ? '3px solid var(--primary-hover)'
                      : '3px solid transparent',
                  }}
                >
                  {item.image && (
                    <img
                      src={imgSrc(item.image)}
                      alt={item.title}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                    />
                  )}
                  <div className="data-item-content">
                    <h4>{item.title}</h4>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {item.category && <span className="badge">{item.category}</span>}
                      {item.readTime && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {item.readTime}
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Heart size={10} color="var(--danger)" /> {item.likes || 0}
                      </span>
                      {item.author && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={10} /> {item.author}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="data-item-actions">
                    <button
                      className={`action-btn ${viewingComments === item.id ? 'edit' : ''}`}
                      style={{ background: viewingComments === item.id ? undefined : 'rgba(255,255,255,0.04)', color: viewingComments === item.id ? undefined : 'var(--text-muted)' }}
                      onClick={() => handleViewComments(item.id)}
                      title="Maoni"
                    >
                      {viewingComments === item.id ? <ChevronUp size={14} /> : <MessageCircle size={14} />}
                    </button>
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(item)}
                      title="Hariri"
                    >
                      <PenTool size={14} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deleting === item.id}
                      title="Futa"
                    >
                      {deleting === item.id
                        ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                        : <Trash2 size={14} />}
                    </button>
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
                    ) : makalaComments.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Bado hakuna maoni.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {makalaComments.map(c => (
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
