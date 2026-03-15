export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } }
};

// Daftar API endpoint dengan fallback
const API_ENDPOINTS = [
  (p) => `https://api.siputzx.my.id/api/m/tweet?profile=${p.profile}&name=${p.name}&username=${p.username}&tweet=${p.tweet}&image=null&theme=dark&retweets=${p.retweets}&quotes=400&likes=${p.likes}&client=Twitter%20for%20iPhone`,
  (p) => `https://api.nyxs.pw/tools/fake-tweet?avatar=${p.profile}&name=${p.name}&username=${p.username}&tweet=${p.tweet}&retweet=${p.retweets}&like=${p.likes}`,
  (p) => `https://bk9.fun/maker/tweet?avatar=${p.profile}&name=${p.name}&username=${p.username}&text=${p.tweet}&retweet=${p.retweets}&like=${p.likes}`,
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
    // Priority: base64 upload → URL input → default
    let finalProfileUrl = 'https://files.catbox.moe/f7g0nx.jpg';

    if (profileBase64) {
      // Upload base64 ke catbox.moe sebagai hosting sementara
      try {
        finalProfileUrl = await uploadToCatbox(profileBase64);
      } catch (e) {
        console.warn('[profile] catbox upload failed, using URL fallback:', e.message);
        finalProfileUrl = profile || 'https://files.catbox.moe/f7g0nx.jpg';
      }
    } else if (profile && profile.trim()) {
      finalProfileUrl = profile.trim();
    }

    const params = {
      profile: encodeURIComponent(finalProfileUrl),
      name: encodeURIComponent(name),
      username: encodeURIComponent(username.replace(/^@/, '')),
      tweet: encodeURIComponent(tweet),
      retweets: retweets || 0,
      likes: likes || 0,
    };

    // Coba semua endpoint, pakai yang pertama berhasil
    let lastError = null;
    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      try {
        const apiUrl = API_ENDPOINTS[i](params);
        console.log(`[tweet] trying endpoint ${i + 1}: ${apiUrl.split('?')[0]}`);

        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
            'Accept': 'image/png, image/*, */*',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          lastError = `Endpoint ${i + 1}: HTTP ${response.status}`;
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
          // Coba baca sebagai JSON kalau bukan image
          const text = await response.text();
          try {
            const json = JSON.parse(text);
            // Beberapa API return {status, result} dengan URL image
            const imgUrl = json?.result || json?.data?.url || json?.url || json?.image;
            if (imgUrl) {
              const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer());
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Disposition', 'inline; filename="tweet.png"');
                return res.status(200).send(buf);
              }
            }
          } catch {}
          lastError = `Endpoint ${i + 1}: bukan image (${contentType})`;
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 1000) {
          lastError = `Endpoint ${i + 1}: response terlalu kecil (${buffer.length} bytes)`;
          continue;
        }

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename="tweet.png"');
        return res.status(200).send(buffer);

      } catch (err) {
        lastError = `Endpoint ${i + 1}: ${err.message}`;
        console.warn(`[tweet] endpoint ${i + 1} failed:`, err.message);
        continue;
      }
    }

    // Semua endpoint gagal
    return res.status(503).json({
      error: 'Semua API sedang tidak tersedia. Coba lagi dalam beberapa menit.',
      details: lastError,
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
}

// Upload base64 image ke catbox.moe (free image hosting)
async function uploadToCatbox(base64Data) {
  // base64Data bisa berupa "data:image/jpeg;base64,..." atau raw base64
  const raw = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const mimeMatch = base64Data.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';

  const buffer = Buffer.from(raw, 'base64');

  // Buat FormData manual untuk catbox
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const filename = `profile_${Date.now()}.${ext}`;

  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload`,
    `--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
  ];

  const header = Buffer.from(parts.join('\r\n'));
  const footer = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([header, buffer, footer]);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  if (!text.startsWith('https://')) {
    throw new Error('Catbox upload failed: ' + text);
  }
  return text.trim();
}
