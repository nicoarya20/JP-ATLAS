/** Indonesian copy of the Beranda widgets; titles keep the wireframe's words (R07 §3.1). */
export const HOME_COPY = {
  title: 'Beranda',
  error: 'Bagian ini belum bisa dimuat.',
  staleTitle: 'Data terbaru belum bisa dimuat. Yang tampil mungkin sudah lama.',
  retry: 'Coba lagi',
  more: 'Lihat semua',
  briefing: {
    title: 'Daily Briefing',
    subtitle: 'Apa yang perlu saya tahu hari ini?',
    footnote: (time: string) => `Disusun otomatis dari data proyek · diperbarui ${time}`,
  },
  counters: {
    unassigned: { label: 'Unassigned', hint: 'tanpa penanggung jawab di proyek yang Anda kelola' },
    inProgress: { label: 'In Progress', hint: 'sedang dikerjakan di proyek yang Anda kelola' },
    completed: { label: 'Completed', hint: 'selesai di proyek yang Anda kelola' },
    unit: 'tugas',
    notManager:
      'Kartu ini menghitung tugas di proyek yang Anda kelola. Anda belum mengelola proyek apa pun.',
    noProject:
      'Kartu ini menghitung tugas di proyek yang Anda kelola. Anda belum masuk proyek apa pun.',
  },
  focus: {
    title: 'My Focus',
    subtitle: 'Apa yang harus saya kerjakan sekarang?',
    done: 'Selesai',
    start: 'Mulai kerjakan',
    review: 'Periksa',
    late: (days: number) => `Terlambat ${days} hari`,
    all: (n: number) => `Lihat semua tugas (${n})`,
    awaiting: (n: number) => `${n} menunggu diperiksa`,
    waitingReview: 'Menunggu pemeriksaan Anda',
    empty: 'Tidak ada tugas yang menunggu Anda. Semua beres.',
    emptyAction: 'Lihat tugas',
    noProjectTitle: 'Anda belum masuk proyek apa pun',
    noProjectHint: 'Minta Admin atau Project Manager menambahkan Anda ke sebuah proyek.',
    completed: (title: string) => `"${title}" ditandai selesai.`,
    started: (title: string) => `"${title}" mulai dikerjakan.`,
    failed: 'Gagal mengubah status tugas',
  },
  done: {
    title: 'Tasks Completed This Week',
    empty: 'Belum ada tugas selesai pekan ini.',
    more: (total: number) => `Lihat semua (${total})`,
  },
  ask: {
    title: 'Ask Data',
    subtitle: 'Pilih pertanyaan tentang proyek Anda',
    note: 'Jawaban disusun dari data proyek Anda. Tanya bebas belum tersedia.',
    list: 'Pertanyaan',
  },
  agenda: {
    title: 'Agenda & Projects',
    subtitle: 'Ada acara apa? Proyek saya bagaimana?',
    today: 'Hari ini',
    tomorrow: 'Besok',
    empty: 'Tidak ada acara hari ini atau besok.',
    emptyAction: 'Lihat acara',
    projects: 'Proyek saya',
    noProjects: 'Belum ada proyek berjalan.',
    noProjectsHint: 'Proyek yang Anda ikuti dan sedang berjalan muncul di sini.',
    due: (day: string) => `tenggat ${day}`,
  },
  activity: {
    title: 'Latest Activity',
    empty: 'Belum ada aktivitas di proyek Anda.',
  },
} as const;

/** Where each widget leads; the pages are built by their own menus. */
export const HOME_LINKS = {
  tasks: '/app/tasks',
  doneTasks: '/app/tasks?lingkup=semua&status=selesai',
  projects: '/app/projects',
  events: '/app/events',
} as const;
