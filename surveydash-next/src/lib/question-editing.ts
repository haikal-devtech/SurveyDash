export function parseOptionLines(text: string) {
  const labels = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (labels.length < 2) throw new Error('Masukkan minimal 2 pilihan, satu per baris.');
  if (labels.length > 50) throw new Error('Maksimal 50 pilihan. Kurangi daftar sebelum melanjutkan.');
  if (labels.some((label) => label.length > 300)) throw new Error('Setiap pilihan maksimal 300 karakter.');
  if (new Set(labels).size !== labels.length)
    throw new Error('Ada pilihan yang sama. Hapus pilihan yang berulang.');
  return labels;
}
