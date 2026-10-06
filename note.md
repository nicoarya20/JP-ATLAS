# Fitur PM Dashboard

### Menu Ringkasan ( KPI, Overdue, dan Prioritas )

- proyek aktif ( bisa melihat project yang sedang aktif dan dikerjakan saat ini )
- task terbuka ( bisa melihat task dengan status open, inprogress, reopened kalau yang close tidak dihitung )
- bug terbuka ( bisa membuat task tapi dengan kind bugs )
- ditugaskan saya ( task aktif yang di tugaskan ke saya )
- status task saya ( breakdown status task yang ditugaskan ke saya dengan status open, inprogress, ready for qc, reopened )
- ditutup 14 terakhir ( jumlah task yang di ubah statusnya ke closed dan dihitung 14 terakhir )
- jadwal task ( task aktif dikelompokkan by due date : telat, hari ini, besok, minggu ini, nanti, tanpa tenggat)
- perlu perhatian kamu ( task yang lewat hari duedate / deadline dan belum diclosed, nanti akan dijadikan top 5 )
- snapshoot minggu ini ( rangkuman kilat 7 hari terakhir task closed, in progress, bugs, dan total task aktif )
- jatuh tempo 7 hari ke depan ( task yang deadlinenya kurang dari 7 hari ke depan akan muncul early warning )
- ghost reminder ( task in progress yang tidak disentuh 3 hari terakhir )
- events mendatang ( events yang akan datang dalam 7 hari kedepan dan merah jika hari ini )
- aktivitas terbaru ( notifikasi terbaru: komentar, assingment, status yang diubah, mention )
- proyek kamu ( daftar singkat proyek aktif yang kamu miliki atau ikuti, max 5 ditampilkan )

---

### Menu Proyek

- search projects  ( search by name atau deskripsi )
- tombol refresh ( refresh page projek )
- new project :   
- a) card untuk membuat projek dengan form :  
nama proyek  
deskripsi  
klasifikasi status : Draft, Active, On Hold, Completed, dan Cancelled  
klasifikasi prioritas : Low, Medium, High, dan Cartical  
assigny :  orang yang ditugaskan pada project

  timeline : mulai dan selesai. ada juga fitur cepat 1 minggu, 2 minggu, 1 bulan, dan 3 bulan
- b) card buat project dari cerita :  
jadi pada card ini user menceritakan proyeknya seperti apa lalu nanti ai yang susun proyek dan menyesuaikan dengan isi form pada pembuatan projek dengan form lalu nanti bisa create dan ada checklist jadikan template atau tidak
- c) template project:  
jadi di template ini adalah hasil dari create project dari cerita tadi, jika memang ada project yang sama maka tinggal pakai template aja. ga perlu cerita lagi
- card quick : card yang menampilkan project dengan semua status
- card status : card yang menyortir projek dengan sesuai statusnya : Active, On Hold, Completed, Draft, dan Cancelled 
- card health : card yang menyortir projek dengan status projek yang  statusnya : Overdue, At Risk, dan Delayed
- filter :  
proyek saya : tombol yang menampilkan project yang hanya kita ikuti atau berpartisipasi  
semua proyek : tombol yang menampilkan semua project  
any priority : tombol select prioritas project : low, medium, high, dan cartical. dan tombol ini menampilkan projeck sesuai dengan prioritas project  
any user : tombol select user dan fungsinya untuk menampilkan project yang berhubungan dengan user yang dipilih  
recently updated : tombol select yang fungsinya menampilkan project sesuai dengan tenggatnya
- view :  
tombol comfy dan dense : setting tampilan project apakah mau jadi 3 baris atau 4 baris  
grid view : membuat tampilan project menjadi grid  
list view : membuat tampilan project menjadi list  
timeline view : membuat tampilan project seperti timeline pada kalender

---

- Detail Proyek :  
- a) Tab Overview :    
- card members : menampilkan jumlah partisipan yang ada di projek    
- card tasks : menampilkan jumlah keseluruhan task yang ada pada projek    
- card milestones : menampilkan titik penanda atau chekcpoint pada projek    
- card timeline : menampilkan presentase timeline pengerjaan projek    
- card dates : menampilkan deadline project     
- card task progress : menampilkan progress task berdasarkan statusnya    
- card team : menampilkan anggota / partisipan yang ada di dalam project  
- b) Tab Tasks :    
- button dashboard : menampilkan dashboard mengenai task yaitu :   
  - card total task   
  - card total status open task   
  - card total status closed task  
  - card total status overdue task  
  - card throughput total task dalam kurun waktu 14 hari yang task dengan status created dan closed  
  - card status breakdown : menampilkan breakdown donut chart presentase task dengan status closed, open, inprogress dan reopened  
  - card top assignees open : menampilkan top assigne yang membuat task dengan status open
