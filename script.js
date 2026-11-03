// ==========================================
// AZIZI ALFARIZKI // PLAYER 1 PORTFOLIO
// Modular Component Loader & Interactive Script
// ==========================================

// 1. Inisialisasi Audio Context untuk Chiptune SFX
let audioCtx = null;
function play8BitSFX(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; // Karakteristik gelombang 8-bit NES/Game Boy

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'coin') {
            // Suara Koin Retro (B5 -> E6)
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.setValueAtTime(1318.51, now + 0.08);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'jump') {
            // Suara Lompatan Retro (Sweep Up)
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(650, now + 0.16);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === 'powerup') {
            // Suara Power-Up (Arpeggio Naik Cepat)
            const freqs = [330, 392, 523, 659, 784, 1046];
            freqs.forEach((f, i) => {
                osc.frequency.setValueAtTime(f, now + i * 0.05);
            });
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (err) {
        console.warn('Audio synthesis not supported or blocked:', err);
    }
}

// 2. Dynamic Component Loader (Memuat file per section)
async function loadComponents() {
    const includeElements = document.querySelectorAll('[data-include]');
    
    // Peringatan jika dibuka langsung via file://
    if (window.location.protocol === 'file:') {
        const warning = document.createElement('div');
        warning.className = 'fixed bottom-4 right-4 max-w-md bg-yellow-400 text-black border-4 border-black p-4 font-mono text-xs z-50 shadow-2xl';
        warning.innerHTML = `
            <div class="font-pixel text-[10px] font-bold pb-1">⚠️ [CORS NOTICE // LOCALHOST]</div>
            File HTML dipisah per section (modular). Mohon jalankan via Web Server Laragon agar browser mengizinkan pemuatan file:
            <div class="mt-2 font-bold underline">http://localhost/portfolio%20html/</div>
        `;
        document.body.appendChild(warning);
    }

    const loadPromises = Array.from(includeElements).map(async (el) => {
        const filePath = el.getAttribute('data-include');
        if (!filePath) return;

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            el.outerHTML = html;
        } catch (error) {
            console.error(`Gagal memuat komponen: ${filePath}`, error);
            el.innerHTML = `
                <div class="pixel-box p-4 text-center font-pixel text-xs text-red-400 border border-red-500">
                    [!] GAGAL MEMUAT ${filePath}. Pastikan membuka melalui Laragon (http://localhost/portfolio%20html).
                </div>
            `;
        }
    });

    await Promise.all(loadPromises);
}

// 3. Setup Interactive Features Setelah Komponen Selesai Dimuat
function setupInteractiveFeatures() {
    // Current Year di Footer
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Inisialisasi Tema Tersimpan
    const savedTheme = localStorage.getItem('portfolio-theme');
    const themeStatus = document.getElementById('theme-status');
    const themeIcon = document.getElementById('theme-icon');

    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (themeStatus) themeStatus.textContent = 'LIGHT';
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    // Inisialisasi 8-Bit Retro Snake Arcade Game
    initRetroSnakeGame();

    // Inisialisasi Daily Dev RPG Gacha & Interactive Terminal
    initDevGacha();
    initRetroTerminal();

    // Inisialisasi Clean URL Navigation (Hapus #hash & index.html dari address bar)
    initCleanUrlNavigation();

    // Inisialisasi Retro Scroll Reveal (Animasi In & Out)
    initScrollReveal();
}

// ==========================================
// 8-BIT RETRO SNAKE ARCADE GAME ENGINE
// ==========================================
let redrawSnakeGame = null;

