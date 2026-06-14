import axios from "axios";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scriptUrl, settings } = req.body;

  if (!scriptUrl || typeof scriptUrl !== "string") {
    return res.status(400).json({ error: "scriptUrl wajib diisi" });
  }

  try {
    new URL(scriptUrl);
  } catch {
    return res.status(400).json({ error: "Format URL tidak valid" });
  }

  try {
    const response = await axios.post(scriptUrl, { action: "saveSettings", settings }, {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });
    const appsScriptData = response.data;
    if (appsScriptData?.success === false) {
      return res.json({ ok: false, warning: appsScriptData.error ?? "Apps Script menolak permintaan. Pengaturan tetap disimpan di Firestore.", details: appsScriptData });
    }
    return res.json({ ok: true, ...appsScriptData });
  } catch (error: any) {
    console.warn("survey-settings: Apps Script POST failed (non-fatal):", error.message);
    return res.json({ ok: false, warning: "Apps Script belum mendukung doPost. Deploy code.gs terbaru agar sinkron. Pengaturan tetap disimpan di Firestore.", details: error.message });
  }
}
