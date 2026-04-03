# 🤟 VisualVoice — ASL Learning Web App
 
> Learn American Sign Language through real-time webcam sign detection, gamified XP, streaks, trophies, and a Duolingo-style lesson path.
 
---
 
## 📸 Overview
 
VisualVoice is a browser-based ASL learning platform built with plain HTML, CSS, and JavaScript — no frontend framework needed. It uses Firebase for authentication and data storage, and connects to a Python/Flask backend that runs a trained sign-detection model via webcam.
 
---
 
## 🗂️ Project Structure
 
```
visualvoice-frontend/
│
├── index.html              ← redirect to login
├── login.html              ← Firebase login & signup page
├── dashboard.html          ← main dashboard (XP, streak, trophies)
├── learn.html              ← lesson unit path (Duolingo-style)
├── practice.html           ← webcam sign detection practice
├── progress.html           ← user stats & level progress
├── trophies.html           ← all achievements page
├── leaderboard.html        ← weekly & all-time rankings
│
├── firebase.js             ← Firebase app init (paste your config here)
├── auth.js                 ← login, signup, Google auth, auth guard
├── progress.js             ← XP, streak, trophy, Firestore read/write
├── api.js                  ← connector to Python backend (sign detection)
├── learn.js                ← lesson unit rendering & popup logic
├── practice.js             ← webcam capture, detection loop, scoring
│
└── server.py               ← Python Flask backend (friend's ML model)
```
 
---
 
## ✨ Features
 
- 🔐 **Firebase Auth** — Email/password + Google sign-in
- ⚡ **XP System** — Earn XP per lesson, daily login bonus (+50 XP)
- 🔥 **Streak Tracker** — Daily login streak with 7-day calendar view
- 🏆 **Trophies** — 9 achievements that unlock automatically as you progress
- 🥇 **Leaderboard** — Weekly and all-time rankings
- 📚 **4 Learning Units** — Basic Greetings → Alphabet → Phrases → Advanced
- 📷 **Webcam Detection** — Real-time ASL sign recognition via ML model
- 📊 **Progress Page** — League tier, unit completion, streak calendar
- 📱 **Responsive** — Works on mobile and desktop
 
---
 
## 🚀 Getting Started
 
### 1. Clone the repo
 
```bash
git clone https://github.com/YOUR_USERNAME/visualvoice-frontend.git
cd visualvoice-frontend
```
 
### 2. Set up Firebase
 
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project → Add a Web App
3. Enable **Authentication** → Email/Password + Google
4. Enable **Firestore Database** (start in test mode)
5. Copy your config and paste it into `firebase.js`:
 
```javascript
const firebaseConfig = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
};
```
 
### 3. Run the frontend
 
Since the app uses ES modules (`import/export`), you need a local server — just opening `index.html` directly won't work.
 
**Option A — VS Code Live Server** (easiest):
Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), right-click `login.html` → Open with Live Server.
 
**Option B — Python:**
```bash
python -m http.server 8080
```
Then open `http://localhost:8080/login.html`
 
**Option C — Node:**
```bash
npx serve .
```
 
### 4. Connect the ML backend (optional)
 
The webcam practice page sends frames to a Flask server. Ask your teammate to run `server.py`:
 
```bash
pip install flask flask-cors opencv-python tensorflow numpy
python server.py
```
 
The server runs on `http://localhost:5000`. If the backend isn't running, the app falls back to a simulated detection mode so you can still test the UI.
 
---
 
## 🔥 Firestore Data Structure
 
Each user gets a document at `users/{uid}`:
 
```
{
  name:             string,
  email:            string,
  xp:               number,      ← total XP ever
  weeklyXp:         number,      ← resets Monday
  streak:           number,      ← current day streak
  lastLoginDate:    string,      ← "YYYY-MM-DD"
  hearts:           number,      ← max 5
  gems:             number,
  league:           string,      ← Bronze / Silver / Gold / Diamond
  lessonsCompleted: number,
  trophies:         string[],    ← list of trophy IDs
  unitProgress: {
    "unit-basics": {
      lessonsComplete: string[],
      lastAccessed:    timestamp
    },
    ...
  }
}
```
 
---
 
## 🧠 ML Backend API
 
The frontend talks to the Flask server via two endpoints:
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | Send a webcam frame, get sign prediction |
| POST | `/api/progress` | Report lesson completion |
 
**Request (detect):**
```json
{
  "image": "<base64 JPEG string>",
  "lesson_id": "asl-a"
}
```
 
**Response:**
```json
{
  "predicted": "A",
  "confidence": 0.92
}
```
 
---
 
## 🏅 Trophy System
 
Trophies are checked and awarded automatically whenever XP or progress changes:
 
| Trophy | Condition |
|--------|-----------|
| 🌟 First Sign | Complete your first lesson |
| 🔥 On Fire | Reach a 7-day streak |
| 🔤 ABC Pro | Complete all Alphabet lessons |
| 🥇 Gold League | Reach the Gold League (2000 XP) |
| ⚡ Speed Signer | Earn 500 XP total |
| 💎 Diamond | Reach the Diamond League (5000 XP) |
| 🏅 100 Lessons | Complete 100 lessons |
| 🎯 Perfect Week | Maintain a 14-day streak |
| 🦉 Night Owl | Practice on 30 different days |
 
---
 
## 🌐 League System
 
| League | XP Required |
|--------|------------|
| 🥉 Bronze | 0 XP |
| 🥈 Silver | 500 XP |
| 🥇 Gold | 2,000 XP |
| 💎 Diamond | 5,000 XP |
 
---
 
## 👥 Team
 
| Role | Person |
|------|--------|
| Frontend | You |
| Firebase / Database | Friend A |
| ML Model / Backend | Friend B |
 
---
 
## 📋 To Do / Known Limitations
 
- [ ] Leaderboard currently uses sample data alongside real user — needs full Firestore collection query when team is ready
- [ ] Weekly XP does not auto-reset on Mondays yet (needs a Firebase Cloud Function)
- [ ] Shop page not yet built
- [ ] Settings page not yet built
- [ ] `learn.js` lesson states are partially hardcoded — will be fully dynamic once `unitProgress` is populated via practice sessions
 
---
 
## 📄 License
 
MIT — free to use and modify.
 
---
 
> Built with 🤟 for learning ASL, one sign at a time.
 
