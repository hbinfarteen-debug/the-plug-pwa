const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const USE_POSTGRES = !!process.env.DATABASE_URL;

// ─── SQLite setup (local dev) ───────────────────────────────────────────────
let sqliteDb;
let sqlite3;

function initSqlite() {
  if (sqliteDb) return sqliteDb;
  
  try {
    sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'database.sqlite');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('SQLite error:', err);
      else console.log('Using SQLite for local development');
    });

    sqliteDb.run('PRAGMA journal_mode=WAL');
    
    // Initialize schema synchronously (simple tables)
    sqliteDb.serialize(() => {
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        dob TEXT NOT NULL,
        deviceid TEXT NOT NULL,
        ubuntupoints INTEGER DEFAULT 100,
        homebase TEXT NOT NULL,
        unlockedsuburbs TEXT,
        role TEXT DEFAULT 'user',
        giftedtotal INTEGER DEFAULT 0,
        password TEXT,
        createdat TEXT DEFAULT (datetime('now'))
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
        is16plusfriendly INTEGER DEFAULT 0,
        is_boosted INTEGER DEFAULT 0,
        boost_expires_at TEXT,
        posterid INTEGER NOT NULL,
        imageurls TEXT,
        status TEXT DEFAULT 'active',
        createdat TEXT DEFAULT (datetime('now'))
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listingid INTEGER NOT NULL,
        bidderid INTEGER NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        createdat TEXT DEFAULT (datetime('now'))
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listingid INTEGER NOT NULL,
        seekerid INTEGER NOT NULL,
        providerid INTEGER NOT NULL,
        swapcode TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        createdat TEXT DEFAULT (datetime('now'))
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS disputes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dealid INTEGER NOT NULL,
        reporterid INTEGER NOT NULL,
        reason TEXT NOT NULL,
        statement TEXT,
        status TEXT DEFAULT 'open',
        createdat TEXT DEFAULT (datetime('now'))
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dealid INTEGER NOT NULL REFERENCES deals(id),
        authorid INTEGER NOT NULL REFERENCES users(id),
        targetid INTEGER NOT NULL REFERENCES users(id),
        pointsawarded INTEGER DEFAULT 0,
        text TEXT,
        createdat TEXT DEFAULT (datetime('now'))
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listingid INTEGER REFERENCES listings(id),
        buyerid INTEGER REFERENCES users(id),
        sellerid INTEGER REFERENCES users(id),
        lastmsg TEXT,
        updatedat TEXT DEFAULT (datetime('now'))
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatid INTEGER REFERENCES chats(id),
        senderid INTEGER REFERENCES users(id),
        text TEXT NOT NULL,
        createdat TEXT DEFAULT (datetime('now'))
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        listing_id INTEGER REFERENCES listings(id),
        amount REAL NOT NULL,
        type TEXT DEFAULT 'boost',
        status TEXT DEFAULT 'pending',
        proof_code TEXT,
        paynow_reference TEXT,
        poll_url TEXT,
        createdat TEXT DEFAULT (datetime('now'))
      )`);
      console.log('SQLite Schema Initialized');
    });
    return sqliteDb;
  } catch (err) {
    console.error('CRITICAL: Failed to load sqlite3 native module.');
    console.error('Render environment (Linux) GLIBC mismatch detected.');
    console.error('FIX: Add DATABASE_URL to Render environment variables.');
    throw new Error('Database unavailable: SQLite failed to load and Postgres is not configured.');
  }
}

// ─── PostgreSQL setup (Render production) ──────────────────────────────────
let pgPool;

if (USE_POSTGRES) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  (async () => {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          fullname TEXT NOT NULL,
          phone TEXT UNIQUE NOT NULL,
          dob DATE NOT NULL,
          deviceid TEXT NOT NULL,
          ubuntupoints INTEGER DEFAULT 100,
          homebase TEXT NOT NULL,
          unlockedsuburbs TEXT,
          role TEXT DEFAULT 'user',
          giftedtotal INTEGER DEFAULT 0,
          password TEXT,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
          is16plusfriendly BOOLEAN DEFAULT false,
          is_boosted BOOLEAN DEFAULT false,
          boost_expires_at TIMESTAMP,
          posterid INTEGER NOT NULL REFERENCES users(id),
          imageurls TEXT,
          status TEXT DEFAULT 'active',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS bids (
          id SERIAL PRIMARY KEY,
          listingid INTEGER NOT NULL REFERENCES listings(id),
          bidderid INTEGER NOT NULL REFERENCES users(id),
          amount REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS deals (
          id SERIAL PRIMARY KEY,
          listingid INTEGER NOT NULL REFERENCES listings(id),
          seekerid INTEGER NOT NULL REFERENCES users(id),
          providerid INTEGER NOT NULL REFERENCES users(id),
          swapcode TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS disputes (
          id SERIAL PRIMARY KEY,
          dealid INTEGER NOT NULL REFERENCES deals(id),
          reporterid INTEGER NOT NULL REFERENCES users(id),
          reason TEXT NOT NULL,
          statement TEXT,
          status TEXT DEFAULT 'open',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          dealid INTEGER NOT NULL REFERENCES deals(id),
          authorid INTEGER NOT NULL REFERENCES users(id),
          targetid INTEGER NOT NULL REFERENCES users(id),
          pointsawarded INTEGER DEFAULT 0,
          text TEXT,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS chats (
          id SERIAL PRIMARY KEY,
          listingid INTEGER REFERENCES listings(id),
          buyerid INTEGER REFERENCES users(id),
          sellerid INTEGER REFERENCES users(id),
          lastmsg TEXT,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          chatid INTEGER REFERENCES chats(id),
          senderid INTEGER REFERENCES users(id),
          text TEXT NOT NULL,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          listing_id INTEGER REFERENCES listings(id),
          amount REAL NOT NULL,
          type TEXT DEFAULT 'boost',
          status TEXT DEFAULT 'pending',
          proof_code TEXT,
          paynow_reference TEXT,
          poll_url TEXT,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Migrations for existing deployments
      try {
        await client.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false`);
        await client.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP`);
        await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'boost'`);
        await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_code TEXT`);
        await client.query(`ALTER TABLE payments ALTER COLUMN listing_id DROP NOT NULL`);
      } catch (e) {
        console.error('Migration notice:', e.message);
      }
      
      console.log('Postgres Schema Initialized (Lowercase)');
    } catch (err) {
      console.error('Schema initialization failed:', err);
    } finally {
      client.release();
    }
  })();
}

function query(text, params = []) {
  if (USE_POSTGRES) {
    return pgPool.query(text, params);
  }

  return new Promise((resolve, reject) => {
    const db = initSqlite();
    const sqliteText = text.replace(/\$\d+/g, '?');
    const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      db.all(sqliteText, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows: rows || [] });
      });
    } else {
      db.run(sqliteText, params, function (err) {
        if (err) reject(err);
        else resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
      });
    }
  });
}

module.exports = { query, pool: pgPool || sqliteDb };
