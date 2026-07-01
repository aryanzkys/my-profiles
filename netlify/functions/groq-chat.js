const { createGroqChatCompletion } = require('../../lib/groq');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const { profile, history = [], message } = body;
    if (!message) return { statusCode: 400, body: 'Missing message' };

    const messages = [];
    if (profile) messages.push({ role: 'system', content: String(profile) });
    if (Array.isArray(history)) {
      for (const m of history.slice(-8)) {
        if (!m || !m.text) continue;
        messages.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: String(m.text) });
      }
    }
    messages.push({ role: 'user', content: String(message) });

    const reply = await createGroqChatCompletion(messages);
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reply: reply || '' }) };
  } catch (e) {
    return { statusCode: e?.status || 500, body: JSON.stringify({ error: e?.message || 'Server error' }) };
  }
};
