// ============================================
// TWEET GENERATOR PRO — SCRIPT v2
// by ryaakbar
// ============================================

let currentBlobUrl = null;
let toastTimer = null;
let profileBase64 = null;   // base64 dari file upload
let profileMode = 'url';    // 'url' | 'upload'

// ── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(el => { if (el.isIntersecting) el.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    const navbar = document.getElementById('navbar');
    const scrollBtns = document.getElementById('scrollBtns');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 20;
        navbar?.classList.toggle('scrolled', scrolled);
        scrollBtns?.classList.toggle('visible', scrolled);
    });

    document.querySelectorAll('.cyber-input, .num-input').forEach(input => {
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') generateTweet(); });
    });
});

// ── PROFILE TAB SWITCH ────────────────────
function switchProfileTab(mode) {
    profileMode = mode;
    document.getElementById('tabUrl').classList.toggle('active', mode === 'url');
    document.getElementById('tabUpload').classList.toggle('active', mode === 'upload');
    document.getElementById('profileUrlMode').style.display = mode === 'url' ? 'block' : 'none';
    document.getElementById('profileUploadMode').style.display = mode === 'upload' ? 'block' : 'none';

    if (mode === 'url') {
        profileBase64 = null;
        const url = document.getElementById('profileInput').value.trim();
        previewProfile(url);
        setProfileBadge(false);
    } else {
        // Reset ke default saat switch ke upload kalau belum ada file
        if (!profileBase64) showAvatarDefault();
    }
}

// ── PROFILE URL PREVIEW ───────────────────
function showAvatarImage(src) {
    const img = document.getElementById('profilePreview');
    const svg = document.getElementById('profileAvatarSvg');
    img.src = src;
    img.style.display = 'block';
    if (svg) svg.style.display = 'none';
}
function showAvatarDefault() {
    const img = document.getElementById('profilePreview');
    const svg = document.getElementById('profileAvatarSvg');
    img.style.display = 'none';
    img.src = '';
    if (svg) svg.style.display = 'block';
}

function previewProfile(url) {
    if (!url.trim()) { showAvatarDefault(); return; }
    const testImg = new Image();
    testImg.onload = () => showAvatarImage(url);
    testImg.onerror = () => showAvatarDefault();
    testImg.src = url;
}

// ── FILE UPLOAD HANDLER ───────────────────
function handleFileUpload(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
        showToast('⚠️ Foto terlalu besar! Maks 3MB ya bro', 'error');
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('⚠️ Harus file gambar bro!', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        profileBase64 = e.target.result;
        // Preview langsung
        showAvatarImage(profileBase64);
        setProfileBadge(true);
        // Update drop area UI
        const dropArea = document.getElementById('dropArea');
        const dropContent = document.getElementById('dropContent');
        dropArea.classList.add('has-file');
        dropContent.innerHTML = `
            <i class="fa-solid fa-circle-check" style="font-size:1.3rem;color:#10b981;margin-bottom:5px"></i>
            <div style="font-size:0.82rem;color:#34d399;font-weight:600">${file.name}</div>
            <div style="font-family:var(--font-mono);font-size:0.63rem;color:var(--text-muted);margin-top:3px">
                Klik untuk ganti foto
            </div>`;
        showToast('✅ Foto berhasil dipilih!', 'success');
    };
    reader.readAsDataURL(file);
}

// ── DRAG & DROP ───────────────────────────
function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('dropArea').classList.add('dragover');
}
function handleDragLeave(e) {
    document.getElementById('dropArea').classList.remove('dragover');
}
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropArea').classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file) {
        const fakeInput = { files: [file] };
        handleFileUpload(fakeInput);
    }
}

function setProfileBadge(show) {
    document.getElementById('profileBadge').style.display = show ? 'grid' : 'none';
}

// ── CHAR COUNT ────────────────────────────
function updateCharCount(textarea) {
    const len = textarea.value.length;
    const counter = document.getElementById('charCount');
    counter.textContent = `${len} / 280`;
    counter.classList.remove('warn', 'danger');
    if (len >= 260) counter.classList.add('danger');
    else if (len >= 220) counter.classList.add('warn');
}