- button trash: untuk melihat sampah atau task yang sudah dihapus dan rentang waktunya selama 30 hari
- button new task : untuk menambahkan task, :  
a) single task : membuat task dengan form yang isinya   
- project : auto memilih project yang dibuka pada saat mau buat tasknya  
- title task  
- deskripsi task  
- kind : menentukan jenis tasknya : bug, qc, ticket, dan idea  
- priority : menentukan prioritas tasknya apakah : low, medium, high atau critical  
- assignee : menentukan siapa yang mengerjakan tasknya jika tidak dipilih otomatis jadi unassigneed  
- start date dan due date : start task dan selesai tasknya  
- estimate : estimasi jam penyelesain task  
b) bulk csv : membuat multiple task   
- project : auto memilih project yang dibuka pada saat mau buat tasknya  
- upload csv : upload csv untuk multiple tasknya dengan isi headernya :  
title,description,kind,priority,startsAt,dueAt,estimateHours,assigneeEmail,tagNames  
- download sample : jadi jika bingung untuk pengesian csvnya bisa dilihat contohnya pada tombol ini nanti mendownload sample csv  
- atau bisa juga paste csv nya di text input dibawah 2 tombol sebelumnya
- Filter :  
- scope :   
- project : auto memilih project yang dibuka pada saat mau buat tasknya  
- assignee : nah scope assignee jadi hanya menampilkan task yang dikerjakan oleh assignee yang dipilih  
- tipe task :   
  - all kinds : memfilter task sesuai dengan jenis atau kindnya : task, bug, qc, ticket, dan idea  
  - all statues : memfilter task sesuai dengan statusnya : open, in progress, ready for qc, atau closed  
  - all priorities : memfilter task sesuai dengan prioritas tasknya apakah : critical, high, medium, atau low
- urutan : memfilter task berdasarkan urutannya yaitu : due date, priority, title ( A - Z ), created, updated, estimate hours  
- view :  
  - kanban view : melihat task dengan tampilan grid  
  - table view : melihat task dengan tampilan table  
  - gant view : melihat task dengan tampilan calender dan timeline
- tombol download : untuk mendownload semua task berupa file .csv  
- tombol select : untuk menselecet semua task yang ada ditampilan
- detail task :  
- judul task  
- deskirpsi task  
- card dengan tab :  
checklist : checklist kalau semisal ada subtask  
komentar : untuk mengomnetari task  
evidence : untuk melampirkan file foto atau url dan ada optional note jika ada task yang semisal perlu diperbaiki  
deps ( dependencies ): untuk membuat task agar terblok  
aktivitas : untuk melihat logs status task  
- ubah status : ubah status task : open, inprogress, reopened, closed  
- pengaturan:  
tipe / kind : ubah tipe tasknya apa : task, bug, qc, ticket  
prioritas : ubah prioritas task : low, medium, high, critical  
assignee : ubah author atau orang yang mengerjakan tasknya  
- planning :  
 mulai : tanggal mulai pengerjaan task  
 tenggat : tanggal selesai pengerjaan task  
 estimate : estimasi jam penyelesain task   
- tags :  
 tags  : kata kunci untuk mempermudah pencarian task
- c) Tab Team  
pada tab ini menampilkan teamnya siapa saja :  
owner pemilik tasknya siapa  
dan membernya siapa saja dengan role apa saja.  
untuk rolenya : PM, Member, dan Viewer
- d) Tab Milestone  
- view: bisa dibuat list dan grid  
- tambah milestones : menambahkan titik penanda atau chekcpoint pada projek  
- edit dan hapus millestone : untuk edit formnya isinya judul millestone, deskripsi, dan deadline millestonenya
- e) Tab Phases   
- gunakan template : jadi dipase ini bisa memakai template yang disediakan yaitu: planning, development, testing, dan release  
- view: bisa dibuat list, grid dan stepper  
- tambah fase : nama fase, mulai dan selesai fase, tag untuk memudahkan pencarian fase  
- edit fase : edit nama fase, mulai, tambah deskripsi dan selesai fase, tag untuk memudahkan pencarian fase  
- detail fase : melihat detail fase  
- mulai fease : memulai fase nanti indicator pada stappernya berwarna hijau  
- selesaikan fase : nanti fase ditandai selesai  
- hapus fase : menghapus fase
- f) Tab Extensions  
pada tab ini menampilkan riwayat perpanjangan deadline projek. 
- jumlah extension : menampilkan berapa kali deadline projek sudah diperpanjang  
- list riwayat extension : diurutkan dari yang terbaru, isinya :  
  - deadline lama → deadline baru  
  - by : siapa yang memperpanjang deadlinenya  
  - tanggal dan jam kapan perpanjangan dilakukan  
  - alasan perpanjangan ( reason )
