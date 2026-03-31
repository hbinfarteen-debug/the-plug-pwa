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
  const { fullname, phone, dob, deviceid, homebase, password } = req.body;
  
  try {
    const result = await db.query(
      'INSERT INTO users (fullname, phone, dob, deviceid, homebase, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [fullname, phone, dob, deviceid, homebase, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Phone or Device ID already registered' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });
    
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/check-name/:name', async (req, res) => {
  try {
    const result = await db.query('SELECT id FROM users WHERE fullname = $1', [req.params.name]);
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT id, fullname, fullname as "fullName", homebase, homebase as "homeBase", ubuntupoints, ubuntupoints as "ubuntuPoints" FROM users WHERE id = $1', [req.params.id]);
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
      SELECT listings.*, 
             listings."posterId" as "posterId", 
             listings."imageUrls" as "imageUrls", 
             listings."is16PlusFriendly" as "is16PlusFriendly", 
             listings."createdAt" as "createdAt",
             users.fullname, users.ubuntupoints, users.homebase 
      FROM listings 
      JOIN users ON listings."posterId" = users.id 
      WHERE status = 'active' 
      ORDER BY listings."createdAt" DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const listingRes = await db.query(`
      SELECT listings.*, 
             listings."posterId" as "posterId", 
             listings."imageUrls" as "imageUrls", 
             listings."is16PlusFriendly" as "is16PlusFriendly", 
             listings."createdAt" as "createdAt",
             users.fullname, users.ubuntupoints, users.homebase 
      FROM listings 
      JOIN users ON listings."posterId" = users.id 
      WHERE listings.id = $1
    `, [req.params.id]);

    if (listingRes.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    
    const row = listingRes.rows[0];

    // Get all bids
    const bidsRes = await db.query(`
      SELECT bids.*, 
             bids."listingId" as "listingId", 
             bids."bidderId" as "bidderId", 
             bids."createdAt" as "createdAt",
             users.fullname, users.ubuntupoints 
      FROM bids 
      JOIN users ON bids."bidderId" = users.id 
      WHERE bids."listingId" = $1 
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
      SELECT listings.*, 
             listings."posterId" as "posterId",
             bids.amount as "myBid", 
             bids.status as "bidStatus" 
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

// Messaging
app.get('/api/chats/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query(`
      SELECT chats.*, 
             chats."listingId" as "listingId",
             chats."buyerId" as "buyerId",
             chats."sellerId" as "sellerId",
             chats."lastMsg" as "lastMsg",
             chats."updatedAt" as "updatedAt",
             u1.fullname as "buyerName", 
             u2.fullname as "sellerName",
             l.title as "listingTitle"
      FROM chats
      JOIN users u1 ON chats."buyerId" = u1.id
      JOIN users u2 ON chats."sellerId" = u2.id
      LEFT JOIN listings l ON chats."listingId" = l.id
      WHERE "buyerId" = $1 OR "sellerId" = $1
      ORDER BY chats."updatedAt" DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats', async (req, res) => {
  const { listingId, buyerId, sellerId } = req.body;
  try {
    // Check if chat exists
    const existing = await db.query(
      'SELECT id FROM chats WHERE "listingId" = $1 AND "buyerId" = $2 AND "sellerId" = $3',
      [listingId, buyerId, sellerId]
    );
    
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    const result = await db.query(
      'INSERT INTO chats ("listingId", "buyerId", "sellerId") VALUES ($1, $2, $3) RETURNING id',
      [listingId, buyerId, sellerId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT messages.*, 
             messages."chatId" as "chatId",
             messages."senderId" as "senderId",
             messages."createdAt" as "createdAt"
      FROM messages 
      WHERE "chatId" = $1 
      ORDER BY messages."createdAt" ASC
    `, [req.params.chatId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  const { chatId, senderId, text } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO messages ("chatId", "senderId", text) VALUES ($1, $2, $3) RETURNING *',
      [chatId, senderId, text]
    );
    
    // Update last message in chat
    await db.query(
      'UPDATE chats SET "lastMsg" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [text, chatId]
    );
    
    res.json(result.rows[0]);
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
