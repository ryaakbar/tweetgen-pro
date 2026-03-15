export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Metode tidak diizinkan' });
    }

    const { profile, name, username, tweet, retweets = 0, likes = 0 } = req.body;

    if (!name || !username || !tweet) {
      return res.status(400).json({ error: 'Data tidak lengkap. Name, username, dan tweet wajib diisi.' });
    }

    const defaultProfileUrl = 'https://files.catbox.moe/f7g0nx.jpg';
    const finalProfileUrl = profile ? profile : defaultProfileUrl;

    const apiUrl = `https://api.siputzx.my.id/api/m/tweet?profile=${encodeURIComponent(finalProfileUrl)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username)}&tweet=${encodeURIComponent(tweet)}&image=null&theme=dark&retweets=${retweets}&quotes=400&likes=${likes}&client=Twitter%20for%20iPhone`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'Gagal mengambil data dari API eksternal',
        details: errorText
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="tweet.png"');
    return res.status(200).send(buffer);

  } catch (error) {
    return res.status(500).json({
      error: 'Gagal memproses permintaan',
      details: error.message
    });
  }
}
