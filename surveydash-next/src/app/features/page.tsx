export const metadata = { title: 'Fitur — SurveyDash Studio', alternates: { canonical: '/features' } };
import Link from 'next/link';
import { PublicArticle } from '@/components/public-article';
export default function FeaturesPage() {
  return (
    <PublicArticle
      title="Seluruh proses survei dalam satu ruang."
      intro="Form, data, insight, dan presentasi yang saling terhubung."
      sections={[
        [
          '01 · Form',
          'Buat pertanyaan singkat, paragraf, pilihan tunggal atau jamak, penilaian, angka, dan tanggal. Atur kewajiban jawaban, urutan, preview, status buka/tutup, dan visibilitas.',
        ],
        [
          '02 · Data',
          'Jawaban masuk sebagai baris dalam tabel. Cari, urutkan, pilih kolom, lihat detail, koreksi dengan riwayat, lalu unduh Excel atau CSV untuk diolah di spreadsheet.',
        ],
        [
          '03 · Insight',
          'Grafik memakai jawaban yang tersimpan. Analisis SKM menggunakan sembilan unsur; jawaban kosong tidak dipaksakan menjadi skor satu.',
        ],
        [
          '04 · Presentasi',
          'Gunakan kanvas grafik atau buat presentasi beberapa slide. Atur posisi, teks, bentuk, gambar, dan grafik yang terhubung dengan data survei.',
        ],
        [
          '05 · Template',
          'Simpan form, presentasi, atau paket survei. Gunakan kembali, duplikat, ubah detail, dan arsipkan template milik Anda.',
        ],
      ]}
    >
      <Link className="btn btn-primary" href="/login?mode=signup">
        Mulai workspace
      </Link>
    </PublicArticle>
  );
}
