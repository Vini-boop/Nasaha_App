require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80';

async function fixImages() {
  try {
    const resMakala = await pool.query(`
      UPDATE makala
      SET image = $1
      WHERE image LIKE '/uploads/%' OR image IS NULL OR image = ''
    `, [DEFAULT_IMAGE]);
    console.log(`Updated ${resMakala.rowCount} makala with broken images.`);

    const resMethali = await pool.query(`
      UPDATE methali
      SET image = $1
      WHERE image LIKE '/uploads/%' OR image IS NULL OR image = ''
    `, [DEFAULT_IMAGE]);
    console.log(`Updated ${resMethali.rowCount} methali with broken images.`);

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

fixImages();
