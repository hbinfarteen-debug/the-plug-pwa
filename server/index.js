const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { Paynow } = require('paynow');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const ALL_SUBURBS = [
  "Ascot", "Barbourfields", "Barham Green", "Bellevue", "Belmont", "Belview", "Benneydale", "Branton", "Bradfield", "Burnside", 
  "CBD", "Cement", "Charlemont", "Cowdray Park", "Donnington", "Douglasdale", "Dunstal", "Emakhandeni", "Emganwini", "Enclave", 
  "Entumbane", "Eloana", "Enqotsheni", "Envas", "Famona", "Four Winds", "Glencoe", "Glengarry", "Greenhill", "Gwabalanda", 
  "Harrisvale", "Helenvale", "Highmount", "Hillcrest", "Hillside", "Holmlane", "Hopeville", "Ilanda", "Iminyela", "Kelvin", 
  "Killarney", "Kings City", "Kingsdale", "Kumalo", "Lakeside", "Lobengula", "Lochview", "Lower Range", "Lucydale", "Luveve", 
  "Mabuthweni", "Magwegwe", "Mahatshula", "Makokoba", "Malindela", "Marlands", "Matshobana", "Matsheumhlope", "Montgomery", "Montrose", 
  "Morningside", "Mpopoma", "Mzilikazi", "Newton West", "Nguboyenja", "Njube", "Nketa", "Nkulumane", "North End", "Northlea", 
  "Northlynne", "Northvale", "Orange Grove", "Paddonhurst", "Parklands", "Parkmont", "Pelandaba", "Pelandaba West", "Picnic Park", "Pumula", 
  "Rangemore", "Raylton", "Richmond", "Riverside", "Romney Park", "Sauerstown", "Selbourne Park", "Selwyn", "Sizinda", "Southway", 
  "Southwold", "Steeldale", "Suburbs", "Sunnyside", "Sunninghill", "Tegela", "Thorngrove", "Trenance", "Tshabalala", "Umwinsidale", 
  "Waterford", "Willsgrove", "Windy Ridge", "Woodville", "Woodlands"
];

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

