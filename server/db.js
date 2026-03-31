require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const USE_POSTGRES = !!process.env.DATABASE_URL;

// ─── SQLite setup (local dev) ───────────────────────────────────────────────
let sqliteDb;

if (!USE_POSTGRES) {
  const dbPath = path.join(__dirname, 'database.sqlite');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('SQLite error:', err);
    else console.log('Using SQLite for local development');
  });

  // Enable WAL mode for better concurrency
  sqliteDb.run('PRAGMA journal_mode=WAL');

  // Create tables
  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      dob TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      ubuntuPoints INTEGER DEFAULT 100,
      homeBase TEXT NOT NULL,
      unlockedSuburbs TEXT,
      role TEXT DEFAULT 'user',
      giftedTotal INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      suburb TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price REAL,
      is16PlusFriendly INTEGER DEFAULT 0,
      posterId INTEGER NOT NULL,
      imageUrls TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listingId INTEGER NOT NULL,
      bidderId INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listingId INTEGER NOT NULL,
      seekerId INTEGER NOT NULL,
      providerId INTEGER NOT NULL,
      swapCode TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealId INTEGER NOT NULL,
      reporterId INTEGER NOT NULL,
      reason TEXT NOT NULL,
      statement TEXT,
      status TEXT DEFAULT 'open',
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealId INTEGER NOT NULL,
      authorId INTEGER NOT NULL,
      targetId INTEGER NOT NULL,
      pointsAwarded INTEGER DEFAULT 0,
      text TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )`);

    console.log('SQLite Schema Initialized');
  });
}

// ─── PostgreSQL setup (Render production) ──────────────────────────────────
let pgPool;

if (USE_POSTGRES) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Initialize PG schema
  (async () => {
    const client = await pgPool.connect();
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
  })();
}

// ─── Unified query function ─────────────────────────────────────────────────
// Translates $1,$2 style params to ? for SQLite
function query(text, params = []) {
  if (USE_POSTGRES) {
    return pgPool.query(text, params);
  }

  return new Promise((resolve, reject) => {
    // Convert Postgres $1,$2 placeholders to SQLite ?
    const sqliteText = text.replace(/\$\d+/g, '?');

    // Determine if SELECT or mutating
    const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      sqliteDb.all(sqliteText, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows: rows || [] });
      });
    } else {
      sqliteDb.run(sqliteText, params, function (err) {
        if (err) reject(err);
        else resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
      });
    }
  });
}

module.exports = { query, pool: pgPool || sqliteDb };
