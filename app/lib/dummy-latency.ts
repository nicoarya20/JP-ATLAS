// DUMMY: jeda palsu supaya status "memuat" pada tombol terlihat; hapus saat aksi memanggil API sungguhan.
export const fakeLatency = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms));
