# Deployment Guide: $0 Functional PWA

Follow these steps to take **The Plug** from your laptop to a live PWA in Bulawayo for free.

## 1. Setup Supabase (Database & Images)
Supabase gives you a professional Postgres database and image storage for $0.

1.  Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Database**: Go to the **SQL Editor** and run the following to setup your tables:
    ```sql
    -- Users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      fullName TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      dob DATE,
      deviceId TEXT,
      ubuntuPoints INTEGER DEFAULT 100,
      homeBase TEXT,
      role TEXT DEFAULT 'user'
    );

    -- Listings table
    CREATE TABLE listings (
      id SERIAL PRIMARY KEY,
      type TEXT,
      title TEXT,
      description TEXT,
      category TEXT,
      suburb TEXT,
      duration INTEGER,
      price REAL,
      is16PlusFriendly BOOLEAN,
      posterId INTEGER REFERENCES users(id),
      imageUrls JSONB DEFAULT '[]',
      status TEXT DEFAULT 'active'
    );
    ```
3.  **Storage**: Go to **Storage** and create a **Public Bucket** named `listings`.
4.  **API Keys**: Go to **Project Settings -> API** and copy your `Project URL` and `anon public key`.

## 2. Update Environment Variables
Create a `.env` file in your `client` folder:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Deployment (Hosting)
### Frontend (Vercel)
1.  Push your code to GitHub.
2.  Import the project into **Vercel**.
3.  Set the **Root Directory** to `client`.
4.  Add your environment variables (`VITE_SUPABASE_URL`, etc.).

### Backend (Render Free Tier)
Since you are using a Node.js server, you can host the `server` folder on **Render.com**.
1.  Create a "Web Service" on Render.
2.  Set the **Build Command** to `npm install`.
3.  Set the **Start Command** to `node index.js`.
4.  **Persistent Storage Warning**: On the free tier, the SQLite database (`database.sqlite`) will reset every time the server restarts. 
    - **To fix this for free**, you should update `server/index.js` to connect to your **Supabase Postgres** database instead of SQLite.

---

## Technical Recommendation
For a truly "Hacker" $0 setup, you can move all your logic from the `server` folder directly into the `client` components using the Supabase client. This removes the need for a separate server entirely!
