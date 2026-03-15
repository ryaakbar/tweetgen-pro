export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } }
};

// ── API ENDPOINTS (dicoba berurutan) ──────────────────────────────────────────
const ENDPOINTS = [
  // 1. siputzx
  (p) => ({
    url: `https://api.siputzx.my.id/api/m/tweet?profile=${p.profile}&name=${p.name}&username=${p.username}&tweet=${p.tweet}&image=null&theme=dark&retweets=${p.retweets}&quotes=400&likes=${p.likes}&client=Twitter%20for%20iPhone`,
    method: 'GET',
  }),
  // 2. ryzendesu
  (p) => ({
    url: `https://api.ryzendesu.vip/api/maker/tweet?text=${p.tweet}&username=${p.username}&name=${p.name}&avatar=${p.profile}`,
    method: 'GET',
  }),
  // 3. betabotz
  (p) => ({
    url: `https://api.betabotz.eu.org/api/tools/faketweet?text=${p.tweet}&username=${p.username}&name=${p.name}&avatar=${p.profile}&apikey=beta`,
    method: 'GET',
  }),
  // 4. agatz
  (p) => ({
    url: `https://api.agatz.xyz/api/faketweet?text=${p.tweet}&username=${p.username}&name=${p.name}&avatar=${p.profile}`,
    method: 'GET',
  }),
  // 5. nyxs
  (p) => ({
    url: `https://api.nyxs.pw/tools/fake-tweet?avatar=${p.profile}&name=${p.name}&username=${p.username}&tweet=${p.tweet}&retweet=${p.retweets}&like=${p.likes}`,
    method: 'GET',
  }),
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { profile, profileBase64, name, username, tweet, retweets = 0, likes = 0 } = req.body;

    if (!name || !username || !tweet) {
      return res.status(400).json({ error: 'Name, username, dan tweet wajib diisi.' });
    }

    // Resolve profile URL
    let finalProfileUrl = 'https://i.pravatar.cc/150?img=32';
    if (profileBase64) {
      try { finalProfileUrl = await uploadToCatbox(profileBase64); }
      catch (e) { finalProfileUrl = profile || finalProfileUrl; }
    } else if (profile?.trim()) {
      finalProfileUrl = profile.trim();
    }

    const params = {
      profile:  encodeURIComponent(finalProfileUrl),
      name:     encodeURIComponent(name),
      username: encodeURIComponent(username.replace(/^@/, '')),
      tweet:    encodeURIComponent(tweet),
      retweets: retweets || 0,
      likes:    likes || 0,
    };

    // Coba semua endpoint
    let lastError = null;
    for (let i = 0; i < ENDPOINTS.length; i++) {
      try {
        const { url, method } = ENDPOINTS[i](params);
        console.log(`[tweet] trying endpoint ${i + 1}: ${url.split('?')[0]}`);

        const response = await fetch(url, {
          method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
            'Accept': 'image/png,image/jpeg,image/*,*/*',
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
          lastError = `Endpoint ${i + 1} (${url.split('/')[2]}): HTTP ${response.status}`;
          continue;
        }

        const contentType = response.headers.get('content-type') || '';

        // Response langsung image
        if (contentType.includes('image') || contentType.includes('octet-stream')) {
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length < 500) { lastError = `Endpoint ${i + 1}: response terlalu kecil`; continue; }
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Disposition', 'inline; filename="tweet.png"');
          return res.status(200).send(buffer);
        }

        // Response JSON yang mengandung URL image
        if (contentType.includes('json') || contentType.includes('text')) {
          const text = await response.text();
          let imgUrl = null;
          try {
            const json = JSON.parse(text);
            imgUrl = json?.result || json?.data?.url || json?.url || json?.image
                  || json?.data?.image || json?.data?.result || json?.output;
          } catch {}

          if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
            const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
            if (imgRes.ok) {
              const buf = Buffer.from(await imgRes.arrayBuffer());
              if (buf.length > 500) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Disposition', 'inline; filename="tweet.png"');
                return res.status(200).send(buf);
              }
            }
          }
          lastError = `Endpoint ${i + 1}: tidak ada image di response`;
          continue;
        }

        lastError = `Endpoint ${i + 1}: content-type tidak dikenal (${contentType})`;
      } catch (err) {
        lastError = `Endpoint ${i + 1}: ${err.message}`;
        console.warn(`[tweet] endpoint ${i + 1} failed:`, err.message);
      }
    }

    // Semua gagal — return error jelas
    return res.status(503).json({
      error: 'Semua API sedang tidak tersedia. Coba lagi nanti.',
      details: lastError,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

// Upload base64 ke catbox.moe
async function uploadToCatbox(base64Data) {
  const raw = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const mimeMatch = base64Data.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const buffer = Buffer.from(raw, 'base64');
  const boundary = '----FB' + Math.random().toString(36).slice(2);
  const filename = `pfp_${Date.now()}.${ext}`;
  const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`);
  const footer = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([header, buffer, footer]);
  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  if (!text.startsWith('https://')) throw new Error('Catbox: ' + text);
  return text.trim();
}
