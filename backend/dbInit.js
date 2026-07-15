require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const dataDir = path.join(__dirname, 'data');

function readDB(name) {
  const file = path.join(dataDir, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return []; }
}

async function initDB() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    console.log('Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS dibaji, methali, makala;');

    // 1. Create Dibaji Table
    console.log('Creating dibaji table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dibaji (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        meaning TEXT NOT NULL,
        source TEXT,
        "enText" TEXT,
        "enMeaning" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 2. Create Methali Table
    console.log('Creating methali table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS methali (
        id TEXT PRIMARY KEY,
        methali TEXT NOT NULL,
        meaning TEXT NOT NULL,
        lesson TEXT,
        category TEXT,
        image TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 3. Create Makala Table
    console.log('Creating makala table...');
    await client.query(`
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
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('Altering makala table for likes and user_id...');
    await client.query('ALTER TABLE makala ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE makala ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;');
    await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;');

    console.log('Creating makala_comments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS makala_comments (
        id TEXT PRIMARY KEY,
        makala_id TEXT REFERENCES makala(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        comment TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Create Push Tokens Table
    console.log('Creating push_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        token TEXT PRIMARY KEY,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables created successfully. Starting migration from JSON...');

    // Migrate Dibaji
    const dibaji = readDB('dibaji');
    for (const d of dibaji) {
      await client.query(`
        INSERT INTO dibaji (id, text, meaning, source, "enText", "enMeaning", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [d.id, d.text, d.meaning, d.source, d.enText, d.enMeaning, new Date(d.createdAt)]);
    }
    console.log(`Migrated ${dibaji.length} dibaji.`);

    // Migrate Methali
    const methali = readDB('methali');
    for (const m of methali) {
      await client.query(`
        INSERT INTO methali (id, methali, meaning, lesson, category, image, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET image = EXCLUDED.image
      `, [m.id, m.methali, m.meaning, m.lesson, m.category, m.image, new Date(m.createdAt)]);
    }
    console.log(`Migrated ${methali.length} methali.`);

    // Migrate Makala
    const makala = readDB('makala');
    for (const mk of makala) {
      await client.query(`
        INSERT INTO makala (id, title, content, excerpt, category, author, "readTime", image, date, published, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [mk.id, mk.title, mk.content, mk.excerpt, mk.category, mk.author, mk.readTime, mk.image, mk.date, mk.published, new Date(mk.createdAt)]);
    }
    console.log(`Migrated ${makala.length} makala.`);

    console.log('Migration complete!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
  }
}

initDB();
