const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize schema
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Listings table
  db.run(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'item' or 'gig'
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      suburb TEXT NOT NULL,
      duration INTEGER NOT NULL, -- 24, 48, 72
      price REAL, -- Optional for items, gigs don't have starting price
      is16PlusFriendly BOOLEAN DEFAULT 0,
      posterId INTEGER NOT NULL,
      imageUrls TEXT, -- JSON array of strings
      status TEXT DEFAULT 'active', -- 'active', 'handshake', 'completed', 'disputed'
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (posterId) REFERENCES users(id)
    )
  `);

  // Bids table
  db.run(`
    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listingId INTEGER NOT NULL,
      bidderId INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listingId) REFERENCES listings(id),
      FOREIGN KEY (bidderId) REFERENCES users(id)
    )
  `);

  // Deals/Handshakes table
  db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listingId INTEGER NOT NULL,
      seekerId INTEGER NOT NULL,
      providerId INTEGER NOT NULL,
      swapCode TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'success', 'disputed'
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listingId) REFERENCES listings(id),
      FOREIGN KEY (seekerId) REFERENCES users(id),
      FOREIGN KEY (providerId) REFERENCES users(id)
    )
  `);

  // Disputes table
  db.run(`
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealId INTEGER NOT NULL,
      reporterId INTEGER NOT NULL,
      reason TEXT NOT NULL,
      statement TEXT,
      status TEXT DEFAULT 'open', -- 'open', 'resolved'
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealId) REFERENCES deals(id),
      FOREIGN KEY (reporterId) REFERENCES users(id)
    )
  `);
  
  // Reviews/Feedback table
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealId INTEGER NOT NULL,
      authorId INTEGER NOT NULL,
      targetId INTEGER NOT NULL,
      pointsAwarded INTEGER DEFAULT 0,
      text TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealId) REFERENCES deals(id),
      FOREIGN KEY (authorId) REFERENCES users(id),
      FOREIGN KEY (targetId) REFERENCES users(id)
    )
  `);
  // Seed initial data
  db.get('SELECT COUNT(*) as c FROM users', (err, row) => {
    if (row && row.c === 0) {
      db.run(`INSERT INTO users (fullName, phone, dob, deviceId, ubuntuPoints, homeBase, unlockedSuburbs) 
              VALUES ('Chukwudi M.', '263111', '1985-05-12', 'device1', 145, 'Burnside', '["Burnside"]')`);
      db.run(`INSERT INTO users (fullName, phone, dob, deviceId, ubuntuPoints, homeBase, unlockedSuburbs) 
              VALUES ('Nomsa D.', '263222', '1992-08-20', 'device2', 187, 'Cowdray Park', '["Cowdray Park"]')`);
      
      db.run(`INSERT INTO listings (type, title, description, category, suburb, duration, price, posterId) 
              VALUES ('item', 'PS3 Console + 4 Games', 'Great condition, 4 games included.', 'Gaming', 'Burnside', 24, 6.00, 1)`);
      db.run(`INSERT INTO listings (type, title, description, category, suburb, duration, is16PlusFriendly, posterId) 
              VALUES ('gig', 'Lawn Mowing', 'Front and back yard.', 'Gardening', 'Cowdray Park', 48, 1, 2)`);
    }
  });
});

module.exports = db;
