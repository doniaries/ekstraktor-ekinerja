if (window.__driveMessageListener) {
    chrome.runtime.onMessage.removeListener(window.__driveMessageListener);
}

function parseDriveAriaLabel(raw) {
    if (!raw) return { name: '', isFolder: false };
    const lower = raw.toLowerCase();
    const isFolder = lower.startsWith('folder') || 
                     lower.includes('shared folder') || 
                     lower.includes('folder bersama') || 
                     lower.includes('folder dibagikan');
    
    let name = raw;
    
    // Google Drive memisahkan tipe, nama, dan metadata dengan koma
    // Contoh: "Folder bersama, Meningkatnya daya tarik..., Dimodifikasi oleh..."
    // Contoh: "Google Spreadsheet, PERJANJIAN KINERJA, Dimodifikasi oleh..."
    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
        const firstPart = parts[0].toLowerCase();
        const knownTypes = [
            'folder', 'folder bersama', 'folder dibagikan', 'shared folder', 
            'file', 'google spreadsheet', 'google docs', 'google dokumen', 
            'google slides', 'google slide', 'pdf', 'microsoft word', 'microsoft excel'
        ];
        if (knownTypes.some(t => firstPart === t || firstPart.startsWith(t))) {
            name = parts[1];
        }
    }
    
    // Bersihkan prefix jika masih menempel
    name = name
        .replace(/^(Folder bersama|Folder dibagikan|Shared folder|Folder|File|Google Spreadsheet|Google Dokumen|Google Docs|Google Slides|Microsoft Word|Microsoft Excel|PDF)[:,\s]+/i, '')
        .trim();
        
    // Bersihkan suffix metadata
    name = name
        .replace(/,\s*(Dimodifikasi|Dimiliki|Modified|Owned|Terakhir diubah|Last modified|Dipilih|Selected).*$/i, '')
        .replace(/\s*(Google Spreadsheet|Google Docs|Google Slides|Microsoft Word|Microsoft Excel|PDF|Dibagikan|Shared)\s*$/i, '')
        .trim();
        
    return { name, isFolder };
}

