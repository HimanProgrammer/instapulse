// Pulls profile, daily account insights and recent media insights for one logged-in account.
import { fetchAccount } from '../lib/instagram.js';

export default async function handler(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    res.json(await fetchAccount(token));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