- button extend deadline : untuk memperpanjang deadline projek dengan form yang isinya :  
  - current deadline : menampilkan deadline projek saat ini  
  - new deadline : tanggal deadline baru, jika sama dengan current deadline akan muncul error "Same as current deadline" dan tombol save tidak bisa diklik  
  - reason ( optional ) : alasan kenapa deadline diperpanjang, misal scope bertambah  
  - tombol cancel dan save extension
- h) Tab Retro  
pada tab ini menampilkan retrospective atau rangkuman hasil kerja projek dalam rentang waktu tertentu  
- rentang waktu : pilih periode retro yaitu 7d, 14d, 30d, dan 90d  
- tombol refresh : refresh data retro  
- copy markdown : menyalin rangkuman retro dalam format markdown  
- download .md : mendownload rangkuman retro berupa file .md  
- card shipped : jumlah task yang sudah closed dalam periode yang dipilih  
- card slipped : jumlah task yang lewat tenggat atau meleset dari deadline  
- card still blocked : jumlah task yang masih terblok oleh deps  
- card new tasks : jumlah task baru yang dibuat dalam periode yang dipilih  
- card extensions : jumlah perpanjangan deadline projek dalam periode yang dipilih  
- card commits : jumlah commit yang masuk dalam periode yang dipilih  
- list shipped : daftar task yang sudah closed, isinya prioritas, judul task, assignee, dan tanggal closed
- deadline pushes : daftar perpanjangan deadline projek dalam periode yang dipilih, isinya deadline lama → deadline baru, siapa yang memperpanjang, dan alasannya
- top contributors : daftar anggota yang paling banyak menyelesaikan task ( closed ) dalam periode yang dipilih

---

### Menu Tasks

- tombol refresh ( refresh page tasks )
- button new task : untuk menambahkan task :
- a) single task : membuat task dengan form yang isinya   
- project : auto memilih project yang dibuka pada saat mau buat tasknya  
- title task  
- deskripsi task  
- kind : menentukan jenis tasknya : bug, qc, ticket, dan idea  
- priority : menentukan prioritas tasknya apakah : low, medium, high atau critical  
- assignee : menentukan siapa yang mengerjakan tasknya jika tidak dipilih otomatis jadi unassigneed  
- start date dan due date : start task dan selesai tasknya  
- estimate : estimasi jam penyelesain task  
b) bulk csv : membuat multiple task   
- project : auto memilih project yang dibuka pada saat mau buat tasknya  
- upload csv : upload csv untuk multiple tasknya dengan isi headernya :  
title,description,kind,priority,startsAt,dueAt,estimateHours,assigneeEmail,tagNames  
- Filter :  
- scope :   
- project : auto memilih project yang dibuka pada saat mau buat tasknya  
- assignee : nah scope assignee jadi hanya menampilkan task yang dikerjakan oleh assignee yang dipilih  
- tipe task :   
  - all kinds : memfilter task sesuai dengan jenis atau kindnya : task, bug, qc, ticket, dan idea  
  - all statues : memfilter task sesuai dengan statusnya : open, in progress, ready for qc, atau closed  
  - all priorities : memfilter task sesuai dengan prioritas tasknya apakah : critical, high, medium, atau low
- urutan : memfilter task berdasarkan urutannya yaitu : due date, priority, title ( A - Z ), created, updated, estimate hours  
- view :  
  - kanban view : melihat task dengan tampilan grid  
  - table view : melihat task dengan tampilan table  
  - gant view : melihat task dengan tampilan calender dan timeline
- tombol download : untuk mendownload semua task berupa file .csv  
- tombol select : untuk menselecet semua task yang ada ditampilan

---

