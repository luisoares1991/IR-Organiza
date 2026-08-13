export default function handler(req, res) {
  const source = process.env.GEMINI_API_KEY
    ? 'GEMINI_API_KEY'
    : process.env.VITE_GEMINI_API_KEY
      ? 'VITE_GEMINI_API_KEY'
      : 'none';

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ source });
}
