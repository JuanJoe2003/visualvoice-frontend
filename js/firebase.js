/**
 * firebase.js — VisualVoice
 * ─────────────────────────────────────────────────────────────
 * HOW TO SET UP:
 *  1. Go to https://console.firebase.google.com
 *  2. Create a project → Add Web App → copy your firebaseConfig
 *  3. Enable Authentication → Email/Password + Google
 *  4. Enable Firestore Database (start in test mode for now)
 *  5. Paste your config values below
 * ─────────────────────────────────────────────────────────────
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCIE7taV5BSdKaHp3i6onfrIpLdRvvu59Q",
  authDomain: "asl-teaching-web.firebaseapp.com",
  projectId: "asl-teaching-web",
  storageBucket: "asl-teaching-web.appspot.com",
  messagingSenderId: "949463143708",
  appId: "1:949463143708:web:10d99792abb862e6e216d9",
  measurementId: "G-DE4NRCYC7K"
};
// ─────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