function initRetroSnakeGame() {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('snake-score');
    const highscoreEl = document.getElementById('snake-highscore');
    const statusEl = document.getElementById('snake-status-text');
    const overlay = document.getElementById('snake-overlay');
    const startBtn = document.getElementById('snake-start-btn');
    const msgTitle = document.getElementById('snake-msg-title');
    const msgSubtitle = document.getElementById('snake-msg-subtitle');

    // Dimensi Grid: Canvas 480x240 -> 48x24 cells berukuran 10px
    const GRID_SIZE = 10;
    const COLS = Math.floor(canvas.width / GRID_SIZE); // 48
    const ROWS = Math.floor(canvas.height / GRID_SIZE); // 24

    let snake = [
        { x: 15, y: 12 },
        { x: 14, y: 12 },
        { x: 13, y: 12 }
    ];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = { x: 28, y: 12 };
    let score = 0;
    let highScore = parseInt(localStorage.getItem('snake-highscore') || '0', 10);
    let gameLoop = null;
    let isRunning = false;
    let isGameOver = false;

    if (highscoreEl) highscoreEl.textContent = String(highScore).padStart(2, '0');

    function spawnFood() {
        let valid = false;
        while (!valid) {
            food = {
                x: Math.floor(Math.random() * COLS),
                y: Math.floor(Math.random() * ROWS)
            };
            valid = !snake.some(seg => seg.x === food.x && seg.y === food.y);
        }
    }

    function setDirection(newDir) {
        if (!isRunning || isGameOver) return;
        // Mencegah ular berbalik arah 180 derajat ke badannya sendiri
        if (newDir.x !== 0 && dir.x === -newDir.x) return;
        if (newDir.y !== 0 && dir.y === -newDir.y) return;
        nextDir = newDir;
    }

    function update() {
        if (!isRunning || isGameOver) return;

        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Tabrakan Dinding (Mati gaya klasik Nokia 3310 / Arcade)
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
            triggerGameOver();
            return;
        }

        // Tabrakan dengan Tubuh Sendiri
        if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
            triggerGameOver();
            return;
        }

        // Ular maju
        snake.unshift(head);

        // Ular makan makanan (Tumbuh 1 segmen)
        if (head.x === food.x && head.y === food.y) {
            score += 1;
            if (scoreEl) scoreEl.textContent = String(score).padStart(2, '0');
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('snake-highscore', highScore);
                if (highscoreEl) highscoreEl.textContent = String(highScore).padStart(2, '0');
            }
            play8BitSFX('coin');
            spawnFood();
        } else {
            // Ekor dilepas jika tidak makan (panjang tidak bertambah)
            snake.pop();
        }

        render();
    }

    function render() {
        const isLight = document.body.classList.contains('light-mode');

        // Background Retro Canvas
        ctx.fillStyle = isLight ? '#f5f5f0' : '#0c0c0c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pola Grid Titik Retro
        ctx.fillStyle = isLight ? '#deded8' : '#1c1c1c';
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if ((x + y) % 2 === 0) {
                    ctx.fillRect(x * GRID_SIZE + 4, y * GRID_SIZE + 4, 2, 2);
                }
            }
        }

        // Gambar Makanan (Pixel Fruit)
        ctx.fillStyle = isLight ? '#dc2626' : '#22c55e';
        ctx.fillRect(food.x * GRID_SIZE + 1, food.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        ctx.fillStyle = isLight ? '#ffffff' : '#000000';
        ctx.fillRect(food.x * GRID_SIZE + 3, food.y * GRID_SIZE + 3, 4, 4);

        // Gambar Ular
        snake.forEach((seg, idx) => {
            if (idx === 0) {
                // Kepala Ular
                ctx.fillStyle = isLight ? '#111111' : '#ffffff';
                ctx.fillRect(seg.x * GRID_SIZE, seg.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

                // Mata Ular Sesuai Arah Gerak
                ctx.fillStyle = isLight ? '#ffffff' : '#000000';
                if (dir.x === 1) { // Kanan
                    ctx.fillRect(seg.x * GRID_SIZE + 6, seg.y * GRID_SIZE + 2, 2, 2);
                    ctx.fillRect(seg.x * GRID_SIZE + 6, seg.y * GRID_SIZE + 6, 2, 2);
                } else if (dir.x === -1) { // Kiri
                    ctx.fillRect(seg.x * GRID_SIZE + 2, seg.y * GRID_SIZE + 2, 2, 2);
                    ctx.fillRect(seg.x * GRID_SIZE + 2, seg.y * GRID_SIZE + 6, 2, 2);
                } else if (dir.y === -1) { // Atas
                    ctx.fillRect(seg.x * GRID_SIZE + 2, seg.y * GRID_SIZE + 2, 2, 2);
                    ctx.fillRect(seg.x * GRID_SIZE + 6, seg.y * GRID_SIZE + 2, 2, 2);
                } else { // Bawah
                    ctx.fillRect(seg.x * GRID_SIZE + 2, seg.y * GRID_SIZE + 6, 2, 2);
                    ctx.fillRect(seg.x * GRID_SIZE + 6, seg.y * GRID_SIZE + 6, 2, 2);
                }
            } else {
                // Badan Ular (Piksel Kotak Klasik)
                ctx.fillStyle = isLight ? '#333333' : '#cccccc';
                ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            }
        });
    }

    redrawSnakeGame = render;

    function triggerGameOver() {
        isGameOver = true;
        isRunning = false;
        clearInterval(gameLoop);
        gameLoop = null;

        play8BitSFX('powerup');
        if (statusEl) statusEl.textContent = 'DEAD';

        if (msgTitle) msgTitle.textContent = 'GAME OVER!';
        if (msgSubtitle) msgSubtitle.textContent = `FINAL SCORE: ${score}`;
        if (startBtn) startBtn.innerHTML = '<i class="fa-solid fa-rotate-right text-xs"></i> PLAY AGAIN';
        if (overlay) overlay.classList.remove('hidden');
    }

    function startGame() {
        snake = [
            { x: 15, y: 12 },
            { x: 14, y: 12 },
            { x: 13, y: 12 }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        if (scoreEl) scoreEl.textContent = '00';
        if (statusEl) statusEl.textContent = 'RUNNING';
        spawnFood();
        isGameOver = false;
        isRunning = true;
        if (overlay) overlay.classList.add('hidden');

        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(update, 115);
        render();
    }

    if (startBtn) {
        startBtn.onclick = () => {
            startGame();
        };
    }

    // Keyboard Controller (Arrow keys & WASD)
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'w'].includes(key)) {
            if (isRunning) e.preventDefault();
            setDirection({ x: 0, y: -1 });
        } else if (['arrowdown', 's'].includes(key)) {
            if (isRunning) e.preventDefault();
            setDirection({ x: 0, y: 1 });
        } else if (['arrowleft', 'a'].includes(key)) {
            if (isRunning) e.preventDefault();
            setDirection({ x: -1, y: 0 });
        } else if (['arrowright', 'd'].includes(key)) {
            if (isRunning) e.preventDefault();
            setDirection({ x: 1, y: 0 });
        } else if (key === ' ' || key === 'enter') {
            if (!isRunning) {
                e.preventDefault();
                startGame();
            }
        }
    });

    // D-Pad Touch / Mouse Controls
    document.addEventListener('click', (e) => {
        const dpad = e.target.closest('.snake-dpad');
        if (!dpad) return;
        const d = dpad.getAttribute('data-dir');
        if (d === 'UP') setDirection({ x: 0, y: -1 });
        if (d === 'DOWN') setDirection({ x: 0, y: 1 });
        if (d === 'LEFT') setDirection({ x: -1, y: 0 });
        if (d === 'RIGHT') setDirection({ x: 1, y: 0 });
    });

    render();
}

