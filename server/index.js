const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth & Users
app.post('/api/auth/register', async (req, res) => {
  const { fullName, phone, dob, deviceId, homeBase } = req.body;
  
  // Calculate age
  const age = (new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 16) {
    return res.status(400).json({ error: 'Must be 16 or older' });
  }

  try {
    const result = await db.query(
      'INSERT INTO users (fullName, phone, dob, deviceId, homeBase, unlockedSuburbs) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [fullName, phone, dob, deviceId, homeBase, JSON.stringify([homeBase])]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Phone or Device ID already registered' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/check-name/:name', async (req, res) => {
  try {
    const result = await db.query('SELECT id FROM users WHERE fullName = $1', [req.params.name]);
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listings
app.get('/api/listings', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT listings.*, users.fullName, users."ubuntuPoints", users."homeBase" 
      FROM listings 
      JOIN users ON listings.posterId = users.id 
      WHERE status = 'active' 
      ORDER BY listings.createdAt DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const listingRes = await db.query(`
      SELECT listings.*, users.fullName, users."ubuntuPoints", users."homeBase" 
      FROM listings 
      JOIN users ON listings.posterId = users.id 
      WHERE listings.id = $1
    `, [req.params.id]);

    if (listingRes.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    
    const row = listingRes.rows[0];

    // Get all bids
    const bidsRes = await db.query(`
      SELECT bids.*, users.fullName, users."ubuntuPoints" 
      FROM bids 
      JOIN users ON bids."bidderId" = users.id 
      WHERE "listingId" = $1 
      ORDER BY amount DESC
    `, [req.params.id]);

    row.bids = bidsRes.rows || [];
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/listings', async (req, res) => {
  const { type, title, description, category, suburb, duration, price, is16PlusFriendly, posterId, imageUrls } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO listings (type, title, description, category, suburb, duration, price, "is16PlusFriendly", "posterId", "imageUrls") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
      [type, title, description, category, suburb, duration, price || null, is16PlusFriendly ? true : false, posterId, JSON.stringify(imageUrls || [])]
    );
    res.json({ id: result.rows[0].id, message: 'Listing created via The Plug' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/listings/:id/bid', async (req, res) => {
  const { bidderId, amount } = req.body;
  const listingId = req.params.id;
  
  try {
    await db.query(
      'INSERT INTO bids ("listingId", "bidderId", amount) VALUES ($1, $2, $3)',
      [listingId, bidderId, amount]
    );
    
    // Also update the listing's current price
    await db.query('UPDATE listings SET price = $1 WHERE id = $2', [amount, listingId]);
    res.json({ message: 'Bid placed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// My Plugs
app.get('/api/users/:id/plugs', async (req, res) => {
  const userId = req.params.id;
  try {
    // Hustle: Listings I posted
    const hustleRes = await db.query('SELECT * FROM listings WHERE "posterId" = $1', [userId]);
    
    // Requests: Listings I bid on
    const requestsRes = await db.query(`
      SELECT listings.*, bids.amount as "myBid", bids.status as "bidStatus" 
      FROM listings 
      JOIN bids ON listings.id = bids."listingId" 
      WHERE bids."bidderId" = $1
    `, [userId]);

    res.json({
      requests: requestsRes.rows || [],
      hustle: hustleRes.rows || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM listings WHERE type='item' AND status='active') as "activeItems",
        (SELECT COUNT(*) FROM listings WHERE type='gig' AND status='active') as "activeGigs",
        (SELECT COUNT(*) FROM disputes WHERE status='open') as "openDisputes"
    `);
    res.json(result.rows[0] || { activeItems: 0, activeGigs: 0, openDisputes: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`The Plug Backend running on port ${PORT}`);
});
