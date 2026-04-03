/**
 * practice.js — VisualVoice
 * Handles webcam lifecycle, frame capture, sign detection, scoring, and lesson flow.
 */

// ===== LESSON DATA FALLBACK =====
// If navigated directly (not from learn.html), use a demo alphabet lesson.
const DEMO_LESSON = {
    id: 'asl-alphabet-demo',
    name: 'Alphabet A–F',
    emoji: '🔤',
    signs: [
        { id: 'asl-a', emoji: '🤜', letter: 'A', word: 'Alpha',   hint: 'Closed fist, thumb resting on the side', steps: ['Make a fist with your dominant hand', 'Rest your thumb on the side of your index finger', 'Hold palm facing forward'] },
        { id: 'asl-b', emoji: '✋', letter: 'B', word: 'Bravo',   hint: 'Four fingers straight up, thumb folded',  steps: ['Hold all four fingers straight up together', 'Fold your thumb across your palm', 'Keep palm flat and facing outward'] },
        { id: 'asl-c', emoji: '🤌', letter: 'C', word: 'Charlie', hint: 'Curve your hand to form a "C"',            steps: ['Curve all fingers and thumb', 'Leave space between fingers and thumb', 'Shape resembles the letter C'] },
        { id: 'asl-d', emoji: '☝️', letter: 'D', word: 'Delta',   hint: 'Index finger up, others touch thumb',      steps: ['Point your index finger straight up', 'Bend middle, ring, and pinky to touch thumb', 'Index and thumb form a circle'] },
        { id: 'asl-e', emoji: '🤏', letter: 'E', word: 'Echo',    hint: 'All fingers bent, touching thumb',          steps: ['Bend all four fingers inward at knuckles', 'Touch fingertips to the thumb', 'Keep the shape compact and close'] },
        { id: 'asl-f', emoji: '👌', letter: 'F', word: 'Foxtrot', hint: 'Index & thumb make circle, others up',      steps: ['Touch index fingertip to thumb tip', 'Extend the other three fingers upward', 'Palm can face you or slightly outward'] },
    ]
};

// ===== STATE =====
let lesson = null;
let signs = [];
let currentIndex = 0;
let scoreCorrect = 0;
let scoreWrong = 0;
let scoreXP = 0;
let hearts = 3;
let sessionStart = Date.now();
let cameraActive = false;
let videoStream = null;
let captureInProgress = false;
let detectionLoop = null;

// ===== INIT =====
function init() {
    // Load lesson from sessionStorage (set by learn.js) or fall back to demo
    const stored = sessionStorage.getItem('vv_lesson');
    if (stored) {
        const lessonMeta = JSON.parse(stored);
        // Build a minimal signs array from meta — in a real app
        // you'd fetch lesson signs from the backend here.
        lesson = lessonMeta;
        signs = buildSignsFromMeta(lessonMeta);
    } else {
        lesson = DEMO_LESSON;
        signs = DEMO_LESSON.signs;
    }

    updateProgressBar();
    loadSign(currentIndex);
}

// Build sign list from lesson meta (single-sign lesson from learn.js)
function buildSignsFromMeta(meta) {
    if (meta.signs) return meta.signs;          // Already has signs array
    // Single-sign lesson — create one item
    return [{
        id: meta.id,
        emoji: meta.emoji,
        letter: meta.name,
        word: meta.hint || '',
        hint: meta.hint || '',
        steps: [
            'Position your hand clearly in the camera frame',
            'Hold the sign steady for 1–2 seconds',
            'Press "Capture Sign" when ready',
        ]
    }];
}

// ===== LOAD SIGN =====
function loadSign(index) {
    if (index >= signs.length) {
        finishLesson();
        return;
    }

    const sign = signs[index];

    // Target sign card
    document.getElementById('target-emoji').textContent = sign.emoji;
    document.getElementById('target-name').textContent = sign.letter;
    document.getElementById('target-hint').textContent = sign.hint || '';

    // Reference panel
    document.getElementById('ref-emoji').textContent = sign.emoji;
    document.getElementById('ref-letter').textContent = sign.letter;
    document.getElementById('ref-word').textContent = sign.word || '';

    // Steps
    const stepsList = document.getElementById('steps-list');
    stepsList.innerHTML = '';
    (sign.steps || []).forEach((step, i) => {
        const el = document.createElement('div');
        el.className = `step-item ${i === 0 ? 'active' : ''}`;
        el.id = `step-${i}`;
        el.innerHTML = `<div class="step-num">${i + 1}</div>${step}`;
        stepsList.appendChild(el);
    });

    // Reset result card
    hideResult();
    resetDetectionBar();
    updateProgressBar();

    // Reset webcam container state
    setWebcamState('');
}