// 4. Global Event Delegation (Aman untuk elemen yang di-load dinamis)
document.addEventListener('click', (e) => {
    // Toggle Light / Night Theme
    const toggleThemeBtn = e.target.closest('#toggle-theme');
    if (toggleThemeBtn) {
        const isLight = document.body.classList.toggle('light-mode');
        const themeStatus = document.getElementById('theme-status');
        const themeIcon = document.getElementById('theme-icon');

        if (isLight) {
            if (themeStatus) themeStatus.textContent = 'LIGHT';
            if (themeIcon) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
            localStorage.setItem('portfolio-theme', 'light');
        } else {
            if (themeStatus) themeStatus.textContent = 'NIGHT';
            if (themeIcon) {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
            localStorage.setItem('portfolio-theme', 'night');
        }
        play8BitSFX('coin');
        if (typeof redrawSnakeGame === 'function') {
            redrawSnakeGame();
        }
    }

    // Toggle CRT Scanlines
    const toggleCrtBtn = e.target.closest('#toggle-crt');
    if (toggleCrtBtn) {
        const crtLayer = document.getElementById('scanlines-layer');
        const crtStatus = document.getElementById('crt-status');
        if (crtLayer && crtStatus) {
            if (crtLayer.classList.contains('hidden')) {
                crtLayer.classList.remove('hidden');
                crtStatus.textContent = 'ON';
            } else {
                crtLayer.classList.add('hidden');
                crtStatus.textContent = 'OFF';
            }
            play8BitSFX('coin');
        }
    }

    // Interactive SFX Sound Buttons
    const sfxBtn = e.target.closest('.sfx-btn');
    if (sfxBtn) {
        const soundType = sfxBtn.getAttribute('data-sound');
        play8BitSFX(soundType);
    }

    // Tech Box Item Slot Click (Retro SFX)
    const techBox = e.target.closest('.tech-box');
    if (techBox) {
        play8BitSFX('jump');
    }

    // Contact & Achievement Card Click (Retro SFX)
    const contactCard = e.target.closest('.contact-card');
    if (contactCard) {
        play8BitSFX('coin');
    }
});

// ==========================================
// DAILY DEVELOPER RPG GACHA ENGINE
// ==========================================
function initDevGacha() {
    const pullBtn = document.getElementById('gacha-pull-btn');
    const card = document.getElementById('gacha-card');
    const tierEl = document.getElementById('gacha-tier');
    const titleEl = document.getElementById('gacha-title');
    const descEl = document.getElementById('gacha-desc');
    const statEl = document.getElementById('gacha-stat');
    const countEl = document.getElementById('gacha-count');
    const statusEl = document.getElementById('gacha-status');

    if (!pullBtn || !card) return;

    let pullCount = 0;
    let isRolling = false;

    const gachaPool = [
        // ==========================================
        // ULTRA RARE [UR] - Jackpot Tingkat Dewa
        // ==========================================
        {
            tier: 'UR',
            color: '#c084fc',
            title: 'AURA SULTAN MENDADAK',
            desc: 'Tiba-tiba nemu uang 100 ribu di saku celana lama, ditambah hari ini bakal ada yang nraktir makan enak!',
            stat: 'BUFF: +999% REZEKI NOMPLOK // MAKAN GRATIS'
        },
        {
            tier: 'UR',
            color: '#c084fc',
            title: 'KARMIC GOD OF TENGGO',
            desc: 'Pekerjaan dan tugas beres tepat jam 17:00! Atasan lagi murah senyum, bebas lembur, langsung pulang santai!',
            stat: 'BUFF: +100% PULANG ON-TIME // 0% OVERTHINKING'
        },
        {
            tier: 'UR',
            color: '#c084fc',
            title: 'DEWA GREEN LIGHT & PARKIR SAKTI',
            desc: 'Semua lampu merah mendadak hijau saat kamu lewat, plus selalu dapat tempat parkir tepat di depan pintu masuk!',
            stat: 'BUFF: +500% HOKI JALANAN // ANTI-MACET'
        },

        // ==========================================
        // SUPER SUPER RARE [SSR] - Hoki & Berkah Tingkat Tinggi
        // ==========================================
        {
            tier: 'SSR',
            color: '#facc15',
            title: 'TIDUR PULAS ANTI-BEGADANG',
            desc: 'Malam ini kamu tidur 8 jam pulas tanpa overthinking, bangun pagi badan segar bugar tanpa sakit pinggang!',
            stat: 'BUFF: +100% REGEN ENERGI // PUNGGUNG SEHAT'
        },
        {
            tier: 'SSR',
            color: '#facc15',
            title: 'PESONA KARISMA LEVEL 99',
            desc: 'Semua orang yang kamu temui mendadak ramah, chat langsung dibalas kilat, dan ide-idemu disetujui tanpa debat!',
            stat: 'BUFF: +85% DAYA TARIK SOSIAL // PERSUASI MAKSIMAL'
        },
        {
            tier: 'SSR',
            color: '#facc15',
            title: 'BERKAH MAKANAN PORSI SULTAN',
            desc: 'Pesan makanan datang super kilat, porsinya ekstra melimpah plus dikasih es teh manis segar gratis!',
            stat: 'BUFF: +90% KENIKMATAN KULINER // PERUT KENYANG'
        },
        {
            tier: 'SSR',
            color: '#facc15',
            title: 'SAKTI APPROVED TANPA REVISI',
            desc: 'Proposal, tugas, laporan, atau urusan administratifmu langsung di-ACC di lembar pertama tanpa dicoret-coret!',
            stat: 'BUFF: 100% ACC INSTAN // NIKMAT DUNIAWI'
        },

        // ==========================================
        // SUPER RARE [SR] - Keberuntungan Harian Menyenangkan
        // ==========================================
        {
            tier: 'SR',
            color: '#38bdf8',
            title: 'BATERAI HP HEMAT SAKTI',
            desc: 'Baterai HP awet seharian meski lupa bawa charger, dan sinyal internet selalu full-bar 5G anti-buffering!',
            stat: 'BUFF: +60% KETAHANAN GADGET // BEBAS PANIK'
        },
        {
            tier: 'SR',
            color: '#38bdf8',
            title: 'AURA ANTI-DRAMA CIRCLE',
            desc: 'Hari ini kamu terhindar dari segala drama toxic dan gosip melelahkan. Pikiran tenang, adem, dan full senyum!',
            stat: 'BUFF: +75% KETENANGAN BATIN // FULL SENYUM'
        },
        {
            tier: 'SR',
            color: '#38bdf8',
            title: 'TANGAN DEWA FLASH SALE',
            desc: 'Berhasil klaim voucher diskon 50% dan gratis ongkir saat checkout tanpa kalah cepat dengan orang lain!',
            stat: 'BUFF: +70% PENGHEMATAN DOMPET // HOKI BELANJA'
        },
        {
            tier: 'SR',
            color: '#38bdf8',
            title: 'ALPUKAT MATANG SEMPURNA',
            desc: 'Setiap buah dan jajanan yang kamu beli hari ini rasanya pas, manis, dan matang sempurna tanpa bagian busuk!',
            stat: 'BUFF: +50% HOKI MAKANAN // KEPUASAN HAKIKI'
        },

        // ==========================================
        // RARE [R] - Keberuntungan Kecil Penghangat Hari
        // ==========================================
        {
            tier: 'R',
            color: '#4ade80',
            title: 'RACIKAN KOPI / TEH PAS',
            desc: 'Rasa manis dan hangat minuman yang kamu seduh hari ini pas banget di lidah, sukses menaikkan mood +30%!',
            stat: 'BUFF: +30% RELAKSASI PIKIRAN // MOOD BOOSTER'
        },
        {
            tier: 'R',
            color: '#4ade80',
            title: 'COLOKAN USB SEKALI TANCAP',
            desc: 'Berhasil mencolokkan kabel USB ke port-nya langsung pas di percobaan pertama tanpa perlu dibolak-balik!',
            stat: 'BUFF: +25% EFISIENSI TANGAN // KEPUASAN BATIN'
        },
        {
            tier: 'R',
            color: '#4ade80',
            title: 'PAYUNG GAIB PERJALANAN',
            desc: 'Langit mendung gelap sepanjang jalan, tapi hujan baru turun deras pas kamu baru saja melangkah masuk rumah!',
            stat: 'BUFF: +40% PERLINDUNGAN CUACA // TETAP KERING'
        },
        {
            tier: 'R',
            color: '#4ade80',
            title: 'PILIH ANTRIAN TEPAT',
            desc: 'Antrian kasir atau loket yang kamu pilih bergerak paling cepat dibanding antrian sebelah yang macet!',
            stat: 'BUFF: +35% HEMAT WAKTU // ANTI-KESAL'
        }
    ];

    pullBtn.onclick = () => {
        if (isRolling) return;
        isRolling = true;
        pullBtn.disabled = true;
        pullBtn.classList.add('opacity-50', 'cursor-not-allowed');
        if (statusEl) statusEl.textContent = 'ROLLING GACHA...';
        play8BitSFX('jump');

        let rollTicks = 0;
        const maxTicks = 8;
        const rollInterval = setInterval(() => {
            const randomItem = gachaPool[Math.floor(Math.random() * gachaPool.length)];
            tierEl.textContent = `[${randomItem.tier}]`;
            tierEl.style.borderColor = randomItem.color;
            tierEl.style.color = randomItem.color;
            titleEl.textContent = randomItem.title;
            statEl.textContent = randomItem.stat;
            rollTicks++;

            if (rollTicks >= maxTicks) {
                clearInterval(rollInterval);

                // Final Weighted Pick
                const rand = Math.random() * 100;
                let targetTier = 'R';
                if (rand < 10) targetTier = 'UR';
                else if (rand < 35) targetTier = 'SSR';
                else if (rand < 75) targetTier = 'SR';

                const tierPool = gachaPool.filter(item => item.tier === targetTier);
                const result = tierPool[Math.floor(Math.random() * tierPool.length)];

                tierEl.textContent = `[${result.tier}]`;
                tierEl.style.borderColor = result.color;
                tierEl.style.color = result.color;
                titleEl.textContent = result.title;
                descEl.textContent = result.desc;
                statEl.textContent = result.stat;

                pullCount++;
                if (countEl) countEl.textContent = pullCount;
                if (statusEl) {
                    statusEl.textContent = result.tier === 'UR' ? 'JACKPOT UR!!' : (result.tier === 'SSR' ? 'LUCKY SSR!' : 'PULL SUCCESS');
                }

                if (result.tier === 'UR' || result.tier === 'SSR') {
                    play8BitSFX('powerup');
                } else {
                    play8BitSFX('coin');
                }

                isRolling = false;
                pullBtn.disabled = false;
                pullBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }, 70);
    };
}

// ==========================================
// RETRO BROWSER CLI INTERACTIVE TERMINAL
// ==========================================
function initRetroTerminal() {
    const form = document.getElementById('terminal-form');
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    if (!form || !input || !output) return;

    const jokes = [
        "Kenapa programmer memakai kacamata? Karena mereka tidak bisa C#!",
        "Ada 10 tipe manusia di dunia: yang paham biner, dan yang tidak.",
        "Programmer: 'It works on my local machine!' -> DevOps: 'Kalau begitu bungkus komputermu ke production!'",
        "Kenapa developer benci alam liar? Karena terlalu banyak bug!",
        "Software Development: Seni mengubah kafein dan camilan menjadi baris kode yang berfungsi."
    ];

    function print(html, isCmd = false) {
        const div = document.createElement('div');
        div.className = isCmd ? 'text-green-400 font-bold' : 'text-gray-300';
        div.innerHTML = html;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }

    function execute(rawCmd) {
        const cmd = rawCmd.trim().toLowerCase();
        if (!cmd) return;

        print(`<span class="text-green-400 font-pixel text-[9px]">$</span> <span class="text-white">${rawCmd}</span>`, true);

        switch (cmd) {
            case 'help':
                print(`
                    <div class="text-yellow-400 font-pixel text-[9px] mb-1">AVAILABLE COMMANDS:</div>
                    <div class="space-y-0.5 text-[10px]">
                        <div>- <span class="text-green-400 font-bold">whoami</span>   : Inspect visitor session status</div>
                        <div>- <span class="text-green-400 font-bold">skills</span>   : View Azizi's tech inventory</div>
                        <div>- <span class="text-green-400 font-bold">projects</span> : List completed quests & systems</div>
                        <div>- <span class="text-green-400 font-bold">matrix</span>   : Trigger falling green cyber rain</div>
                        <div>- <span class="text-green-400 font-bold">joke</span>     : Tell a random dev joke</div>
                        <div>- <span class="text-green-400 font-bold">contact</span>  : Show transmission channels</div>
                        <div>- <span class="text-green-400 font-bold">date</span>     : Show system timestamp</div>
                        <div>- <span class="text-green-400 font-bold">clear</span>    : Clear terminal screen</div>
                    </div>
                `);
                play8BitSFX('coin');
                break;

            case 'whoami':
                print(`<span class="text-cyan-400">[USER]:</span> GUEST_RECRUITER [LV.99] | <span class="text-green-400">HOST:</span> azizi-os | <span class="text-yellow-400">PERM:</span> GRANTED`);
                play8BitSFX('coin');
                break;

            case 'skills':
                print(`
                    <div class="text-yellow-400 font-pixel text-[9px]">AZIZI TECH INVENTORY:</div>
                    <div class="text-[10px] text-gray-300">
                        [Frontend] React.js, Next.js, Tailwind CSS, Leaflet.js WebGIS<br>
                        [Backend]  PHP/Laravel, Golang REST API, Node.js/Express, MySQL, PostgreSQL<br>
                        [DevSec]   Bandit SAST, CodeQL CI/CD, Docker, Git
                    </div>
                `);
                play8BitSFX('coin');
                break;

            case 'projects':
                print(`
                    <div class="text-yellow-400 font-pixel text-[9px]">COMPLETED QUESTS:</div>
                    <div class="text-[10px] text-gray-300">
                        1. WebGIS Kampung Pancasila (SUS Score: 82.5)<br>
                        2. SIM Proyek CV Galaxy & Tiga Putra (Laravel)<br>
                        3. High-Performance Portal Pesantren (Golang)<br>
                        4. WebGIS Kawasan Tanpa Rokok (BRIDA Surabaya)
                    </div>
                `);
                play8BitSFX('coin');
                break;

            case 'matrix':
                print(`
                    <div class="text-green-400 font-pixel text-[9px] animate-pulse">
                        01000001 01011010 01001001 01011010 01001001<br>
                        SYSTEM OVERRIDE: MATRIX PROTOCOL ACTIVATED<br>
                        10110101 11000101 00101100 11110001 01010101<br>
                        [CYBER GRID SECURE // ALL SYSTEMS GO]
                    </div>
                `);
                play8BitSFX('powerup');
                break;

            case 'joke':
                const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
                print(`<span class="text-yellow-400">DEV_JOKE:</span> "${randomJoke}"`);
                play8BitSFX('jump');
                break;

            case 'contact':
                print(`
                    <div class="text-cyan-400 font-pixel text-[9px]">TRANSMISSION CHANNELS:</div>
                    <div class="text-[10px] text-gray-300">
                        Email    : azizialfarizki@gmail.com<br>
                        GitHub   : github.com/ziazizi11<br>
                        Location : Surabaya, Indonesia (UTC+7)
                    </div>
                `);
                play8BitSFX('coin');
                break;

            case 'date':
                print(`<span class="text-gray-400">SYSTEM TIME:</span> ${new Date().toLocaleString()}`);
                play8BitSFX('coin');
                break;

            case 'sudo':
            case 'sudo su':
                print(`<span class="text-red-400 font-bold">[PERMISSION DENIED]:</span> Nice try! User 'guest' is not in sudoers file. Incident reported to Azizi.`);
                play8BitSFX('powerup');
                break;

            case 'clear':
                output.innerHTML = `
                    <div class="text-green-400 font-pixel text-[9px]">> azizi-os kernel v2.6.0 initialized.</div>
                    <div class="text-gray-400">Type <span class="text-white font-bold">'help'</span> to inspect available commands.</div>
                `;
                play8BitSFX('coin');
                break;

            default:
                print(`<span class="text-red-400">command not found: '${rawCmd}'.</span> Type <span class="text-white font-bold">'help'</span> for valid commands.`);
                break;
        }
    }

    form.onsubmit = (e) => {
        e.preventDefault();
        const val = input.value;
        input.value = '';
        execute(val);
    };

    // Quick Action Chips Click Delegation
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.term-chip');
        if (!chip) return;
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) execute(cmd);
    });
}