window.__driveMessageListener = (request, sender, sendResponse) => {
    if (request.action === 'extractDriveFiles') {
        try {
            const filesMap = new Map();

            // ================================================================
            // STRATEGI 1: Elemen Baris (List View & Grid View)
            // Google Drive menggunakan [role="row"] pada list view
            // dan [role="gridcell"] atau card pada grid view.
            // ID biasanya ada di atribut `data-id` pada row atau anaknya.
            // ================================================================
            const itemContainers = document.querySelectorAll(
                '[role="main"] [role="row"], ' +
                '[role="grid"] [role="row"], ' +
                '[role="row"], ' +
                '[data-target="item"], ' +
                'c-wiz [data-id]'
            );

            itemContainers.forEach(container => {
                // Abaikan jika berada di sidebar navigasi kiri, breadcrumb header, atau menu
                if (container.closest('[role="navigation"], nav, header, [role="banner"]')) return;

                const rect = container.getBoundingClientRect();
                // Abaikan elemen di bagian atas halaman (header / search / breadcrumb)
                if (rect.top < 120 && rect.height < 50) return;

                // Dapatkan ID
                let id = container.getAttribute('data-id') 
                    || container.getAttribute('data-item-id')
                    || container.querySelector('[data-id]')?.getAttribute('data-id')
                    || container.closest('[data-id]')?.getAttribute('data-id');

                // Jika belum ketemu, cek anchor di dalamnya
                if (!id) {
                    const anchor = container.querySelector('a[href]');
                    if (anchor) {
                        const href = anchor.getAttribute('href') || '';
                        const match = href.match(/\/(?:folders|file\/d)\/([a-zA-Z0-9_-]{15,})/);
                        if (match) id = match[1];
                    }
                }

                if (!id || id.length < 15 || filesMap.has(id)) return;

                // Ambil aria-label terbaik
                let labelCandidate = container.getAttribute('aria-label');
                if (!labelCandidate || labelCandidate.length < 3) {
                    const labeledChild = container.querySelector('[aria-label]');
                    if (labeledChild) {
                        labelCandidate = labeledChild.getAttribute('aria-label');
                    }
                }

                // Parse aria-label untuk nama dan penentuan folder
                let { name, isFolder } = parseDriveAriaLabel(labelCandidate);

                // Fallback nama dari innerText jika aria-label tidak memadai
                if (!name || name.length < 2) {
                    const textLines = container.innerText.split('\n').map(s => s.trim()).filter(Boolean);
                    // Filter teks aksi navigasi
                    const filteredLines = textLines.filter(line => {
                        const lower = line.toLowerCase();
                        return !['nama', 'pemilik', 'tanggal diubah', 'ukuran file', 'terakhir diubah', 'saya'].includes(lower);
                    });
                    if (filteredLines.length > 0) {
                        name = filteredLines[0];
                    }
                }

                // Cek apakah item adalah folder berdasarkan icon/konten jika belum terdeteksi
                if (!isFolder) {
                    const html = container.innerHTML.toLowerCase();
                    if (html.includes('folder') || (labelCandidate && labelCandidate.toLowerCase().includes('folder'))) {
                        isFolder = true;
                    }
                }

                // Validasi nama
                if (!name || name.length < 2) return;

                const link = isFolder 
                    ? `https://drive.google.com/drive/folders/${id}?usp=drive_link`
                    : `https://drive.google.com/file/d/${id}/view?usp=drive_link`;

                filesMap.set(id, { id, name, link, isFolder });
            });

            // ================================================================
            // STRATEGI 2: Fallback dengan query langsung div[data-id]
            // (Pendekatan asli yang sangat andal di Google Drive)
            // ================================================================
            if (filesMap.size === 0) {
                const elements = document.querySelectorAll('div[data-id], [data-id]');
                elements.forEach(el => {
                    const id = el.getAttribute('data-id');
                    if (!id || id.length < 20 || filesMap.has(id)) return;

                    // Skip navigasi kiri & breadcrumb atas
                    if (el.closest('[role="navigation"], nav, header')) return;
                    const rect = el.getBoundingClientRect();
                    if (rect.top < 120 && rect.height < 50) return;

                    let name = "";
                    const labelEl = el.querySelector('[aria-label]') || (el.hasAttribute('aria-label') ? el : null);
                    let isFolder = false;

                    if (labelEl) {
                        const labelText = labelEl.getAttribute('aria-label') || '';
                        const parsed = parseDriveAriaLabel(labelText);
                        name = parsed.name;
                        isFolder = parsed.isFolder;
                    }

                    if (!name) {
                        const lines = el.innerText.split('\n').map(l => l.trim()).filter(Boolean);
                        if (lines.length > 0) name = lines[0];
                    }

                    if (!isFolder && el.innerHTML.toLowerCase().includes('folder')) {
                        isFolder = true;
                    }

                    if (name && name.length >= 2) {
                        const link = isFolder 
                            ? `https://drive.google.com/drive/folders/${id}?usp=drive_link`
                            : `https://drive.google.com/file/d/${id}/view?usp=drive_link`;

                        filesMap.set(id, { id, name, link, isFolder });
                    }
                });
            }

            // ================================================================
            // STRATEGI 3: Fallback ke seluruh anchor a[href] (jika Drive berubah)
            // ================================================================
            if (filesMap.size === 0) {
                document.querySelectorAll('a[href]').forEach(anchor => {
                    const href = anchor.getAttribute('href') || '';
                    const match = href.match(/\/(?:folders|file\/d)\/([a-zA-Z0-9_-]{15,})/);
                    if (!match) return;

                    const id = match[1];
                    if (!id || filesMap.has(id)) return;
                    if (anchor.closest('[role="navigation"], nav, header')) return;

                    const isFolder = href.includes('/folders/');
                    let name = anchor.getAttribute('aria-label') || anchor.getAttribute('title') || '';
                    if (name) {
                        name = parseDriveAriaLabel(name).name;
                    } else {
                        const lines = anchor.innerText.split('\n').map(l => l.trim()).filter(Boolean);
                        if (lines.length > 0) name = lines[0];
                    }

                    if (name && name.length >= 2) {
                        const link = isFolder 
                            ? `https://drive.google.com/drive/folders/${id}?usp=drive_link`
                            : `https://drive.google.com/file/d/${id}/view?usp=drive_link`;

                        filesMap.set(id, { id, name, link, isFolder });
                    }
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
