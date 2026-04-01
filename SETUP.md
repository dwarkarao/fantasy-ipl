# Fantasy IPL v2 — Setup Guide

## What you're setting up
- React frontend (Vite)
- Firebase Authentication + Firestore database
- Vercel hosting + serverless API functions
- CricketData.org for live squads and match stats

---

## Step 1 — Install Node.js (if not already)
Download from https://nodejs.org (LTS version)

---

## Step 2 — Set up Firebase

1. Go to https://console.firebase.google.com
2. Open your existing `ipl---app` project (or create a new one)
3. Enable **Authentication → Email/Password** sign-in
4. Enable **Firestore Database** (start in production mode)
5. Go to **Project Settings → General** and copy your Firebase config values

---

## Step 3 — Create your `.env` file

In the project root, copy `.env.example` to `.env`:
```
cp .env.example .env
```

Fill in your Firebase config values:
```
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123

VITE_ADMIN_EMAIL=admin@fantasyipl.com
CRICKET_API_KEY=2550bee4-0883-4212-b82e-0c7c100a322e
```

---

## Step 4 — Create user accounts (run once)

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" — save the file as `serviceAccountKey.json` in the project root
3. Run:
```bash
npm install
node scripts/setup-firebase.mjs
```

This creates:
- `admin@fantasyipl.com` / `admin123`  ← **Change this password after first login!**
- `user1@fantasyipl.com` through `user20@fantasyipl.com` / `demo123`

> ⚠️ Delete `serviceAccountKey.json` after running. Never commit it to Git.

---

## Step 5 — Upload Firestore security rules

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

---

## Step 6 — Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Step 7 — Deploy to Vercel

1. Push your project to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fantasy-ipl-v2.git
git push -u origin main
```
> Use a Personal Access Token for the password (GitHub → Settings → Developer Settings → Tokens → Tokens classic)

2. Go to https://vercel.com → New Project → Import your GitHub repo

3. In Vercel, add your environment variables (same as your `.env` file)
   - Add `CRICKET_API_KEY` (without VITE_ prefix — this stays server-side)
   - Add all `VITE_FIREBASE_*` variables

4. Click Deploy — done!

---

## How the app works

### As a Participant
- Log in at your Vercel URL with your `userX@fantasyipl.com` / `demo123` credentials
- Go to **Dashboard** to see upcoming matches
- Click **"Pick team"** before the match starts
- Pick 3 players per side (Batsman + Bowler + Any) + 1 Sub per side = 8 total
- Assign star levels to each player (Normal / ⭐ Star / ⭐⭐⭐ Triple Star)
- Max 2 foreign players across all 8 picks
- Picks lock automatically when the match starts

### As Admin
- Log in as `admin@fantasyipl.com`
- Go to **Admin → Add Match** to add upcoming matches (include the CricketData.org match ID)
- After a match ends, go to **Admin → Enter/Edit Stats**
- Click "Auto-pull from API" to fetch stats automatically
- Correct any errors manually, then click "Save Stats"
- Leaderboard updates automatically

---

## Changing Scoring Rules

Edit `src/config/scoring.js` — everything is clearly labeled with comments.
The changes take effect immediately for all future score calculations.

---

## Project Structure

```
fantasy-ipl-v2/
├── api/                    ← Vercel serverless functions (server-side, no CORS)
│   ├── matches.js          ← Fetch upcoming IPL matches
│   ├── squads.js           ← Fetch squad for a specific match
│   └── match-stats.js      ← Auto-pull player stats after match
├── scripts/
│   └── setup-firebase.mjs  ← Run once to create all user accounts
├── src/
│   ├── config/
│   │   └── scoring.js      ← ⭐ Edit this to change scoring rules
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx   ← Upcoming matches + pick status
│   │   ├── PickTeam.jsx    ← Core picking UI
│   │   ├── Leaderboard.jsx ← Season rankings
│   │   └── Admin.jsx       ← Match management + stats entry
│   ├── components/
│   │   └── Navbar.jsx
│   ├── App.jsx             ← Router + protected routes
│   ├── firebase.js         ← Firebase init
│   ├── index.css           ← Design system + global styles
│   └── main.jsx
├── firestore.rules         ← Deploy to Firebase for security
├── .env.example            ← Copy to .env and fill in values
├── vercel.json
├── vite.config.js
└── package.json
```
