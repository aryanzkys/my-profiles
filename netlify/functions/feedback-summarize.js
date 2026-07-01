// Netlify Function: feedback-summarize using Qwen on Groq
const { createGroqChatCompletion } = require('../../lib/groq');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function loadFeedbacks() {
  // Try Supabase REST
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/feedbacks?select=*&order=created_at.asc`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      if (r.ok) return await r.json();
    } catch {}
    // Try storage JSON
    try {
      const url = `${SUPABASE_URL}/storage/v1/object/app_data/feedbacks.json`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      if (r.ok) { const t = await r.text(); try { const arr = JSON.parse(t); if (Array.isArray(arr)) return arr; } catch {} }
    } catch {}
  }
  return [];
}

exports.handler = async () => {
  try {
    const rows = await loadFeedbacks();
    const texts = rows.map((r, i) => `- ${r.userMessage || r.message || ''}`).filter(s => s.trim().length > 0);
  const prompt = `You are Aryan's AI Assistant. Summarize the following user feedback about Aryan's site in a concise, structured, and friendly way. Include: top themes, positives, constructive points, and 3-5 actionable improvements. Use accessible formatting: clear headings (##), bold for key phrases, short bullet points, and emojis sparingly for clarity. When it helps, use a small Markdown table or a short blockquote for an example. Keep it under 180 words.\n\nFeedback:\n${texts.join('\n')}`;
    const reply = await createGroqChatCompletion([
      { role: 'user', content: prompt },
    ], { maxCompletionTokens: 512 });
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ summary: reply || '' }) };
  } catch (e) {
    return { statusCode: e?.status || 500, body: JSON.stringify({ error: e?.message || 'Server error' }) };
  }
};
