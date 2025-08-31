export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!key) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    const { profile, history = [], message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Missing message' });

    const contents = [];
    if (profile) contents.push({ role: 'user', parts: [{ text: String(profile) }] });
    if (Array.isArray(history)) {
      for (const m of history) {
        if (!m || !m.text) continue;
        contents.push({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: String(m.text) }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: String(message) }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents }) });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error || 'Upstream error' });
    const candidate = data?.candidates?.[0];
    const reply = (candidate?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n').trim();
    res.status(200).json({ reply: reply || '' });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Server error' });
  }
}
