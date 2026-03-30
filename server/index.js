const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth & Users
app.post('/api/auth/register', (req, res) => {
  const { fullName, phone, dob, deviceId, homeBase } = req.body;
  
  // Calculate age
  const age = (new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 16) {
    return res.status(400).json({ error: 'Must be 16 or older' });
  }

  // Insert user
  db.run(
    'INSERT INTO users (fullName, phone, dob, deviceId, homeBase, unlockedSuburbs) VALUES (?, ?, ?, ?, ?, ?)',
    [fullName, phone, dob, deviceId, homeBase, JSON.stringify([homeBase])],
    function(err) {
      if (err) return res.status(400).json({ error: 'Phone or Device ID already registered' });
      res.json({ id: this.lastID, fullName, ubuntuPoints: 100, homeBase });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { phone } = req.body;
  db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'User not found' });
    res.json(row);
  });
});

app.get('/api/auth/check-name/:name', (req, res) => {
  db.get('SELECT id FROM users WHERE fullName = ?', [req.params.name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ available: !row });
  });
});

app.get('/api/users/:id', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  });
});

// Listings
app.get('/api/listings', (req, res) => {
  db.all('SELECT listings.*, users.fullName, users.ubuntuPoints, users.homeBase FROM listings JOIN users ON listings.posterId = users.id WHERE status = "active" ORDER BY listings.createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/listings/:id', (req, res) => {
  db.get('SELECT listings.*, users.fullName, users.ubuntuPoints, users.homeBase FROM listings JOIN users ON listings.posterId = users.id WHERE listings.id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Listing not found' });
    
    // Get all bids
    db.all('SELECT bids.*, users.fullName, users.ubuntuPoints FROM bids JOIN users ON bids.bidderId = users.id WHERE listingId = ? ORDER BY amount DESC', [req.params.id], (err, bids) => {
      row.bids = bids || [];
      res.json(row);
    });
  });
});

app.post('/api/listings', (req, res) => {
  const { type, title, description, category, suburb, duration, price, is16PlusFriendly, posterId, imageUrls } = req.body;
  db.run(
    'INSERT INTO listings (type, title, description, category, suburb, duration, price, is16PlusFriendly, posterId, imageUrls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [type, title, description, category, suburb, duration, price || null, is16PlusFriendly ? 1 : 0, posterId, JSON.stringify(imageUrls || [])],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Listing created via The Plug' });
    }
  );
});

app.post('/api/listings/:id/bid', (req, res) => {
  const { bidderId, amount } = req.body;
  const listingId = req.params.id;
  
  db.run(
    'INSERT INTO bids (listingId, bidderId, amount) VALUES (?, ?, ?)',
    [listingId, bidderId, amount],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Also update the listing's current price
      db.run('UPDATE listings SET price = ? WHERE id = ?', [amount, listingId], (err2) => {
        if (err2) console.error('Failed to update listing price:', err2);
        res.json({ message: 'Bid placed successfully' });
      });
    }
  );
});

// My Plugs
app.get('/api/users/:id/plugs', (req, res) => {
  const userId = req.params.id;
  const plugs = { requests: [], hustle: [] };
  
  // Hustle: Listings I posted
  db.all('SELECT * FROM listings WHERE posterId = ?', [userId], (err, rows) => {
    plugs.hustle = rows || [];
    
    // Requests: Listings I bid on
    db.all(`SELECT listings.*, bids.amount as myBid, bids.status as bidStatus 
            FROM listings 
            JOIN bids ON listings.id = bids.listingId 
            WHERE bids.bidderId = ?`, [userId], (err, rows2) => {
      plugs.requests = rows2 || [];
      res.json(plugs);
    });
  });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  db.get(`SELECT 
    (SELECT COUNT(*) FROM listings WHERE type='item' AND status='active') as activeItems,
    (SELECT COUNT(*) FROM listings WHERE type='gig' AND status='active') as activeGigs,
    (SELECT COUNT(*) FROM disputes WHERE status='open') as openDisputes
  `, (err, row) => {
    res.json(row || { activeItems: 0, activeGigs: 0, openDisputes: 0 });
  });
});

app.listen(PORT, () => {
  console.log(`The Plug Backend running on port ${PORT}`);
});
