// ============================================
// TWEET GENERATOR PRO — SCRIPT
// by ryaakbar
// ============================================

let currentBlobUrl = null;
let toastTimer = null;

// ── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Reveal on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(el => {
            if (el.isIntersecting) el.target.classList.add('visible');
        });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    const scrollBtns = document.getElementById('scrollBtns');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar?.classList.add('scrolled');
            scrollBtns?.classList.add('visible');
        } else {
            navbar?.classList.remove('scrolled');
            scrollBtns?.classList.remove('visible');
        }
    });

    // Enter key support
    document.querySelectorAll('.cyber-input, .num-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') generateTweet();
        });
    });
});

// ── PROFILE PREVIEW ───────────────────────
function previewProfile(url) {
    const img = document.getElementById('profilePreview');
    if (!url.trim()) {
        img.src = 'https://files.catbox.moe/f7g0nx.jpg';
        return;
    }
    const testImg = new Image();
    testImg.onload = () => { img.src = url; };
    testImg.onerror = () => {
        img.src = 'https://files.catbox.moe/f7g0nx.jpg';
    };
    testImg.src = url;
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

    // Validasi
    if (!name) { showToast('⚠️ Display name wajib diisi!', 'error'); focusInput('nameInput'); return; }
    if (!username) { showToast('⚠️ Username wajib diisi!', 'error'); focusInput('usernameInput'); return; }
    if (!tweet) { showToast('⚠️ Isi tweet wajib diisi!', 'error'); focusInput('tweetInput'); return; }

    // Clean username — hapus @ kalau ada
    const cleanUsername = username.replace(/^@/, '');

    // UI: loading state
    setLoading(true);
    hideResult();
    hideError();

    try {
        const res = await fetch('/api/tweet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profile,
                name,
                username: cleanUsername,
                tweet,
                retweets,
                likes
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const contentType = res.headers.get('Content-Type') || '';
        if (!contentType.includes('image')) {
            const errData = await res.json().catch(() => ({ error: 'Response bukan image' }));
            throw new Error(errData.error || 'API tidak mengembalikan image');
        }

        // Revoke old blob URL
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);

        const blob = await res.blob();
        currentBlobUrl = URL.createObjectURL(blob);

        const img = document.getElementById('resultImg');
        img.src = currentBlobUrl;
        img.onload = () => {
            setLoading(false);
            showResult();
            showToast('✅ Tweet berhasil digenerate!', 'success');
            // Smooth scroll ke result
            setTimeout(() => {
                document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        };

    } catch (err) {
        setLoading(false);
        showError(err.message);
        showToast('❌ Gagal generate tweet', 'error');
    }
}

// ── DOWNLOAD ──────────────────────────────
function downloadTweet() {
    if (!currentBlobUrl) return;
    const name = document.getElementById('nameInput').value.trim() || 'tweet';
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const a = document.createElement('a');
    a.href = currentBlobUrl;
    a.download = `tweet_${safeName}_${Date.now()}.png`;
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
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        showToast('📋 Image copied to clipboard!', 'success');
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Image';
        }, 2500);
    } catch {
        // Fallback: open in new tab
        window.open(currentBlobUrl, '_blank');
        showToast('💡 Dibuka di tab baru, save manual ya!', 'success');
    }
}

// ── UI HELPERS ────────────────────────────
function setLoading(show) {
    const btn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');

    if (show) {
        loading.classList.remove('hidden');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Generating...</span>';
    } else {
        loading.classList.add('hidden');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Generate Tweet</span><span class="btn-arrow">→</span>';
    }
}

function showResult() {
    document.getElementById('resultCard').classList.remove('hidden');
}

function hideResult() {
    document.getElementById('resultCard').classList.add('hidden');
}

function showError(msg) {
    document.getElementById('errorText').textContent = msg;
    document.getElementById('errorCard').classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorCard').classList.add('hidden');
}

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
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
