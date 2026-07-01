const { createGroqChatCompletion } = require('../../lib/groq');

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { profile, history = [], message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Missing message' });

    const messages = [];
    if (profile) messages.push({ role: 'system', content: String(profile) });
    if (Array.isArray(history)) {
      for (const m of history) {
        if (!m || !m.text) continue;
        messages.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: String(m.text) });
      }
    }
    messages.push({ role: 'user', content: String(message) });

    const reply = await createGroqChatCompletion(messages);
    res.status(200).json({ reply: reply || '' });
  } catch (e) {
    res.status(e?.status || 500).json({ error: e?.message || 'Server error' });
  }
}
