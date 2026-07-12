module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const honeypot = String(body.website || '').trim();

  // 봇 방지용 함정 필드 — 사람 눈에는 안 보이고, 봇만 채워서 보냄
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!name || !email || !message) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  if (name.length > 60 || email.length > 120 || message.length > 2000) {
    res.status(400).json({ error: 'too_long' });
    return;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  const token = process.env.GITHUB_WRITE_TOKEN;
  const repo = 'dldpdls1020/jeongoseo-website';
  const now = new Date();
  const iso = now.toISOString();
  const slugDate = iso.slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `content/voices/${slugDate}-${rand}.json`;

  const entry = {
    name,
    email,
    message,
    date: iso.slice(0, 16).replace('T', ' '),
    public: true
  };

  const contentB64 = Buffer.from(JSON.stringify(entry, null, 2), 'utf-8').toString('base64');

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'User-Agent': 'jeongoseo-website'
      },
      body: JSON.stringify({
        message: `고객의 소리: ${name}`,
        content: contentB64,
        branch: 'main'
      })
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      res.status(502).json({ error: 'github_write_failed', detail: errText });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
};
