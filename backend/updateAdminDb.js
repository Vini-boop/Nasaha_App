require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateAdmin() {
  try {
    const newEmail = 'vinmarmak21@gmail.com';
    const newPassword = 'Simbariunum10';
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update existing admin or insert if not exists
    const adminRes = await pool.query("SELECT * FROM users WHERE role = 'ADMIN'");
    if (adminRes.rows.length > 0) {
      // Update all admins to this new credential (assuming there's only 1)
      await pool.query(
        "UPDATE users SET email = $1, password = $2 WHERE role = 'ADMIN'",
        [newEmail, hashed]
      );
      console.log("Successfully updated existing ADMIN credentials in the database.");
    } else {
      console.log("No ADMIN found. Seed will handle it on next start.");
    }
  } catch (err) {
    console.error("Error updating admin:", err);
  } finally {
    pool.end();
  }
}

updateAdmin();
