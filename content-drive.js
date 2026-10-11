if (window.__driveMessageListener) {
    chrome.runtime.onMessage.removeListener(window.__driveMessageListener);
}

window.__driveMessageListener = (request, sender, sendResponse) => {
    if (request.action === 'extractDriveFiles') {
        try {
            const filesMap = new Map();

            // ================================================================
            // STRATEGI: Cari setiap baris item di Google Drive
            // Setiap baris (row) dalam list view Google Drive merupakan
            // elemen dengan role="row". Dari setiap row kita ambil
            // HANYA anchor pertama yang mengarah ke folder Drive.
            // Ini mencegah ikutnya link breadcrumb / parent folder.
            // ================================================================

            // Coba ambil baris dari List View (role="row")
            const rows = document.querySelectorAll('[role="row"], [role="listitem"], [role="gridcell"]');

            rows.forEach(row => {
                // Ambil semua anchor di dalam row ini
                const anchors = row.querySelectorAll('a[href]');
                
                for (const anchor of anchors) {
                    const href = anchor.getAttribute('href') || '';

                    // Hanya proses jika mengarah ke folder Drive
                    const folderMatch = href.match(/\/drive\/folders\/([a-zA-Z0-9_-]{10,})/);
                    if (!folderMatch) continue;

                    const id = folderMatch[1];
                    if (!id || filesMap.has(id)) break; // sudah diproses, skip baris ini

                    // Ambil nama item dari aria-label di row (bukan anchor)
                    // karena aria-label di row lebih akurat berisi nama folder
                    let name = '';

                    // Cari aria-label yang mengandung nama (bukan navigasi)
                    const ariaEls = row.querySelectorAll('[aria-label]');
                    for (const el of ariaEls) {
                        const raw = el.getAttribute('aria-label') || '';
                        // Abaikan aria-label yang sangat pendek (ikon, tombol)
                        if (raw.length < 3) continue;
                        // Abaikan jika ini adalah label aksi (Lebih banyak, Bagikan, dsb)
                        const skipWords = ['lebih banyak', 'bagikan', 'lihat detail', 'pilih', 'opsi', 'tindakan', 'more actions', 'share'];
                        if (skipWords.some(w => raw.toLowerCase().includes(w))) continue;
                        
                        name = raw;
                        break;
                    }

                    if (!name) {
                        // Fallback: aria-label dari anchor itu sendiri
                        name = anchor.getAttribute('aria-label') || anchor.getAttribute('title') || '';
                    }

                    if (!name) {
                        // Fallback: innerText baris pertama yang tidak kosong
                        const lines = row.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (lines.length > 0) name = lines[0];
                    }

                    // Bersihkan prefix bahasa Indonesia/Inggris:
                    // "Folder, Nama" → "Nama"
                    // "Folder bersama, Nama" → "Nama"  
                    // "File, Nama" → "Nama"
                    name = name
                        .replace(/^Folder bersama,?\s*/i, '')
                        .replace(/^Folder dibagikan,?\s*/i, '')
                        .replace(/^Shared folder,?\s*/i, '')
                        .replace(/^(Folder|File),?\s*/i, '')
                        .trim();

                    // Hapus suffix tipe file yang ikut terbaca
                    // "Nama folder Google Spreadsheet Dibagikan" → "Nama folder"
                    name = name
                        .replace(/\s*(Google Spreadsheet|Google Docs|Google Slides|Microsoft Word|Microsoft Excel|PDF|Dibagikan|Shared)\s*$/i, '')
                        .trim();

                    // Abaikan jika nama terlalu pendek
                    if (!name || name.length < 2) break;

                    const link = https://drive.google.com/drive/folders/?usp=drive_link;
                    filesMap.set(id, { id, name, link, isFolder: true });
                    break; // Satu anchor per row sudah cukup
                }
            });

            // ================================================================
            // FALLBACK: Jika tidak ada row/listitem (mungkin Grid View)
            // Gunakan pendekatan lama tapi dengan filter ketat
            // ================================================================
            if (filesMap.size === 0) {
                document.querySelectorAll('a[href]').forEach(anchor => {
                    const href = anchor.getAttribute('href') || '';
                    const folderMatch = href.match(/\/drive\/folders\/([a-zA-Z0-9_-]{10,})/);
                    if (!folderMatch) return;

                    const id = folderMatch[1];
                    if (!id || filesMap.has(id)) return;

                    // Abaikan breadcrumb: posisi di atas halaman
                    const rect = anchor.getBoundingClientRect();
                    if (rect.top < 150 && rect.height < 50) return;

                    // Abaikan jika dalam elemen navigasi
                    if (anchor.closest('[role="navigation"]') || anchor.closest('nav')) return;

                    let name = anchor.getAttribute('aria-label') || anchor.getAttribute('title') || '';
                    if (!name) {
                        const lines = anchor.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (lines.length > 0) name = lines[0];
                    }

                    name = name
                        .replace(/^Folder bersama,?\s*/i, '')
                        .replace(/^(Folder|File),?\s*/i, '')
                        .replace(/\s*(Google Spreadsheet|Google Docs|Dibagikan|Shared)\s*$/i, '')
                        .trim();

                    if (!name || name.length < 2) return;

                    const link = https://drive.google.com/drive/folders/?usp=drive_link;
                    filesMap.set(id, { id, name, link, isFolder: true });
                });
            }

            const files = Array.from(filesMap.values());
            sendResponse({ success: true, files });

        } catch (error) {
            console.error("Gagal mengekstrak file:", error);
            sendResponse({ success: false, msg: error.message });
        }
        return true;
    }
};

chrome.runtime.onMessage.addListener(window.__driveMessageListener);
