/**
 * learn.js — VisualVoice
 * Handles lesson unit rendering, lesson selection popup, and navigation to practice.
 */

// ===== DATA =====
const UNITS = [
    {
        id: 'unit-basics',
        title: 'Basic Greetings',
        icon: '🌱',
        state: 'done',        // 'done' | 'current' | 'locked'
        progress: 100,
        barClass: 'fill-green',
        lessons: [
            { id: 'hello', emoji: '👋', name: 'Hello', hint: 'Open hand, wave side to side', state: 'done', xp: 10, time: '2 min', stars: 3 },
            { id: 'thank-you', emoji: '🙏', name: 'Thank You', hint: 'Flat hand from chin outward', state: 'done', xp: 10, time: '2 min', stars: 3 },
            { id: 'please', emoji: '🤲', name: 'Please', hint: 'Rub flat hand on chest in circles', state: 'done', xp: 10, time: '2 min', stars: 2 },
            { id: 'sorry', emoji: '😔', name: 'Sorry', hint: 'Fist circles on chest', state: 'done', xp: 10, time: '3 min', stars: 3 },
        ]
    },
    {
        id: 'unit-alphabet',
        title: 'Alphabet & Numbers',
        icon: '🌿',
        state: 'current',
        progress: 60,
        barClass: 'fill-gold',
        lessons: [
            { id: 'asl-a', emoji: '🤜', name: 'Letter A', hint: 'Closed fist, thumb to side', state: 'done', xp: 10, time: '2 min', stars: 3 },
            { id: 'asl-b', emoji: '✋', name: 'Letter B', hint: 'Four fingers up, thumb folded', state: 'done', xp: 10, time: '2 min', stars: 3 },
            { id: 'asl-c', emoji: '🤌', name: 'Letter C', hint: 'Curved hand forming C shape', state: 'done', xp: 10, time: '2 min', stars: 2 },
            { id: 'asl-d', emoji: '☝️', name: 'Letter D', hint: 'Index up, other fingers touch thumb', state: 'current', xp: 10, time: '2 min', stars: 0 },
            { id: 'asl-e', emoji: '🤏', name: 'Letter E', hint: 'Fingers bent, touching thumb', state: 'locked', xp: 10, time: '2 min', stars: 0 },
            { id: 'asl-f', emoji: '👌', name: 'Letter F', hint: 'Index & thumb circle, others up', state: 'locked', xp: 10, time: '2 min', stars: 0 },
            { id: 'numbers', emoji: '🔢', name: '1 – 10', hint: 'Numbers in ASL finger counting', state: 'locked', xp: 15, time: '4 min', stars: 0 },
        ]
    },
    {
        id: 'unit-phrases',
        title: 'Common Phrases',
        icon: '🌳',
        state: 'locked',
        progress: 0,
        barClass: 'fill-blue',
        lessons: [
            { id: 'my-name', emoji: '🙋', name: 'My Name Is', hint: 'Two H hands tap twice', state: 'locked', xp: 15, time: '4 min', stars: 0 },
            { id: 'how-are-you', emoji: '🤔', name: 'How Are You?', hint: 'Bent hands move up together', state: 'locked', xp: 15, time: '4 min', stars: 0 },
            { id: 'nice-meet', emoji: '🤝', name: 'Nice to Meet You', hint: 'Flat hands slide together', state: 'locked', xp: 15, time: '4 min', stars: 0 },
            { id: 'where', emoji: '🗺️', name: 'Where?', hint: 'Index finger wags side to side', state: 'locked', xp: 15, time: '3 min', stars: 0 },
        ]
    },
    {
        id: 'unit-advanced',
        title: 'Advanced Conversations',
        icon: '🏔️',
        state: 'locked',
        progress: 0,
        barClass: 'fill-blue',
        lessons: [
            { id: 'family', emoji: '👨‍👩‍👧', name: 'Family Signs', hint: 'Learn mother, father, sibling...', state: 'locked', xp: 20, time: '6 min', stars: 0 },
            { id: 'feelings', emoji: '😊', name: 'Feelings', hint: 'Happy, sad, angry, excited...', state: 'locked', xp: 20, time: '6 min', stars: 0 },
            { id: 'colors', emoji: '🌈', name: 'Colors', hint: 'Red, blue, green, yellow...', state: 'locked', xp: 20, time: '5 min', stars: 0 },
        ]
    }
];

// ===== STATE =====
let activeLesson = null;

