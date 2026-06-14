import axios from "axios";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scriptUrl, action } = req.body;

  if (!scriptUrl || !action) {
    return res.status(400).json({ error: "scriptUrl dan action wajib diisi" });
  }

  try {
    new URL(scriptUrl);
  } catch {
    return res.status(400).json({ error: "Format URL tidak valid" });
  }

  try {
    const sep = scriptUrl.includes("?") ? "&" : "?";
    const response = await axios.get(`${scriptUrl}${sep}action=${encodeURIComponent(action)}`, {
      timeout: 30000,
    });
    return res.json(response.data);
  } catch (error: any) {
    console.error(`survey-action [${action}] error:`, error.message);
    return res.status(500).json({ error: "Aksi gagal dijalankan", details: error.message });
  }
}
