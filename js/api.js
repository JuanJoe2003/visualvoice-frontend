/**
 * api.js — VisualVoice
 * Thin connector layer: sends data to/from the backend.
 * Replace BASE_URL with your actual server endpoint.
 */

const API = (() => {
    const BASE_URL = 'http://localhost:5000/api'; // ← Change to your backend URL

    // ── Helpers ──────────────────────────────────────────────────────────

    async function _post(path, data) {
        try {
            const res = await fetch(`${BASE_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`[API] POST ${path} failed:`, err.message);
            return null;
        }
    }

    async function _get(path) {
        try {
            const res = await fetch(`${BASE_URL}${path}`);
            if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`[API] GET ${path} failed:`, err.message);
            return null;
        }
    }

    // ── Sign Detection ────────────────────────────────────────────────────

    /**
     * Send a captured frame (base64 JPEG) to the backend for sign detection.
     * @param {string} imageBase64  — Base64-encoded image string (no prefix needed)
     * @param {string} lessonId     — Current lesson ID e.g. 'asl-a'
     * @returns {Promise<{ predicted: string, confidence: number } | null>}
     */
    async function detectSign(imageBase64, lessonId) {
        const result = await _post('/detect', {
            image: imageBase64,
            lesson_id: lessonId,
        });
        // Expected response: { predicted: "A", confidence: 0.92 }
        return result;
    }

    // ── Progress ──────────────────────────────────────────────────────────

    /**
     * Report lesson completion to the backend.
     * @param {object} payload
     * @param {string} payload.lessonId
     * @param {number} payload.correct
     * @param {number} payload.total
     * @param {number} payload.xp
     * @param {number} payload.durationSeconds
     */
    async function submitProgress(payload) {
        return await _post('/progress', payload);
    }

    /**
     * Fetch user stats from the backend.
     * @returns {Promise<{ xp: number, streak: number, level: number } | null>}
     */
    async function getUserStats() {
        return await _get('/user/stats');
    }

    // ── Auth ──────────────────────────────────────────────────────────────

    /**
     * Log in with email + password.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ token: string, user: object } | null>}
     */
    async function login(email, password) {
        return await _post('/auth/login', { email, password });
    }

    /**
     * Sign up a new user.
     * @param {string} name
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ token: string, user: object } | null>}
     */
    async function signup(name, email, password) {
        return await _post('/auth/signup', { name, email, password });
    }

    // ── Public API ────────────────────────────────────────────────────────
    return { detectSign, submitProgress, getUserStats, login, signup };
})();
