// Per-ayah audio, used by the Quran video generator (unlike the main audio
// library which only has full-surah files). everyayah.com hosts a
// well-known, widely-used set of per-verse recordings named
// "{surah:3d}{ayah:3d}.mp3" per reciter folder — this is the same source
// many Quran apps use for ayah-by-ayah playback/highlighting.

export interface AyahAudioReciter {
  id: string;
  name: string;
  /** everyayah.com folder name for this reciter/riwayah. */
  folder: string;
}

export const AYAH_AUDIO_RECITERS: AyahAudioReciter[] = [
  { id: "alafasy", name: "مشاري بن راشد العفاسي", folder: "Alafasy_128kbps" },
  { id: "husary", name: "محمود خليل الحصري", folder: "Husary_128kbps" },
  { id: "husary-mujawwad", name: "محمود خليل الحصري (مجوّد)", folder: "Husary_128kbps_Mujawwad" },
  { id: "husary-muallim", name: "محمود خليل الحصري (المعلّم)", folder: "Husary_Muallim_128kbps" },
  { id: "minshawi", name: "محمد صديق المنشاوي (مرتّل)", folder: "Minshawy_Murattal_128kbps" },
  { id: "minshawi-mujawwad", name: "محمد صديق المنشاوي (مجوّد)", folder: "Minshawy_Mujawwad_192kbps" },
  { id: "abdulbasit", name: "عبد الباسط عبد الصمد (مرتّل)", folder: "Abdul_Basit_Murattal_192kbps" },
  { id: "abdulbasit-mujawwad", name: "عبد الباسط عبد الصمد (مجوّد)", folder: "Abdul_Basit_Mujawwad_128kbps" },
  { id: "sudais", name: "عبد الرحمن السديس", folder: "Abdurrahmaan_As-Sudais_192kbps" },
  { id: "rifai", name: "هاني الرفاعي", folder: "Hani_Rifai_192kbps" },
  { id: "shuraim", name: "سعود الشريم", folder: "Saood_ash-Shuraym_128kbps" },
  { id: "ghamdi", name: "سعد الغامدي", folder: "Ghamadi_40kbps" },
  { id: "ajmi", name: "أحمد بن علي العجمي", folder: "ahmed_ibn_ali_al_ajamy_128kbps" },
  { id: "fares", name: "فارس عباد", folder: "Fares_Abbad_64kbps" },
  { id: "dussary", name: "ياسر الدوسري", folder: "Yasser_Ad-Dussary_128kbps" },
  { id: "muaiqly", name: "ماهر المعيقلي", folder: "MaherAlMuaiqly128kbps" },
  { id: "basfar", name: "عبد الله بصفر", folder: "Abdullah_Basfar_192kbps" },
  { id: "shaatree", name: "أبو بكر الشاطري", folder: "Abu_Bakr_Ash-Shaatree_128kbps" },
  { id: "ayyoub", name: "محمد أيوب", folder: "Muhammad_Ayyoub_128kbps" },
  { id: "hudhaify", name: "علي بن عبد الرحمن الحذيفي", folder: "Hudhaify_128kbps" },
  { id: "qasim", name: "محسن القاسم", folder: "Muhsin_Al_Qasim_192kbps" },
  { id: "neana", name: "أحمد نعينع", folder: "Ahmed_Neana_128kbps" },
  { id: "jibreel", name: "محمد جبريل", folder: "Muhammad_Jibreel_128kbps" },
  { id: "qatami", name: "ناصر القطامي", folder: "Nasser_Alqatami_128kbps" },
  { id: "budair", name: "صلاح البدير", folder: "Salah_Al_Budair_128kbps" },
  { id: "tablaway", name: "محمد الطبلاوي", folder: "Mohammad_al_Tablaway_128kbps" },
  { id: "matroud", name: "عبد الله مطرود", folder: "Abdullah_Matroud_128kbps" },
  { id: "salamah", name: "ياسر سلامة", folder: "Yaser_Salamah_128kbps" },
  { id: "qahtani", name: "خالد القحطاني", folder: "Khaalid_Abdullaah_al-Qahtaanee_192kbps" },
  { id: "juhaynee", name: "عبد الله عواد الجهني", folder: "Abdullaah_3awwaad_Al-Juhaynee_128kbps" },
];

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export function ayahAudioUrl(folder: string, surah: number, ayah: number) {
  return `https://everyayah.com/data/${folder}/${pad3(surah)}${pad3(ayah)}.mp3`;
}
