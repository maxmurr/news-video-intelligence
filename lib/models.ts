export const MODELS = {
  transcribe: 'google/gemini-3.5-flash',
  stories: 'google/gemini-3-flash',
  headlines: 'google/gemini-3.1-flash-lite',
  frames: 'google/gemini-3.5-flash',
  chat: 'google/gemini-3.5-flash',
  embed: 'cohere/embed-v4.0',
  rerank: 'cohere/rerank-v4-fast',
} as const;

export const EMBEDDING_DIMENSIONS = 1536;