// ===== PROGRESS BAR =====
function updateProgressBar() {
    const total = signs.length;
    const pct = total > 0 ? Math.round((currentIndex / total) * 100) : 0;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-label').textContent = `${currentIndex} / ${total}`;
}

// ===== CAMERA =====
async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        const video = document.getElementById('webcam-video');
        video.srcObject = videoStream;
        await video.play();

        cameraActive = true;
        document.getElementById('cam-overlay').classList.add('hidden');
        document.getElementById('capture-btn').disabled = false;

        setDetectionState('active', 'Camera active — show your sign');
        startDetectionLoop();
    } catch (err) {
        console.error('Camera error:', err);
        setDetectionState('', 'Camera access denied. Please allow camera permission.');
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        videoStream = null;
        cameraActive = false;
    }
    stopDetectionLoop();
}

// ===== DETECTION LOOP (live feedback) =====
function startDetectionLoop() {
    detectionLoop = setInterval(async () => {
        if (!cameraActive || captureInProgress) return;
        const frame = captureFrame();
        if (!frame) return;

        // Call API for live confidence preview (non-blocking)
        const sign = signs[currentIndex];
        if (!sign) return;

        const result = await API.detectSign(frame, sign.id).catch(() => null);
        if (!result) return;

        const conf = Math.round((result.confidence || 0) * 100);
        document.getElementById('confidence-fill').style.width = conf + '%';

        if (conf > 50) {
            document.getElementById('detection-pct').textContent = conf + '%';
            document.getElementById('detection-label').textContent =
                `Detecting: ${result.predicted || '?'} (${conf}%)`;
        }
    }, 1500); // Check every 1.5s
}

function stopDetectionLoop() {
    if (detectionLoop) {
        clearInterval(detectionLoop);
        detectionLoop = null;
    }
}

// ===== CAPTURE =====
async function captureSign() {
    if (!cameraActive || captureInProgress) return;

    captureInProgress = true;
    const captureBtn = document.getElementById('capture-btn');
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';

    const frame = captureFrame();
    const sign = signs[currentIndex];

    setDetectionState('active', 'Analyzing your sign...');

    // Advance step indicator to show processing
    advanceStep(1);

    let result = null;

    // Try real API first
    if (frame) {
        result = await API.detectSign(frame, sign.id).catch(() => null);
    }

    // FALLBACK: simulate a result if backend isn't connected yet
    if (!result) {
        result = simulateDetection(sign);
    }

    const isCorrect = result.predicted === sign.letter && result.confidence >= 0.6;

    setTimeout(() => {
        handleDetectionResult(isCorrect, result);
        captureInProgress = false;
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Sign';
    }, 600);
}

