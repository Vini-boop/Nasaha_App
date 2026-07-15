/**
 * NasahaApp REST API Backend
 * Connected to PostgreSQL (Neon DB)
 */
require('dotenv').config();
const express = require('express');
// Triggering nodemon restart to load new .env variables
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();
const { sendAdminNotification, sendCredentialsEmail, sendCommentNotification, sendLikeMilestoneNotification, sendDibajiCommentNotification } = require('./emailService');
const { getOrComputeRotation } = require('./dibajiRotation');
const authLib = require('./middleware/auth');
const verifyTokenBase = authLib.verifyToken;

const verifyToken = async (req, res, next) => {
  verifyTokenBase(req, res, () => {
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admins only' });
  }
};
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

// ── Database Setup ────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query(`
  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    "adminEmail" TEXT,
    "emailAlertsEnabled" BOOLEAN DEFAULT false
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'WRITER',
    current_session TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session TEXT;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
  
  ALTER TABLE dibaji ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
  ALTER TABLE dibaji ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

  CREATE TABLE IF NOT EXISTS dibaji_rotation (
    id TEXT PRIMARY KEY,
    active_date TEXT NOT NULL,
    sunday_date TEXT NOT NULL,
    active_dibaji JSONB NOT NULL,
    history JSONB NOT NULL DEFAULT '[]',
    queue JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS dibaji_comments (
    id TEXT PRIMARY KEY,
    dibaji_id TEXT REFERENCES dibaji(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS makala (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category TEXT,
    author TEXT,
    "readTime" TEXT,
    image TEXT,
    date TEXT,
    published BOOLEAN DEFAULT true,
    likes INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE makala ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
  ALTER TABLE makala ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  
  -- Methali table might not be explicitly created in this block but we should alter it anyway
  ALTER TABLE methali ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  
  CREATE TABLE IF NOT EXISTS makala_comments (
    id TEXT PRIMARY KEY,
    makala_id TEXT REFERENCES makala(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO settings (id, "adminEmail", "emailAlertsEnabled") 
  VALUES ('global', 'vinmarmak21@gmail.com', true) 
  ON CONFLICT (id) DO NOTHING;
  -- Migrate any installation still using the old placeholder address
  UPDATE settings 
  SET "adminEmail" = 'vinmarmak21@gmail.com', "emailAlertsEnabled" = true
  WHERE id = 'global' AND "adminEmail" = 'admin@nasaha.app';
`).then(async () => {
  const adminRes = await pool.query("SELECT * FROM users WHERE role = 'ADMIN'");
  if (adminRes.rows.length === 0) {
    const hashed = await bcrypt.hash('Simbariunum10', 10);
    await pool.query(
      'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), 'Admin', 'vinmarmak21@gmail.com', hashed, 'ADMIN']
    );
    console.log('Seeded default admin user');
  }
}).catch(err => console.error("Error creating tables:", err));

async function createNotification(message, type, userId = null) {
  try {
    const nid = uuidv4();
    await pool.query('INSERT INTO notifications (id, message, type, user_id) VALUES ($1, $2, $3, $4)', [nid, message, type, userId]);
    await sendAdminNotification('NasahaApp Alert: ' + type, message);
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

async function sendMassPushNotification(title, body, type, id) {
  try {
    const tokensRes = await pool.query('SELECT token FROM push_tokens');
    if (tokensRes.rows.length === 0) return;
    let messages = [];
    for (let row of tokensRes.rows) {
      messages.push({
        to: row.token,
        sound: 'default',
        title: title,
        body: body,
        data: { type, id },
      });
    }
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Push chunk error:', error);
      }
    }
  } catch (err) {
    console.error("Error sending push notifications:", err);
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

// ── File Upload Endpoint ──────────────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const dibajiCount = await pool.query('SELECT COUNT(*) FROM dibaji');
    const methaliCount = await pool.query('SELECT COUNT(*) FROM methali');
    const makalaCount = await pool.query('SELECT COUNT(*) FROM makala');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      counts: {
        dibaji: parseInt(dibajiCount.rows[0].count, 10),
        methali: parseInt(methaliCount.rows[0].count, 10),
        makala: parseInt(makalaCount.rows[0].count, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DIBAJI
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/dibaji/current
 *
 * Returns the full rotation state for today (Africa/Nairobi timezone):
 *   activeDibaji  — the single Dibaji active for the current 24-hour day
 *   history       — completed Dibajis from earlier this week (oldest last)
 *   queue         — all Dibajis generated so far this week
 *   cycleStart    — always "Sunday"
 *   timezone      — always "Africa/Nairobi"
 *   sundayDate    — ISO date of this week's cycle start
 *
 * Both the admin panel and the mobile app must call this endpoint.
 * No rotation logic should live on the client side.
 *
 * The result is cache-keyed by date so it refreshes automatically at midnight.
 */
app.get('/api/dibaji/current', async (req, res) => {
  try {
    // Use a date-specific cache key so the cache auto-invalidates at midnight
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
    const cacheKey = `dibaji_current_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const rotation = await getOrComputeRotation(pool);
    // Cache until end-of-day: max 24 h, but keyed by date so safe
    cache.set(cacheKey, rotation, 86400);
    res.json(rotation);
  } catch (err) {
    console.error('Error computing dibaji rotation:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dibaji', async (req, res) => {
  try {
    const cached = cache.get('dibaji');
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM dibaji ORDER BY "createdAt" DESC');
    cache.set('dibaji', result.rows);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dibaji/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dibaji WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dibaji', verifyToken, async (req, res) => {
  const { text, meaning, source, enText, enMeaning } = req.body;
  if (!text || !meaning) return res.status(400).json({ error: 'text and meaning are required' });

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  try {
    const result = await pool.query(`
      INSERT INTO dibaji (id, text, meaning, source, "enText", "enMeaning", "createdAt", user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, text.trim(), meaning.trim(), (source || 'Dibaji za leo').trim(), enText?.trim() || '', enMeaning?.trim() || '', createdAt, req.user.id]);
    cache.del('dibaji');
    // Invalidate date-keyed rotation cache so the new dibaji pool is seen immediately
    cache.keys().forEach(k => { if (k.startsWith('dibaji_current_')) cache.del(k); });
    await createNotification(`Dibaji mpya imeongezwa: "${text.substring(0, 50)}..."`, 'DIBAJI_ADDED');
    sendMassPushNotification('Dibaji Mpya Imeongezwa!', text.substring(0, 100) + (text.length > 100 ? '...' : ''), 'dibaji_added', id).catch(err => console.error(err));
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/dibaji/:id', verifyToken, async (req, res) => {
  const { text, meaning, source, enText, enMeaning } = req.body;
  try {
    if (req.user.role !== 'ADMIN') {
      const ownerCheck = await pool.query('SELECT user_id FROM dibaji WHERE id = $1', [req.params.id]);
      if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      if (ownerCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Huruhusiwi kuhariri dibaji hii.' });
      }
    }

    const result = await pool.query(`
      UPDATE dibaji 
      SET text = COALESCE($1, text), meaning = COALESCE($2, meaning), source = COALESCE($3, source), "enText" = COALESCE($4, "enText"), "enMeaning" = COALESCE($5, "enMeaning")
      WHERE id = $6
      RETURNING *
    `, [text, meaning, source, enText, enMeaning, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cache.del('dibaji');
    cache.keys().forEach(k => { if (k.startsWith('dibaji_current_')) cache.del(k); });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/dibaji/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const ownerCheck = await pool.query('SELECT user_id FROM dibaji WHERE id = $1', [req.params.id]);
      if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      if (ownerCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Huruhusiwi kufuta dibaji hii.' });
      }
    }

    const result = await pool.query('DELETE FROM dibaji WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cache.del('dibaji');
    cache.keys().forEach(k => { if (k.startsWith('dibaji_current_')) cache.del(k); });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// METHALI
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/methali', async (req, res) => {
  try {
    const cached = cache.get('methali');
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM methali ORDER BY "createdAt" DESC');
    cache.set('methali', result.rows);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/methali/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM methali WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/methali', verifyToken, async (req, res) => {
  const { methali, meaning, lesson, category, image } = req.body;
  if (!methali || !meaning) return res.status(400).json({ error: 'methali and meaning are required' });

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  try {
    const result = await pool.query(`
      INSERT INTO methali (id, methali, meaning, lesson, category, image, "createdAt", user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, methali.trim(), meaning.trim(), lesson?.trim() || '', category?.trim() || 'Jumla', image?.trim() || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', createdAt, req.user.id]);
    cache.del('methali');
    await createNotification(`Methali mpya imeongezwa: "${methali}"`, 'METHALI_ADDED');
    sendMassPushNotification('Methali Mpya Imeongezwa!', methali.substring(0, 100) + (methali.length > 100 ? '...' : ''), 'methali_added', id).catch(err => console.error(err));
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/methali/:id', verifyToken, async (req, res) => {
  const { methali, meaning, lesson, category, image } = req.body;
  try {
    const result = await pool.query(`
      UPDATE methali 
      SET methali = COALESCE($1, methali), meaning = COALESCE($2, meaning), lesson = COALESCE($3, lesson), category = COALESCE($4, category), image = COALESCE($5, image)
      WHERE id = $6
      RETURNING *
    `, [methali, meaning, lesson, category, image, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cache.del('methali');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/methali/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM methali WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cache.del('methali');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// MAKALA
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/makala', async (req, res) => {
  try {
    const cached = cache.get('makala_published');
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM makala WHERE published = true ORDER BY "createdAt" DESC');
    cache.set('makala_published', result.rows);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/makala/all', async (req, res) => {
  try {
    const cached = cache.get('makala_all');
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM makala ORDER BY "createdAt" DESC');
    cache.set('makala_all', result.rows);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/makala/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM makala WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/makala', verifyToken, async (req, res) => {
  const { title, content, category, author, readTime, excerpt, image } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  try {
    const result = await pool.query(`
      INSERT INTO makala (id, title, content, excerpt, category, author, "readTime", image, date, published, "createdAt", user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [id, title.trim(), content.trim(), excerpt?.trim() || content.trim().slice(0, 120) + '...', category?.trim() || 'Jumla', author?.trim() || 'Mwandishi', readTime?.trim() || '3 min', image?.trim() || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80', dateStr, true, createdAt, req.user.id]);
    cache.del(['makala_published', 'makala_all']);
    await createNotification(`Makala mpya imeongezwa: "${title}"`, 'MAKALA_ADDED');
    sendMassPushNotification('Makala Mpya Imeongezwa!', title.trim(), 'new_makala', id).catch(err => console.error(err));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push-tokens', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });
  if (!Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }

  try {
    await pool.query('INSERT INTO push_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING', [token]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/makala/:id', verifyToken, async (req, res) => {
  const { title, content, category, author, readTime, excerpt, image, published } = req.body;
  try {
    const result = await pool.query(`
      UPDATE makala 
      SET title = COALESCE($1, title), content = COALESCE($2, content), excerpt = COALESCE($3, excerpt), category = COALESCE($4, category), author = COALESCE($5, author), "readTime" = COALESCE($6, "readTime"), image = COALESCE($7, image), published = COALESCE($8, published)
      WHERE id = $9
      RETURNING *
    `, [title, content, excerpt, category, author, readTime, image, published, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cache.del(['makala_published', 'makala_all']);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/makala/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM makala WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cache.del(['makala_published', 'makala_all']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LIKES & COMMENTS
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/makala/:id/like', async (req, res) => {
  try {
    const makalaId = req.params.id;
    const result = await pool.query(
      `UPDATE makala SET likes = likes + 1 WHERE id = $1
       RETURNING title, likes, user_id, author`,
      [makalaId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Makala not found' });

    const { title, likes, user_id, author } = result.rows[0];
    cache.del(['makala_published', 'makala_all']);

    if (likes === 1 || likes % 10 === 0) {
      const message = `Makala "${title}" imefikisha likes ${likes}!`;
      await createNotification(message, 'makala_like', user_id);

      // Email the writer at every multiple of 10
      if (likes % 10 === 0) {
        // Prefer user_id FK; fall back to matching by author name
        const writerRes = user_id
          ? await pool.query('SELECT email, name FROM users WHERE id = $1', [user_id])
          : await pool.query('SELECT email, name FROM users WHERE name = $1 LIMIT 1', [author]);

        if (writerRes.rows.length > 0) {
          const { email, name } = writerRes.rows[0];
          await sendLikeMilestoneNotification(email, name, title, likes, 'makala');
        }
      }
    }

    res.json({ likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/makala/:id/comments', async (req, res) => {
  try {
    const makalaId = req.params.id;
    const result = await pool.query(
      'SELECT * FROM makala_comments WHERE makala_id = $1 ORDER BY "createdAt" DESC',
      [makalaId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/makala/:id/comments', async (req, res) => {
  try {
    const makalaId = req.params.id;
    let { user_name, comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Comment is required' });
    if (!user_name || user_name.trim() === '') user_name = 'Msomaji';

    // Verify makala exists
    const mRes = await pool.query(`
      SELECT m.title, m.author, m.user_id, u.email as author_email, u.name as author_name
      FROM makala m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [makalaId]);
    if (mRes.rows.length === 0) return res.status(404).json({ error: 'Makala not found' });

    const commentId = uuidv4();
    const result = await pool.query(
      'INSERT INTO makala_comments (id, makala_id, user_name, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [commentId, makalaId, user_name, comment]
    );

    const { title, author, user_id: makalaUserId } = mRes.rows[0];
    let author_email = mRes.rows[0].author_email;
    let author_name = mRes.rows[0].author_name || author || 'Mwandishi';

    // Fallback: look up writer by author name if user_id FK was not set
    if (!author_email && author) {
      const fallback = await pool.query(
        'SELECT email, name FROM users WHERE name = $1 LIMIT 1',
        [author]
      );
      if (fallback.rows.length > 0) {
        author_email = fallback.rows[0].email;
        author_name = fallback.rows[0].name;
      }
    }

    const message = `Maoni mapya kwenye makala "${title}" kutoka kwa ${user_name}.`;
    await createNotification(message, 'makala_comment', makalaUserId);

    if (author_email) {
      await sendCommentNotification(author_email, author_name, title, user_name, comment);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LIKES & COMMENTS (DIBAJI)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/dibaji/:id/like', async (req, res) => {
  try {
    const dibajiId = req.params.id;
    const result = await pool.query(
      `UPDATE dibaji SET likes = likes + 1 WHERE id = $1
       RETURNING text, likes, user_id, source`,
      [dibajiId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dibaji not found' });

    const { text, likes, user_id, source } = result.rows[0];
    cache.del(['dibaji']);

    if (likes === 1 || likes % 10 === 0) {
      const excerpt = text.substring(0, 40) + (text.length > 40 ? '...' : '');
      const message = `Dibaji "${excerpt}" imefikisha likes ${likes}!`;
      await createNotification(message, 'dibaji_like', user_id);

      // Email the writer at every multiple of 10
      if (likes % 10 === 0) {
        // Prefer user_id FK; fall back to matching by source (writer name)
        const writerRes = user_id
          ? await pool.query('SELECT email, name FROM users WHERE id = $1', [user_id])
          : await pool.query('SELECT email, name FROM users WHERE name = $1 LIMIT 1', [source]);

        if (writerRes.rows.length > 0) {
          const { email, name } = writerRes.rows[0];
          await sendLikeMilestoneNotification(email, name, excerpt, likes, 'dibaji');
        }
      }
    }

    res.json({ likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dibaji/:id/comments', async (req, res) => {
  try {
    const dibajiId = req.params.id;
    const result = await pool.query(
      'SELECT * FROM dibaji_comments WHERE dibaji_id = $1 ORDER BY "createdAt" DESC',
      [dibajiId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dibaji/:id/comments', async (req, res) => {
  try {
    const dibajiId = req.params.id;
    let { user_name, comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Comment is required' });
    if (!user_name || user_name.trim() === '') user_name = 'Msomaji';

    const mRes = await pool.query(`
      SELECT d.text, d.source, d.user_id, u.email AS author_email, u.name AS author_name
      FROM dibaji d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = $1
    `, [dibajiId]);
    if (mRes.rows.length === 0) return res.status(404).json({ error: 'Dibaji not found' });

    const commentId = uuidv4();
    const result = await pool.query(
      'INSERT INTO dibaji_comments (id, dibaji_id, user_name, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [commentId, dibajiId, user_name, comment]
    );

    const { text, source, user_id: dibajiUserId } = mRes.rows[0];
    let author_email = mRes.rows[0].author_email;
    let writerName = mRes.rows[0].author_name || 'Mwandishi';
    const excerpt = text.substring(0, 40) + (text.length > 40 ? '...' : '');

    // Fallback: look up writer by source (writer name) if user_id FK was not set
    if (!author_email && source) {
      const fallback = await pool.query(
        'SELECT email, name FROM users WHERE name = $1 LIMIT 1',
        [source]
      );
      if (fallback.rows.length > 0) {
        author_email = fallback.rows[0].email;
        writerName = fallback.rows[0].name;
      }
    }

    const message = `Maoni mapya kwenye dibaji "${excerpt}" kutoka kwa ${user_name}.`;
    await createNotification(message, 'dibaji_comment', dibajiUserId);

    // Notify the writer one-on-one
    if (author_email) {
      await sendDibajiCommentNotification(author_email, writerName, excerpt, user_name, comment);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS & NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM settings WHERE id = 'global'");
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', verifyToken, requireAdmin, async (req, res) => {
  const { adminEmail, emailAlertsEnabled } = req.body;
  try {
    const result = await pool.query(`
      UPDATE settings 
      SET "adminEmail" = COALESCE($1, "adminEmail"), "emailAlertsEnabled" = COALESCE($2, "emailAlertsEnabled")
      WHERE id = 'global'
      RETURNING *
    `, [adminEmail, emailAlertsEnabled]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const query = isAdmin 
      ? 'SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT 50'
      : 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY "createdAt" DESC LIMIT 50';
    const params = isAdmin ? [] : [req.user.id];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    if (isAdmin) {
      await pool.query('UPDATE notifications SET read = true WHERE read = false');
    } else {
      await pool.query('UPDATE notifications SET read = true WHERE read = false AND user_id = $1', [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public-notifications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, message, type, "createdAt" 
      FROM notifications 
      WHERE type IN ('MAKALA_ADDED', 'DIBAJI_ADDED', 'METHALI_ADDED', 'ADMIN_ANNOUNCEMENT')
      ORDER BY "createdAt" DESC 
      LIMIT 30
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/announcement', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // 1. Save to database
    await createNotification(`Tangazo: "${message.substring(0, 50)}..."`, 'ADMIN_ANNOUNCEMENT');
    sendMassPushNotification('Tangazo Kutoka Kwa Msimamizi', message.substring(0, 100) + (message.length > 100 ? '...' : ''), 'admin_announcement', null).catch(err => console.error(err));

    res.json({ message: 'Tangazo limetumwa kikamilifu.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION & USERS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, "createdAt" FROM users ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', verifyToken, requireAdmin, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  try {
    // Generate password in format WRT026-[4 random digits]
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const password = `WRT026-${randomDigits}`;
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const result = await pool.query(
      'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, "createdAt"',
      [id, name, email, hashed, 'WRITER']
    );

    await sendCredentialsEmail(email, name, password);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique_violation for email
      res.status(400).json({ error: 'User with this email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
      { expiresIn: '24h' }
    );

    delete user.password;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, "createdAt" FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 NasahaApp API running on http://localhost:${PORT}`);
  console.log(`   Connected to PostgreSQL Database`);
  console.log(`   Health:  GET  /api/health`);
  console.log(`   Dibaji:  GET|POST|PUT|DELETE /api/dibaji`);
  console.log(`   Methali: GET|POST|PUT|DELETE /api/methali`);
  console.log(`   Makala:  GET|POST|PUT|DELETE /api/makala\n`);
});