// Admin authentication middleware
app.use('/api/admin', (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (key === (process.env.ADMIN_API_KEY || '259047changwaMAFIA!')) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
});

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
    
    // get user stats
    const statsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM listings WHERE posterid = $1 AND type='item' AND status='sold') as deals,
        (SELECT COUNT(*) FROM listings WHERE posterid = $1 AND type='gig' AND status='sold') as jobs,
        (SELECT COUNT(*) FROM listings WHERE posterid = $1 AND status='active') as listed
    `, [req.params.id]);

    const stats = statsRes.rows[0];
    const user = result.rows[0];
    
    user.stats = {
      deals: parseInt(stats.deals) || 0,
      jobs: parseInt(stats.jobs) || 0,
      listed: parseInt(stats.listed) || 0
    };

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Helper: Notification & Deals Logic ====
async function createNotification(userId, title, message, type, relatedId) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type, related_id) VALUES ($1, $2, $3, $4, $5)',
      [userId, title, message, type || 'general', relatedId || null]
    );
  } catch (err) { console.error('Notification error:', err); }
}

async function checkEndedListings() {
  try {
    const isPg = db.USE_POSTGRES;
    
    // 1. Find active listings that should have ended
    const expiredQuery = isPg 
      ? "SELECT * FROM listings WHERE status = 'active' AND createdat <= NOW() - (duration || ' hours')::interval"
      : "SELECT * FROM listings WHERE status = 'active' AND (CASE WHEN createdat LIKE '%-%' THEN datetime(createdat) ELSE createdat END) <= datetime('now', '-' || duration || ' hours')";

    const expiredRes = await db.query(expiredQuery);

    for (const listing of expiredRes.rows) {
      // Find winner
      const bidRes = await db.query(
        'SELECT * FROM bids WHERE listingid = $1 ORDER BY amount DESC LIMIT 1',
        [listing.id]
      );
      
      if (bidRes.rows.length > 0) {
        const winner = bidRes.rows[0];
        const swapCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

        // Create Deal
        await db.query(
          'INSERT INTO deals (listingid, seekerid, providerid, swapcode, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [listing.id, winner.bidderid, listing.posterid, swapCode, 'pending', expiresAt]
        );

        // Update Listing Status
        await db.query('UPDATE listings SET status = $1 WHERE id = $2', ['ended', listing.id]);

        // Create Notification for Winner
        await createNotification(
          winner.bidderid, 
          'You won the bid! 🎉', 
          `Congratulations! You won "${listing.title}". Please honor the deal within 72 hrs or 5 ubuntu points will be deducted.`,
          'deal_won',
          listing.id
        );

        // Create Notification for Poster
        await createNotification(
          listing.posterid, 
          'Bid ended - Winner found!', 
          `Someone has won your plug "${listing.title}". Please honor the deal within 72 hrs or 5 ubuntu points will be deducted.`,
          'bid_won',
          listing.id
        );
        
        // Auto-create chat if not exists
        await db.query(
          'INSERT INTO chats (listingid, buyerid, sellerid, lastmsg) SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM chats WHERE listingid=$1 AND buyerid=$2 AND sellerid=$3)',
          [listing.id, winner.bidderid, listing.posterid, 'Deal created! Seal the trade here.']
        );
      } else {
        // No bids, just end it
        await db.query('UPDATE listings SET status = $1 WHERE id = $2', ['ended', listing.id]);
      }
    }

    // 2. Check for deals older than 72hrs that aren't completed
    const stuckQuery = isPg
      ? "SELECT d.*, l.title FROM deals d JOIN listings l ON d.listingid = l.id WHERE d.status = 'pending' AND d.points_deducted = 0 AND d.expires_at <= NOW()"
      : "SELECT d.*, l.title FROM deals d JOIN listings l ON d.listingid = l.id WHERE d.status = 'pending' AND d.points_deducted = 0 AND d.expires_at <= datetime('now')";
    
    const stuckDeals = await db.query(stuckQuery);

    for (const deal of stuckDeals.rows) {
       await db.query('UPDATE deals SET status = $1, points_deducted = 1 WHERE id = $2', ['disputed', deal.id]);
       const admins = ['263715198745', '263775939688'];
       for (const phone of admins) {
          const admRes = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
          if (admRes.rows[0]) {
             await createNotification(admRes.rows[0].id, '⚠️ Stuck Deal Alert', `Deal #${deal.id} (${deal.title}) has expired 72hr window. Check chat to see who failed to honor it.`, 'admin_alert', deal.id);
          }
       }
    }

  } catch (err) {
    console.error('checkEndedListings error:', err);
  }
}

// Run cleanup every 10 mins (though we also call it on feed load)
setInterval(checkEndedListings, 10 * 60 * 1000);

