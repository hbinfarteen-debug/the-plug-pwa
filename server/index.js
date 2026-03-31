const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { Paynow } = require('paynow');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Paynow
const paynow = new Paynow(
  process.env.PAYNOW_ID || '11776', 
  process.env.PAYNOW_KEY || 'cb078e20-3eb6-4c7b-944d-5c6c2b186fc9'
);
// In a real production setup, resultUrl should be a fully qualified domain e.g. https://your-render-app.com/api/payments/update-status
paynow.resultUrl = process.env.PAYNOW_RESULT_URL || 'http://localhost:3001/api/payments/update-status';
paynow.returnUrl = process.env.PAYNOW_RETURN_URL || 'http://localhost:5173/home';

app.use(cors());
app.use(express.json());

// Africa's Talking setup (sandbox mode until real keys provided)
const AfricasTalking = require('africastalking');
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AT_API_KEY || 'your-sandbox-key';
const atClient = AfricasTalking({ username: AT_USERNAME, apiKey: AT_API_KEY });
const atSMS = atClient.SMS;

// Helper: generate 6-digit OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// Auth & Users
app.post('/api/auth/register', async (req, res) => {
  const { fullname, phone, dob, deviceid, homebase, password } = req.body;
  
  try {
    const result = await db.query(`
      INSERT INTO users (fullname, phone, dob, deviceid, homebase, password) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, 
                fullname as "fullName", 
                fullname as "fullname", 
                homebase as "homeBase", 
                homebase as "homebase", 
                ubuntupoints as "ubuntuPoints", 
                ubuntupoints as "ubuntupoints", 
                phone, dob, deviceid,
                avatarurl as "avatarUrl",
                avatarurl as "avatarurl",
                phone_verified as "phoneVerified",
                blacklisted
    `, [fullname, phone, dob, deviceid, homebase, password]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Phone or Device ID already registered' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const result = await db.query(`
      SELECT id, 
             fullname as "fullName", 
             fullname as "fullname", 
             homebase as "homeBase", 
             homebase as "homebase", 
             ubuntupoints as "ubuntuPoints", 
             ubuntupoints as "ubuntupoints", 
             password, phone, dob, deviceid,
             avatarurl as "avatarUrl",
             avatarurl as "avatarurl",
             phone_verified as "phoneVerified",
             blacklisted
      FROM users WHERE phone = $1 OR fullname = $1
    `, [phone]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });
    
    const user = result.rows[0];

    // Blacklist check
    if (user.blacklisted) {
      return res.status(403).json({ error: 'This account has been suspended. Contact support.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Update device fingerprint on each login
    const { deviceid: newDevice } = req.body;
    if (newDevice && newDevice !== user.deviceid) {
      await db.query('UPDATE users SET deviceid = $1 WHERE id = $2', [newDevice, user.id]);
      user.deviceid = newDevice;
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== OTP: Request Code ====
app.post('/api/auth/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    // Invalidate old codes
    await db.query('UPDATE otp_codes SET used = TRUE WHERE phone = $1', [phone]);
    // Store new code
    await db.query(
      'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAt]
    );

    // Send SMS
    if (AT_USERNAME === 'sandbox') {
      // Sandbox mode - log to console (visible in Render logs / local terminal)
      console.log(`[OTP SANDBOX] Phone: ${phone} → Code: ${code}`);
      res.json({ success: true, sandbox: true, debug_code: code });
    } else {
      // Production - send real SMS
      await atSMS.send({
        to: [phone],
        message: `Your Plug verification code is: ${code}. Valid for 10 minutes. Do not share this code.`,
        from: 'ThePlug'
      });
      res.json({ success: true });
    }
  } catch (err) {
    console.error('OTP Error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ==== OTP: Verify Code ====
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, code, userId } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

  try {
    const result = await db.query(
      'SELECT * FROM otp_codes WHERE phone = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY createdat DESC LIMIT 1',
      [phone, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code. Please try again.' });
    }

    // Mark code as used
    await db.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);

    // Mark user as verified
    await db.query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [userId]);

    res.json({ success: true, verified: true });
  } catch (err) {
    console.error('Verify Error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ==== Device Verification (FREE - no SMS needed) ====
app.post('/api/auth/verify-device', async (req, res) => {
  const { userId, deviceId } = req.body;
  if (!userId || !deviceId) return res.status(400).json({ error: 'Missing fields' });

  try {
    // Check if deviceId is blacklisted on another account
    const blacklistCheck = await db.query(
      'SELECT id, blacklisted FROM users WHERE deviceid = $1 AND id != $2',
      [deviceId, userId]
    );
    if (blacklistCheck.rows.some(r => r.blacklisted)) {
      return res.status(403).json({ error: 'This device has been suspended from The Plug.' });
    }

    // Store device fingerprint and mark verified
    await db.query(
      'UPDATE users SET deviceid = $1, phone_verified = TRUE WHERE id = $2',
      [deviceId, userId]
    );
    res.json({ success: true, verified: true });
  } catch (err) {
    console.error('Device verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
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
    const result = await db.query(
      `SELECT id, fullname, fullname as "fullName", homebase, homebase as "homeBase", ubuntupoints, ubuntupoints as "ubuntuPoints", 
              avatarurl as "avatarUrl", avatarurl as "avatarurl", phone_verified, phone_verified as "phoneVerified",
              unlockedsuburbs_limit as "unlockedSuburbsLimit", unlockedsuburbs as "unlockedSuburbs" 
       FROM users WHERE id = $1`,
      [req.params.id]
    );
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
             listings.posterid as "posterId", 
             listings.imageurls as "imageUrls", 
             listings.is16plusfriendly as "is16PlusFriendly", 
             listings.createdat as "createdAt",
             users.fullname, users.ubuntupoints, users.homebase 
      FROM listings 
      JOIN users ON listings.posterid = users.id 
      WHERE status = 'active' 
      ORDER BY listings.createdat DESC
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
             listings.posterid as "posterId", 
             listings.imageurls as "imageUrls", 
             listings.is16plusfriendly as "is16PlusFriendly", 
             listings.createdat as "createdAt",
             users.fullname, users.ubuntupoints, users.homebase 
      FROM listings 
      JOIN users ON listings.posterid = users.id 
      WHERE listings.id = $1
    `, [req.params.id]);

    if (listingRes.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    
    const row = listingRes.rows[0];

    // Get all bids
    const bidsRes = await db.query(`
      SELECT bids.*, 
             bids.listingid as "listingId", 
             bids.bidderid as "bidderId", 
             bids.createdat as "createdAt",
             users.fullname, users.ubuntupoints 
      FROM bids 
      JOIN users ON bids.bidderid = users.id 
      WHERE bids.listingid = $1 
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
      'INSERT INTO listings (type, title, description, category, suburb, duration, price, is16plusfriendly, posterid, imageurls) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
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
      'INSERT INTO bids (listingid, bidderid, amount) VALUES ($1, $2, $3)',
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
    const hustleRes = await db.query('SELECT * FROM listings WHERE posterid = $1', [userId]);
    
    // Requests: Listings I bid on
    const requestsRes = await db.query(`
      SELECT listings.*, 
             listings.posterid as "posterId",
             bids.amount as "myBid", 
             bids.status as "bidStatus" 
      FROM listings 
      JOIN bids ON listings.id = bids.listingid 
      WHERE bids.bidderid = $1
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
             chats.listingid as "listingId",
             chats.buyerid as "buyerId",
             chats.sellerid as "sellerId",
             chats.lastmsg as "lastMsg",
             chats.updatedat as "updatedAt",
             u1.fullname as "buyerName", 
             u2.fullname as "sellerName",
             l.title as "listingTitle"
      FROM chats
      JOIN users u1 ON chats.buyerid = u1.id
      JOIN users u2 ON chats.sellerid = u2.id
      LEFT JOIN listings l ON chats.listingid = l.id
      WHERE buyerid = $1 OR sellerid = $1
      ORDER BY chats.updatedat DESC
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
      'SELECT id FROM chats WHERE listingid = $1 AND buyerid = $2 AND sellerid = $3',
      [listingId, buyerId, sellerId]
    );
    
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    const result = await db.query(
      'INSERT INTO chats (listingid, buyerid, sellerid) VALUES ($1, $2, $3) RETURNING id',
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
             messages.chatid as "chatId",
             messages.senderid as "senderId",
             messages.createdat as "createdAt"
      FROM messages 
      WHERE chatid = $1 
      ORDER BY messages.createdat ASC
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
      'INSERT INTO messages (chatid, senderid, text) VALUES ($1, $2, $3) RETURNING *',
      [chatId, senderId, text]
    );
    
    // Update last message in chat
    await db.query(
      'UPDATE chats SET lastmsg = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2',
      [text, chatId]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Profile Updates
app.post('/api/users/:id/avatar', async (req, res) => {
  const { avatarUrl } = req.body;
  const { id } = req.params;
  try {
    await db.query('UPDATE users SET avatarurl = $1 WHERE id = $2', [avatarUrl, id]);
    res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Admin Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM listings WHERE type='item' AND status='active') as "activeItems",
        (SELECT COUNT(*) FROM listings WHERE type='gig' AND status='active') as "activeGigs",
        (SELECT COUNT(*) FROM disputes WHERE status='open') as "openDisputes",
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status='approved') as "totalRevenue"
    `);
    res.json(result.rows[0] || { activeItems: 0, activeGigs: 0, openDisputes: 0, totalRevenue: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Blacklist a user by ID (bans phone + deviceId)
app.post('/api/admin/blacklist/:id', async (req, res) => {
  const { reason } = req.body;
  try {
    await db.query(
      'UPDATE users SET blacklisted = TRUE, blacklist_reason = $1 WHERE id = $2',
      [reason || 'Violation of community guidelines', req.params.id]
    );
    res.json({ success: true, message: 'User blacklisted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Unblacklist a user
app.post('/api/admin/unblacklist/:id', async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET blacklisted = FALSE, blacklist_reason = NULL WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true, message: 'User reinstated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== PAYMENTS (Boosted Plugs via Paynow) ====
app.post('/api/payments/initiate-boost', async (req, res) => {
  const { userId, listingId, phone, amount } = req.body;
  
  if (!phone) return res.status(400).json({ error: 'Phone number required (EcoCash/OneMoney)' });

  // Use a unique reference for the transaction
  const invoice = `Boost_Plug_${listingId}_${Date.now()}`;
  const payment = paynow.createPayment(invoice, "admin@theplug.co.zw");
  payment.add("Listing Boost (48hrs)", amount || 0.30);
  
  try {
    // Determine method based on prefix (rough assumption for ZW: 077/078 is eco, 071 is one)
    const method = (phone.includes('071') || phone.includes('71')) ? 'onemoney' : 'ecocash';
    
    // Initiate mobile transaction
    const response = await paynow.sendMobile(payment, phone, method);
    
    if (response.success) {
      // Create a pending payment record
      await db.query(
        'INSERT INTO payments (user_id, listing_id, amount, paynow_reference, poll_url, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, listingId, amount || 0.30, response.pollUrl, response.pollUrl, 'pending']
      );
      res.json({ success: true, pollUrl: response.pollUrl, instructions: response.instructions });
    } else {
      res.status(400).json({ error: response.error || 'Failed to initiate payment with Paynow.' });
    }
  } catch (err) {
    console.error('Paynow Error:', err);
    res.status(500).json({ error: 'Payment gateway error: ' + err.message });
  }
});

// ==== PAYMENTS (Manual Boosts & Donations) ====
app.post('/api/payments/manual-submit', async (req, res) => {
  const { userId, listingId, amount, proofCode, type } = req.body;
  
  if (!proofCode) return res.status(400).json({ error: 'Transaction ID (Ref Code) is required.' });

  try {
    await db.query(
      'INSERT INTO payments (user_id, listing_id, amount, proof_code, type, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, listingId || null, amount, proofCode, type || 'boost', 'pending']
    );
    res.json({ success: true, message: 'Payment submitted for verification. Barry will check soon!' });
  } catch (err) {
    console.error('Payment submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: View all pending verification payments
app.get('/api/admin/pending-payments', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT payments.*, users.fullname as "userName", users.phone, listings.title as "listingTitle"
      FROM payments
      JOIN users ON payments.user_id = users.id
      LEFT JOIN listings ON payments.listing_id = listings.id
      WHERE payments.status = 'pending'
      ORDER BY payments.createdat DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Approve a manual payment
app.post('/api/admin/approve-payment/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const payRes = await db.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (payRes.rows.length === 0) return res.status(404).json({ error: 'Payment record not found' });
    
    const payment = payRes.rows[0];
    
    await db.query('UPDATE payments SET status = $1 WHERE id = $2', ['approved', id]);
    
    // If it's a boost, activate it
    if (payment.type === 'boost' && payment.listing_id) {
       const expStr = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
       await db.query(
         'UPDATE listings SET is_boosted = TRUE, boost_expires_at = $1 WHERE id = $2',
         [expStr, payment.listing_id]
       );
    }
    
    // If it's a donation >= $5, reward with +5 neighborhood slots
    if (payment.type === 'donation' && Number(payment.amount) >= 5) {
       await db.query(
         'UPDATE users SET unlockedsuburbs_limit = unlockedsuburbs_limit + 5 WHERE id = $1',
         [payment.user_id]
       );
    }
    
    res.json({ success: true, message: 'Payment approved and applied!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reject a manual payment
app.post('/api/admin/reject-payment/:id', async (req, res) => {
  try {
    await db.query('UPDATE payments SET status = $1 WHERE id = $2', ['rejected', req.params.id]);
    res.json({ success: true, message: 'Payment rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: View all users
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await db.query('SELECT id, fullname, phone, ubuntupoints, homebase, blacklisted FROM users ORDER BY createdat DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: View "Won Bids" (highest bids for active/ended listings)
app.get('/api/admin/won-bids', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT l.id, l.title, l.price as "basePrice", 
             u.fullname as "posterName", 
             b.amount as "highestBid",
             bidder.fullname as "winningBidder",
             l.status
      FROM listings l
      JOIN users u ON l.posterid = u.id
      JOIN bids b ON l.id = b.listingid
      JOIN users bidder ON b.bidderid = bidder.id
      WHERE b.amount = (SELECT MAX(amount) FROM bids WHERE listingid = l.id)
      ORDER BY l.createdat DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Neighborhood Unlocks ====
app.post('/api/users/:id/unlock-suburb', async (req, res) => {
  const { id } = req.params;
  const { suburb } = req.body;
  try {
    const user = await db.query('SELECT unlockedsuburbs, unlockedsuburbs_limit FROM users WHERE id = $1', [id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    let current = [];
    try { current = JSON.parse(user.rows[0].unlockedsuburbs || '[]'); } catch(e) { current = []; }
    
    if (current.length >= user.rows[0].unlockedsuburbs_limit) {
      return res.status(400).json({ error: 'You have reached your neighborhood limit.' });
    }
    
    if (current.includes(suburb)) {
      return res.status(400).json({ error: 'Neighborhood already unlocked.' });
    }
    
    current.push(suburb);
    await db.query('UPDATE users SET unlockedsuburbs = $1 WHERE id = $2', [JSON.stringify(current), id]);
    res.json({ success: true, unlockedSuburbs: current });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`The Plug Backend running on port ${PORT}`);
});