// ── GENERATE ──────────────────────────────
async function generateTweet() {
    const profile   = document.getElementById('profileInput').value.trim();
    const name      = document.getElementById('nameInput').value.trim();
    const username  = document.getElementById('usernameInput').value.trim();
    const tweet     = document.getElementById('tweetInput').value.trim();
    const retweets  = parseInt(document.getElementById('retweetsInput').value) || 0;
    const likes     = parseInt(document.getElementById('likesInput').value) || 0;

    if (!name) { showToast('⚠️ Display name wajib diisi!', 'error'); focusInput('nameInput'); return; }
    if (!username) { showToast('⚠️ Username wajib diisi!', 'error'); focusInput('usernameInput'); return; }
    if (!tweet) { showToast('⚠️ Isi tweet wajib diisi!', 'error'); focusInput('tweetInput'); return; }

    // Validasi mode upload
    if (profileMode === 'upload' && !profileBase64) {
        showToast('⚠️ Pilih foto profil dulu bro!', 'error');
        return;
    }

    setLoading(true);
    hideResult();
    hideError();

    const payload = {
        name,
        username,
        tweet,
        retweets,
        likes,
    };

    // Kirim sesuai mode
    if (profileMode === 'upload' && profileBase64) {
        payload.profileBase64 = profileBase64;
    } else {
        payload.profile = profile;
    }

    try {
        const res = await fetch('/api/tweet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const contentType = res.headers.get('Content-Type') || '';

        if (!res.ok || !contentType.includes('image')) {
            const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            throw new Error(errData.error || errData.details || `Gagal: HTTP ${res.status}`);
        }

        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        const blob = await res.blob();
        currentBlobUrl = URL.createObjectURL(blob);

        const img = document.getElementById('resultImg');
        img.src = currentBlobUrl;
        img.onload = () => {
            setLoading(false);
            showResult();
            showToast('🔥 Tweet berhasil digenerate!', 'success');
            setTimeout(() => {
                document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        };

    } catch (err) {
        // API gagal semua — coba Canvas fallback
        console.warn('[tweet] all APIs failed, trying canvas fallback:', err.message);
        showToast('⚡ API down, pakai mode offline...', '');
        try {
            const profileSrc = profileBase64 ||
                (profileMode === 'url' ? document.getElementById('profileInput').value.trim() : null);
            const dataUrl = await generateTweetCanvas({
                name, username, tweet, retweets, likes, profileSrc
            });
            setLoading(false);
            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
            // Convert dataURL ke blob
            const byteStr = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteStr.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
            const blob = new Blob([ab], { type: 'image/png' });
            currentBlobUrl = URL.createObjectURL(blob);
            const img = document.getElementById('resultImg');
            img.src = currentBlobUrl;
            img.onload = () => {
                showResult();
                showToast('✅ Generated (offline mode)!', 'success');
                setTimeout(() => {
                    document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
            };
        } catch (canvasErr) {
            setLoading(false);
            showError('Semua API down dan canvas fallback gagal: ' + err.message);
            showToast('❌ Gagal total bro, coba lagi nanti', 'error');
        }
    }
}

// ── DOWNLOAD ──────────────────────────────
function downloadTweet() {
    if (!currentBlobUrl) return;
    const name = document.getElementById('nameInput').value.trim() || 'tweet';
    const safe = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const a = document.createElement('a');
    a.href = currentBlobUrl;
    a.download = `tweet_${safe}_${Date.now()}.png`;
    a.click();
    showToast('⬇️ Downloading...', 'success');
}

// ── COPY IMAGE ────────────────────────────
async function copyTweetImg() {
    if (!currentBlobUrl) return;
    const copyBtn = document.getElementById('copyBtn');
    try {
        const res = await fetch(currentBlobUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        showToast('📋 Image copied!', 'success');
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Image';
        }, 2500);
    } catch {
        window.open(currentBlobUrl, '_blank');
        showToast('💡 Dibuka di tab baru, save manual!', 'success');
    }
}

// ── UI HELPERS ────────────────────────────
function setLoading(show) {
    const btn = document.getElementById('generateBtn');
    document.getElementById('loading').classList.toggle('hidden', !show);
    btn.disabled = show;
    btn.innerHTML = show
        ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Generating...</span>'
        : '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Generate Tweet</span><span class="btn-arrow">→</span>';
}
function showResult() { document.getElementById('resultCard').classList.remove('hidden'); }
function hideResult() { document.getElementById('resultCard').classList.add('hidden'); }
function showError(msg) {
    document.getElementById('errorText').textContent = msg;
    document.getElementById('errorCard').classList.remove('hidden');
}
function hideError() { document.getElementById('errorCard').classList.add('hidden'); }
function focusInput(id) {
    const el = document.getElementById(id);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── TOAST ─────────────────────────────────
function showToast(msg, type = '') {
    clearTimeout(toastTimer);
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ══════════════════════════════════════════
// CANVAS FALLBACK — generate tweet lokal
// dipake kalau semua API eksternal gagal
// ══════════════════════════════════════════
async function generateTweetCanvas({ name, username, tweet, retweets, likes, profileSrc }) {
    const W = 600, PAD = 28;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Hitung tinggi dinamis berdasarkan panjang tweet
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    const words = tweet.split(' ');
    let lines = [], line = '';
    const maxW = W - PAD * 2 - 72;
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW) { lines.push(line); line = word; }
        else line = test;
    }
    if (line) lines.push(line);
    const tweetH = lines.length * 26;
    const H = 180 + tweetH;

    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#15202b';
    ctx.fillRect(0, 0, W, H);

    // Avatar circle
    const avatarSize = 48, avatarX = PAD, avatarY = PAD;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();

    if (profileSrc && profileSrc.startsWith('data:')) {
        await new Promise(resolve => {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize); resolve(); };
            img.onerror = () => {
                ctx.fillStyle = '#1d4ed8'; ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize); resolve();
            };
            img.src = profileSrc;
        });
    } else if (profileSrc) {
        await new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize); resolve(); };
            img.onerror = () => {
                ctx.fillStyle = '#1d4ed8'; ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize); resolve();
            };
            img.src = profileSrc;
        });
    } else {
        ctx.fillStyle = '#1d4ed8'; ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    const textX = avatarX + avatarSize + 14;

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.fillText(name, textX, avatarY + 18);

    // Verified badge (X blue)
    ctx.fillStyle = '#1d9bf0';
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillText('✓', textX + ctx.measureText(name).width + 5, avatarY + 18);

    // Username
    ctx.fillStyle = '#8899a6';
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillText('@' + username, textX, avatarY + 38);

    // X logo top right
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
    ctx.fillText('𝕏', W - PAD - 20, avatarY + 20);

    // Tweet text
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    let ty = avatarY + avatarSize + 22;
    for (const l of lines) { ctx.fillText(l, PAD, ty); ty += 26; }

    // Time line
    ctx.fillStyle = '#8899a6';
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) +
        ' · ' + now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · Twitter for iPhone';
    ctx.fillText(timeStr, PAD, ty + 8);

    // Divider
    ty += 26;
    ctx.strokeStyle = '#38444d';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, ty); ctx.lineTo(W - PAD, ty); ctx.stroke();
    ty += 16;

    // Stats
    ctx.font = 'bold 15px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(formatNum(retweets), PAD, ty + 2);
    ctx.font = '15px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#8899a6';
    ctx.fillText(' Retweets', PAD + ctx.measureText(formatNum(retweets)).width, ty + 2);

    const rtW = ctx.measureText(formatNum(retweets) + ' Retweets  ').width + PAD;
    ctx.font = 'bold 15px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(formatNum(likes), rtW, ty + 2);
    ctx.font = '15px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#8899a6';
    ctx.fillText(' Likes', rtW + ctx.measureText(formatNum(likes)).width, ty + 2);

    // Divider 2
    ty += 22;
    ctx.beginPath(); ctx.moveTo(PAD, ty); ctx.lineTo(W - PAD, ty); ctx.stroke();

    return canvas.toDataURL('image/png');
}

function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}