// Listings
app.get('/api/listings', async (req, res) => {
  try {
    await checkEndedListings(); // Refresh active statuses
    const isPg = db.USE_POSTGRES;

    const feedQuery = isPg
      ? `SELECT listings.*, 
             listings.posterid as "posterId", 
             listings.imageurls as "imageUrls", 
             listings.is16plusfriendly as "is16PlusFriendly", 
             listings.createdat as "createdAt",
             (SELECT COUNT(*) FROM bids WHERE listingid = listings.id) as "bidCount",
             users.fullname, users.ubuntupoints, users.homebase 
      FROM listings 
      JOIN users ON listings.posterid = users.id 
      WHERE status = 'active' 
      OR (status = 'ended' AND listings.createdat + (listings.duration + 72) * interval '1 hour' > NOW())
      ORDER BY listings.createdat DESC`
      : `SELECT listings.*, 
             listings.posterid as "posterId", 
             listings.imageurls as "imageUrls", 
             listings.is16plusfriendly as "is16PlusFriendly", 
             listings.createdat as "createdAt",
             (SELECT COUNT(*) FROM bids WHERE listingid = listings.id) as "bidCount",
             users.fullname, users.ubuntupoints, users.homebase 
      FROM listings 
      JOIN users ON listings.posterid = users.id 
      WHERE status = 'active' 
      OR (status = 'ended' AND datetime(listings.createdat, '+' || (listings.duration + 72) || ' hours') > datetime('now'))
      ORDER BY listings.createdat DESC`;

    const result = await db.query(feedQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==== Notifications ====
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY createdat DESC LIMIT 20',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notifications/read/:id', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET read = 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==== Deals & Trade Confirmation ====
app.get('/api/deals/:userId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, l.title, l.price, l.type, 
             u1.fullname as "seekerName", u2.fullname as "providerName"
      FROM deals d
      JOIN listings l ON d.listingid = l.id
      JOIN users u1 ON d.seekerid = u1.id
      JOIN users u2 ON d.providerid = u2.id
      WHERE seekerid = $1 OR providerid = $1
      ORDER BY d.createdat DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/deals/:id/confirm', async (req, res) => {
  const { userId, role } = req.body; // role: 'buyer' or 'seller'
  try {
    const dealRes = await db.query('SELECT * FROM deals WHERE id = $1', [req.params.id]);
    if (dealRes.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    const deal = dealRes.rows[0];

    let targetUserId = null;

    if (role === 'buyer') {
      await db.query('UPDATE deals SET buyer_confirmed = 1 WHERE id = $1', [deal.id]);
      targetUserId = deal.providerid; // seller gets points
    } else {
      await db.query('UPDATE deals SET seller_confirmed = 1 WHERE id = $1', [deal.id]);
      targetUserId = deal.seekerid; // buyer gets points
    }

    // Immediately award 5 pts to the target user
    if (targetUserId) {
       await db.query('UPDATE users SET ubuntupoints = ubuntupoints + 5 WHERE id = $1', [targetUserId]);
       await createNotification(
          targetUserId, 
          'Gifted +5 Ubuntu Points! 🎁', 
          'The other party marked the deal as DONE and gifted you 5 Ubuntu points!', 
          'pts_gain', 
          deal.id
       );
    }

    // Refresh deal
    const updatedRes = await db.query('SELECT * FROM deals WHERE id = $1', [deal.id]);
    const updatedDeal = updatedRes.rows[0];

    if (updatedDeal.buyer_confirmed && updatedDeal.seller_confirmed) {
      // Complete deal
      await db.query('UPDATE deals SET status = $1 WHERE id = $2', ['completed', deal.id]);
      await db.query('UPDATE listings SET status = $1 WHERE id = $2', ['sold', deal.listingid]);
    }

    res.json({ success: true, deal: updatedDeal });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/deals/:id/deduct', async (req, res) => {
  // Admin call only
  const { targetId, reason } = req.body;
  try {
    await db.query('UPDATE users SET ubuntupoints = ubuntupoints - 5 WHERE id = $1', [targetId]);
    await createNotification(targetId, 'Points Deducted - 5 Pts', `Your points were deducted due to: ${reason}`, 'pts_loss', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  const { type, title, description, category, suburb, duration, price, is16PlusFriendly, posterId, imageUrls, suburbs } = req.body;
  const finalSuburbs = Array.isArray(suburbs) ? suburbs : [suburb].filter(Boolean);
  const primarySuburb = finalSuburbs[0] || suburb || 'CBD';
  try {
    const result = await db.query(
      'INSERT INTO listings (type, title, description, category, suburb, duration, price, is16plusfriendly, posterid, imageurls, suburbs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id',
      [type, title, description, category, primarySuburb, duration, price || null, is16PlusFriendly ? true : false, posterId, JSON.stringify(imageUrls || []), JSON.stringify(finalSuburbs)]
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
    const listing = await db.query('SELECT status FROM listings WHERE id = $1', [listingId]);
    if (listing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    if (listing.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'This plug has ended. No more bids allowed!' });
    }

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

// Disputes
app.post('/api/disputes', async (req, res) => {
  const { dealid, reporterid, reason, statement } = req.body;
  try {
    // 1. Insert dispute
    if (db.USE_POSTGRES) {
      await db.query(
        'INSERT INTO disputes (dealid, reporterid, reason, statement) VALUES ($1, $2, $3, $4)',
        [dealid, reporterid, reason, statement]
      );
    } else {
      await db.query(
        'INSERT INTO disputes (dealid, reporterid, reason, statement) VALUES ($1, $2, $3, $4)',
        [dealid, reporterid, reason, statement]
      );
    }

    // 2. Mark deal as disputed
    if (dealid) {
      await db.query("UPDATE deals SET status = 'disputed' WHERE id = $1", [dealid]);
    }

    // 3. Notify admins
    const admins = ['263715198745', '263775939688'];
    for (const phone of admins) {
       const admRes = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
       if (admRes.rows[0]) {
          await createNotification(
             admRes.rows[0].id, 
             '🚩 New Dispute Filed', 
             `Deal #${dealid || 'Unknown'} was disputed for: ${reason}. Please review the chat.`, 
             'admin_alert', 
             dealid || null
          );
       }
    }

    res.json({ message: 'Dispute filed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Disputes
app.get('/api/admin/disputes', async (req, res) => {
  // Need to join deal, reporter, u1, u2
  try {
    const isPg = db.USE_POSTGRES;
    const queryStr = isPg 
      ? `SELECT dp.*, 
                d.status as "dealStatus", d.seekerid, d.providerid,
                u1.fullname as "seekerName", u1.phone as "seekerPhone",
                u2.fullname as "providerName", u2.phone as "providerPhone",
                rep.fullname as "reporterName"
         FROM disputes dp
         JOIN deals d ON dp.dealid = d.id
         JOIN users u1 ON d.seekerid = u1.id
         JOIN users u2 ON d.providerid = u2.id
         JOIN users rep ON dp.reporterid = rep.id
         ORDER BY dp.createdat DESC`
      : `SELECT dp.*, 
                d.status as "dealStatus", d.seekerid, d.providerid,
                u1.fullname as "seekerName", u1.phone as "seekerPhone",
                u2.fullname as "providerName", u2.phone as "providerPhone",
                rep.fullname as "reporterName"
         FROM disputes dp
         JOIN deals d ON dp.dealid = d.id
         JOIN users u1 ON d.seekerid = u1.id
         JOIN users u2 ON d.providerid = u2.id
         JOIN users rep ON dp.reporterid = rep.id
         ORDER BY dp.createdat DESC`;

    const result = await db.query(queryStr);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/disputes/:id/resolve', async (req, res) => {
  const { action, targetId, otherId } = req.body; 
  // action: 'award', 'deduct', 'clear'
  const disputeId = req.params.id;
  try {
    if (action === 'award' && targetId) {
       await db.query('UPDATE users SET ubuntupoints = ubuntupoints + 5 WHERE id = $1', [targetId]);
       await createNotification(targetId, 'Dispute Resolved', `Admin awarded you 5 pts for a resolved dispute.`, 'pts_gain', null);
    } else if (action === 'deduct' && targetId) {
       await db.query('UPDATE users SET ubuntupoints = ubuntupoints - 5 WHERE id = $1', [targetId]);
       await createNotification(targetId, 'Dispute Resolved', `Admin deducted 5 pts for a resolved dispute.`, 'pts_loss', null);
    }
    
    await db.query("UPDATE disputes SET status = 'resolved' WHERE id = $1", [disputeId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reviews
app.post('/api/reviews', async (req, res) => {
  const { dealid, authorid, targetid, text } = req.body;
  try {
     // Save simple review text
     await db.query(
        'INSERT INTO reviews (dealid, authorid, targetid, text) VALUES ($1, $2, $3, $4)',
        [dealid, authorid, targetid, text]
     );
     res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT messages.*, 
             messages.chatid as "chatId",
             messages.senderid as "senderId",
             messages.createdat as "createdAt",
             users.fullname as "senderName",
             users.phone as "senderPhone",
             users.role as "senderRole"
      FROM messages 
      LEFT JOIN users ON messages.senderid = users.id
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
             l.posterid as "sellerId",
             b.bidderid as "buyerId",
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

// Admin: Sanitize Suburbs (One-time cleanup)
app.post('/api/admin/sanitize-suburbs', async (req, res) => {
  try {
    const listLower = ALL_SUBURBS.map(s => s.toLowerCase());
    const placeholders = listLower.map((_, i) => `$${i + 1}`).join(',');
    
    // 1. Remove listings with invalid suburbs
    const delRes = await db.query(`
      DELETE FROM listings 
      WHERE LOWER(suburb) NOT IN (${placeholders})
    `, listLower);

    // 2. Reset invalid user homebases to 'CBD'
    const updRes = await db.query(`
      UPDATE users 
      SET homebase = 'CBD' 
      WHERE LOWER(homebase) NOT IN (${placeholders})
    `, listLower);

    res.json({
      message: "Sanitization complete",
      listingsDeleted: delRes.rowCount,
      usersUpdated: updRes.rowCount
    });
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
