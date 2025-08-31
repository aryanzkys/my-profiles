const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!key) return { statusCode: 500, body: 'Missing GEMINI_API_KEY' };
    const body = JSON.parse(event.body || '{}');
    const { profile, history = [], message } = body;
    if (!message) return { statusCode: 400, body: 'Missing message' };

    // Build contents for Gemini: profile as first user message, then history, then user message
    const contents = [];
    if (profile) contents.push({ role: 'user', parts: [{ text: String(profile) }] });
    if (Array.isArray(history)) {
      for (const m of history) {
        if (!m || !m.text) continue;
        contents.push({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: String(m.text) }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: String(message) }] });

    const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data?.error || 'Upstream error' }) };
    }
    const candidate = data?.candidates?.[0];
    const reply = (candidate?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n').trim();
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reply: reply || '' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e?.message || 'Server error' }) };
  }
};
