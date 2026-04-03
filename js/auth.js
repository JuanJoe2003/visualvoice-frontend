/**
 * auth.js — VisualVoice
 * Handles: login, signup, Google sign-in, logout, auth state guard.
 * Used by: login.html, dashboard.html (guard), all protected pages.
 *
 * Firestore user document structure (users/{uid}):
 * {
 *   name:        string,
 *   email:       string,
 *   createdAt:   timestamp,
 *   xp:          number,       ← total XP earned ever
 *   weeklyXp:    number,       ← resets every Monday
 *   streak:      number,       ← current day streak
 *   lastLoginDate: string,     ← "YYYY-MM-DD" for streak logic
 *   hearts:      number,       ← max 5
 *   gems:        number,
 *   league:      string,       ← "Bronze" | "Silver" | "Gold" | "Diamond"
 *   lessonsCompleted: number,
 *   trophies:    string[],     ← list of earned trophy IDs
 *   unitProgress: {            ← keyed by unit ID
 *     [unitId]: {
 *       lessonsComplete: string[],   ← lesson IDs completed
 *       lastAccessed: timestamp
 *     }
 *   }
 * }
 */

import { auth, db } from './firebase.js';

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { updateStreak } from './progress.js';

const googleProvider = new GoogleAuthProvider();

// ── Default user data for new accounts ──────────────────────
function defaultUserData(name, email) {
    return {
        name,
        email,
        createdAt: serverTimestamp(),
        xp: 0,
        weeklyXp: 0,
        streak: 0,
        lastLoginDate: '',
        hearts: 5,
        gems: 0,
        league: 'Bronze',
        lessonsCompleted: 0,
        trophies: [],
        unitProgress: {},
    };
}

// ── Create Firestore user doc if it doesn't exist ───────────
async function ensureUserDoc(user, nameOverride = null) {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        const name = nameOverride || user.displayName || user.email.split('@')[0];
        await setDoc(ref, defaultUserData(name, user.email));
    }
    // Update streak on every login
    await updateStreak(user.uid);
}

// ── Sign Up ──────────────────────────────────────────────────
export async function signUp(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), defaultUserData(name, email));
    await updateStreak(cred.user.uid);
    return cred.user;
}

// ── Log In ───────────────────────────────────────────────────
export async function logIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user);
    return cred.user;
}

// ── Google Sign-In ───────────────────────────────────────────
export async function signInWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(cred.user);
    return cred.user;
}

// ── Log Out ──────────────────────────────────────────────────
export async function logOut() {
    await signOut(auth);
    window.location.href = 'login.html';
}

// ── Auth Guard: redirect to login if not signed in ───────────
// Call this at the top of any protected page script.
export function requireAuth(callback) {
    return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
            unsub();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            if (callback) callback(user);
            resolve(user);
        });
    });
}

// ── Auth Guard for login page: redirect away if already in ──
// Call this on login.html so logged-in users skip to dashboard.
export function redirectIfLoggedIn() {
    onAuthStateChanged(auth, (user) => {
        if (user) window.location.href = 'dashboard.html';
    });
}

// ── Get current user synchronously (after auth resolved) ────
export function currentUser() {
    return auth.currentUser;
}