- detail task :  
- judul task  
- deskirpsi task  
- card dengan tab :  
checklist : checklist kalau semisal ada subtask  
komentar : untuk mengomnetari task  
evidence : untuk melampirkan file foto atau url dan ada optional note jika ada task yang semisal perlu diperbaiki  
deps ( dependencies ): untuk membuat task agar terblok  
aktivitas : untuk melihat logs status task  
- ubah status : ubah status task : open, inprogress, reopened, closed  
- pengaturan:  
tipe / kind : ubah tipe tasknya apa : task, bug, qc, ticket  
prioritas : ubah prioritas task : low, medium, high, critical  
assignee : ubah author atau orang yang mengerjakan tasknya  
- planning :  
 mulai : tanggal mulai pengerjaan task  
 tenggat : tanggal selesai pengerjaan task  
 estimate : estimasi jam penyelesain task   
- tags :  
 tags  : kata kunci untuk mempermudah pencarian task

---

### Menu Ticket

papan tiket masuk dari semua proyek, dipakai untuk triage saat meeting : tentukan prioritas, assign, dan pantau yang overdue

- tombol refresh : refresh data tiket
- buat tiket : untuk membuat tiket baru.  
a) single : membuat satu tiket dengan form yang isinya  
- project : pilih project tiketnya  
- title : judul tiket  
- description : deskripsi tiket, misal konteks atau kriteria selesai  
- kind : jenis tiketnya, default ticket  
- priority : prioritas tiket, default medium  
- assignee : siapa yang mengerjakan, jika tidak dipilih otomatis jadi unassigned  
- start date dan due date ( optional ) : mulai dan tenggat tiket  
- estimate : estimasi jam penyelesaian tiket  
b) bulk csv : membuat multiple tiket sekaligus  
- project : pilih project tiketnya  
- upload csv : upload file csv dengan header wajib :  
title,description,kind,priority,startsAt,dueAt,estimateHours,assigneeEmail,tagNames  
- download sample : download contoh file csv  
- atau bisa juga paste csv nya langsung di text input  
- tombol import : untuk membuat tiket dari csv
- card open : jumlah tiket yang masih open
- card overdue : jumlah tiket yang lewat tenggat dan belum closed
- card unassigned : jumlah tiket yang belum ada assigneenya
- card blocked : jumlah tiket yang terblok oleh deps
- card stale &gt;7d : jumlah tiket yang tidak disentuh lebih dari 7 hari
- filter :  
  - search : cari tiket berdasarkan judul, project, atau assignee  
  - all projects : memfilter tiket sesuai projectnya  
  - all statuses : memfilter tiket sesuai statusnya  
  - all priorities : memfilter tiket sesuai prioritasnya  
  - all assignees : memfilter tiket sesuai assigneenya
- attention : filter cepat tiket yang perlu perhatian : all, overdue, unassigned, blocked, dan stale &gt;7d
- table tiket : daftar tiket isinya task, project, status, priority, assignee, due ( merah jika overdue ), dan age ( umur tiket sejak dibuat )
- detail ticket :
- judul ticket  
- deskirpsi ticket  
- card dengan tab :  
checklist : checklist kalau semisal ada subticket  
komentar : untuk mengomnetari ticket  
evidence : untuk melampirkan file foto atau url dan ada optional note jika ada ticket yang semisal perlu diperbaiki  
deps ( dependencies ): untuk membuat ticket agar terblok  
aktivitas : untuk melihat logs status ticket  
- ubah status : ubah status ticket : open, inprogress, reopened, closed  
- pengaturan:  
tipe / kind : ubah tipe ticketnya apa : task, bug, qc, ticket  
prioritas : ubah prioritas ticket : low, medium, high, critical  
assignee : ubah author atau orang yang mengerjakan ticketnya  
- planning :  
 mulai : tanggal mulai pengerjaan ticket  
 tenggat : tanggal selesai pengerjaan ticket  
 estimate : estimasi jam penyelesain ticket   
- tags :  
 tags  : kata kunci untuk mempermudah pencarian ticket

---

### Menu Pengembangan

catatan ide &amp; usulan pengembangan lintas proyek. ditinjau berkala, lalu dinaikkan jadi task jika diputuskan dikerjakan

