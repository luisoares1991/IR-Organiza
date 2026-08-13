export default function handler(req, res) {
  res.status(501).json({ error: 'Endpoint em configuração.' });
}