// ==========================================
// CLEAN URL & SMOOTH SCROLL NAVIGATION
// ==========================================
function initCleanUrlNavigation() {
    function cleanUrlInBar() {
        if (window.history && window.history.replaceState) {
            let cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/';
            window.history.replaceState(null, '', cleanPath + window.location.search);
        }
    }

    // Jika saat pertama kali load URL sudah membawa #hash (seperti #status),
    // scroll dengan rapi ke section tersebut lalu hilangkan hash dari address bar
    if (window.location.hash) {
        const target = document.querySelector(window.location.hash);
        if (target) {
            setTimeout(() => {
                const headerOffset = 70;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                cleanUrlInBar();
            }, 300);
        } else {
            cleanUrlInBar();
        }
    } else {
        cleanUrlInBar();
    }

    // Intercept semua klik link anchor internal (href="#...")
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;

        const targetHref = anchor.getAttribute('href');

        // Klik logo / scroll to top
        if (targetHref === '#' || targetHref === '') {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            cleanUrlInBar();
            return;
        }

        const targetElement = document.querySelector(targetHref);
        if (targetElement) {
            e.preventDefault();
            const headerOffset = 70;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            // Samarkan / bersihkan address bar seketika
            cleanUrlInBar();
        }
    });
}

// ==========================================
// RETRO SCROLL REVEAL ENGINE (ANIMASI IN & OUT)
// ==========================================
function initScrollReveal() {
    // 1. Targetkan Header setiap Section (slide masuk dari kiri)
    const sectionHeaders = document.querySelectorAll('section > div:first-child');
    sectionHeaders.forEach(el => {
        el.classList.add('pixel-reveal-left');
    });

    // 2. Targetkan setiap Card & Kotak Konten (slide naik berjenjang)
    const contentCards = document.querySelectorAll(
        'section .pixel-box, article.pixel-box, .contact-card, .philosophy-box, footer'
    );

    contentCards.forEach((el) => {
        el.classList.add('pixel-reveal');

        // Berikan efek stagger berjenjang jika berada di dalam grid
        const parentGrid = el.closest('.grid');
        if (parentGrid) {
            const siblings = Array.from(parentGrid.children);
            const siblingIndex = siblings.indexOf(el);
            if (siblingIndex > 0) {
                el.style.transitionDelay = `${(siblingIndex % 4) * 0.09}s`;
            }
        }
    });

    const allTargets = [...sectionHeaders, ...contentCards];
    if (!allTargets.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animasi IN: Masuk ke dalam layar
                entry.target.classList.add('in-view');
            } else {
                // Animasi OUT: Keluar dari layar (saat di-scroll menjauh)
                entry.target.classList.remove('in-view');
            }
        });
    }, {
        threshold: 0.12, // Memicu saat 12% bagian elemen mulai terlihat
        rootMargin: '0px 0px -30px 0px'
    });

    allTargets.forEach(el => observer.observe(el));
}

// Bootstrapper: Load Components -> Bind UI
document.addEventListener('DOMContentLoaded', async () => {
    await loadComponents();
    setupInteractiveFeatures();
});
