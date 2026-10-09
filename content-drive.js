chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractDriveFiles') {
        try {
            const elements = document.querySelectorAll('div[data-id]');
            const filesMap = new Map();

            elements.forEach(el => {
                const id = el.getAttribute('data-id');
                // ID Google Drive umumnya lebih dari 20 karakter
                if (id && id.length > 20) {
                    let name = "";
                    
                    // Mencari elemen dengan aria-label yang biasanya menyimpan nama file
                    const labelEl = el.querySelector('[aria-label]') || (el.hasAttribute('aria-label') ? el : null);
                    if (labelEl) {
                        name = labelEl.getAttribute('aria-label');
                        // Bersihkan teks (biasanya formatnya: "File, NamaFile.pdf, dimiliki oleh saya")
                        if (name.includes(',')) {
                            name = name.split(',')[0].replace(/^File\s*/i, '').replace(/^Folder\s*/i, '').trim();
                        }
                    } else {
                        // Fallback ke teks elemen
                        name = el.innerText.split('\n')[0].trim();
                    }
                    
                    if (name && !filesMap.has(id)) {
                        filesMap.set(id, {
                            id: id,
                            name: name,
                            link: `https://drive.google.com/file/d/${id}/view?usp=drive_link`
                        });
                    }
                }
            });
            
            const files = Array.from(filesMap.values());
            sendResponse({ success: true, files: files });
        } catch (error) {
            console.error("Gagal mengekstrak file:", error);
            sendResponse({ success: false, msg: error.message });
        }
        return true;
    }
});
