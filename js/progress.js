/**
 * progress.js — VisualVoice
 * Reads and writes all user progress to Firestore.
 *
 * Functions exported:
 *  getUserData(uid)                 → full user doc
 *  updateStreak(uid)                → call on every login; handles streak logic
 *  addXP(uid, amount)               → adds XP, updates league, checks trophies
 *  completLesson(uid, unitId, lessonId, xpEarned)
 *  getUserProgress(uid)             → returns { xp, streak, league, trophies, unitProgress, ... }
 *  checkAndAwardTrophies(uid, data) → internal: compares data against trophy rules
 */

import { db } from './firebase.js';

import {
    doc,
    getDoc,
    updateDoc,
    increment,
    arrayUnion,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Trophy definitions ────────────────────────────────────────
// Add more here as you create new lessons.
export const TROPHY_DEFS = [
    { id: 'first-sign',    emoji: '🌟', name: 'First Sign',    desc: 'Complete your first lesson',         check: d => d.lessonsCompleted >= 1 },
    { id: 'on-fire',       emoji: '🔥', name: 'On Fire',       desc: 'Reach a 7-day streak',               check: d => d.streak >= 7 },
    { id: 'abc-pro',       emoji: '🔤', name: 'ABC Pro',       desc: 'Complete all Alphabet lessons',       check: d => (d.unitProgress?.['unit-alphabet']?.lessonsComplete || []).length >= 7 },
    { id: 'gold-league',   emoji: '🥇', name: 'Gold League',   desc: 'Reach the Gold League',              check: d => d.league === 'Gold' || d.league === 'Diamond' },
    { id: 'speed-signer',  emoji: '⚡', name: 'Speed Signer',  desc: 'Earn 500 XP total',                  check: d => d.xp >= 500 },
    { id: 'diamond',       emoji: '💎', name: 'Diamond',       desc: 'Reach the Diamond League',           check: d => d.league === 'Diamond' },
    { id: '100-lessons',   emoji: '🏅', name: '100 Lessons',   desc: 'Complete 100 lessons',               check: d => d.lessonsCompleted >= 100 },
    { id: 'perfect-week',  emoji: '🎯', name: 'Perfect Week',  desc: 'Maintain a 14-day streak',           check: d => d.streak >= 14 },
    { id: 'night-owl',     emoji: '🦉', name: 'Night Owl',     desc: 'Practice on 30 different days',      check: d => d.lessonsCompleted >= 30 },
];

// ── League thresholds ─────────────────────────────────────────
function getLeague(totalXp) {
    if (totalXp >= 5000) return 'Diamond';
    if (totalXp >= 2000) return 'Gold';
    if (totalXp >= 500)  return 'Silver';
    return 'Bronze';
}

// ── Get full user data ────────────────────────────────────────
export async function getUserData(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() };
}

// ── Streak logic ──────────────────────────────────────────────
// Called on every login. Increments streak if last login was yesterday,
// resets streak to 1 if more than a day was missed, keeps if same day.
export async function updateStreak(uid) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const today = todayStr();
    const last = data.lastLoginDate || '';

    if (last === today) return; // Already updated today

    const yesterday = yesterdayStr();
    let newStreak;

    if (last === yesterday) {
        // Consecutive day — continue streak
        newStreak = (data.streak || 0) + 1;
    } else if (!last) {
        // Brand new account
        newStreak = 1;
    } else {
        // Missed a day — reset streak
        newStreak = 1;
    }

    // Also give daily login XP bonus (+50) if this is first login today
    await updateDoc(ref, {
        streak: newStreak,
        lastLoginDate: today,
        xp: increment(50),
        weeklyXp: increment(50),
    });

    // Re-fetch to check league and trophies with new XP
    const updated = await getDoc(ref);
    await _syncLeagueAndTrophies(uid, updated.data());
}

// ── Add XP ───────────────────────────────────────────────────
export async function addXP(uid, amount) {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, {
        xp: increment(amount),
        weeklyXp: increment(amount),
    });
    const snap = await getDoc(ref);
    await _syncLeagueAndTrophies(uid, snap.data());
}

// ── Complete a Lesson ─────────────────────────────────────────
export async function completeLesson(uid, unitId, lessonId, xpEarned = 10) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const data = snap.data();

    const alreadyDone = (data.unitProgress?.[unitId]?.lessonsComplete || []).includes(lessonId);

    const updates = {
        xp: increment(xpEarned),
        weeklyXp: increment(xpEarned),
    };

    if (!alreadyDone) {
        // Only count unique completions
        updates.lessonsCompleted = increment(1);
        updates[`unitProgress.${unitId}.lessonsComplete`] = arrayUnion(lessonId);
    }

    updates[`unitProgress.${unitId}.lastAccessed`] = serverTimestamp();

    await updateDoc(ref, updates);

    const updated = await getDoc(ref);
    const newTrophies = await _syncLeagueAndTrophies(uid, updated.data());
    return { newTrophies };
}

// ── Get progress summary (for dashboard rendering) ───────────
export async function getUserProgress(uid) {
    const data = await getUserData(uid);
    if (!data) return null;

    const xpToNextLeague = _xpToNextLeague(data.xp);
    const weeklyXpGoal = 1000; // XP needed for weekly leaderboard milestone

    return {
        name:             data.name || 'Learner',
        email:            data.email || '',
        xp:               data.xp || 0,
        weeklyXp:         data.weeklyXp || 0,
        weeklyXpGoal,
        streak:           data.streak || 0,
        hearts:           data.hearts ?? 5,
        gems:             data.gems || 0,
        league:           data.league || 'Bronze',
        lessonsCompleted: data.lessonsCompleted || 0,
        trophies:         data.trophies || [],
        unitProgress:     data.unitProgress || {},
        xpToNextLeague,
        lastLoginDate:    data.lastLoginDate || '',
    };
}

// ── Internal: sync league label and check new trophies ───────
async function _syncLeagueAndTrophies(uid, data) {
    const ref = doc(db, 'users', uid);
    const newLeague = getLeague(data.xp || 0);
    const newlyEarned = [];

    // Find trophies that are now earned but not yet awarded
    const alreadyHas = data.trophies || [];
    for (const t of TROPHY_DEFS) {
        if (!alreadyHas.includes(t.id) && t.check(data)) {
            newlyEarned.push(t.id);
        }
    }

    const updates = { league: newLeague };
    if (newlyEarned.length > 0) {
        updates.trophies = arrayUnion(...newlyEarned);
    }

    await updateDoc(ref, updates);
    return newlyEarned; // Return so UI can show "trophy earned!" popup
}

// ── XP needed to reach next league ───────────────────────────
function _xpToNextLeague(xp) {
    if (xp < 500)  return { next: 'Silver',  needed: 500 - xp,  current: xp,         goal: 500 };
    if (xp < 2000) return { next: 'Gold',    needed: 2000 - xp, current: xp - 500,    goal: 1500 };
    if (xp < 5000) return { next: 'Diamond', needed: 5000 - xp, current: xp - 2000,   goal: 3000 };
    return { next: null, needed: 0, current: xp, goal: xp };
}

// ── Date helpers ─────────────────────────────────────────────
function todayStr() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