// ===== RENDER =====
function renderUnits() {
    const container = document.getElementById('units-container');
    container.innerHTML = '';

    UNITS.forEach(unit => {
        const section = document.createElement('div');
        section.className = 'unit-section';

        const headerStateClass = {
            done: 'unit-done',
            current: 'unit-current',
            locked: 'unit-locked'
        }[unit.state];

        const badgeClass = {
            done: 'badge-done',
            current: 'badge-current',
            locked: 'badge-locked'
        }[unit.state];

        const badgeText = {
            done: '✓ Complete',
            current: 'In Progress',
            locked: '🔒 Locked'
        }[unit.state];

        const progressBar = unit.state !== 'locked'
            ? `<div class="unit-progress-wrap">
                <div style="font-size:0.7rem;font-weight:800;color:var(--muted);">${unit.progress}% complete</div>
                <div class="unit-bar-track">
                    <div class="unit-bar-fill ${unit.barClass}" style="width:${unit.progress}%"></div>
                </div>
               </div>`
            : '';

        section.innerHTML = `
            <div class="unit-header ${headerStateClass}">
                <div class="unit-icon">${unit.icon}</div>
                <div class="unit-meta">
                    <div class="unit-title">${unit.title}</div>
                    <div class="unit-sub">${unit.lessons.length} lessons</div>
                    ${progressBar}
                </div>
                <div class="unit-badge ${badgeClass}">${badgeText}</div>
            </div>
            <div class="lessons-grid" id="grid-${unit.id}"></div>
        `;

        container.appendChild(section);

        // Render lesson nodes
        const grid = document.getElementById(`grid-${unit.id}`);
        unit.lessons.forEach((lesson, i) => {
            const row = document.createElement('div');
            row.className = 'lesson-row';

            const btnStateClass = {
                done: 'done',
                current: 'current',
                locked: 'locked-btn'
            }[lesson.state];

            const nodeClass = lesson.state === 'done' ? 'done' : lesson.state === 'current' ? 'current-node' : 'locked';

            const checkmark = lesson.state === 'done'
                ? `<div class="checkmark"><i class="fas fa-check"></i></div>` : '';

            const starBadge = lesson.state === 'current'
                ? `<div class="star-badge">⭐</div>` : '';

            const starsDisplay = lesson.stars > 0
                ? '⭐'.repeat(lesson.stars)
                : lesson.state === 'locked' ? '🔒' : '○○○';

            row.innerHTML = `
                <div class="lesson-node ${nodeClass}" onclick="${lesson.state !== 'locked' ? `showLessonPopup(${JSON.stringify(lesson).replace(/"/g, '&quot;')}, event)` : 'showLockedMsg()'}">
                    <div class="lesson-btn ${btnStateClass}">
                        ${lesson.emoji}
                        ${checkmark}
                        ${starBadge}
                    </div>
                    <div class="lesson-label">${lesson.name}</div>
                </div>
            `;

            grid.appendChild(row);
        });
    });
}

// ===== POPUP =====
function showLessonPopup(lesson, event) {
    activeLesson = lesson;
    const popup = document.getElementById('lesson-popup');
    const starsStr = lesson.stars > 0 ? '⭐'.repeat(lesson.stars) : '—';

    document.getElementById('popup-emoji').textContent = lesson.emoji;
    document.getElementById('popup-title').textContent = lesson.name;
    document.getElementById('popup-sub').textContent = lesson.hint;
    document.getElementById('popup-xp').innerHTML = `+${lesson.xp} XP<span>Reward</span>`;
    document.getElementById('popup-time').innerHTML = `${lesson.time}<span>Duration</span>`;
    document.getElementById('popup-stars').innerHTML = `${starsStr}<span>Best</span>`;

    const btn = document.getElementById('popup-btn');
    btn.textContent = lesson.state === 'done' ? 'Practice Again 🔁' : 'Start Lesson 🚀';

    // Position popup near click but keep in viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const px = event.clientX;
    const py = event.clientY;

    popup.classList.add('show');

    requestAnimationFrame(() => {
        const pw = popup.offsetWidth;
        const ph = popup.offsetHeight;
        let left = px + 16;
        let top = py - 20;
        if (left + pw > vw - 20) left = px - pw - 16;
        if (top + ph > vh - 20) top = vh - ph - 20;
        if (top < 20) top = 20;
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    });
}

function closePopup() {
    document.getElementById('lesson-popup').classList.remove('show');
    activeLesson = null;
}

function showLockedMsg() {
    // Brief shake animation
    const nodes = document.querySelectorAll('.lesson-node.locked .lesson-btn');
    nodes.forEach(n => {
        n.style.animation = 'none';
        setTimeout(() => n.style.animation = '', 10);
    });
}

function startLesson() {
    if (!activeLesson) return;

    // Save lesson context and navigate to practice
    sessionStorage.setItem('vv_lesson', JSON.stringify(activeLesson));
    window.location.href = 'practice.html';
}

// Close popup when clicking outside
document.addEventListener('click', (e) => {
    const popup = document.getElementById('lesson-popup');
    if (popup.classList.contains('show') && !popup.contains(e.target) && !e.target.closest('.lesson-node')) {
        closePopup();
    }
});

// Sidebar toggle (mobile)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ===== INIT =====
renderUnits();