function captureFrame() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('webcam-canvas');
    if (!video || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Return base64 JPEG (strip prefix for API)
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

// Simulated detection for development / offline mode
function simulateDetection(sign) {
    const confidence = 0.5 + Math.random() * 0.45; // 0.50 – 0.95
    const correct = Math.random() > 0.25; // 75% chance correct
    return {
        predicted: correct ? sign.letter : 'X',
        confidence: correct ? confidence : 0.3 + Math.random() * 0.2
    };
}

// ===== HANDLE RESULT =====
function handleDetectionResult(isCorrect, result) {
    const conf = Math.round((result.confidence || 0) * 100);

    if (isCorrect) {
        scoreCorrect++;
        scoreXP += 10;
        setWebcamState('correct');
        setDetectionState('correct', `✓ ${result.predicted} detected — ${conf}% confidence`);
        showResult(true, result);
        updateScores();
        spawnXpFloat('+10 XP');
        advanceStep(2);
    } else {
        scoreWrong++;
        hearts = Math.max(0, hearts - 1);
        setWebcamState('wrong');
        setDetectionState('wrong', `✗ Detected: ${result.predicted || '?'} (${conf}%) — Try again`);
        showResult(false, result);
        updateHearts();
        updateScores();

        if (hearts === 0) {
            setTimeout(finishLesson, 2000);
        }
    }
}

// ===== UI HELPERS =====
function setWebcamState(state) {
    const container = document.getElementById('webcam-container');
    container.className = 'webcam-container';
    if (state) container.classList.add(state);
}

function setDetectionState(dotState, label) {
    const dot = document.getElementById('detection-dot');
    dot.className = 'detection-dot';
    if (dotState) dot.classList.add(dotState);
    document.getElementById('detection-label').textContent = label;
}

function resetDetectionBar() {
    setDetectionState('active', cameraActive ? 'Camera active — show your sign' : 'Camera not started');
    document.getElementById('confidence-fill').style.width = '0%';
    document.getElementById('detection-pct').textContent = '—';
}

function advanceStep(toIndex) {
    document.querySelectorAll('.step-item').forEach((el, i) => {
        el.classList.remove('active');
        if (i < toIndex) el.classList.add('done');
        if (i === toIndex) el.classList.add('active');
    });
}

function updateScores() {
    document.getElementById('score-correct').textContent = scoreCorrect;
    document.getElementById('score-wrong').textContent = scoreWrong;
    document.getElementById('score-xp').textContent = scoreXP;
}

function updateHearts() {
    for (let i = 1; i <= 3; i++) {
        const h = document.getElementById(`h${i}`);
        if (h) h.classList.toggle('lost', i > hearts);
    }
}

function showResult(isCorrect, result) {
    const card = document.getElementById('result-card');
    const emoji = document.getElementById('result-emoji');
    const title = document.getElementById('result-title');
    const sub = document.getElementById('result-sub');
    const xpEl = document.getElementById('result-xp');

    card.className = 'result-card';

    if (isCorrect) {
        card.classList.add('show', 'correct-card');
        emoji.textContent = ['🎉','✅','🌟','🔥','🙌'][Math.floor(Math.random() * 5)];
        title.className = 'result-title correct-text';
        title.textContent = ['Great Sign!', 'Perfect!', 'Nailed it!', 'Well done!'][Math.floor(Math.random() * 4)];
        sub.textContent = `You signed "${signs[currentIndex]?.letter}" correctly!`;
        xpEl.textContent = '+10 XP';
        xpEl.style.display = '';
    } else {
        card.classList.add('show', 'wrong-card');
        emoji.textContent = ['😅','💪','🤔','😬'][Math.floor(Math.random() * 4)];
        title.className = 'result-title wrong-text';
        title.textContent = ['Keep Trying!', 'Not quite…', 'Almost!'][Math.floor(Math.random() * 3)];
        sub.textContent = `Make sure your "${signs[currentIndex]?.letter}" is clear and steady.`;
        xpEl.style.display = 'none';
    }
}

function hideResult() {
    const card = document.getElementById('result-card');
    card.className = 'result-card';
}

function nextSign() {
    if (currentIndex < signs.length - 1) {
        currentIndex++;
        loadSign(currentIndex);
    } else {
        finishLesson();
    }
}

function skipSign() {
    if (currentIndex < signs.length - 1) {
        scoreWrong++;
        updateScores();
        currentIndex++;
        loadSign(currentIndex);
    } else {
        finishLesson();
    }
}

// ===== XP FLOAT =====
function spawnXpFloat(text) {
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = text;
    const targetCard = document.getElementById('score-xp');
    const rect = targetCard.getBoundingClientRect();
    el.style.left = rect.left + rect.width / 2 + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
}

// ===== FINISH =====
async function finishLesson() {
    stopCamera();
    stopDetectionLoop();

    const total = scoreCorrect + scoreWrong;
    const accuracy = total > 0 ? Math.round((scoreCorrect / total) * 100) : 0;
    const duration = Math.round((Date.now() - sessionStart) / 1000);

    // Submit progress to backend
    await API.submitProgress({
        lessonId: lesson.id,
        correct: scoreCorrect,
        total,
        xp: scoreXP,
        durationSeconds: duration,
    }).catch(() => null);

    // Show celebration
    document.getElementById('cel-correct').textContent = scoreCorrect;
    document.getElementById('cel-xp').textContent = scoreXP;
    document.getElementById('cel-accuracy').textContent = accuracy + '%';
    document.getElementById('cel-sub').textContent =
        `${signs.length} signs · ${scoreCorrect} correct · ${duration}s`;

    document.getElementById('celebration').classList.add('show');
}

// ===== BOOTSTRAP =====
init();
