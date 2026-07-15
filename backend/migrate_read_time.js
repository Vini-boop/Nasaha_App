const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const makalas = await pool.query('SELECT * FROM makala');
    for (let m of makalas.rows) {
      if (!m.readTime) continue;
      let newReadTime = m.readTime.trim();
      
      if (newReadTime.includes('min')) {
        newReadTime = newReadTime.replace('min', 'Dakika');
      } else if (newReadTime.includes('hr') || newReadTime.includes('hour')) {
        newReadTime = newReadTime.replace(/hrs?|hours?/, 'Saa');
      } else if (!newReadTime.includes('Dakika') && !newReadTime.includes('Saa')) {
        // if it's just a number like "4"
        const numMatch = newReadTime.match(/\d+/);
        if (numMatch) {
            newReadTime = numMatch[0] + ' Dakika';
        } else {
            newReadTime = '4 Dakika'; // fallback
        }
      }
      
      await pool.query('UPDATE makala SET "readTime" = $1 WHERE id = $2', [newReadTime, m.id]);
      console.log(`Updated ${m.title} to readTime: ${newReadTime}`);
    }
    console.log("Migration complete!");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
