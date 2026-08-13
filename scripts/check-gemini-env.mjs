const state = {
  GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
  VITE_GEMINI_API_KEY: Boolean(process.env.VITE_GEMINI_API_KEY),
};
console.log('[env-check]', JSON.stringify(state));
