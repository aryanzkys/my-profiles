const GROQ_CHAT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'qwen/qwen3-32b';

class GroqApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'GroqApiError';
    this.status = status;
  }
}

async function createGroqChatCompletion(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqApiError('Missing GROQ_API_KEY');

  const response = await fetch(GROQ_CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.8,
      max_completion_tokens: options.maxCompletionTokens ?? 512,
      reasoning_effort: options.reasoningEffort ?? 'none',
      reasoning_format: 'hidden',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.error || 'Groq upstream error';
    throw new GroqApiError(String(message), response.status);
  }

  return String(data?.choices?.[0]?.message?.content || '').trim();
}

module.exports = {
  DEFAULT_GROQ_MODEL,
  GroqApiError,
  createGroqChatCompletion,
};
