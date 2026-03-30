require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Create tables if they don't exist
const initializeSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        fullName TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        dob DATE NOT NULL,
        deviceId TEXT NOT NULL,
        ubuntuPoints INTEGER DEFAULT 100,
        homeBase TEXT NOT NULL,
        unlockedSuburbs TEXT,
        role TEXT DEFAULT 'user',
        giftedTotal INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        suburb TEXT NOT NULL,
        duration INTEGER NOT NULL,
        price REAL,
        is16PlusFriendly BOOLEAN DEFAULT false,
        posterId INTEGER NOT NULL REFERENCES users(id),
        imageUrls TEXT,
        status TEXT DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        listingId INTEGER NOT NULL REFERENCES listings(id),
        bidderId INTEGER NOT NULL REFERENCES users(id),
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        listingId INTEGER NOT NULL REFERENCES listings(id),
        seekerId INTEGER NOT NULL REFERENCES users(id),
        providerId INTEGER NOT NULL REFERENCES users(id),
        swapCode TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id SERIAL PRIMARY KEY,
        dealId INTEGER NOT NULL REFERENCES deals(id),
        reporterId INTEGER NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        statement TEXT,
        status TEXT DEFAULT 'open',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        dealId INTEGER NOT NULL REFERENCES deals(id),
        authorId INTEGER NOT NULL REFERENCES users(id),
        targetId INTEGER NOT NULL REFERENCES users(id),
        pointsAwarded INTEGER DEFAULT 0,
        text TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Postgres Schema Initialized');
  } catch (err) {
    console.error('Schema initialization failed:', err);
  } finally {
    client.release();
  }
};

if (process.env.DATABASE_URL) {
  initializeSchema();
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
