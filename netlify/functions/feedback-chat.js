// Netlify Function: feedback-chat — Gemini chat grounded on feedbacks
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function loadFeedbacks() {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/feedbacks?select=*&order=created_at.asc`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      if (r.ok) return await r.json();
    } catch {}
    try {
      const url = `${SUPABASE_URL}/storage/v1/object/app_data/feedbacks.json`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      if (r.ok) { const t = await r.text(); try { const arr = JSON.parse(t); if (Array.isArray(arr)) return arr; } catch {} }
    } catch {}
  }
  return [];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!key) return { statusCode: 500, body: 'Missing GEMINI_API_KEY' };
    const body = JSON.parse(event.body || '{}');
    const { message } = body;
    if (!message) return { statusCode: 400, body: 'Missing message' };

    const rows = await loadFeedbacks();
    const corpus = rows.map((r,i)=>`[${i+1}] ${r.userMessage || r.message || ''}`).join('\n');
  const system = `You are Aryan's AI Assistant, trained by Aryan. You have access to a feedback corpus collected from users (each line is one feedback). When asked to summarize feedback or analyze positive vs negative, produce a clear, structured response with accessible formatting: use headings (##), bold for key phrases, short bullet points, and sparing emojis for clarity. If asked to show positive vs negative, categorize items and count them, with examples. Keep answers under 220 words unless the user asks for details. If the user asks for raw items, show up to the top 10 representative ones.`;
    const user = `FEEDBACK CORPUS:\n${corpus}\n\nUSER REQUEST:\n${message}`;
    const contents = [ { role: 'user', parts: [{ text: system + '\n\n' + user }] } ];
    const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents }) });
    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, body: JSON.stringify({ error: data?.error || 'Upstream error' }) };
    const candidate = data?.candidates?.[0];
    const reply = (candidate?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n').trim();
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reply: reply || '' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e?.message || 'Server error' }) };
  }
};