- tombol refresh : refresh data ide
- catat ide : untuk mencatat ide atau usulan pengembangan baru  
a) single : membuat satu ide dengan form yang isinya  
- project : pilih project idenya  
- title : judul ide  
- description : deskripsi ide, misal konteks atau kriteria selesai  
- kind : jenisnya, default idea  
- priority : prioritas ide, default medium  
b) bulk csv : membuat multiple ide sekaligus  
- project : pilih project idenya  
- upload csv : upload file csv dengan header wajib :  
title,description,kind,priority,startsAt,dueAt,estimateHours,assigneeEmail,tagNames  
- download sample : download contoh file csv  
- atau bisa juga paste csv nya langsung di text input  
- tombol import : untuk membuat ide dari csv
- card open : jumlah ide yang masih open
- card unassigned : jumlah ide yang belum ada assigneenya
- card stale &gt;7d : jumlah ide yang tidak disentuh lebih dari 7 hari
- filter :  
  - search : cari ide berdasarkan judul, project, atau assignee  
  - all projects : memfilter ide sesuai projectnya  
  - all statuses : memfilter ide sesuai statusnya  
  - all priorities : memfilter ide sesuai prioritasnya  
  - all assignees : memfilter ide sesuai assigneenya
- attention : filter cepat ide yang perlu perhatian : all, unassigned, dan stale &gt;7d
- table ide : daftar ide isinya task, project, status, priority, assignee, due, dan age ( umur ide sejak dibuat, kuning jika sudah lama )
- detail pengembangan :
- judul pengembangan  
- deskirpsi pengembangan  
- card dengan tab :  
checklist : checklist kalau semisal ada subpengembangan  
komentar : untuk mengomnetari pengembangan  
evidence : untuk melampirkan file foto atau url dan ada optional note jika ada pengembangan yang semisal perlu diperbaiki  
deps ( dependencies ): untuk membuat pengembangan agar terblok  
aktivitas : untuk melihat logs status pengembangan  
- ubah status : ubah status pengembangan : open, inprogress, reopened, closed  
- pengaturan:  
tipe / kind : ubah tipe pengembangannya apa : task, bug, qc, pengembangan  
prioritas : ubah prioritas pengembangan : low, medium, high, critical  
assignee : ubah author atau orang yang mengerjakan pengembangannya  
- planning :  
 mulai : tanggal mulai pengerjaan pengembangan  
 tenggat : tanggal selesai pengerjaan pengembangan  
 estimate : estimasi jam penyelesain pengembangan   
- tags :  
 tags  : kata kunci untuk mempermudah pencarian pengembangan

---

### Menu Tim

anggota proyek dan beban kerja per user. bisa melihat siapa yang online, siapa yang kelebihan beban, dan apa yang lagi terjadi

- filter proyek : memilih proyek yang mau dilihat timnya, atau semua proyek
- online sekarang : menampilkan teman yang sedang aktif beserta rolenya dan jumlah yang online
- beban tim : jumlah task terbuka per teman di proyek yang kamu ikuti, bisa diurutkan berdasarkan beban, telat, dan nama
- aktivitas tim : log perubahan status task dan komentar di proyek kamu selama 7 hari terakhir
- direktori teman : daftar semua teman yang berbagi proyek dengan kamu, isinya nama, email, role, jumlah task, dan proyek bersama beserta role di proyek tersebut ( PM, owner, dll )

---

### Menu Events

jadwal dan pengingat tim bersama seperti meeting, review, atau event penting lainnya. semua anggota tim bisa melihat dan menambah event

- filter tag : memfilter event sesuai tagnya
- group : tag : mengelompokkan event berdasarkan tagnya
- upcoming saja : menampilkan event yang akan datang saja
- buat event : untuk membuat event baru
- view :  
  - list view : melihat event dengan tampilan list  
  - grid view : melihat event dengan tampilan grid  
  - calendar view : melihat event dengan tampilan kalender
- card event : isinya judul event, status ( misal selesai ), tag, tanggal dan jam, lokasi, peserta, dan siapa yang membuat event
- edit dan hapus event : untuk mengubah atau menghapus event
- detail event :  
  - kembali ke events : kembali ke halaman list event  
  - judul event, status ( misal selesai ), dan tag  
  - tanggal dan jam event  
  - lokasi event, misal online meeting atau meeting room  
  - project yang terhubung dengan event  
  - **catatan / notulensi: isi catatan event, misal daftar peserta.**  
  **jadi rencananya nanti di sini saat mau membuat notulensi user bisa menggunakan dengan Foto atau Voice. jadi nanti disini ditambahkan fitur ai yang bisa membuat notulensi dari foto atau voice menjadi draft text catatan**
  - pembuat event : siapa yang membuat event  
  - dibuat dan diperbarui : tanggal event dibuat dan terakhir diubah  
  - tombol edit dan hapus event
- Hasil Rapat yang Dikonfirmasi  
jadi setelah user menambahkan catatan atau notulensi nanti dipilah jadi poin tugas, keputusan, informasi, atau pertanyaan

